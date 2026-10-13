"""Model registry, downloads and ONNX Runtime sessions (single-item and batched)."""

import contextlib
import hashlib
import os
import threading
import time
import urllib.request

import numpy as np

try:
    import onnxruntime as ort  # onnxruntime-directml on Windows/AMD, onnxruntime-gpu on NVIDIA

    ort.set_default_logger_severity(3)
except Exception:  # pragma: no cover - optional dependency
    ort = None

MODEL_DIR = os.path.join('data', 'models')

# sha256 doubles as the model's identity in stage fingerprints: swapping a file changes results.
MODELS = {
    'scrfd': {
        'file': 'scrfd_10g_kps.onnx',
        'url': 'https://huggingface.co/public-data/insightface/resolve/main/models/buffalo_l/det_10g.onnx',
        'sha256': '5838f7fe053675b1c7a08b633df49e7af5495cee0493c7dcf6697200b85b5b91',
    },
    'yunet': {
        'file': 'face_detection_yunet_2023mar.onnx',
        'url': 'https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx',
        'sha256': '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4',
    },
    'yolox': {
        'file': 'yolox_l.onnx',
        'url': 'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_l.onnx',
        'sha256': '7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411',
    },
}


# ---------------------------------------------------------------------------
# Timing
# ---------------------------------------------------------------------------

class Timers:
    """Thread-safe accumulated wall time per named section (summed across threads)."""

    def __init__(self):
        self._lock = threading.Lock()
        self.totals = {}

    @contextlib.contextmanager
    def time(self, key):
        t = time.perf_counter()
        try:
            yield
        finally:
            self.add(key, time.perf_counter() - t)

    def add(self, key, dt):
        with self._lock:
            self.totals[key] = self.totals.get(key, 0.0) + dt

    def clear(self):
        with self._lock:
            self.totals.clear()


TIMERS = Timers()


# ---------------------------------------------------------------------------
# Model files
# ---------------------------------------------------------------------------

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def ensure_model(key):
    spec = MODELS[key]
    os.makedirs(MODEL_DIR, exist_ok=True)
    path = os.path.join(MODEL_DIR, spec['file'])
    if os.path.exists(path):
        return path
    print(f"Downloading {spec['file']}...")
    req = urllib.request.Request(spec['url'], headers={'User-Agent': 'photosbyperkins-pipeline'})
    tmp = path + '.part'
    with urllib.request.urlopen(req) as r, open(tmp, 'wb') as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    digest = sha256_file(tmp)
    if digest != spec['sha256']:
        os.remove(tmp)
        raise RuntimeError(f"Checksum mismatch for {spec['file']}: {digest}")
    os.replace(tmp, path)
    return path


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

# Every GPU session call goes through this lock: DirectML is not re-entrant, and running two
# sessions concurrently on the same adapter can hang the driver (887A0020 -> device removed).
# With the scheduler (scheduler.py) only the GPU thread calls GPU sessions, so it is uncontended.
GPU_LOCK = threading.Lock()


class OrtModel:
    """ONNX Runtime session.

    batch_size == 1   fixed-shape export; run_batch loops one item at a time
    batch_size  > 1   the input's first dim must be symbolic (e.g. 'batch'); it is pinned to
                      batch_size via a free-dimension override so DirectML sees static shapes,
                      partial batches are zero-padded and the padding is dropped from outputs
                      (every output must be batch-major).

    On a GPU failure the session is rebuilt on the CPU and the call retried, so a driver reset
    doesn't fail the whole run.
    """

    def __init__(self, path, use_gpu, batch_size=1, batch_dim='batch', name=None):
        self.path = path
        self.name = name or os.path.splitext(os.path.basename(path))[0]
        self.batch_size = max(1, int(batch_size))
        self.batch_dim = batch_dim
        providers = ['CPUExecutionProvider']
        available = ort.get_available_providers()
        if use_gpu:
            for gpu in ('DmlExecutionProvider', 'CUDAExecutionProvider', 'ROCMExecutionProvider'):
                if gpu in available:
                    providers = [gpu, 'CPUExecutionProvider']
                    break
        self._build(providers)

    def _build(self, providers):
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        if self.batch_size > 1:
            opts.add_free_dimension_override_by_name(self.batch_dim, self.batch_size)
        if providers[0] == 'DmlExecutionProvider':
            opts.enable_mem_pattern = False
            opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        elif providers[0] == 'CPUExecutionProvider':
            opts.intra_op_num_threads = 2  # parallelism comes from the worker pool
        session = ort.InferenceSession(self.path, sess_options=opts, providers=providers)
        self.provider = session.get_providers()[0]
        self.input_name = session.get_inputs()[0].name
        on_gpu = self.provider != 'CPUExecutionProvider'
        # CPU sessions are thread-safe; let worker threads run them in parallel.
        self.state = (session, on_gpu, GPU_LOCK if on_gpu else contextlib.nullcontext())

    @property
    def on_gpu(self):
        return self.state[1]

    def _session_run(self, blob):
        session, on_gpu, lock = self.state
        try:
            t0 = time.perf_counter()
            with lock:
                t1 = time.perf_counter()
                out = session.run(None, {self.input_name: blob})
            t2 = time.perf_counter()
            TIMERS.add('infer.wait', t1 - t0)
            TIMERS.add(f'infer.run.{self.name}', t2 - t1)
            return out
        except Exception as e:
            if not on_gpu:
                raise
            with GPU_LOCK:
                if self.state[0] is session:  # first thread to notice rebuilds
                    print(f'  GPU inference failed ({str(e).splitlines()[0][:160]}); '
                          f'falling back to CPU for {os.path.basename(self.path)}')
                    self._build(['CPUExecutionProvider'])
            return self._session_run(blob)

    def run(self, blob):
        """Run a single item. blob has a leading batch dim of 1."""
        if self.batch_size == 1:
            return self._session_run(blob)
        return self.run_batch([blob])[0]

    def run_batch(self, blobs):
        """Run a list of single-item blobs (each with leading dim 1). Returns one output list per blob."""
        if self.batch_size == 1:
            return [self._session_run(b) for b in blobs]
        results = []
        for i in range(0, len(blobs), self.batch_size):
            chunk = blobs[i:i + self.batch_size]
            stacked = np.concatenate(chunk, axis=0)
            pad = self.batch_size - len(chunk)
            if pad:
                stacked = np.concatenate([stacked, np.zeros((pad, *stacked.shape[1:]), stacked.dtype)], axis=0)
            outs = self._session_run(np.ascontiguousarray(stacked))
            for j in range(len(chunk)):
                results.append([o[j:j + 1] for o in outs])
        return results
