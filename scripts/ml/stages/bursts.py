"""Burst deduplication (64-bit dHash) and composite frame quality scoring stage.

Computes per-photo:
  - dhash: 16-char hex (64-bit difference hash on 9x8 grayscale resize)
  - subjectSharpness: [0..1] Laplacian variance on primary subject/face region
  - faceFrontalSymmetry: [0..1] bilateral luminance symmetry of primary face/head region
  - exposureBalance: [0..1] well-exposed pixel fraction minus clipping penalty
  - eyesOpenScore: [0..1] eye-band vertical/horizontal contrast energy ratio
  - qualityScore = 0.45 * subjectSharpness
                 + 0.25 * faceFrontalSymmetry
                 + 0.20 * exposureBalance
                 + 0.10 * eyesOpenScore
"""
from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from ..stage import Stage

STAGE_VERSION = 1


def compute_dhash_hex(gray: np.ndarray) -> str:
    """Computes a 64-bit horizontal difference hash as a 16-char lowercase hex string."""
    resized = cv2.resize(gray, (9, 8), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    bits = diff.flatten()
    val = 0
    for b in bits:
        val = (val << 1) | int(bool(b))
    return f'{val:016x}'


def hamming_distance_hex(h1: str, h2: str) -> int:
    """Returns the bit Hamming distance between two 16-char hex dHashes."""
    try:
        return (int(h1, 16) ^ int(h2, 16)).bit_count()
    except ValueError:
        return 64


def _crop_norm_box(
    img: np.ndarray,
    box: dict[str, float] | None,
    default_box: tuple[float, float, float, float] = (0.5, 0.5, 0.6, 0.6),
) -> np.ndarray:
    h, w = img.shape[:2]
    if box and 'x' in box and 'y' in box:
        cx = float(box.get('x', 0.5))
        cy = float(box.get('y', 0.5))
        bw = float(box.get('w', 0.35))
        bh = float(box.get('h', 0.5))
    else:
        cx, cy, bw, bh = default_box

    x1 = max(0, min(w - 2, int(round((cx - bw / 2.0) * w))))
    y1 = max(0, min(h - 2, int(round((cy - bh / 2.0) * h))))
    x2 = max(x1 + 2, min(w, int(round((cx + bw / 2.0) * w))))
    y2 = max(y1 + 2, min(h, int(round((cy + bh / 2.0) * h))))
    return img[y1:y2, x1:x2]


class BurstsStage(Stage):
    name = 'bursts'
    version = STAGE_VERSION
    recipe = 'dhash64+quality-v1'
    device = 'cpu'
    batch_size = 1

    def __init__(self, use_gpu: bool = True, subject_lookup: dict[str, dict[str, Any]] | None = None):
        super().__init__()
        self.use_gpu = use_gpu
        self._subject_lookup = subject_lookup if subject_lookup is not None else {}

    def describe(self) -> str:
        return 'dhash64 + composite sharpness/symmetry/exposure/eyes quality (CPU)'

    def fingerprint(self, runtime=None) -> str:
        if runtime is not None:
            return f'bursts:v={STAGE_VERSION}'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:
        key = getattr(photo, 'key', '')
        subj_payload = self._subject_lookup.get(key) or {}
        subjects = subj_payload.get('subjects') or []
        faces = subj_payload.get('faces') or []

        primary_subject = subjects[0] if subjects else None
        primary_face = faces[0] if faces else None

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
        dhash = compute_dhash_hex(gray)

        # 1. Subject sharpness via Laplacian variance on primary subject (or central region)
        subj_crop = _crop_norm_box(gray, primary_subject or primary_face)
        lap_var = float(cv2.Laplacian(subj_crop, cv2.CV_64F).var())
        subject_sharpness = float(np.clip(lap_var / (lap_var + 220.0), 0.0, 1.0))

        # 2. Face frontal symmetry & eyes open score
        if primary_face and primary_face.get('w', 0) > 0.01 and primary_face.get('h', 0) > 0.01:
            face_crop = _crop_norm_box(gray, primary_face)
        elif primary_subject:
            head_box = {
                'x': float(primary_subject.get('x', 0.5)),
                'y': max(0.08, float(primary_subject.get('y', 0.5)) - float(primary_subject.get('h', 0.5)) * 0.36),
                'w': max(0.08, float(primary_subject.get('w', 0.3)) * 0.45),
                'h': max(0.08, float(primary_subject.get('h', 0.5)) * 0.25),
            }
            face_crop = _crop_norm_box(gray, head_box)
        else:
            face_crop = _crop_norm_box(gray, None, default_box=(0.5, 0.35, 0.25, 0.25))

        fh, fw = face_crop.shape[:2]
        if fw >= 6 and fh >= 6:
            half_w = fw // 2
            left_half = face_crop[:, :half_w].astype(np.float32)
            right_half = cv2.flip(face_crop[:, fw - half_w :], 1).astype(np.float32)
            mad = float(np.mean(np.abs(left_half - right_half))) / 255.0
            face_frontal_symmetry = float(np.clip(1.0 - mad * 2.2, 0.0, 1.0))

            ey1 = max(0, int(fh * 0.22))
            ey2 = max(ey1 + 2, min(fh, int(fh * 0.55)))
            eye_band = face_crop[ey1:ey2, :]
            gy = cv2.Sobel(eye_band, cv2.CV_32F, 0, 1, ksize=3)
            eye_energy = float(np.mean(np.abs(gy)))
            eyes_open_score = float(np.clip(eye_energy / (eye_energy + 18.0), 0.15, 1.0))
        else:
            face_frontal_symmetry = 0.5
            eyes_open_score = 0.5

        # 3. Exposure balance on primary subject crop
        subj_f = subj_crop.astype(np.float32)
        well_exposed = float(np.mean((subj_f >= 18.0) & (subj_f <= 238.0)))
        clipped = float(np.mean((subj_f < 8.0) | (subj_f > 248.0)))
        exposure_balance = float(np.clip(well_exposed - 0.5 * clipped, 0.0, 1.0))

        quality_score = (
            0.45 * subject_sharpness
            + 0.25 * face_frontal_symmetry
            + 0.20 * exposure_balance
            + 0.10 * eyes_open_score
        )

        return {
            'dhash': dhash,
            'subjectSharpness': round(subject_sharpness, 4),
            'faceFrontalSymmetry': round(face_frontal_symmetry, 4),
            'exposureBalance': round(exposure_balance, 4),
            'eyesOpenScore': round(eyes_open_score, 4),
            'qualityScore': round(float(np.clip(quality_score, 0.0, 1.0)), 4),
        }

    def infer(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return batch

    def requests(self, decoded) -> list:  # noqa: ARG002
        return []

    def postprocess(self, decoded_or_photo, reqs_or_prepped=None, outputs_or_raw=None) -> dict[str, Any]:
        if isinstance(outputs_or_raw, dict):
            return dict(outputs_or_raw)
        return self.prep(decoded_or_photo, decoded_or_photo.img)

    def apply(self, photo: dict[str, Any], payload: dict[str, Any] | None) -> bool:
        if not payload:
            photo.pop('qualityScore', None)
            return False
        if 'qualityScore' in payload:
            photo['qualityScore'] = payload['qualityScore']
        return True

    @staticmethod
    def summary_key(payload: dict[str, Any] | None) -> str:
        if not payload:
            return 'none'
        q = float(payload.get('qualityScore', 0.0))
        return 'high' if q >= 0.65 else ('mid' if q >= 0.40 else 'low')
