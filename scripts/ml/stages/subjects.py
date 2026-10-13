"""Subject detection for photo focus points and Story Maker framing.

For every photo thumbnail this computes:
  x / y        normalized focus point used by object-position crops, sprite/recap/social-card
               crops and lightbox zoom. For faces this is the top of the primary face box
               (natural headroom); for people it is the head region of the primary person;
               otherwise a saliency centroid.
  src          'face' | 'person' | 'saliency'
  faces[]      significant faces, primary first: {x, y, w, h, confidence} (centre + size)
  subjects[]   significant people (body boxes), primary first: {x, y, w, h, confidence}
  score        hero-image ranking score (faces >> people >> nothing)
  recapScore   strict score for the 1:4 recap slices (faces only)

Pipeline
  1. Faces:   SCRFD-10G (InsightFace) via ONNX Runtime. Falls back to OpenCV YuNet.
  2. People:  YOLOX-L (COCO person class) via ONNX Runtime. Falls back to OpenCV DNN.
  3. Saliency fallback when neither is found: spectral-residual saliency x local sharpness.

Every numeric tuning constant lives in PARAMS and feeds the stage fingerprint, so changing one
recomputes the stage automatically. Bump STAGE_VERSION for logic changes that PARAMS can't see.
"""

import math
import os
import threading

import cv2
import numpy as np

from ml.runtime import MODELS, TIMERS, OrtModel, ensure_model, ort
from ml.stage import Request, Stage

# Continues detectFaces.py ALGO_VERSION (2) so migrated cache entries stay valid.
STAGE_VERSION = 2

PARAMS = {
    # Faces
    'FACE_SCORE_MIN': 0.5,
    'FACE_MIN_REL_W': 0.018,          # ~19px on a 1080px thumbnail
    'FACE_KEEP_REL_WEIGHT': 0.15,     # keep secondary faces whose weight is >= 15% of the primary's
    'FACE_NMS_IOU': 0.4,
    'FACE_MIN_PX': 4,
    'MAX_FACES': 6,
    'SCRFD_SIZE': 640,
    'SCRFD_TILE_OVERLAP': 192,        # faces up to ~190px are fully inside at least one tile
    'SCRFD_TILE_TRIGGER': 1.15,       # tile when the long side exceeds SIZE * this
    'SCRFD_TILE_EDGE_MARGIN': 3,
    # People
    'PERSON_INPUT': 640,
    'PERSON_SCORE_MIN': 0.45,
    'PERSON_NMS_IOU': 0.45,
    'PERSON_MIN_PX': 8,
    'PERSON_MIN_REL_H': 0.12,
    'PERSON_KEEP_REL_WEIGHT': 0.2,
    'PERSON_UPPER_BODY': 0.45,        # sharpness measured on the top 45% of the body box
    'PERSON_HEAD_OFFSET': 0.06,       # focus point offset into the body box
    'MAX_SUBJECTS': 4,
    'PERSON_SCORE_FACTOR': 0.15,      # people rank below faces for hero selection
    # Recap
    'RECAP_CROP_RATIO': 1.0 / 4.0,
    'RECAP_MAX_FACE_FRACTION': 0.55,
    # Saliency
    'SAL_WORK_W': 256,
    'SAL_SPECTRAL_W': 64,
    'SAL_PERCENTILE': 92,
    'SAL_MIN_CONCENTRATION': 0.2,
    'SAL_SPREAD_NORM': 0.4,
}
P = PARAMS


def nms(boxes_xyxy, scores, iou):
    if len(boxes_xyxy) == 0:
        return []
    xywh = [[float(b[0]), float(b[1]), float(b[2] - b[0]), float(b[3] - b[1])] for b in boxes_xyxy]
    keep = cv2.dnn.NMSBoxes(xywh, [float(s) for s in scores], 0.0, iou)
    return [int(i) for i in np.array(keep).flatten()]


# ---------------------------------------------------------------------------
# Face detection
# ---------------------------------------------------------------------------

