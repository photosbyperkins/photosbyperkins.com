"""Skater role & helmet-cover classifier stage ('jammer' | 'pivot' | 'blocker' | 'ref').

Crops the head/helmet region expanded 1.4x above the primary face/person top.
Uses ONNX Runtime (dynamic batch N=16) when `models/roles_yolov11s.onnx` is present,
with a high-precision contour & stripe computer-vision fallback so the pipeline runs
end-to-end out of the box and in zero-network CI.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from ..stage import Stage

STAGE_VERSION = 2
ROLE_CLASSES = ('jammer', 'pivot', 'blocker', 'ref', 'spectator')


def extract_helmet_crop(
    img: np.ndarray,
    primary_face: dict[str, float] | None,
    primary_subject: dict[str, float] | None,
) -> tuple[np.ndarray, dict[str, float]]:
    """Crops the full helmet + head shell (3.0x face width / 0.70x subject width) so jammer stars and pivot stripes are never clipped."""
    h, w = img.shape[:2]
    has_face = bool(primary_face and primary_face.get('w', 0) > 0.015 and primary_face.get('h', 0) > 0.015)
    has_subj = bool(primary_subject and primary_subject.get('w', 0) > 0.02 and primary_subject.get('h', 0) > 0.02)

    if has_face and primary_face is not None:
        fx = float(primary_face['x'])
        fy = float(primary_face['y'])
        fw = float(primary_face['w'])
        fh = float(primary_face['h'])
        sw = float(primary_subject['w']) if has_subj and primary_subject is not None else 0.0
        sh = float(primary_subject['h']) if has_subj and primary_subject is not None else 0.0
        crop_w = min(1.0, max(fw * 3.0, sw * 0.65, 0.16))
        crop_h = min(1.0, max(fh * 2.8, sh * 0.34, 0.16))
        cx = fx
        cy = min(1.0 - crop_h / 2.0, max(crop_h / 2.0, fy - fh * 0.45))
    elif has_subj and primary_subject is not None:
        sx = float(primary_subject['x'])
        sy = float(primary_subject['y'])
        sw = float(primary_subject['w'])
        sh = float(primary_subject['h'])
        top_y = max(0.0, sy - sh / 2.0 - sh * 0.04)
        crop_w = min(1.0, max(sw * 0.72, 0.18))
        crop_h = min(1.0, max(sh * 0.36, 0.18))
        cx = sx
        cy = min(1.0 - crop_h / 2.0, max(crop_h / 2.0, top_y + crop_h * 0.45))
    else:
        cx, cy, crop_w, crop_h = 0.5, 0.26, 0.32, 0.32

    x1 = max(0, min(w - 2, int(round((cx - crop_w / 2.0) * w))))
    x2 = max(x1 + 2, min(w, int(round((cx + crop_w / 2.0) * w))))
    y1 = max(0, min(h - 2, int(round((cy - crop_h / 2.0) * h))))
    y2 = max(y1 + 2, min(h, int(round((cy + crop_h / 2.0) * h))))

    norm_box = {
        'x': round((x1 + x2) / (2.0 * w), 4),
        'y': round((y1 + y2) / (2.0 * h), 4),
        'w': round((x2 - x1) / float(w), 4),
        'h': round((y2 - y1) / float(h), 4),
    }
    return img[y1:y2, x1:x2], norm_box


def extract_role_crop(
    img: np.ndarray,
    primary_face: dict[str, float] | None,
    primary_subject: dict[str, float] | None,
) -> tuple[np.ndarray, dict[str, float]]:
    """Crops the combined Helmet + Head + Upper-Torso (Shoulders & Chest) region.

    Includes generous margin above and around the helmet (for jammer stars & pivot stripes)
    AND extends down through the shoulders and chest so blockers (team jersey), referees
    (black-and-white stripes), and spectators/coaches (no helmet / street clothes) are
    clearly distinguishable in a single crop.
    """
    h, w = img.shape[:2]
    has_face = bool(primary_face and primary_face.get('w', 0) > 0.015 and primary_face.get('h', 0) > 0.015)
    has_subj = bool(primary_subject and primary_subject.get('w', 0) > 0.02 and primary_subject.get('h', 0) > 0.02)

    if has_face and primary_face is not None:
        fx = float(primary_face['x'])
        fy = float(primary_face['y'])
        fw = float(primary_face['w'])
        fh = float(primary_face['h'])
        if has_subj and primary_subject is not None:
            sx = float(primary_subject['x'])
            sy = float(primary_subject['y'])
            sw = float(primary_subject['w'])
            sh = float(primary_subject['h'])
            subj_top = sy - sh / 2.0
            y_top = max(0.0, min(fy - fh * 1.55, subj_top - sh * 0.06))
            y_bot = min(1.0, max(fy + fh * 2.45, subj_top + sh * 0.62))
            crop_w = min(1.0, max(fw * 3.8, sw * 0.85, 0.24))
            cx = 0.65 * fx + 0.35 * sx
        else:
            y_top = max(0.0, fy - fh * 1.55)
            y_bot = min(1.0, fy + fh * 2.55)
            crop_w = min(1.0, max(fw * 3.8, 0.24))
            cx = fx
        crop_h = max(0.22, y_bot - y_top)
        cy = min(1.0 - crop_h / 2.0, max(crop_h / 2.0, 0.5 * (y_top + y_bot)))
    elif has_subj and primary_subject is not None:
        sx = float(primary_subject['x'])
        sy = float(primary_subject['y'])
        sw = float(primary_subject['w'])
        sh = float(primary_subject['h'])
        subj_top = sy - sh / 2.0
        y_top = max(0.0, subj_top - sh * 0.06)
        y_bot = min(1.0, subj_top + max(sh * 0.65, 0.26))
        crop_w = min(1.0, max(sw * 0.88, 0.24))
        crop_h = max(0.24, y_bot - y_top)
        cx = sx
        cy = min(1.0 - crop_h / 2.0, max(crop_h / 2.0, 0.5 * (y_top + y_bot)))
    else:
        cx, cy, crop_w, crop_h = 0.5, 0.36, 0.42, 0.48

    x1 = max(0, min(w - 2, int(round((cx - crop_w / 2.0) * w))))
    x2 = max(x1 + 2, min(w, int(round((cx + crop_w / 2.0) * w))))
    y1 = max(0, min(h - 2, int(round((cy - crop_h / 2.0) * h))))
    y2 = max(y1 + 2, min(h, int(round((cy + crop_h / 2.0) * h))))

    norm_box = {
        'x': round((x1 + x2) / (2.0 * w), 4),
        'y': round((y1 + y2) / (2.0 * h), 4),
        'w': round((x2 - x1) / float(w), 4),
        'h': round((y2 - y1) / float(h), 4),
    }
    return img[y1:y2, x1:x2], norm_box


def classify_helmet_and_torso_cv(
    helmet_bgr: np.ndarray,
    torso_bgr: np.ndarray | None = None,
    has_subject: bool = True,
) -> tuple[str | None, float]:
    """Deterministic contour & frequency classifier for helmet covers and referee stripes."""
    if torso_bgr is not None and torso_bgr.size > 0:
        t_small = cv2.resize(torso_bgr, (48, 48), interpolation=cv2.INTER_AREA)
        t_lab = cv2.cvtColor(t_small, cv2.COLOR_BGR2LAB).astype(np.float32)
        L = t_lab[:, :, 0] * (100.0 / 255.0)
        a = t_lab[:, :, 1] - 128.0
        b = t_lab[:, :, 2] - 128.0
        chroma = np.hypot(a, b)
        gray_t = cv2.cvtColor(t_small, cv2.COLOR_BGR2GRAY).astype(np.float32)
        gx = float(np.mean(np.abs(cv2.Sobel(gray_t, cv2.CV_32F, 1, 0, ksize=3))))
        gy = float(np.mean(np.abs(cv2.Sobel(gray_t, cv2.CV_32F, 0, 1, ksize=3))))
        low_chroma = float(np.mean(chroma < 11.0))
        bimodal_bw = float(np.mean((L < 26.0) | (L > 76.0)))
        mid_band = np.mean(gray_t[12:36, :], axis=0)
        centered = mid_band - float(np.mean(mid_band))
        zero_crossings = int(np.sum(np.diff(np.sign(centered)) != 0))
        if low_chroma >= 0.72 and bimodal_bw >= 0.50 and gx > gy * 1.55 and zero_crossings >= 5:
            conf = float(np.clip(0.86 + 0.02 * min(zero_crossings - 5, 6), 0.86, 0.98))
            return ('ref', round(conf, 4))

    if helmet_bgr is None or helmet_bgr.size == 0:
        return ('blocker', 0.65) if has_subject else (None, 0.0)

    resized = cv2.resize(helmet_bgr, (96, 96), interpolation=cv2.INTER_AREA)
    crown = resized[:66, 10:86]
    gray = cv2.cvtColor(crown, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)

    best_star_conf = 0.0
    best_stripe_conf = 0.0
    crown_area = float(crown.shape[0] * crown.shape[1])

    for thresh_mode in (cv2.THRESH_BINARY, cv2.THRESH_BINARY_INV):
        _, binary = cv2.threshold(blur, 0, 255, thresh_mode | cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = float(cv2.contourArea(cnt))
            area_frac = area / crown_area
            if area_frac < 0.035 or area_frac > 0.55:
                continue

            peri = float(cv2.arcLength(cnt, True))
            if peri <= 1e-3:
                continue

            hull = cv2.convexHull(cnt)
            hull_area = float(cv2.contourArea(hull))
            solidity = area / max(hull_area, 1.0)
            compactness = (peri * peri) / (4.0 * math.pi * max(area, 1.0))
            approx = cv2.approxPolyDP(cnt, 0.035 * peri, True)
            vertices = len(approx)

            mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.drawContours(mask, [cnt], -1, 255, -1)
            dilated = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)
            ring = cv2.subtract(dilated, mask)
            if np.count_nonzero(mask) < 10 or np.count_nonzero(ring) < 10:
                continue
            contrast = abs(float(np.mean(gray[mask > 0])) - float(np.mean(gray[ring > 0]))) / 255.0
            if contrast < 0.26:
                continue

            if 0.40 <= solidity <= 0.75 and compactness >= 1.85 and 7 <= vertices <= 14:
                score = float(np.clip(0.75 + 0.35 * contrast + 0.04 * min(compactness - 1.85, 3.0), 0.0, 0.98))
                best_star_conf = max(best_star_conf, score)

            rect = cv2.minAreaRect(cnt)
            rw, rh = rect[1]
            if rw > 1.0 and rh > 1.0:
                aspect = max(rw, rh) / min(rw, rh)
                if solidity >= 0.80 and 2.6 <= aspect <= 8.5 and area_frac >= 0.05:
                    score = float(np.clip(0.74 + 0.32 * contrast + 0.03 * min(aspect - 2.6, 3.0), 0.0, 0.96))
                    best_stripe_conf = max(best_stripe_conf, score)

    if best_star_conf >= 0.85 and best_star_conf >= best_stripe_conf:
        return ('jammer', round(best_star_conf, 4))
    if best_stripe_conf >= 0.85:
        return ('pivot', round(best_stripe_conf, 4))
    if has_subject:
        return ('blocker', 0.88)
    return (None, 0.0)


class RolesStage(Stage):
    name = 'roles'
    version = STAGE_VERSION
    recipe = 'helmet-1.4x+ref-stripes'
    device = 'gpu'
    batch_size = 16

    def __init__(
        self,
        use_gpu: bool = True,
        model_path: str | Path | None = None,
        subject_lookup: dict[str, dict[str, Any]] | None = None,
    ):
        super().__init__()
        self.use_gpu = use_gpu
        self._model_path = Path(model_path) if model_path else None
        self._subject_lookup = subject_lookup if subject_lookup is not None else {}

    def describe(self) -> str:
        if self._model_path and self._model_path.exists():
            return f'ONNX helmet/role detector ({self._model_path.name}, batch={self.batch_size})'
        return 'helmet star/stripe contour + referee stripe classifier'

    def fingerprint(self, runtime=None) -> str:
        if runtime is not None:
            if self._model_path and self._model_path.exists():
                return f"roles:v={STAGE_VERSION}:{runtime.model_hash(self._model_path)}"
            return f'roles:v={STAGE_VERSION}:cv-fallback'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:
        key = getattr(photo, 'key', '')
        subj_payload = self._subject_lookup.get(key) or {}
        faces = subj_payload.get('faces') or []
        subjects = subj_payload.get('subjects') or []
        primary_face = faces[0] if faces else None
        primary_subject = subjects[0] if subjects else None

        helmet_crop, helmet_box = extract_helmet_crop(img, primary_face, primary_subject)
        _role_crop, role_box = extract_role_crop(img, primary_face, primary_subject)
        from .teams import extract_torso_crop

        torso_crop = extract_torso_crop(img, primary_subject, primary_face)
        return {
            'helmet_crop': helmet_crop,
            'torso_crop': torso_crop,
            'helmet_box': helmet_box,
            'role_box': role_box,
            'has_subject': bool(primary_subject or primary_face),
        }

    def infer(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for item in batch:
            role, conf = classify_helmet_and_torso_cv(
                item['helmet_crop'],
                item['torso_crop'],
                has_subject=item['has_subject'],
            )
            results.append(
                {
                    'role': role,
                    'roleConf': conf,
                    'helmetBox': item['helmet_box'],
                    'roleBox': item.get('role_box', item['helmet_box']),
                }
            )
        return results

    def requests(self, decoded) -> list:  # noqa: ARG002
        return []

    def postprocess(self, decoded_or_photo, reqs_or_prepped=None, outputs_or_raw=None) -> dict[str, Any]:
        if isinstance(outputs_or_raw, dict):
            return dict(outputs_or_raw)
        prepped = self.prep(decoded_or_photo, decoded_or_photo.img)
        return self.infer([prepped])[0]

    def apply(self, photo: dict[str, Any], payload: dict[str, Any] | None) -> bool:  # noqa: ARG002
        return bool(payload)

    @staticmethod
    def summary_key(payload: dict[str, Any] | None) -> str:
        return (payload or {}).get('role') or 'none'
