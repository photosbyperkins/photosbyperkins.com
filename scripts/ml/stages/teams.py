"""Zero-training team jersey color clustering & CIEDE2000 assignment stage.

Extracts the torso region (30%-65% height of primary person box), masks out skin
pixels, computes the dominant CIE L*a*b* jersey color, and matches against
event.json `teams[].jerseyColorHex` via CIEDE2000 (with deterministic 2-cluster
k-means fallback across the bout when hex colors are not configured).
"""
from __future__ import annotations

import math
from typing import Any

import cv2
import numpy as np

from ..stage import Stage

STAGE_VERSION = 1


def hex_to_bgr(hex_str: str) -> np.ndarray | None:
    s = (hex_str or '').strip().lstrip('#')
    if len(s) == 3:
        s = ''.join(ch * 2 for ch in s)
    if len(s) != 6:
        return None
    try:
        r = int(s[0:2], 16)
        g = int(s[2:4], 16)
        b = int(s[4:6], 16)
        return np.array([[[b, g, r]]], dtype=np.uint8)
    except ValueError:
        return None


def bgr_to_cie_lab(bgr_pixel: np.ndarray) -> tuple[float, float, float]:
    """Converts a (1, 1, 3) uint8 BGR pixel to standard CIE L*a*b* (L in 0..100, a/b in -128..127)."""
    lab_cv = cv2.cvtColor(bgr_pixel, cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
    L = float(lab_cv[0]) * (100.0 / 255.0)
    a = float(lab_cv[1]) - 128.0
    b = float(lab_cv[2]) - 128.0
    return (L, a, b)


def hex_to_cie_lab(hex_str: str) -> tuple[float, float, float] | None:
    bgr = hex_to_bgr(hex_str)
    if bgr is None:
        return None
    return bgr_to_cie_lab(bgr)


def cie_lab_to_hex(lab: tuple[float, float, float] | list[float]) -> str:
    L, a, b = float(lab[0]), float(lab[1]), float(lab[2])
    l_cv = int(np.clip(round(L * 255.0 / 100.0), 0, 255))
    a_cv = int(np.clip(round(a + 128.0), 0, 255))
    b_cv = int(np.clip(round(b + 128.0), 0, 255))
    arr = np.array([[[l_cv, a_cv, b_cv]]], dtype=np.uint8)
    bgr = cv2.cvtColor(arr, cv2.COLOR_LAB2BGR)[0, 0]
    return f'#{int(bgr[2]):02x}{int(bgr[1]):02x}{int(bgr[0]):02x}'


def ciede2000(
    lab1: tuple[float, float, float] | list[float],
    lab2: tuple[float, float, float] | list[float],
) -> float:
    """Exact CIEDE2000 color difference between two CIE L*a*b* colors."""
    L1, a1, b1 = float(lab1[0]), float(lab1[1]), float(lab1[2])
    L2, a2, b2 = float(lab2[0]), float(lab2[1]), float(lab2[2])

    C1 = math.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    C_bar = 0.5 * (C1 + C2)
    C_bar7 = C_bar**7
    G = 0.5 * (1.0 - math.sqrt(C_bar7 / (C_bar7 + 25.0**7)))

    a1_p = (1.0 + G) * a1
    a2_p = (1.0 + G) * a2
    C1_p = math.hypot(a1_p, b1)
    C2_p = math.hypot(a2_p, b2)

    h1_p = math.degrees(math.atan2(b1, a1_p)) % 360.0 if C1_p > 1e-7 else 0.0
    h2_p = math.degrees(math.atan2(b2, a2_p)) % 360.0 if C2_p > 1e-7 else 0.0

    dL_p = L2 - L1
    dC_p = C2_p - C1_p

    if C1_p * C2_p <= 1e-7:
        dh_p = 0.0
    else:
        dh = h2_p - h1_p
        if abs(dh) <= 180.0:
            dh_p = dh
        elif dh > 180.0:
            dh_p = dh - 360.0
        else:
            dh_p = dh + 360.0

    dH_p = 2.0 * math.sqrt(C1_p * C2_p) * math.sin(math.radians(dh_p / 2.0))

    L_bar_p = 0.5 * (L1 + L2)
    C_bar_p = 0.5 * (C1_p + C2_p)

    if C1_p * C2_p <= 1e-7:
        h_bar_p = h1_p + h2_p
    else:
        if abs(h1_p - h2_p) <= 180.0:
            h_bar_p = 0.5 * (h1_p + h2_p)
        elif (h1_p + h2_p) < 360.0:
            h_bar_p = 0.5 * (h1_p + h2_p + 360.0)
        else:
            h_bar_p = 0.5 * (h1_p + h2_p - 360.0)

    T = (
        1.0
        - 0.17 * math.cos(math.radians(h_bar_p - 30.0))
        + 0.24 * math.cos(math.radians(2.0 * h_bar_p))
        + 0.32 * math.cos(math.radians(3.0 * h_bar_p + 6.0))
        - 0.20 * math.cos(math.radians(4.0 * h_bar_p - 63.0))
    )

    d_theta = 30.0 * math.exp(-(((h_bar_p - 275.0) / 25.0) ** 2))
    C_bar_p7 = C_bar_p**7
    R_C = 2.0 * math.sqrt(C_bar_p7 / (C_bar_p7 + 25.0**7))
    S_L = 1.0 + (0.015 * ((L_bar_p - 50.0) ** 2)) / math.sqrt(20.0 + (L_bar_p - 50.0) ** 2)
    S_C = 1.0 + 0.045 * C_bar_p
    S_H = 1.0 + 0.015 * C_bar_p * T
    R_T = -math.sin(math.radians(2.0 * d_theta)) * R_C

    term_L = dL_p / S_L
    term_C = dC_p / S_C
    term_H = dH_p / S_H

    return float(math.sqrt(term_L**2 + term_C**2 + term_H**2 + R_T * term_C * term_H))


def extract_torso_crop(
    img: np.ndarray,
    primary_subject: dict[str, float] | None,
    primary_face: dict[str, float] | None = None,
) -> np.ndarray:
    """Extracts the 30%-65% height torso band of the primary person box (or below the primary face)."""
    h, w = img.shape[:2]
    if primary_subject and primary_subject.get('w', 0) > 0.02 and primary_subject.get('h', 0) > 0.02:
        cx = float(primary_subject['x'])
        cy = float(primary_subject['y'])
        bw = float(primary_subject['w'])
        bh = float(primary_subject['h'])
        box_x1 = cx - bw / 2.0
        box_y1 = cy - bh / 2.0
        tx1 = box_x1 + 0.20 * bw
        tx2 = box_x1 + 0.80 * bw
        ty1 = box_y1 + 0.26 * bh
        ty2 = box_y1 + 0.65 * bh
    elif primary_face and primary_face.get('w', 0) > 0.015 and primary_face.get('h', 0) > 0.015:
        fx = float(primary_face['x'])
        fy = float(primary_face['y'])
        fw = float(primary_face['w'])
        fh = float(primary_face['h'])
        tx1 = max(0.0, fx - fw * 1.6)
        tx2 = min(1.0, fx + fw * 1.6)
        ty1 = min(0.92, fy + fh * 0.70)
        ty2 = min(1.0, fy + fh * 2.60)
    else:
        tx1, tx2 = 0.32, 0.68
        ty1, ty2 = 0.35, 0.68

    x1 = max(0, min(w - 2, int(round(tx1 * w))))
    x2 = max(x1 + 2, min(w, int(round(tx2 * w))))
    y1 = max(0, min(h - 2, int(round(ty1 * h))))
    y2 = max(y1 + 2, min(h, int(round(ty2 * h))))
    return img[y1:y2, x1:x2]


def compute_dominant_torso_lab(torso_bgr: np.ndarray) -> dict[str, Any]:
    """Masks out skin tones and computes dominant jersey CIE L*a*b* and referee stripe score."""
    small = cv2.resize(torso_bgr, (32, 32), interpolation=cv2.INTER_AREA)
    ycrcb = cv2.cvtColor(small, cv2.COLOR_BGR2YCrCb)
    cr = ycrcb[:, :, 1]
    cb = ycrcb[:, :, 2]
    skin_mask = (cr >= 135) & (cr <= 172) & (cb >= 77) & (cb <= 127)

    lab_cv = cv2.cvtColor(small, cv2.COLOR_BGR2LAB).astype(np.float32)
    L = lab_cv[:, :, 0] * (100.0 / 255.0)
    a = lab_cv[:, :, 1] - 128.0
    b = lab_cv[:, :, 2] - 128.0
    chroma = np.hypot(a, b)

    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gx = float(np.mean(np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3))))
    gy = float(np.mean(np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))))
    low_chroma_frac = float(np.mean(chroma < 12.0))
    high_contrast_frac = float(np.mean((L < 28.0) | (L > 75.0)))
    ref_stripe_score = 0.0
    if gy > 1e-3 and (gx / (gy + 1.0)) > 1.45 and low_chroma_frac > 0.65 and high_contrast_frac > 0.45:
        ref_stripe_score = float(np.clip((gx / (gy + 1.0) - 1.2) * 0.6, 0.0, 1.0))

    non_skin = ~skin_mask
    chromatic = non_skin & (chroma >= 14.0) & (L >= 10.0) & (L <= 92.0)

    if np.count_nonzero(chromatic) >= int(0.18 * small.shape[0] * small.shape[1]):
        sel_L = float(np.median(L[chromatic]))
        sel_a = float(np.median(a[chromatic]))
        sel_b = float(np.median(b[chromatic]))
    elif np.count_nonzero(non_skin) > 0:
        sel_L = float(np.median(L[non_skin]))
        sel_a = float(np.median(a[non_skin]))
        sel_b = float(np.median(b[non_skin]))
    else:
        sel_L = float(np.median(L))
        sel_a = float(np.median(a))
        sel_b = float(np.median(b))

    lab_tuple = (round(sel_L, 2), round(sel_a, 2), round(sel_b, 2))
    return {
        'torsoLab': list(lab_tuple),
        'torsoHex': cie_lab_to_hex(lab_tuple),
        'refStripeScore': round(ref_stripe_score, 4),
    }