class ScrfdFaces:
    """SCRFD-10G with keypoints.

    The published export bakes a 640x640 input (and batch 1) into its Reshape nodes, so small
    faces are found by running a whole-image pass plus overlapping native-resolution 640px
    tiles, merged with NMS.
    """

    STRIDES = (8, 16, 32)
    NUM_ANCHORS = 2
    model_key = 'scrfd'

    def __init__(self):
        size = P['SCRFD_SIZE']
        self.anchors = {}
        for stride in self.STRIDES:
            n = size // stride
            centers = np.stack(np.mgrid[:n, :n][::-1], axis=-1).astype(np.float32)
            self.anchors[stride] = np.repeat((centers * stride).reshape(-1, 2), self.NUM_ANCHORS, axis=0)

    def load(self, use_gpu):
        return OrtModel(ensure_model('scrfd'), use_gpu, name='scrfd')

    @staticmethod
    def _blob(canvas):
        size = P['SCRFD_SIZE']
        return cv2.dnn.blobFromImage(canvas, 1.0 / 128, (size, size), (127.5, 127.5, 127.5), swapRB=True)

    @staticmethod
    def _tile_starts(length, size, overlap):
        if length <= size:
            return [0]
        n = math.ceil((length - overlap) / (size - overlap))
        return [round(i * (length - size) / (n - 1)) for i in range(n)]

    def requests(self, img):
        ih, iw = img.shape[:2]
        size = P['SCRFD_SIZE']
        # Pass 1: whole image letterboxed into 640 (large / close faces)
        scale = min(size / iw, size / ih)
        nw, nh = int(round(iw * scale)), int(round(ih * scale))
        canvas = np.zeros((size, size, 3), dtype=np.uint8)
        canvas[:nh, :nw] = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
        reqs = [Request('face', self._blob(canvas), ('full', scale))]
        # Pass 2: native-resolution tiles (small / distant faces)
        if max(iw, ih) > size * P['SCRFD_TILE_TRIGGER']:
            overlap = P['SCRFD_TILE_OVERLAP']
            for ty in self._tile_starts(ih, size, overlap):
                for tx in self._tile_starts(iw, size, overlap):
                    tile = img[ty:ty + size, tx:tx + size]
                    canvas = np.zeros((size, size, 3), dtype=np.uint8)
                    canvas[:tile.shape[0], :tile.shape[1]] = tile
                    reqs.append(Request('face', self._blob(canvas), ('tile', tx, ty, tile.shape[0], tile.shape[1])))
        return reqs

    def _decode(self, outs):
        """Raw outputs for one 640x640 canvas -> boxes (N,4), scores (N,), kps (N,10) in canvas pixels."""
        boxes, scores, kpss = [], [], []
        fmc = len(self.STRIDES)
        for idx, stride in enumerate(self.STRIDES):
            s = outs[idx].reshape(-1)
            pos = np.where(s >= P['FACE_SCORE_MIN'])[0]
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

    def decode(self, img, pairs):
        """pairs: [(Request, outputs)] in request order."""
        ih, iw = img.shape[:2]
        m = P['SCRFD_TILE_EDGE_MARGIN']
        all_boxes, all_scores, all_kps = [], [], []
        for req, outs in pairs:
            b, s, k = self._decode(outs)
            if req.meta[0] == 'full':
                scale = req.meta[1]
                all_boxes.append(b / scale)
                all_scores.append(s)
                all_kps.append(k / scale)
                continue
            _, tx, ty, th, tw = req.meta
            if len(s) == 0:
                continue
            # Drop faces clipped by an interior tile edge (the neighbouring tile has them whole)
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
        min_px = P['FACE_MIN_PX']
        for i in nms(boxes, scores, P['FACE_NMS_IOU']):
            x1, y1, x2, y2 = boxes[i]
            x1, y1 = max(0.0, x1), max(0.0, y1)
            x2, y2 = min(float(iw), x2), min(float(ih), y2)
            if x2 - x1 > min_px and y2 - y1 > min_px:
                faces.append((x1, y1, x2 - x1, y2 - y1, float(scores[i]), kpss[i].reshape(5, 2)))
        return faces


class YunetModel:
    """OpenCV YuNet (CPU, one detector per thread). Input is the whole BGR image."""

    on_gpu = False
    batch_size = 1
    name = 'yunet'
    provider = 'OpenCV CPU'

    def __init__(self):
        self.path = ensure_model('yunet')
        self.local = threading.local()

    def run_batch(self, imgs):
        out = []
        for img in imgs:
            ih, iw = img.shape[:2]
            det = getattr(self.local, 'det', None)
            if det is None:
                det = cv2.FaceDetectorYN.create(self.path, '', (iw, ih), P['FACE_SCORE_MIN'], P['FACE_NMS_IOU'], 5000)
                self.local.det = det
            det.setInputSize((iw, ih))
            with TIMERS.time('infer.run.yunet'):
                _, found = det.detect(img)
            out.append(found)
        return out


class YunetFaces:
    """OpenCV YuNet fallback when ONNX Runtime is unavailable."""

    model_key = 'yunet'

    def load(self, use_gpu):
        return YunetModel()

    def requests(self, img):
        return [Request('face', img)]

    def decode(self, img, pairs):
        ih, iw = img.shape[:2]
        min_px = P['FACE_MIN_PX']
        faces = []
        for _, found in pairs:
            for f in (found if found is not None else []):
                x, y, w, h = [float(v) for v in f[:4]]
                x1, y1 = max(0.0, x), max(0.0, y)
                x2, y2 = min(float(iw), x + w), min(float(ih), y + h)
                if x2 - x1 > min_px and y2 - y1 > min_px:
                    faces.append((x1, y1, x2 - x1, y2 - y1, float(f[14]), np.array(f[4:14]).reshape(5, 2)))
        return faces


