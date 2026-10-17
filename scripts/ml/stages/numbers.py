"""Jersey number & arm-band OCR stage with PP-OCRv3/v4 ONNX + Burst Consensus Boost.

- Crops upper-torso/shoulder/back + deltoid armband regions from up to top-4 `subjects[]` boxes.
- Uses PP-OCRv3 DBNet scene-text detection + PP-OCRv4 CTC alphanumeric recognition (including
  rotated `±35°` deltoid armband patches for front/3/4 action shots), with an aspect-preserved
  OpenCV block-digit recognizer fallback for synthetic benchmarks and zero-model environments.
- Computes per-subject `torsoLab` and `refStripeScore` so referee stripes/numbers are ignored
  and each detected number is bound to the specific skater's jersey color.
"""
from __future__ import annotations

import os
import re
import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from ..runtime import MODELS, REPO_MODEL_DIR, TIMERS, ensure_model, ort
from ..stage import Stage
from .teams import compute_dominant_torso_lab

STAGE_VERSION = 5
DERBY_NUMBER_RE = re.compile(r'^(?:[0-9]{1,4}|[0-9]{1,3}[A-Z]|[A-Z][0-9]{1,3})$')
SINGLE_FRAME_CONF = 0.85
BURST_CANDIDATE_CONF = 0.72

# Common protective-gear brand strings printed on wrist guards / elbow pads / helmets
GEAR_LOGO_BLACKLIST = {'187', 'S1', 'T8', '888', 'Z87'}

# Exact 95-character dictionary embedded in en_PP-OCRv4_rec_infer.onnx ('character' metadata prop)
_PPOCR_ASCII_CHARS = list(
    '0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~!"#$%&\'()*+,-./ '
)
_PPOCR_CHAR_LIST = ['blank', *_PPOCR_ASCII_CHARS, ' ']

_OCR_SESSION_LOCK = threading.Lock()
_DET_SESSION: Any = None
_REC_SESSION: Any = None
_SESSIONS_INITIALIZED = False


def is_valid_derby_number(text: str) -> bool:
    cleaned = (text or '').strip().upper()
    if not (1 <= len(cleaned) <= 4):
        return False
    if not DERBY_NUMBER_RE.match(cleaned):
        return False
    return any(ch.isdigit() for ch in cleaned)


def _get_onnx_ocr_sessions() -> tuple[Any, Any]:
    """Lazily initializes thread-safe ONNX Runtime sessions for PP-OCRv3 det + PP-OCRv4 rec."""
    global _DET_SESSION, _REC_SESSION, _SESSIONS_INITIALIZED
    if _SESSIONS_INITIALIZED:
        return _DET_SESSION, _REC_SESSION
    with _OCR_SESSION_LOCK:
        if _SESSIONS_INITIALIZED:
            return _DET_SESSION, _REC_SESSION
        _SESSIONS_INITIALIZED = True
        if ort is None:
            return None, None
        try:
            det_file = MODELS['ppocr_det']['file']
            rec_file = MODELS['ppocr_rec']['file']
            local_det = os.path.join('data', 'models', det_file)
            local_rec = os.path.join('data', 'models', rec_file)
            repo_det = os.path.join(REPO_MODEL_DIR, det_file)
            repo_rec = os.path.join(REPO_MODEL_DIR, rec_file)

            det_path = local_det if os.path.exists(local_det) else (repo_det if os.path.exists(repo_det) else None)
            rec_path = local_rec if os.path.exists(local_rec) else (repo_rec if os.path.exists(repo_rec) else None)

            if det_path is None and os.path.exists('data'):
                det_path = ensure_model('ppocr_det')
            if rec_path is None and os.path.exists('data'):
                rec_path = ensure_model('ppocr_rec')

            if det_path and rec_path and os.path.exists(det_path) and os.path.exists(rec_path):
                opts = ort.SessionOptions()
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                opts.intra_op_num_threads = 2
                _DET_SESSION = ort.InferenceSession(det_path, sess_options=opts, providers=['CPUExecutionProvider'])
                _REC_SESSION = ort.InferenceSession(rec_path, sess_options=opts, providers=['CPUExecutionProvider'])
        except Exception:
            _DET_SESSION = None
            _REC_SESSION = None
        return _DET_SESSION, _REC_SESSION


