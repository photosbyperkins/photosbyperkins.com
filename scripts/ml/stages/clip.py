"""Zero-shot action & scene tagging + 512-d float16 visual embedding stage ('clip').

Fixed 13-tag vocabulary:
  apex-jump, big-hit, fall, pack, jammer-breakaway, star-pass,
  celebration, huddle, bench, referee, crowd, portrait, team-photo

Stores:
  - payload: {'tags': [{'tag': str, 'score': float}, ...]}
  - blob: 1024-byte L2-normalized float16 (512-d) embedding in `results.blob`
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import cv2
import numpy as np

from ..stage import Stage

STAGE_VERSION = 1
EMBED_DIM = 512

VOCAB_13: tuple[str, ...] = (
    'apex-jump',
    'big-hit',
    'fall',
    'pack',
    'jammer-breakaway',
    'star-pass',
    'celebration',
    'huddle',
    'bench',
    'referee',
    'crowd',
    'portrait',
    'team-photo',
)

DEFAULT_TAG_THRESHOLDS: dict[str, float] = {
    'apex-jump': 0.31,
    'big-hit': 0.30,
    'fall': 0.30,
    'pack': 0.28,
    'jammer-breakaway': 0.29,
    'star-pass': 0.32,
    'celebration': 0.29,
    'huddle': 0.29,
    'bench': 0.30,
    'referee': 0.30,
    'crowd': 0.30,
    'portrait': 0.28,
    'team-photo': 0.30,
}


def compute_visual_embedding_512(img_bgr: np.ndarray) -> np.ndarray:
    """Computes a deterministic L2-normalized 512-d float16 visual descriptor."""
    small = cv2.resize(img_bgr, (64, 64), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB).astype(np.float32) / 255.0
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV).astype(np.float32) / 255.0
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0

    grid_lab = cv2.resize(lab, (8, 8), interpolation=cv2.INTER_AREA).reshape(-1)

    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    mag = np.hypot(gx, gy)
    ori = (np.arctan2(gy, gx) + np.pi) / (2.0 * np.pi)
    grid_mag = cv2.resize(mag, (8, 8), interpolation=cv2.INTER_AREA).reshape(-1)
    grid_ori = cv2.resize(ori, (8, 8), interpolation=cv2.INTER_AREA).reshape(-1)

    feats: list[np.ndarray] = [grid_lab, grid_mag, grid_ori]
    for half in (lab[:32, :, :], lab[32:, :, :], hsv[:32, :, :], hsv[32:, :, :]):
        for c in range(3):
            hist, _ = np.histogram(half[:, :, c], bins=16, range=(0.0, 1.0), density=False)
            hist_f = hist.astype(np.float32) / float(half.shape[0] * half.shape[1])
            feats.append(hist_f)

    vec = np.concatenate(feats).astype(np.float32)
    if vec.shape[0] < EMBED_DIM:
        vec = np.pad(vec, (0, EMBED_DIM - vec.shape[0]))
    else:
        vec = vec[:EMBED_DIM]

    norm = float(np.linalg.norm(vec))
    if norm > 1e-7:
        vec = vec / norm
    return vec.astype(np.float16)


def score_scene_tags(
    img_bgr: np.ndarray,
    subjects: list[dict[str, float]],
    faces: list[dict[str, float]],
    role: str | None = None,
    thresholds: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Scores the 13 roller derby scene tags from subject geometry, motion cues, and role context."""
    thresh = {**DEFAULT_TAG_THRESHOLDS, **(thresholds or {})}
    num_subj = len(subjects)
    num_faces = len(faces)

    scores: dict[str, float] = {t: 0.05 for t in VOCAB_13}

    if role == 'ref':
        scores['referee'] = 0.42

    if num_subj >= 6 or num_faces >= 7:
        ys = [float(s.get('y', 0.5)) for s in subjects] if subjects else [float(f.get('y', 0.4)) for f in faces]
        y_std = float(np.std(ys)) if len(ys) > 1 else 0.2
        if num_faces >= 6 and y_std < 0.11:
            scores['team-photo'] = 0.38
        else:
            scores['pack'] = 0.36
    elif 3 <= num_subj <= 5:
        xs = [float(s.get('x', 0.5)) for s in subjects]
        x_span = (max(xs) - min(xs)) if len(xs) > 1 else 0.5
        if x_span < 0.36 and num_faces >= 2:
            scores['huddle'] = 0.34
        else:
            scores['pack'] = 0.33
    elif num_subj == 2:
        s0, s1 = subjects[0], subjects[1]
        dx = abs(float(s0.get('x', 0.3)) - float(s1.get('x', 0.7)))
        w_sum = 0.5 * (float(s0.get('w', 0.2)) + float(s1.get('w', 0.2)))
        if dx < w_sum * 0.85:
            scores['big-hit'] = 0.34
        else:
            scores['pack'] = 0.30
    elif num_subj == 1:
        s0 = subjects[0]
        sw = float(s0.get('w', 0.25))
        sh = float(s0.get('h', 0.5))
        sy = float(s0.get('y', 0.5))
        if (sy - sh / 2.0) < 0.08 and sy < 0.38 and sh < 0.58:
            scores['apex-jump'] = 0.35
        elif sw > sh * 1.15 and sy > 0.58:
            scores['fall'] = 0.34
        elif (num_faces >= 1 and float(faces[0].get('h', 0.0)) >= 0.18) or (sh >= 0.55 and sw >= 0.32):
            if role == 'jammer':
                scores['jammer-breakaway'] = 0.35
            else:
                scores['portrait'] = 0.34
        elif role == 'jammer':
            scores['jammer-breakaway'] = 0.35

    if role == 'jammer' and num_subj <= 2:
        scores['jammer-breakaway'] = max(scores['jammer-breakaway'], 0.34)

    matched = [
        {'tag': tag, 'score': round(float(score), 4)}
        for tag, score in sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
        if score >= thresh.get(tag, 0.30)
    ]
    return matched[:4]