# ---------------------------------------------------------------------------
# Person detection
# ---------------------------------------------------------------------------

class OpenCvDnnModel:
    """cv2.dnn fallback for YOLOX when ONNX Runtime is unavailable (one net per thread)."""

    on_gpu = False
    batch_size = 1
    provider = 'OpenCV CPU'

    def __init__(self, path, name):
        self.path = path
        self.name = name
        self.local = threading.local()

    def run_batch(self, blobs):
        out = []
        for blob in blobs:
            net = getattr(self.local, 'net', None)
            if net is None:
                net = cv2.dnn.readNetFromONNX(self.path)
                self.local.net = net
            net.setInput(blob)
            with TIMERS.time(f'infer.run.{self.name}'):
                out.append([net.forward()])
        return out


class YoloxPeople:
    """YOLOX-L (official 0.1.1rc0 ONNX export: raw BGR input, undecoded grid outputs)."""

    model_key = 'yolox'

    def __init__(self):
        size = P['PERSON_INPUT']
        grids, strides = [], []
        for stride in (8, 16, 32):
            n = size // stride
            xv, yv = np.meshgrid(np.arange(n), np.arange(n))
            grids.append(np.stack((xv, yv), 2).reshape(-1, 2))
            strides.append(np.full((n * n, 1), stride))
        self.grids = np.concatenate(grids).astype(np.float32)
        self.strides = np.concatenate(strides).astype(np.float32)

    def load(self, use_gpu):
        path = ensure_model('yolox')
        if ort is not None:
            return OrtModel(path, use_gpu, name='yolox')
        return OpenCvDnnModel(path, 'yolox')

    def requests(self, img):
        ih, iw = img.shape[:2]
        size = P['PERSON_INPUT']
        r = min(size / iw, size / ih)
        nw, nh = int(iw * r), int(ih * r)
        canvas = np.full((size, size, 3), 114, dtype=np.uint8)
        canvas[:nh, :nw] = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR)
        blob = np.ascontiguousarray(canvas.transpose(2, 0, 1)[None], dtype=np.float32)
        return [Request('person', blob, r)]

    def decode(self, img, pairs):
        ih, iw = img.shape[:2]
        (req, outs), = pairs
        r = req.meta
        out = outs[0].reshape(-1, 85)
        scores = out[:, 4] * out[:, 5]  # objectness x P(person)
        pos = np.where(scores >= P['PERSON_SCORE_MIN'])[0]
        if pos.size == 0:
            return []
        o = out[pos]
        xy = (o[:, :2] + self.grids[pos]) * self.strides[pos]
        wh = np.exp(o[:, 2:4]) * self.strides[pos]
        boxes = np.concatenate([xy - wh / 2, xy + wh / 2], axis=1) / r
        people = []
        min_px = P['PERSON_MIN_PX']
        for i in nms(boxes, scores[pos], P['PERSON_NMS_IOU']):
            x1, y1, x2, y2 = boxes[i]
            x1, y1 = max(0.0, x1), max(0.0, y1)
            x2, y2 = min(float(iw), x2), min(float(ih), y2)
            if x2 - x1 > min_px and y2 - y1 > min_px:
                people.append((x1, y1, x2 - x1, y2 - y1, float(scores[pos][i])))
        return people


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def load_sharpness_source(thumb_path, fallback_gray):
    """Prefer the processed full-size JPEG (decoded at 1/2 scale via libjpeg DCT scaling)."""
    norm_thumb = os.path.normpath(thumb_path)
    base_rel = os.path.splitext(norm_thumb.replace(os.path.join('build', 'thumbnails'), '', 1).lstrip('/\\'))[0]
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


def saliency_focus(gray):
    """Spectral-residual saliency weighted by local sharpness (in-focus subject vs. blurred background)."""
    h, w = gray.shape[:2]
    sw = P['SAL_WORK_W']
    sh = max(1, int(round(h * sw / w)))
    small = cv2.resize(gray, (sw, sh), interpolation=cv2.INTER_AREA).astype(np.float32)

    # Spectral residual (Hou & Zhang 2007)
    tw = P['SAL_SPECTRAL_W']
    tiny = cv2.resize(small, (tw, max(1, int(round(sh * tw / sw)))), interpolation=cv2.INTER_AREA)
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
    thresh = np.percentile(combined, P['SAL_PERCENTILE'])
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
    concentration = max(0.0, 1.0 - spread / P['SAL_SPREAD_NORM'])
    if concentration < P['SAL_MIN_CONCENTRATION']:
        return None
    return cx, cy, concentration


def r3(v):
    return round(float(v), 3)