def assign_team_for_lab(
    torso_lab: list[float] | tuple[float, float, float],
    team0_lab: tuple[float, float, float],
    team1_lab: tuple[float, float, float],
    ref_stripe_score: float = 0.0,
) -> tuple[int | None, float]:
    """Assigns teamIdx (0, 1, or None) and confidence [0..1] using CIEDE2000."""
    if ref_stripe_score >= 0.72:
        return (None, 0.0)

    d0 = ciede2000(torso_lab, team0_lab)
    d1 = ciede2000(torso_lab, team1_lab)
    best_d = min(d0, d1)
    other_d = max(d0, d1)
    if best_d > 38.0 or (other_d - best_d) < 3.5:
        return (None, round(float(max(0.0, 1.0 - best_d / 50.0)), 4))

    margin = (other_d - best_d) / max(other_d, 1.0)
    proximity = max(0.0, 1.0 - best_d / 45.0)
    conf = float(np.clip(0.55 * proximity + 0.45 * margin, 0.0, 1.0))
    return (0 if d0 <= d1 else 1, round(conf, 4))


def kmeans_2cluster_lab(
    labs: list[list[float]],
    max_iter: int = 20,
) -> tuple[tuple[float, float, float], tuple[float, float, float]] | None:
    """Deterministic 2-cluster k-means on torso LAB vectors across a bout."""
    if len(labs) < 2:
        return None
    arr = np.asarray(labs, dtype=np.float32)
    order = np.argsort(arr[:, 0] + 0.5 * arr[:, 1])
    c0 = arr[order[0]].copy()
    c1 = arr[order[-1]].copy()
    if np.allclose(c0, c1):
        return None

    for _ in range(max_iter):
        d0 = np.linalg.norm(arr - c0, axis=1)
        d1 = np.linalg.norm(arr - c1, axis=1)
        mask0 = d0 <= d1
        if np.any(mask0) and np.any(~mask0):
            new_c0 = arr[mask0].mean(axis=0)
            new_c1 = arr[~mask0].mean(axis=0)
            if np.allclose(c0, new_c0, atol=1e-2) and np.allclose(c1, new_c1, atol=1e-2):
                c0, c1 = new_c0, new_c1
                break
            c0, c1 = new_c0, new_c1
        else:
            break

    return (
        (float(c0[0]), float(c0[1]), float(c0[2])),
        (float(c1[0]), float(c1[1]), float(c1[2])),
    )