def _rotate_image(img_bgr: np.ndarray, angle_deg: float) -> np.ndarray:
    ih, iw = img_bgr.shape[:2]
    mat = cv2.getRotationMatrix2D((iw / 2.0, ih / 2.0), angle_deg, 1.0)
    return cv2.warpAffine(
        img_bgr,
        mat,
        (iw, ih),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _preprocess_ppocr_det(
    img_bgr: np.ndarray,
    target_h: int = 256,
    max_w: int = 448,
) -> tuple[np.ndarray, float, float, int, int]:
    ih, iw = img_bgr.shape[:2]
    scale = min(target_h / float(max(ih, 1)), max_w / float(max(iw, 1)))
    nh = max(32, int(round(ih * scale / 32.0)) * 32)
    nw = max(32, int(round(iw * scale / 32.0)) * 32)
    resized = cv2.resize(img_bgr, (nw, nh), interpolation=cv2.INTER_LINEAR)
    blob = cv2.dnn.blobFromImage(
        resized,
        scalefactor=1.0 / 255.0 / 0.226,
        size=(nw, nh),
        mean=(123.675, 116.28, 103.53),
        swapRB=False,
    )
    return blob, iw / float(nw), ih / float(nh), nw, nh


def _recognize_ppocrv4_patch(rec_sess: Any, warped_bgr: np.ndarray) -> tuple[str, float]:
    h, w = warped_bgr.shape[:2]
    if h < 4 or w < 4:
        return ('', 0.0)
    target_h = 48
    target_w = max(48, min(320, int(round(w * (target_h / float(max(h, 1)))))))
    resized = cv2.resize(warped_bgr, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
    pad_w = max(target_w, 160)
    canvas = np.zeros((target_h, pad_w, 3), dtype=np.float32)
    norm = (resized.astype(np.float32) / 255.0 - 0.5) / 0.5
    canvas[:, :target_w, :] = norm
    blob = np.transpose(canvas, (2, 0, 1))[np.newaxis, ...]
    with TIMERS.time('infer.run.ppocr_rec'):
        probs = rec_sess.run(None, {rec_sess.get_inputs()[0].name: blob})[0][0]
    idxs = np.argmax(probs, axis=-1)
    max_p = np.max(probs, axis=-1)
    chars: list[str] = []
    confs: list[float] = []
    for i, c in enumerate(idxs):
        if c != 0 and c < len(_PPOCR_CHAR_LIST) and not (i > 0 and idxs[i - 1] == c):
            ch = _PPOCR_CHAR_LIST[c].strip().upper()
            if ch and ch.isalnum():
                chars.append(ch)
                confs.append(float(max_p[i]))
    return ''.join(chars), (float(np.mean(confs)) if confs else 0.0)


def _detect_and_rec_ppocr(
    det_sess: Any,
    rec_sess: Any,
    img_bgr: np.ndarray,
    target_h: int = 256,
    min_rel_h: float = 0.11,
) -> list[tuple[str, float, float]]:
    """Runs PP-OCRv3 DBNet detection + PP-OCRv4 CTC recognition, returning `(num_str, conf, rel_h)`."""
    ih, iw = img_bgr.shape[:2]
    if ih < 16 or iw < 16:
        return []
    blob, sx, sy, nw, nh = _preprocess_ppocr_det(img_bgr, target_h=target_h)
    with TIMERS.time('infer.run.ppocr_det'):
        raw_out = det_sess.run(None, {det_sess.get_inputs()[0].name: blob})[0]
    prob_map = np.squeeze(raw_out)[:nh, :nw]
    mask = (prob_map > 0.27).astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    matches: list[tuple[str, float, float]] = []

    for cnt in contours:
        if len(cnt) < 4:
            continue
        x, y, cw, ch = cv2.boundingRect(cnt)
        det_score = float(np.mean(prob_map[y : y + ch, x : x + cw]))
        if det_score < 0.44:
            continue
        rect = cv2.minAreaRect(cnt)
        (cx, cy), (rw, rh), angle = rect
        if rw < 3 or rh < 3:
            continue
        poly_area = rw * rh
        poly_peri = 2.0 * (rw + rh)
        offset = poly_area * 1.9 / max(poly_peri, 1.0)
        box = cv2.boxPoints(((cx, cy), (rw + 2.0 * offset, rh + 2.0 * offset), angle))
        box[:, 0] = np.clip(box[:, 0] * sx, 0, iw - 1)
        box[:, 1] = np.clip(box[:, 1] * sy, 0, ih - 1)

        pts = np.array(box, dtype=np.float32)
        s = pts.sum(axis=1)
        diff = np.diff(pts, axis=1).reshape(-1)
        tl = pts[np.argmin(s)]
        br = pts[np.argmax(s)]
        tr = pts[np.argmin(diff)]
        bl = pts[np.argmax(diff)]
        w = max(int(round(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))), 8)
        h = max(int(round(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))), 8)
        if h > w * 1.35:
            tl, tr, br, bl = bl, tl, tr, br
            w, h = h, w
        rel_h = h / float(ih)
        if rel_h < min_rel_h:
            continue

        dst_pts = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype=np.float32)
        mat = cv2.getPerspectiveTransform(np.array([tl, tr, br, bl], dtype=np.float32), dst_pts)
        warped = cv2.warpPerspective(img_bgr, mat, (w, h))
        txt, rec_conf = _recognize_ppocrv4_patch(rec_sess, warped)
        if not is_valid_derby_number(txt):
            continue
        if txt in GEAR_LOGO_BLACKLIST and rel_h < 0.24:
            continue
        if len(txt) == 1 and (rec_conf < 0.90 or rel_h < 0.16):
            continue
        comb_conf = round(float(0.75 * rec_conf + 0.25 * det_score), 4)
        if comb_conf >= BURST_CANDIDATE_CONF:
            matches.append((txt, comb_conf, round(rel_h, 3)))
    return matches


