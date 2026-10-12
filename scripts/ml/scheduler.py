"""Executors that run stages over photos.

run_inline     each worker thread decodes a photo and runs every request itself (GPU calls are
               serialised by runtime.GPU_LOCK). Simple; used for --cpu and as a reference.
run_pipelined  three-stage pipeline:
                 CPU pool   decode once + stage.requests()  (CPU-provider models run inline here)
                 GPU thread per-model queues, batched up to model.batch_size, flushed on timeout;
                            the ONLY thread that calls GPU sessions (no lock contention)
                 CPU pool   stage.postprocess()
               Backpressure: at most `max_inflight` photos are decoded and waiting at once.

Both yield Item objects in completion order with item.results = {stage: (payload, error)}.
"""

import concurrent.futures
import queue
import threading
import time

import cv2
import numpy as np
from PIL import Image

from ml.runtime import TIMERS
from ml.stage import Decoded


def load_bgr(path):
    if path.lower().endswith(('.avif', '.webp', '.heic')):
        with Image.open(path) as im:
            return cv2.cvtColor(np.asarray(im.convert('RGB')), cv2.COLOR_RGB2BGR)
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


class Item:
    __slots__ = ('key', 'thumb_path', 'stages', 'decoded', 'reqs', 'outs', 'results', 'pending')

    def __init__(self, key, thumb_path, stages):
        self.key = key
        self.thumb_path = thumb_path
        self.stages = stages
        self.decoded = None
        self.reqs = {}
        self.outs = {}
        self.results = {}
        self.pending = 0

    def fail_all(self, err):
        for st in self.stages:
            self.results.setdefault(st.name, (None, err))


def _decode(item):
    with TIMERS.time('decode'):
        img = load_bgr(item.thumb_path)
    if img is None:
        item.fail_all(RuntimeError('could not decode'))
        return False
    item.decoded = Decoded(item.key, item.thumb_path, img)
    return True


def _postprocess(item):
    for st in item.stages:
        if st.name in item.results:
            continue
        try:
            with TIMERS.time(f'post.{st.name}'):
                item.results[st.name] = (st.postprocess(item.decoded, item.reqs[st.name], item.outs[st.name]), None)
        except Exception as e:  # one bad photo must not abort the run
            item.results[st.name] = (None, e)
    item.decoded = None
    item.reqs = item.outs = None


# ---------------------------------------------------------------------------
# Inline
# ---------------------------------------------------------------------------

def run_inline(work, workers):
    """work: list of (key, thumb_path, [stages])."""
    def process(entry):
        item = Item(*entry)
        try:
            if _decode(item):
                for st in item.stages:
                    try:
                        with TIMERS.time(f'pre.{st.name}'):
                            reqs = st.requests(item.decoded)
                        item.reqs[st.name] = reqs
                        item.outs[st.name] = [st.models[r.model].run_batch([r.blob])[0] for r in reqs]
                    except Exception as e:
                        item.results[st.name] = (None, e)
                _postprocess(item)
        except Exception as e:
            item.fail_all(e)
        return item

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        yield from pool.map(process, work)


# ---------------------------------------------------------------------------
# Pipelined (single GPU thread, batched)
# ---------------------------------------------------------------------------

_STOP = object()


class _GpuWorker(threading.Thread):
    def __init__(self, submit_post, batch_timeout):
        super().__init__(name='ml-gpu', daemon=True)
        self.q = queue.Queue()
        self.submit_post = submit_post
        self.batch_timeout = batch_timeout
        self.pending = {}   # model -> [(item, stage_name, idx, blob)]
        self.first_at = {}  # model -> time the oldest pending entry arrived
        self.busy = 0.0

    def run(self):
        while True:
            timeout = self.batch_timeout if self.pending else None
            t0 = time.perf_counter()
            try:
                msg = self.q.get(timeout=timeout)
            except queue.Empty:
                msg = None
            TIMERS.add('gpu.idle', time.perf_counter() - t0)
            if msg is _STOP:
                self._flush(force=True)
                return
            if msg:
                now = time.perf_counter()
                for entry in msg:
                    model = entry[3]
                    self.pending.setdefault(model, []).append(entry)
                    self.first_at.setdefault(model, now)
            self._flush(force=msg is None)

    def _flush(self, force):
        now = time.perf_counter()
        for model in list(self.pending):
            entries = self.pending[model]
            bs = model.batch_size
            while len(entries) >= bs:
                self._run(model, entries[:bs])
                entries = entries[bs:]
            stale = now - self.first_at.get(model, now) >= self.batch_timeout
            if entries and (force or stale):
                self._run(model, entries)
                entries = []
            if entries:
                self.pending[model] = entries
            else:
                del self.pending[model]
                self.first_at.pop(model, None)

    def _run(self, model, entries):
        t0 = time.perf_counter()
        try:
            outs = model.run_batch([e[4] for e in entries])
        except Exception as e:
            outs = None
            err = e
        self.busy += time.perf_counter() - t0
        for i, (item, stage_name, idx, _model, _blob) in enumerate(entries):
            if outs is None:
                item.results.setdefault(stage_name, (None, err))
            else:
                item.outs[stage_name][idx] = outs[i]
            item.pending -= 1
            if item.pending == 0:
                self.submit_post(item)


def run_pipelined(work, workers, batch_timeout=0.02, max_inflight=None):
    """work: list of (key, thumb_path, [stages])."""
    max_inflight = max_inflight or workers * 4
    done_q = queue.Queue()
    slots = threading.BoundedSemaphore(max_inflight)
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=workers)

    def finish(item):
        try:
            _postprocess(item)
        except Exception as e:
            item.fail_all(e)
        done_q.put(item)

    gpu = _GpuWorker(lambda item: pool.submit(finish, item), batch_timeout)
    gpu.start()

    def prepare(item):
        try:
            if not _decode(item):
                done_q.put(item)
                return
            gpu_entries = []
            for st in item.stages:
                try:
                    with TIMERS.time(f'pre.{st.name}'):
                        reqs = st.requests(item.decoded)
                    item.reqs[st.name] = reqs
                    item.outs[st.name] = [None] * len(reqs)
                    for i, r in enumerate(reqs):
                        model = st.models[r.model]
                        if getattr(model, 'on_gpu', False):
                            gpu_entries.append((item, st.name, i, model, r.blob))
                        else:
                            item.outs[st.name][i] = model.run_batch([r.blob])[0]
                except Exception as e:
                    item.results[st.name] = (None, e)
                    gpu_entries = [g for g in gpu_entries if g[1] != st.name]
        except Exception as e:
            item.fail_all(e)
            done_q.put(item)
            return
        if gpu_entries:
            item.pending = len(gpu_entries)
            gpu.q.put(gpu_entries)
        else:
            finish(item)

    def feed():
        for entry in work:
            slots.acquire()
            pool.submit(prepare, Item(*entry))

    feeder = threading.Thread(target=feed, name='ml-feed', daemon=True)
    start = time.perf_counter()
    feeder.start()
    try:
        for _ in range(len(work)):
            item = done_q.get()
            slots.release()
            yield item
    finally:
        gpu.q.put(_STOP)
        gpu.join()
        pool.shutdown(wait=True)
        wall = time.perf_counter() - start
        TIMERS.add('gpu.busy(thread)', gpu.busy)
        TIMERS.add('wall', wall)