def score_subjects(decoded, raw_faces, raw_people):
    """Rank detections and choose the focus point. Returns the cache payload."""
    img = decoded.img
    ih, iw = img.shape[:2]

    sharp_src = None
    if raw_faces or raw_people:
        with TIMERS.time('sharpness source load'):
            sharp_src = load_sharpness_source(decoded.thumb_path, decoded.gray)

    # --- Faces ---
    faces = []
    for (x, y, w, h, score, _kps) in raw_faces:
        nx, ny, nw, nh = x / iw, y / ih, w / iw, h / ih
        if nw < P['FACE_MIN_REL_W']:
            continue
        cx, cy = nx + nw / 2, ny + nh / 2
        sharp = region_sharpness(sharp_src, nx, ny, nw, nh)
        weight = sharp * math.sqrt(nw * nh) * score * center_bias(cx, cy)
        faces.append({'cx': cx, 'cy': cy, 'w': nw, 'h': nh, 'score': score, 'weight': weight})
    faces.sort(key=lambda f: f['weight'], reverse=True)
    if faces:
        top = faces[0]['weight']
        faces = [f for f in faces if f['weight'] >= top * P['FACE_KEEP_REL_WEIGHT']][:P['MAX_FACES']]

    # --- People ---
    people = []
    for (x, y, w, h, score) in raw_people:
        nx, ny, nw, nh = x / iw, y / ih, w / iw, h / ih
        if nh < P['PERSON_MIN_REL_H']:
            continue
        cx, cy = nx + nw / 2, ny + nh / 2
        # Sharpness of the upper body (where faces/helmets/jersey numbers are)
        sharp = region_sharpness(sharp_src, nx, ny, nw, nh * P['PERSON_UPPER_BODY'])
        weight = sharp * math.sqrt(nw * nh) * score * center_bias(cx, cy)
        people.append({'cx': cx, 'cy': cy, 'w': nw, 'h': nh, 'score': score, 'weight': weight})
    people.sort(key=lambda p: p['weight'], reverse=True)
    if people:
        top = people[0]['weight']
        people = [p for p in people if p['weight'] >= top * P['PERSON_KEEP_REL_WEIGHT']][:P['MAX_SUBJECTS']]

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
        ratio = P['RECAP_CROP_RATIO']
        crop_w = (ih * ratio) / iw if (iw / ih) > ratio else 1.0
        recap_candidates = [
            f for f in faces
            if f['w'] <= crop_w * P['RECAP_MAX_FACE_FRACTION'] and crop_w / 2 <= f['cx'] <= 1 - crop_w / 2
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
        result['y'] = r3(max(0.0, top_y + primary['h'] * P['PERSON_HEAD_OFFSET']))  # head region of the body box
        result['score'] = float(primary['weight']) * P['PERSON_SCORE_FACTOR']
    else:
        with TIMERS.time('saliency'):
            sal = saliency_focus(decoded.gray)
        if sal is not None:
            result['src'] = 'saliency'
            result['x'] = r3(sal[0])
            result['y'] = r3(sal[1])
    return result


# ---------------------------------------------------------------------------
# Stage
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


class SubjectsStage(Stage):
    name = 'subjects'
    version = STAGE_VERSION
    recipe = 'thumb-avif-1080+processed-jpeg-half'

    def __init__(self, use_gpu=True):
        super().__init__()
        self.use_gpu = use_gpu
        self.backend = 'ort' if ort is not None else 'opencv'
        self.face = ScrfdFaces() if self.backend == 'ort' else YunetFaces()
        self.person = YoloxPeople()

    @property
    def params(self):
        return {**PARAMS, 'backend': self.backend}

    def model_hashes(self):
        return {k: MODELS[k]['sha256'] for k in (self.face.model_key, self.person.model_key)}

    def load(self):
        if not self.models:
            self.models = {'face': self.face.load(self.use_gpu), 'person': self.person.load(self.use_gpu)}
        return self.models

    def describe(self):
        return ', '.join(f'{k}={getattr(m, "name", k)} ({getattr(m, "provider", "?")})'
                         for k, m in self.models.items())

    def requests(self, decoded):
        return self.face.requests(decoded.img) + self.person.requests(decoded.img)

    def postprocess(self, decoded, reqs, outputs):
        face_pairs = [(r, o) for r, o in zip(reqs, outputs) if r.model == 'face']
        person_pairs = [(r, o) for r, o in zip(reqs, outputs) if r.model == 'person']
        with TIMERS.time('post.decode'):
            raw_faces = self.face.decode(decoded.img, face_pairs)
            raw_people = self.person.decode(decoded.img, person_pairs)
        return score_subjects(decoded, raw_faces, raw_people)

    def apply(self, photo, payload):
        return apply_to_photo(photo, payload)

    @staticmethod
    def summary_key(payload):
        return (payload or {}).get('src') or 'none'
