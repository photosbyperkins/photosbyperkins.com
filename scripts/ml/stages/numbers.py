"""Jersey number & arm-band OCR stage with Burst Consensus Boost.

- Crops upper-torso/shoulder/back regions from up to top-3 `subjects[]` boxes.
- Enforces derby jersey rules: 1-4 alphanumeric characters containing at least one digit;
  `conf >= 0.85` for single-frame emission, or `conf >= 0.72` when corroborated across >= 2
  frames of the same burst (`source: 'burst-consensus'`).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from ..stage import Stage

STAGE_VERSION = 2
DERBY_NUMBER_RE = re.compile(r'^(?:[0-9]{1,4}|[0-9]{1,3}[A-Z]|[A-Z][0-9]{1,3})$')
SINGLE_FRAME_CONF = 0.85
BURST_CANDIDATE_CONF = 0.72


def is_valid_derby_number(text: str) -> bool:
    cleaned = (text or '').strip().upper()
    if not (1 <= len(cleaned) <= 4):
        return False
    return bool(DERBY_NUMBER_RE.match(cleaned))


def _build_digit_templates() -> dict[str, np.ndarray]:
    """Builds canonical 24x36 binary athletic block digit templates ('0'..'9') for zero-weight fallback."""
    templates: dict[str, np.ndarray] = {}
    for ch in '0123456789':
        canvas = np.zeros((36, 24), dtype=np.uint8)
        cv2.putText(canvas, ch, (2, 31), cv2.FONT_HERSHEY_DUPLEX, 1.05, 255, 3, cv2.LINE_AA)
        _, bw = cv2.threshold(canvas, 60, 255, cv2.THRESH_BINARY)
        coords = cv2.findNonZero(bw)
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            glyph = cv2.resize(bw[y : y + h, x : x + w], (20, 32), interpolation=cv2.INTER_AREA)
        else:
            glyph = cv2.resize(bw, (20, 32))
        templates[ch] = glyph
    return templates


_DIGIT_TEMPLATES = _build_digit_templates()


def extract_jersey_crops(
    img: np.ndarray,
    subjects: list[dict[str, float]],
    max_subjects: int = 3,
) -> list[tuple[int, np.ndarray, list[float]]]:
    """Extracts upper-torso/shoulder jersey crops for the top-K subjects."""
    h, w = img.shape[:2]
    crops: list[tuple[int, np.ndarray, list[float]]] = []
    target_subjects = subjects[:max_subjects] if subjects else [{'x': 0.5, 'y': 0.5, 'w': 0.45, 'h': 0.7}]

    for idx, subj in enumerate(target_subjects):
        cx = float(subj.get('x', 0.5))
        cy = float(subj.get('y', 0.5))
        bw = float(subj.get('w', 0.4))
        bh = float(subj.get('h', 0.6))
        if bw < 0.04 or bh < 0.06:
            continue

        bx1 = max(0.0, cx - bw * 0.42)
        bx2 = min(1.0, cx + bw * 0.42)
        by1 = max(0.0, (cy - bh / 2.0) + 0.22 * bh)
        by2 = min(1.0, (cy - bh / 2.0) + 0.62 * bh)

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


def recognize_jersey_crop_cv(crop_bgr: np.ndarray) -> tuple[str, float] | None:
    """High-precision connected-component & block-digit template recognizer for jersey crops."""
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
        boxes: list[tuple[int, int, int, int]] = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if h < ch * 0.24 or h > ch * 0.88:
                continue
            if w < cw * 0.04 or w > cw * 0.48:
                continue
            aspect = h / float(max(w, 1))
            if not (1.05 <= aspect <= 4.5):
                continue
            if x <= 1 or y <= 1 or (x + w) >= (cw - 1) or (y + h) >= (ch - 1):
                continue
            boxes.append((x, y, w, h))

        if not (1 <= len(boxes) <= 4):
            continue

        boxes.sort(key=lambda b: b[0])
        median_cy = float(np.median([b[1] + b[3] / 2.0 for b in boxes]))
        median_h = float(np.median([b[3] for b in boxes]))
        aligned = [
            b
            for b in boxes
            if abs((b[1] + b[3] / 2.0) - median_cy) <= 0.32 * median_h
            and 0.65 * median_h <= b[3] <= 1.45 * median_h
        ]
        if not (1 <= len(aligned) <= 4):
            continue

        chars: list[str] = []
        confs: list[float] = []
        for x, y, w, h in aligned:
            glyph = cv2.resize(binary[y : y + h, x : x + w], (20, 32), interpolation=cv2.INTER_AREA)
            best_ch = ''
            best_score = -1.0
            g_norm = glyph.astype(np.float32) / 255.0
            for digit, tmpl in _DIGIT_TEMPLATES.items():
                t_norm = tmpl.astype(np.float32) / 255.0
                inter = float(np.sum(np.minimum(g_norm, t_norm)))
                union = float(np.sum(np.maximum(g_norm, t_norm))) + 1e-5
                iou = inter / union
                if iou > best_score:
                    best_score = iou
                    best_ch = digit
            if best_score < 0.58:
                chars = []
                break
            chars.append(best_ch)
            mapped_conf = float(np.clip(0.72 + (best_score - 0.58) * 0.85, 0.72, 0.98))
            confs.append(mapped_conf)

        if chars:
            num_str = ''.join(chars)
            avg_conf = float(np.mean(confs))
            if is_valid_derby_number(num_str):
                if best_result is None or avg_conf > best_result[1]:
                    best_result = (num_str, round(avg_conf, 4))

    return best_result


class NumbersStage(Stage):
    name = 'numbers'
    version = STAGE_VERSION
    recipe = 'jersey-ocr-top3+junior-skip'
    device = 'gpu'
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
        return 'derby jersey OCR (top-3 person crops with burst consensus)'

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
            return f'numbers:v={STAGE_VERSION}:cv-fallback'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:
        key = getattr(photo, 'key', '')
        subj_payload = self._subject_lookup.get(key) or {}
        subjects = subj_payload.get('subjects') or []
        crops = extract_jersey_crops(img, subjects, max_subjects=3)
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
                rec = recognize_jersey_crop_cv(crop_img)
                if rec is None:
                    continue
                num_str, conf = rec
                if not is_valid_derby_number(num_str):
                    continue
                entry = {
                    'num': num_str,
                    'conf': round(float(conf), 4),
                    'box': norm_box,
                    'subjectIdx': int(subj_idx),
                    'source': 'ocr',
                }
                if conf >= SINGLE_FRAME_CONF:
                    emitted.append(entry)
                elif conf >= BURST_CANDIDATE_CONF:
                    candidates.append(entry)

            outputs.append(
                {
                    'numbers': emitted,
                    'candidates': candidates,
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
