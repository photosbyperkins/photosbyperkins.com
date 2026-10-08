"""
Subject detection for photo focus points and Story Maker framing.

For every photo thumbnail this computes:
  focusX / focusY   - normalized point used by object-position crops, sprite/recap/social-card
                      crops and lightbox zoom. For faces this is the top of the primary face box
                      (natural headroom); for people it is the head region of the primary person;
                      otherwise a saliency centroid.
  focusSource       - 'face' | 'person' | 'saliency'
  faces[]           - significant faces, primary first: {x, y, w, h, confidence} (centre + size)
  subjects[]        - significant people (body boxes), primary first: {x, y, w, h, confidence}
  faceScore         - hero-image ranking score (faces >> people >> nothing)
  recapScore        - strict score for the 1:4 recap slices (faces only)

Pipeline
  1. Faces:   SCRFD-10G (InsightFace) via ONNX Runtime. Falls back to OpenCV YuNet.
  2. People:  YOLOX-L (COCO person class) via ONNX Runtime. Falls back to OpenCV DNN.
  3. Saliency fallback when neither is found: spectral-residual saliency x local sharpness.

ONNX Runtime uses DirectML (GPU) when `onnxruntime-directml` is installed, otherwise CPU.
GPU inference is serialized per model (DirectML sessions are not re-entrant) while decoding,
pre/post-processing and sharpness run on a CPU thread pool.

Results are cached in data/.faces_cache.json keyed by thumbnail path. Entries are invalidated when
ALGO_VERSION changes or when the thumbnail file changes (size + mtime signature).

Usage: python scripts/detectFaces.py [--force] [--limit N] [--dry-run] [--cpu] [--workers N]
"""

import argparse
import concurrent.futures
import contextlib
import hashlib
import json
import math
import os
import threading
import time
import urllib.request

import cv2
import numpy as np
from PIL import Image

try:
    import onnxruntime as ort  # onnxruntime-directml on Windows/AMD, onnxruntime-gpu on NVIDIA

    ort.set_default_logger_severity(3)
except Exception:  # pragma: no cover - optional dependency
    ort = None

# Bump whenever detection/scoring output changes so cached entries are recomputed.
ALGO_VERSION = 2

DATA_DIR = 'data'
MODEL_DIR = os.path.join(DATA_DIR, 'models')
PHOTOS_FILE = os.path.join(DATA_DIR, 'photos.json')
CACHE_FILE = os.path.join(DATA_DIR, '.faces_cache.json')

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

# Detection tuning

FACE_SCORE_MIN = 0.5
FACE_MIN_REL_W = 0.018  # ~19px on a 1080px thumbnail
FACE_KEEP_REL_WEIGHT = 0.15  # keep secondary faces whose weight is >= 15% of the primary's
PERSON_INPUT = 640
PERSON_SCORE_MIN = 0.45
PERSON_MIN_REL_H = 0.12
PERSON_KEEP_REL_WEIGHT = 0.2
MAX_FACES = 6
MAX_SUBJECTS = 4
PERSON_SCORE_FACTOR = 0.15  # people rank below faces for hero selection
RECAP_CROP_RATIO = 1.0 / 4.0


# ---------------------------------------------------------------------------
# Model management
# ---------------------------------------------------------------------------

def _sha256(path):
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
    digest = _sha256(tmp)
    if digest != spec['sha256']:
        os.remove(tmp)
        raise RuntimeError(f"Checksum mismatch for {spec['file']}: {digest}")
    os.replace(tmp, path)
    return path


# One lock for every GPU session: DirectML is not re-entrant, and running two sessions
# concurrently on the same adapter can hang the driver (887A0020 -> device removed).
_GPU_LOCK = threading.Lock()