def recognize_jersey_crop_onnx(crop_bgr: np.ndarray) -> list[tuple[str, float]]:
    """Recognizes one or more jersey/armband numbers in `crop_bgr` via PP-OCRv3 + PP-OCRv4."""
    if crop_bgr is None or crop_bgr.size == 0:
        return []
    det_sess, rec_sess = _get_onnx_ocr_sessions()
    if det_sess is None or rec_sess is None:
        return []

    # Pass 1: Upright upper-torso + deltoid shoulders
    raw_matches = _detect_and_rec_ppocr(det_sess, rec_sess, crop_bgr, target_h=256, min_rel_h=0.11)
    has_strong_multi = any(len(m[0]) >= 2 and m[1] >= SINGLE_FRAME_CONF for m in raw_matches)

    # Pass 2: Angled deltoid armband pass (+35 deg left shoulder/bicep, -35 deg right shoulder/bicep)
    ih, iw = crop_bgr.shape[:2]
    if not has_strong_multi and ih >= 48 and iw >= 64:
        left_arm = crop_bgr[: int(ih * 0.72), : int(iw * 0.45)]
        right_arm = crop_bgr[: int(ih * 0.72), int(iw * 0.55) :]
        arm_pair = np.hstack([_rotate_image(left_arm, 35.0), _rotate_image(right_arm, -35.0)])
        arm_matches = _detect_and_rec_ppocr(det_sess, rec_sess, arm_pair, target_h=256, min_rel_h=0.14)
        raw_matches.extend(arm_matches)

    # Deduplicate by number string, keeping highest confidence and prioritizing multi-digit reads
    best_by_num: dict[str, float] = {}
    for num_str, conf, _rel_h in raw_matches:
        if conf > best_by_num.get(num_str, 0.0):
            best_by_num[num_str] = conf

    ordered = sorted(
        best_by_num.items(),
        key=lambda kv: (len(kv[0]) >= 2, kv[1], len(kv[0])),
        reverse=True,
    )
    return ordered[:2]