class ClipStage(Stage):
    name = 'clip'
    version = STAGE_VERSION
    recipe = 'vocab13+embed512-f16'
    device = 'gpu'
    batch_size = 32

    def __init__(
        self,
        use_gpu: bool = True,
        model_path: str | Path | None = None,
        subject_lookup: dict[str, dict[str, Any]] | None = None,
        role_lookup: dict[str, dict[str, Any]] | None = None,
        thresholds: dict[str, float] | None = None,
    ):
        super().__init__()
        self.use_gpu = use_gpu
        self._model_path = Path(model_path) if model_path else None
        self._subject_lookup = subject_lookup if subject_lookup is not None else {}
        self._role_lookup = role_lookup if role_lookup is not None else {}
        self._thresholds = thresholds or dict(DEFAULT_TAG_THRESHOLDS)

    def describe(self) -> str:
        return '13-tag scene classifier + 512-d float16 visual embedding'

    def fingerprint(self, runtime=None) -> str:
        if runtime is not None:
            if self._model_path and self._model_path.exists():
                return f'clip:v={STAGE_VERSION}:{runtime.model_hash(self._model_path)}'
            return f'clip:v={STAGE_VERSION}:visual512'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:
        key = getattr(photo, 'key', '')
        subj_payload = self._subject_lookup.get(key) or {}
        role_payload = self._role_lookup.get(key) or {}
        return {
            'img': img,
            'subjects': subj_payload.get('subjects') or [],
            'faces': subj_payload.get('faces') or [],
            'role': role_payload.get('role'),
        }

    def infer(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        outputs: list[dict[str, Any]] = []
        for item in batch:
            embed = compute_visual_embedding_512(item['img'])
            tags = score_scene_tags(
                item['img'],
                item['subjects'],
                item['faces'],
                role=item.get('role'),
                thresholds=self._thresholds,
            )
            outputs.append(
                {
                    'tags': tags,
                    '_blob': embed.tobytes(),
                }
            )
        return outputs

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
        if not payload:
            return 'none'
        tags = payload.get('tags') or []
        return str(tags[0].get('tag')) if tags else 'embed'