class OrtModel:
    """ONNX Runtime session. GPU sessions are serialised; on a GPU failure the session is
    rebuilt on the CPU and the call retried, so a driver reset doesn't fail the whole run."""

    def __init__(self, path, use_gpu):
        self.path = path
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
        self.state = (session, on_gpu, _GPU_LOCK if on_gpu else contextlib.nullcontext())

    def run(self, blob):
        session, on_gpu, lock = self.state
        try:
            with lock:
                return session.run(None, {self.input_name: blob})
        except Exception as e:
            if not on_gpu:
                raise
            with _GPU_LOCK:
                if self.state[0] is session:  # first thread to notice rebuilds
                    print(f'  GPU inference failed ({str(e).splitlines()[0][:160]}); '
                          f'falling back to CPU for {os.path.basename(self.path)}')
                    self._build(['CPUExecutionProvider'])
            return self.run(blob)


def nms(boxes_xyxy, scores, iou):
    if len(boxes_xyxy) == 0:
        return []
    xywh = [[float(b[0]), float(b[1]), float(b[2] - b[0]), float(b[3] - b[1])] for b in boxes_xyxy]
    keep = cv2.dnn.NMSBoxes(xywh, [float(s) for s in scores], 0.0, iou)
    return [int(i) for i in np.array(keep).flatten()]


# ---------------------------------------------------------------------------
# Face detection
# ---------------------------------------------------------------------------

class ScrfdFaceDetector:
    """SCRFD-10G with keypoints.

    The published export bakes a 640x640 input into its Reshape nodes, so small faces are found by
    running a whole-image pass plus overlapping native-resolution 640px tiles, merged with NMS.
    """

    STRIDES = (8, 16, 32)
    NUM_ANCHORS = 2
    SIZE = 640
    TILE_OVERLAP = 192  # faces up to ~190px are fully inside at least one tile; larger ones hit the full pass

    def __init__(self, use_gpu):
        self.model = OrtModel(ensure_model('scrfd'), use_gpu)
        self.name = f'SCRFD-10G tiled ({self.model.provider})'
        self.anchors = {}
        for stride in self.STRIDES:
            n = self.SIZE // stride
            centers = np.stack(np.mgrid[:n, :n][::-1], axis=-1).astype(np.float32)
            self.anchors[stride] = np.repeat((centers * stride).reshape(-1, 2), self.NUM_ANCHORS, axis=0)

    def _infer(self, canvas):
        """Run one 640x640 BGR canvas; returns boxes (N,4), scores (N,), kps (N,10) in canvas pixels."""
        blob = cv2.dnn.blobFromImage(canvas, 1.0 / 128, (self.SIZE, self.SIZE), (127.5, 127.5, 127.5), swapRB=True)
        outs = self.model.run(blob)
        boxes, scores, kpss = [], [], []
        fmc = len(self.STRIDES)
        for idx, stride in enumerate(self.STRIDES):
            s = outs[idx].reshape(-1)
            pos = np.where(s >= FACE_SCORE_MIN)[0]
            if pos.size == 0:
                continue
            anchors = self.anchors[stride][pos]
            d = outs[idx + fmc].reshape(-1, 4)[pos] * stride
            k = outs[idx + fmc * 2].reshape(-1, 10)[pos] * stride
            boxes.append(np.stack([anchors[:, 0] - d[:, 0], anchors[:, 1] - d[:, 1],
                                   anchors[:, 0] + d[:, 2], anchors[:, 1] + d[:, 3]], axis=-1))
            kp = np.empty_like(k)
            kp[:, 0::2] = anchors[:, 0:1] + k[:, 0::2]
            kp[:, 1::2] = anchors[:, 1:2] + k[:, 1::2]
            scores.append(s[pos])
            kpss.append(kp)
        if not boxes:
            return np.zeros((0, 4), np.float32), np.zeros(0, np.float32), np.zeros((0, 10), np.float32)
        return np.concatenate(boxes), np.concatenate(scores), np.concatenate(kpss)

    @staticmethod
    def _tile_starts(length, size, overlap):
        if length <= size:
            return [0]
        n = math.ceil((length - overlap) / (size - overlap))
        return [round(i * (length - size) / (n - 1)) for i in range(n)]

    def detect(self, img):
        ih, iw = img.shape[:2]
        size = self.SIZE
        all_boxes, all_scores, all_kps = [], [], []

        # Pass 1: whole image letterboxed into 640 (large / close faces)
        scale = min(size / iw, size / ih)
        nw, nh = int(round(iw * scale)), int(round(ih * scale))
        canvas = np.zeros((size, size, 3), dtype=np.uint8)
        canvas[:nh, :nw] = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
        b, s, k = self._infer(canvas)
        all_boxes.append(b / scale)
        all_scores.append(s)
        all_kps.append(k / scale)

        # Pass 2: native-resolution tiles (small / distant faces)
        if max(iw, ih) > size * 1.15:
            for ty in self._tile_starts(ih, size, self.TILE_OVERLAP):
                for tx in self._tile_starts(iw, size, self.TILE_OVERLAP):
                    tile = img[ty:ty + size, tx:tx + size]
                    canvas = np.zeros((size, size, 3), dtype=np.uint8)
                    canvas[:tile.shape[0], :tile.shape[1]] = tile
                    b, s, k = self._infer(canvas)
                    if len(s) == 0:
                        continue
                    # Drop faces clipped by an interior tile edge (the neighbouring tile has them whole)
                    th, tw = tile.shape[:2]
                    m = 3
                    clipped = (((b[:, 0] < m) & (tx > 0)) | ((b[:, 1] < m) & (ty > 0)) |
                               ((b[:, 2] > tw - m) & (tx + tw < iw)) | ((b[:, 3] > th - m) & (ty + th < ih)))
                    keep = ~clipped
                    b, s, k = b[keep], s[keep], k[keep]
                    b[:, [0, 2]] += tx
                    b[:, [1, 3]] += ty
                    k[:, 0::2] += tx
                    k[:, 1::2] += ty
                    all_boxes.append(b)
                    all_scores.append(s)
                    all_kps.append(k)

        boxes = np.concatenate(all_boxes)
        scores = np.concatenate(all_scores)
        kpss = np.concatenate(all_kps)
        faces = []
        for i in nms(boxes, scores, 0.4):
            x1, y1, x2, y2 = boxes[i]
            x1, y1 = max(0.0, x1), max(0.0, y1)
            x2, y2 = min(float(iw), x2), min(float(ih), y2)
            if x2 - x1 > 4 and y2 - y1 > 4:
                faces.append((x1, y1, x2 - x1, y2 - y1, float(scores[i]), kpss[i].reshape(5, 2)))
        return faces