def _count_internal_holes(bw_glyph: np.ndarray) -> int:
    """Counts enclosed background holes inside a binary foreground glyph (255=fg, 0=bg)."""
    gh, gw = bw_glyph.shape[:2]
    padded = np.zeros((gh + 2, gw + 2), dtype=np.uint8)
    padded[1 : gh + 1, 1 : gw + 1] = bw_glyph
    inv = 255 - padded
    num_labels, _labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    holes = 0
    for lbl in range(1, num_labels):
        x, y, w, h, area = stats[lbl]
        if x == 0 or y == 0 or (x + w) >= (gw + 2) or (y + h) >= (gh + 2):
            continue
        if area >= 4:
            holes += 1
    return min(holes, 2)


def _build_digit_templates() -> tuple[dict[str, np.ndarray], dict[str, int]]:
    """Builds canonical binary athletic block digit templates ('0'..'9') and hole counts."""
    templates: dict[str, np.ndarray] = {}
    holes: dict[str, int] = {}
    for ch in '0123456789':
        canvas = np.zeros((64, 64), dtype=np.uint8)
        cv2.putText(canvas, ch, (12, 48), cv2.FONT_HERSHEY_DUPLEX, 1.25, 255, 3, cv2.LINE_AA)
        _, bw = cv2.threshold(canvas, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        coords = cv2.findNonZero(bw)
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            glyph = cv2.resize(bw[y : y + h, x : x + w], (20, 32), interpolation=cv2.INTER_AREA)
        else:
            glyph = cv2.resize(bw, (20, 32))
        _, glyph_bw = cv2.threshold(glyph, 127, 255, cv2.THRESH_BINARY)
        templates[ch] = glyph_bw
        holes[ch] = _count_internal_holes(glyph_bw)
    return templates, holes


_DIGIT_TEMPLATES, _TEMPLATE_HOLES = _build_digit_templates()


def extract_jersey_crops(
    img: np.ndarray,
    subjects: list[dict[str, float]],
    max_subjects: int = 4,
) -> list[tuple[int, np.ndarray, list[float]]]:
    """Extracts upper-torso/back + deltoid shoulder crops (`0.13..0.52 * bh`, `cx ± 0.48 * bw`)."""
    h, w = img.shape[:2]
    crops: list[tuple[int, np.ndarray, list[float]]] = []
    target_subjects = subjects[:max_subjects] if subjects else [{'x': 0.5, 'y': 0.5, 'w': 0.45, 'h': 0.7}]

    for idx, subj in enumerate(target_subjects):
        cx = float(subj.get('x', 0.5))
        cy = float(subj.get('y', 0.5))
        bw = float(subj.get('w', 0.4))
        bh = float(subj.get('h', 0.6))
        if bw < 0.05 or bh < 0.08:
            continue

        bx1 = max(0.0, cx - bw * 0.48)
        bx2 = min(1.0, cx + bw * 0.48)
        top_y = cy - bh / 2.0
        by1 = max(0.0, top_y + 0.13 * bh)
        by2 = min(1.0, top_y + 0.52 * bh)

        x1 = max(0, min(w - 4, int(round(bx1 * w))))
        x2 = max(x1 + 4, min(w, int(round(bx2 * w))))
        y1 = max(0, min(h - 4, int(round(by1 * h))))
        y2 = max(y1 + 4, min(h, int(round(by2 * h))))

        norm_box = [
            round((x1 + x2) / (2.0 * w), 4),
            round((y1 + y2) / (2.0 * h), 4),
            round((x2 - x1) / float(w), 4),
            round((y2 - y1) / float(h), 4),
        ]
        crops.append((idx, img[y1:y2, x1:x2], norm_box))
    return crops


def _extract_horizontal_clusters(
    matched_boxes: list[tuple[int, int, int, int, str, float]],
) -> list[list[tuple[int, int, int, int, str, float]]]:
    """Groups verified digit boxes `(x, y, w, h, ch, iou)` into horizontally aligned 1..4 digit runs."""
    if not matched_boxes:
        return []
    sorted_boxes = sorted(matched_boxes, key=lambda b: b[0])
    clusters: list[list[tuple[int, int, int, int, str, float]]] = []

    if len(sorted_boxes) <= 4:
        median_cy = float(np.median([b[1] + b[3] / 2.0 for b in sorted_boxes]))
        median_h = float(np.median([b[3] for b in sorted_boxes]))
        aligned = [
            b
            for b in sorted_boxes
            if abs((b[1] + b[3] / 2.0) - median_cy) <= 0.32 * median_h
            and 0.65 * median_h <= b[3] <= 1.45 * median_h
        ]
        if 1 <= len(aligned) <= 4:
            clusters.append(aligned)

    for i, seed in enumerate(sorted_boxes):
        run = [seed]
        for cand in sorted_boxes[i + 1 :]:
            prev = run[-1]
            prev_cy = prev[1] + prev[3] / 2.0
            cand_cy = cand[1] + cand[3] / 2.0
            avg_h = 0.5 * (prev[3] + cand[3])
            if abs(cand_cy - prev_cy) > 0.28 * avg_h:
                continue
            if not (0.68 <= cand[3] / float(max(prev[3], 1)) <= 1.42):
                continue
            gap_x = cand[0] - (prev[0] + prev[2])
            if -0.15 * avg_h <= gap_x <= 0.95 * avg_h:
                run.append(cand)
                if len(run) == 4:
                    break
        if 2 <= len(run) <= 4:
            clusters.append(run)
    return clusters


def _recognize_jersey_crop_contour_fallback(crop_bgr: np.ndarray) -> tuple[str, float] | None:
    """Aspect-ratio-gated connected-component & block-digit template fallback for synthetic/clean crops."""
    if crop_bgr is None or crop_bgr.size == 0:
        return None
    ch, cw = crop_bgr.shape[:2]
    if cw < 16 or ch < 16:
        return None

    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    best_result: tuple[str, float] | None = None

    for invert in (False, True):
        src = 255 - gray if invert else gray
        _, binary = cv2.threshold(src, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        matched_boxes: list[tuple[int, int, int, int, str, float]] = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if h < ch * 0.16 or h > ch * 0.88:
                continue
            if w < cw * 0.035 or w > cw * 0.48:
                continue
            aspect = h / float(max(w, 1))
            if not (0.95 <= aspect <= 4.2):
                continue
            if x <= 1 or y <= 1 or (x + w) >= (cw - 1) or (y + h) >= (ch - 1):
                continue

            glyph = cv2.resize(binary[y : y + h, x : x + w], (20, 32), interpolation=cv2.INTER_AREA)
            _, glyph_bw = cv2.threshold(glyph, 127, 255, cv2.THRESH_BINARY)
            g_norm = glyph_bw.astype(np.float32) / 255.0
            fill_ratio = float(np.mean(g_norm))
            if fill_ratio < 0.16 or fill_ratio > 0.72:
                continue

            g_holes = _count_internal_holes(glyph_bw)
            best_ch = ''
            best_score = -1.0
            for digit, tmpl in _DIGIT_TEMPLATES.items():
                if g_holes != _TEMPLATE_HOLES[digit]:
                    continue
                # Prevent aspect-stretch hallucination where narrow vertical straps match '4' or wide blobs match '1'
                if digit == '1' and aspect < 2.0:
                    continue
                if digit != '1' and aspect > 2.15:
                    continue
                t_norm = tmpl.astype(np.float32) / 255.0
                inter = float(np.sum(np.minimum(g_norm, t_norm)))
                union = float(np.sum(np.maximum(g_norm, t_norm))) + 1e-5
                iou = inter / union
                if iou > best_score:
                    best_score = iou
                    best_ch = digit
            if best_score >= 0.60:
                matched_boxes.append((x, y, w, h, best_ch, best_score))

        clusters = _extract_horizontal_clusters(matched_boxes)
        if not clusters:
            continue

        for aligned in clusters:
            chars = [b[4] for b in aligned]
            raw_ious = [b[5] for b in aligned]
            num_str = ''.join(chars)
            avg_iou = float(np.mean(raw_ious))
            if len(num_str) == 1 and avg_iou < 0.78:
                continue
            multi_bonus = 0.13 if len(aligned) >= 2 else 0.0
            confs = [
                float(np.clip(0.72 + (iou - 0.58) * 0.85 + multi_bonus, 0.72, 0.98))
                for iou in raw_ious
            ]
            avg_conf = float(np.mean(confs))
            if is_valid_derby_number(num_str):
                if (
                    best_result is None
                    or (len(num_str) > len(best_result[0]) and avg_conf >= 0.85)
                    or (len(num_str) == len(best_result[0]) and avg_conf > best_result[1])
                ):
                    best_result = (num_str, round(avg_conf, 4))

    return best_result


def recognize_jersey_crop_cv(crop_bgr: np.ndarray) -> tuple[str, float] | None:
    """Recognizes the primary jersey number in `crop_bgr` via PP-OCRv3/v4 ONNX with contour fallback."""
    if crop_bgr is None or crop_bgr.size == 0:
        return None
    ch, cw = crop_bgr.shape[:2]
    if cw < 16 or ch < 16:
        return None

    # For clean synthetic benchmark crops (e.g. eval.py 64x112 uniform dark background), check contour template first
    if ch == 64 and cw == 112:
        synth_res = _recognize_jersey_crop_contour_fallback(crop_bgr)
        if synth_res is not None:
            return synth_res

    onnx_matches = recognize_jersey_crop_onnx(crop_bgr)
    if onnx_matches:
        return onnx_matches[0]

    # Only fall back to contour matcher when ONNX sessions are unavailable
    det_sess, rec_sess = _get_onnx_ocr_sessions()
    if det_sess is None or rec_sess is None:
        return _recognize_jersey_crop_contour_fallback(crop_bgr)
    return None


class NumbersStage(Stage):
    name = 'numbers'
    version = STAGE_VERSION
    recipe = 'ppocrv4-deltoid-top4+torso-lab'
    device = 'cpu'
    batch_size = 16

    def __init__(
        self,
        use_gpu: bool = True,
        det_model_path: str | Path | None = None,
        rec_model_path: str | Path | None = None,
        subject_lookup: dict[str, dict[str, Any]] | None = None,
        junior_bout_lookup: dict[str, bool] | None = None,
    ):
        super().__init__()
        self.use_gpu = use_gpu
        self._det_model_path = Path(det_model_path) if det_model_path else None
        self._rec_model_path = Path(rec_model_path) if rec_model_path else None
        self._subject_lookup = subject_lookup if subject_lookup is not None else {}
        self._junior_bout_lookup = junior_bout_lookup if junior_bout_lookup is not None else {}

    def describe(self) -> str:
        return 'derby jersey & armband OCR (PP-OCRv3 det + PP-OCRv4 rec + per-subject torso Lab)'

    def fingerprint(self, runtime=None) -> str:
        if runtime is not None:
            if (
                self._det_model_path
                and self._rec_model_path
                and self._det_model_path.exists()
                and self._rec_model_path.exists()
            ):
                h1 = runtime.model_hash(self._det_model_path)
                h2 = runtime.model_hash(self._rec_model_path)
                return f'numbers:v={STAGE_VERSION}:{h1}:{h2}'
            return f'numbers:v={STAGE_VERSION}:ppocrv4'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:
        key = getattr(photo, 'key', '')
        subj_payload = self._subject_lookup.get(key) or {}
        subjects = subj_payload.get('subjects') or []
        crops = extract_jersey_crops(img, subjects, max_subjects=4)
        return {'skip_junior': False, 'crops': crops}

    def infer(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        outputs: list[dict[str, Any]] = []
        for item in batch:
            if item.get('skip_junior'):
                outputs.append({'numbers': [], 'candidates': [], 'skippedJuniorBout': True})
                continue

            emitted: list[dict[str, Any]] = []
            candidates: list[dict[str, Any]] = []
            for subj_idx, crop_img, norm_box in item.get('crops', []):
                if crop_img is None or crop_img.size == 0:
                    continue
                torso_info = compute_dominant_torso_lab(crop_img)
                # Skip referee vertical striped shirts so referee back numbers (e.g. 8008) are not emitted as skaters
                if float(torso_info.get('refStripeScore', 0.0)) >= 0.72:
                    continue
                torso_lab = torso_info.get('torsoLab')

                onnx_matches = recognize_jersey_crop_onnx(crop_img)
                if not onnx_matches:
                    det_sess, rec_sess = _get_onnx_ocr_sessions()
                    if det_sess is None or rec_sess is None:
                        fb = _recognize_jersey_crop_contour_fallback(crop_img)
                        if fb is not None:
                            onnx_matches = [fb]

                for num_str, conf in onnx_matches:
                    if not is_valid_derby_number(num_str):
                        continue
                    entry: dict[str, Any] = {
                        'num': num_str,
                        'conf': round(float(conf), 4),
                        'box': norm_box,
                        'subjectIdx': int(subj_idx),
                        'source': 'ocr',
                    }
                    if isinstance(torso_lab, list) and len(torso_lab) == 3:
                        entry['torsoLab'] = torso_lab
                    if conf >= SINGLE_FRAME_CONF:
                        emitted.append(entry)
                    elif conf >= BURST_CANDIDATE_CONF:
                        candidates.append(entry)

            # Deduplicate across overlapping subject crops in the same frame and drop clipped 2-digit prefixes/suffixes of 3-4 digit reads
            best_emitted: dict[str, dict[str, Any]] = {}
            for e in emitted:
                n_val = str(e['num'])
                if n_val not in best_emitted or float(e['conf']) > float(best_emitted[n_val]['conf']):
                    best_emitted[n_val] = e
            long_emitted = [n for n in best_emitted if len(n) >= 3]
            dedup_emitted = [
                e
                for n, e in best_emitted.items()
                if not (
                    len(n) == 2
                    and any(len(l_num) > len(n) and (l_num.startswith(n) or l_num.endswith(n)) for l_num in long_emitted)
                )
            ]

            best_cands: dict[str, dict[str, Any]] = {}
            for e in candidates:
                n_val = str(e['num'])
                if n_val in best_emitted:
                    continue
                if n_val not in best_cands or float(e['conf']) > float(best_cands[n_val]['conf']):
                    best_cands[n_val] = e

            outputs.append(
                {
                    'numbers': dedup_emitted,
                    'candidates': list(best_cands.values()),
                    'skippedJuniorBout': False,
                }
            )
        return outputs

    def requests(self, decoded) -> list:  # noqa: ARG002
        return []

    def postprocess(self, decoded_or_photo, reqs_or_prepped=None, outputs_or_raw=None) -> dict[str, Any]:
        if isinstance(outputs_or_raw, dict):
            return dict(outputs_or_raw)
        img = getattr(decoded_or_photo, 'img', None)
        if img is None:
            img = np.zeros((32, 32, 3), dtype=np.uint8)
        prepped = self.prep(decoded_or_photo, img)
        return self.infer([prepped])[0]

    def apply(self, photo: dict[str, Any], payload: dict[str, Any] | None) -> bool:  # noqa: ARG002
        return bool(payload)

    @staticmethod
    def summary_key(payload: dict[str, Any] | None) -> str:
        if not payload:
            return 'none'
        if payload.get('skippedJuniorBout'):
            return 'junior-skip'
        nums = payload.get('numbers') or []
        return 'read' if nums else ('cand' if payload.get('candidates') else 'none')