class TeamsStage(Stage):
    name = 'teams'
    version = STAGE_VERSION
    recipe = 'torso-cielab-ciede2000'
    device = 'cpu'
    batch_size = 1

    def __init__(
        self,
        use_gpu: bool = True,
        subject_lookup: dict[str, dict[str, Any]] | None = None,
        event_teams_lookup: dict[str, list[dict[str, Any]]] | None = None,
    ):
        super().__init__()
        self.use_gpu = use_gpu
        self._subject_lookup = subject_lookup if subject_lookup is not None else {}
        self._event_teams_lookup = event_teams_lookup if event_teams_lookup is not None else {}

    def describe(self) -> str:
        return 'CIE L*a*b* torso histogram + CIEDE2000 team matcher (CPU)'

    def fingerprint(self, runtime=None) -> str:
        if runtime is not None:
            return f'teams:v={STAGE_VERSION}'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:
        key = getattr(photo, 'key', '')
        subj_payload = self._subject_lookup.get(key) or {}
        subjects = subj_payload.get('subjects') or []
        primary_subject = subjects[0] if subjects else None

        torso_crop = extract_torso_crop(img, primary_subject)
        metrics = compute_dominant_torso_lab(torso_crop)

        event_key = f'{getattr(photo, "year", "")}/{getattr(photo, "event_name", "")}'
        teams = self._event_teams_lookup.get(event_key) or self._event_teams_lookup.get(key) or []
        team_idx: int | None = None
        team_conf: float = 0.0

        if len(teams) >= 2:
            hex0 = teams[0].get('jerseyColorHex')
            hex1 = teams[1].get('jerseyColorHex')
            lab0 = hex_to_cie_lab(hex0) if hex0 else None
            lab1 = hex_to_cie_lab(hex1) if hex1 else None
            if lab0 and lab1:
                team_idx, team_conf = assign_team_for_lab(
                    metrics['torsoLab'],
                    lab0,
                    lab1,
                    metrics['refStripeScore'],
                )

        return {
            **metrics,
            'teamIdx': team_idx,
            'teamConf': team_conf,
        }

    def infer(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return batch

    def requests(self, decoded) -> list:  # noqa: ARG002
        return []

    def postprocess(self, decoded_or_photo, reqs_or_prepped=None, outputs_or_raw=None) -> dict[str, Any]:
        if isinstance(outputs_or_raw, dict):
            return dict(outputs_or_raw)
        return self.prep(decoded_or_photo, decoded_or_photo.img)

    def apply(self, photo: dict[str, Any], payload: dict[str, Any] | None) -> bool:  # noqa: ARG002
        return bool(payload)

    @staticmethod
    def summary_key(payload: dict[str, Any] | None) -> str:
        if not payload:
            return 'none'
        idx = payload.get('teamIdx')
        if idx in (0, 1):
            return f'team{idx}'
        return 'lab'