class YunetFaceDetector:
    """OpenCV YuNet fallback when ONNX Runtime is unavailable."""

    def __init__(self):
        self.path = ensure_model('yunet')
        self.local = threading.local()
        self.name = 'YuNet (OpenCV CPU)'

    def detect(self, img):
        ih, iw = img.shape[:2]
        det = getattr(self.local, 'det', None)
        if det is None:
            det = cv2.FaceDetectorYN.create(self.path, '', (iw, ih), FACE_SCORE_MIN, 0.4, 5000)
            self.local.det = det
        det.setInputSize((iw, ih))
        _, found = det.detect(img)
        faces = []
        for f in (found if found is not None else []):
            x, y, w, h = [float(v) for v in f[:4]]
            x1, y1 = max(0.0, x), max(0.0, y)
            x2, y2 = min(float(iw), x + w), min(float(ih), y + h)
            if x2 - x1 > 4 and y2 - y1 > 4:
                faces.append((x1, y1, x2 - x1, y2 - y1, float(f[14]), np.array(f[4:14]).reshape(5, 2)))
        return faces


# ---------------------------------------------------------------------------
# Person detection
# ---------------------------------------------------------------------------

class YoloxPersonDetector:
    """YOLOX-L (official 0.1.1rc0 ONNX export: raw BGR input, undecoded grid outputs)."""

    def __init__(self, use_gpu):
        path = ensure_model('yolox')
        self.use_ort = ort is not None
        if self.use_ort:
            self.model = OrtModel(path, use_gpu)
            self.name = f'YOLOX-L ({self.model.provider})'
        else:
            self.path = path
            self.local = threading.local()
            self.name = 'YOLOX-L (OpenCV CPU)'
        grids, strides = [], []
        for stride in (8, 16, 32):
            n = PERSON_INPUT // stride
            xv, yv = np.meshgrid(np.arange(n), np.arange(n))
            grids.append(np.stack((xv, yv), 2).reshape(-1, 2))
            strides.append(np.full((n * n, 1), stride))
        self.grids = np.concatenate(grids).astype(np.float32)
        self.strides = np.concatenate(strides).astype(np.float32)

    def _run(self, blob):
        if self.use_ort:
            return self.model.run(blob)[0]
        net = getattr(self.local, 'net', None)
        if net is None:
            net = cv2.dnn.readNetFromONNX(self.path)
            self.local.net = net
        net.setInput(blob)
        return net.forward()

    def detect(self, img):
        ih, iw = img.shape[:2]
        r = min(PERSON_INPUT / iw, PERSON_INPUT / ih)
        nw, nh = int(iw * r), int(ih * r)
        canvas = np.full((PERSON_INPUT, PERSON_INPUT, 3), 114, dtype=np.uint8)
        canvas[:nh, :nw] = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR)
        blob = np.ascontiguousarray(canvas.transpose(2, 0, 1)[None], dtype=np.float32)
        out = self._run(blob).reshape(-1, 85)

        scores = out[:, 4] * out[:, 5]  # objectness x P(person)
        pos = np.where(scores >= PERSON_SCORE_MIN)[0]
        if pos.size == 0:
            return []
        o = out[pos]
        xy = (o[:, :2] + self.grids[pos]) * self.strides[pos]
        wh = np.exp(o[:, 2:4]) * self.strides[pos]
        boxes = np.concatenate([xy - wh / 2, xy + wh / 2], axis=1) / r
        people = []
        for i in nms(boxes, scores[pos], 0.45):
            x1, y1, x2, y2 = boxes[i]
            x1, y1 = max(0.0, x1), max(0.0, y1)
            x2, y2 = min(float(iw), x2), min(float(ih), y2)
            if x2 - x1 > 8 and y2 - y1 > 8:
                people.append((x1, y1, x2 - x1, y2 - y1, float(scores[pos][i])))
        return people


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def load_bgr(path):
    if path.lower().endswith(('.avif', '.webp', '.heic')):
        with Image.open(path) as im:
            return cv2.cvtColor(np.asarray(im.convert('RGB')), cv2.COLOR_RGB2BGR)
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


def load_sharpness_source(thumb_path, fallback_gray):
    """Prefer the processed full-size JPEG (decoded at 1/2 scale via libjpeg DCT scaling)."""
    base_rel = os.path.splitext(thumb_path.replace(os.path.join('build', 'thumbnails'), '', 1).lstrip('/\\'))[0]
    native_jpg = os.path.join('build', 'processed', base_rel + '.jpg')
    if os.path.exists(native_jpg):
        data = np.fromfile(native_jpg, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_REDUCED_GRAYSCALE_2)
        if img is not None:
            return img
    return fallback_gray


def region_sharpness(gray, nx, ny, nw, nh):
    h, w = gray.shape[:2]
    x1, y1 = max(0, int(nx * w)), max(0, int(ny * h))
    x2, y2 = min(w, int((nx + nw) * w)), min(h, int((ny + nh) * h))
    roi = gray[y1:y2, x1:x2]
    if roi.size < 16:
        return 0.0
    return float(cv2.Laplacian(roi, cv2.CV_64F).var())


def center_bias(cx, cy):
    return 1.0 - (abs(cx - 0.5) * 0.5 + abs(cy - 0.5) * 0.5)


def saliency_focus(img):
    """Spectral-residual saliency weighted by local sharpness (in-focus subject vs. blurred background)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]
    sw = 256
    sh = max(1, int(round(h * sw / w)))
    small = cv2.resize(gray, (sw, sh), interpolation=cv2.INTER_AREA).astype(np.float32)

    # Spectral residual (Hou & Zhang 2007) at 64px width
    tiny = cv2.resize(small, (64, max(1, int(round(sh * 64 / sw)))), interpolation=cv2.INTER_AREA)
    f = np.fft.fft2(tiny)
    log_amp = np.log(np.abs(f) + 1e-8)
    residual = log_amp - cv2.blur(log_amp, (3, 3))
    sal = np.abs(np.fft.ifft2(np.exp(residual + 1j * np.angle(f)))) ** 2
    sal = cv2.GaussianBlur(sal.astype(np.float32), (0, 0), 2.5)
    sal = cv2.resize(sal, (sw, sh))
    sal /= sal.max() + 1e-8

    sharp = np.abs(cv2.Laplacian(small, cv2.CV_32F))
    sharp = cv2.GaussianBlur(sharp, (0, 0), 6)
    sharp /= sharp.max() + 1e-8

    combined = np.sqrt(sal) * sharp
    thresh = np.percentile(combined, 92)
    mask = combined >= thresh
    weights = combined * mask
    total = float(weights.sum())
    if total <= 0:
        return None
    ys, xs = np.mgrid[:sh, :sw]
    cx = float((weights * xs).sum() / total) / sw
    cy = float((weights * ys).sum() / total) / sh
    # Concentration: how tight the salient mass is (0 = spread everywhere, 1 = a point)
    spread = math.sqrt(float((weights * ((xs / sw - cx) ** 2 + (ys / sh - cy) ** 2)).sum() / total))
    concentration = max(0.0, 1.0 - spread / 0.4)
    if concentration < 0.2:
        return None
    return cx, cy, concentration


def r3(v):
    return round(float(v), 3)


# ---------------------------------------------------------------------------
# Per-image analysis
# ---------------------------------------------------------------------------

def analyze(path, face_det, person_det):
    img = load_bgr(path)
    if img is None:
        return None
    ih, iw = img.shape[:2]

    raw_faces = face_det.detect(img)
    raw_people = person_det.detect(img)

    sharp_src = None
    if raw_faces or raw_people:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sharp_src = load_sharpness_source(path, gray)

    # --- Faces ---
    faces = []
    for (x, y, w, h, score, kps) in raw_faces:
        nx, ny, nw, nh = x / iw, y / ih, w / iw, h / ih
        if nw < FACE_MIN_REL_W:
            continue
        cx, cy = nx + nw / 2, ny + nh / 2
        sharp = region_sharpness(sharp_src, nx, ny, nw, nh)
        weight = sharp * math.sqrt(nw * nh) * score * center_bias(cx, cy)
        faces.append({'cx': cx, 'cy': cy, 'w': nw, 'h': nh, 'score': score, 'weight': weight})
    faces.sort(key=lambda f: f['weight'], reverse=True)
    if faces:
        top = faces[0]['weight']
        faces = [f for f in faces if f['weight'] >= top * FACE_KEEP_REL_WEIGHT][:MAX_FACES]

    # --- People ---
    people = []
    for (x, y, w, h, score) in raw_people:
        nx, ny, nw, nh = x / iw, y / ih, w / iw, h / ih
        if nh < PERSON_MIN_REL_H:
            continue
        cx, cy = nx + nw / 2, ny + nh / 2
        # Sharpness of the upper body (where faces/helmets/jersey numbers are)
        sharp = region_sharpness(sharp_src, nx, ny, nw, nh * 0.45)
        weight = sharp * math.sqrt(nw * nh) * score * center_bias(cx, cy)
        people.append({'cx': cx, 'cy': cy, 'w': nw, 'h': nh, 'score': score, 'weight': weight})
    people.sort(key=lambda p: p['weight'], reverse=True)
    if people:
        top = people[0]['weight']
        people = [p for p in people if p['weight'] >= top * PERSON_KEEP_REL_WEIGHT][:MAX_SUBJECTS]

    result = {
        'faces': [{'x': r3(f['cx']), 'y': r3(f['cy']), 'w': r3(f['w']), 'h': r3(f['h']),
                   'confidence': round(f['score'], 2)} for f in faces],
        'subjects': [{'x': r3(p['cx']), 'y': r3(p['cy']), 'w': r3(p['w']), 'h': r3(p['h']),
                      'confidence': round(p['score'], 2)} for p in people],
        'score': 0.0,
        'recapScore': 0.0,
    }

    if faces:
        primary = faces[0]
        result['src'] = 'face'
        result['x'] = r3(primary['cx'])
        result['y'] = r3(max(0.0, primary['cy'] - primary['h'] / 2))  # top of face: natural headroom
        result['score'] = float(primary['weight'])

        # Recap (1:4 vertical slice): face must fit with room for the head and be centrable.
        crop_w = (ih * RECAP_CROP_RATIO) / iw if (iw / ih) > RECAP_CROP_RATIO else 1.0
        recap_candidates = [
            f for f in faces
            if f['w'] <= crop_w * 0.55 and crop_w / 2 <= f['cx'] <= 1 - crop_w / 2
        ]
        if recap_candidates:
            best = max(recap_candidates, key=lambda f: f['weight'])
            # Penalise busy frames, counting only significant faces (not distant crowd faces)
            result['recapScore'] = float(best['weight']) / float(len(faces) ** 4)
    elif people:
        primary = people[0]
        top_y = primary['cy'] - primary['h'] / 2
        result['src'] = 'person'
        result['x'] = r3(primary['cx'])
        result['y'] = r3(max(0.0, top_y + primary['h'] * 0.06))  # head region of the body box
        result['score'] = float(primary['weight']) * PERSON_SCORE_FACTOR
    else:
        sal = saliency_focus(img)
        if sal is not None:
            result['src'] = 'saliency'
            result['x'] = r3(sal[0])
            result['y'] = r3(sal[1])
    return result


# ---------------------------------------------------------------------------
# photos.json integration
# ---------------------------------------------------------------------------

PHOTO_KEYS = ('focusX', 'focusY', 'focusSource', 'faces', 'subjects', 'faceScore', 'recapScore')


def apply_to_photo(photo, entry):
    for k in PHOTO_KEYS:
        photo.pop(k, None)
    if not entry:
        return False
    photo['faceScore'] = entry.get('score', 0.0)
    photo['recapScore'] = entry.get('recapScore', 0.0)
    if entry.get('x') is None:
        return False
    photo['focusX'] = entry['x']
    photo['focusY'] = entry['y']
    photo['focusSource'] = entry.get('src')
    if entry.get('faces'):
        photo['faces'] = entry['faces']
    if entry.get('subjects'):
        photo['subjects'] = entry['subjects']
    return True


def file_signature(path):
    st = os.stat(path)
    return f'{st.st_size}:{st.st_mtime_ns}'


def is_fresh(entry, sig):
    return isinstance(entry, dict) and entry.get('v') == ALGO_VERSION and entry.get('sig') == sig


def save_json(path, data, indent=None):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, separators=(',', ':') if indent is None else None)
    os.replace(tmp, path)


def select_heroes(photos_data):
    for events in photos_data.values():
        for event_data in events.values():
            candidates = [p for p in (event_data.get('highlights') or event_data.get('album') or [])
                          if isinstance(p, dict)]
            if not candidates:
                continue
            best = max(candidates, key=lambda p: p.get('faceScore', 0.0))
            event_data['hero'] = {
                'src': best.get('src') or best.get('original'),
                'focusX': best.get('focusX'),
                'focusY': best.get('focusY'),
            }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--force', action='store_true', help='ignore the cache and reprocess everything')
    parser.add_argument('--limit', type=int, default=0, help='only process the first N uncached photos')
    parser.add_argument('--dry-run', action='store_true', help='do not write photos.json or the cache')
    parser.add_argument('--cpu', action='store_true', help='disable GPU inference')
    parser.add_argument('--workers', type=int, default=os.cpu_count() or 8)
    args = parser.parse_args()

    if not os.path.exists(PHOTOS_FILE):
        print('photos.json not found.')
        return

    cv2.setNumThreads(1)  # parallelism comes from the worker pool
    with open(PHOTOS_FILE, 'r', encoding='utf-8') as f:
        photos_data = json.load(f)

    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
        except json.JSONDecodeError:
            print('Warning: face cache is corrupt; rebuilding.')

    # Collect photos (a thumbnail can appear in both album and highlights)
    by_thumb = {}
    for events in photos_data.values():
        for event_data in events.values():
            for list_key in ('album', 'highlights'):
                for photo in event_data.get(list_key) or []:
                    if isinstance(photo, dict) and photo.get('thumb'):
                        by_thumb.setdefault(photo['thumb'], []).append(photo)

    todo, missing = [], 0
    for thumb in by_thumb:
        local = os.path.join('build', thumb.lstrip('/'))
        if not os.path.exists(local):
            missing += 1
            continue
        sig = file_signature(local)
        if args.force or not is_fresh(cache.get(thumb), sig):
            todo.append((thumb, local, sig))
    cached = len(by_thumb) - len(todo) - missing
    if args.limit:
        todo = todo[: args.limit]

    print(f'Subject detection: {len(by_thumb)} photos, {cached} cached, '
          f'{len(todo)} to process, {missing} missing thumbnails')

    if todo:
        use_gpu = not args.cpu
        if ort is not None:
            face_det = ScrfdFaceDetector(use_gpu)
        else:
            print('onnxruntime not installed; using OpenCV fallbacks (pip install onnxruntime-directml)')
            face_det = YunetFaceDetector()
        person_det = YoloxPersonDetector(use_gpu)
        print(f'  Faces:  {face_det.name}\n  People: {person_det.name}\n  Workers: {args.workers}')

        counts = {'face': 0, 'person': 0, 'saliency': 0, 'none': 0, 'error': 0}
        start = time.time()
        done = 0
        last_save = time.time()

        def work(item):
            thumb, local, sig = item
            try:
                return thumb, sig, analyze(local, face_det, person_det), None
            except Exception as e:  # keep going; one bad file must not abort the run
                return thumb, sig, None, e

        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            for thumb, sig, res, err in pool.map(work, todo):
                done += 1
                if err is not None or res is None:
                    counts['error'] += 1
                    print(f'  Error processing {thumb}: {err or "could not decode"}')
                    continue
                res['v'] = ALGO_VERSION
                res['sig'] = sig
                cache[thumb] = res
                counts[res.get('src') or 'none'] += 1
                if done % 250 == 0 or done == len(todo):
                    rate = done / max(1e-6, time.time() - start)
                    print(f'  {done}/{len(todo)} ({rate:.1f} img/s) faces={counts["face"]} '
                          f'people={counts["person"]} saliency={counts["saliency"]} none={counts["none"]}')
                if not args.dry_run and time.time() - last_save > 60:
                    save_json(CACHE_FILE, cache)
                    last_save = time.time()
        print(f'Processed {len(todo)} photos in {time.time() - start:.1f}s: {counts}')

    # Prune entries for photos that no longer exist (and legacy .webp keys)
    if not args.limit:
        stale = [k for k in cache if k not in by_thumb]
        for k in stale:
            del cache[k]
        if stale:
            print(f'Pruned {len(stale)} stale cache entries')

    # Apply cache to every photo
    sources = {'face': 0, 'person': 0, 'saliency': 0, 'none': 0}
    for thumb, photos in by_thumb.items():
        entry = cache.get(thumb)
        entry = entry if isinstance(entry, dict) and entry.get('v') == ALGO_VERSION else None
        for photo in photos:
            apply_to_photo(photo, entry)
        sources[(entry or {}).get('src') or 'none'] += 1
    total = max(1, len(by_thumb))
    print('Focus coverage: ' + ', '.join(f'{k}={v} ({v / total:.1%})' for k, v in sources.items()))

    select_heroes(photos_data)

    if args.dry_run:
        print('Dry run: nothing written.')
        return
    save_json(PHOTOS_FILE, photos_data, indent=2)
    save_json(CACHE_FILE, cache)


if __name__ == '__main__':
    main()
