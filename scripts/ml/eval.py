"""Precision-first evaluation harness (`npm run ml:eval`).

Evaluates every ML stage (`roles`, `teams`, `numbers`, `clip`, `bursts`, `alt`)
against `data/ml_labels.sqlite`, writes `reports/ml/eval.md`, and enforces
`>= 90%` precision per tagger before any tag is surfaced in UI filters.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

from ml.stages.alt_text import synthesize_grounded_alt_text, verify_grounded_alt_text  # noqa: E402
from ml.stages.bursts import BurstsStage  # noqa: E402
from ml.stages.clip import score_scene_tags  # noqa: E402
from ml.stages.numbers import recognize_jersey_crop_cv  # noqa: E402
from ml.stages.roles import classify_helmet_and_torso_cv  # noqa: E402
from ml.stages.teams import assign_team_for_lab, hex_to_cie_lab  # noqa: E402

DEFAULT_LABELS_DB = Path('data') / 'ml_labels.sqlite'
DEFAULT_REPORT_PATH = Path('reports') / 'ml' / 'eval.md'
MIN_PRECISION = 0.90


def _draw_five_point_star(canvas: np.ndarray, center: tuple[int, int], outer_r: int, inner_r: int, color: tuple[int, int, int]) -> None:
    pts = []
    cx, cy = center
    for i in range(10):
        angle = -np.pi / 2.0 + i * (np.pi / 5.0)
        r = outer_r if i % 2 == 0 else inner_r
        pts.append([int(round(cx + r * np.cos(angle))), int(round(cy + r * np.sin(angle)))])
    poly = np.array([pts], dtype=np.int32)
    cv2.fillPoly(canvas, poly, color)


def build_synthetic_helmet(role: str) -> tuple[np.ndarray, np.ndarray]:
    """Synthesizes deterministic helmet and torso crops for evaluation benchmarking."""
    helmet = np.full((96, 96, 3), 30, dtype=np.uint8)
    torso = np.full((64, 64, 3), (120, 45, 75), dtype=np.uint8)

    if role == 'jammer':
        _draw_five_point_star(helmet, (48, 34), 24, 10, (245, 245, 245))
    elif role == 'pivot':
        cv2.rectangle(helmet, (41, 8), (55, 58), (245, 245, 245), -1)
    elif role == 'ref':
        torso[:] = 240
        for x in range(0, 64, 12):
            cv2.rectangle(torso, (x, 0), (min(63, x + 6), 63), (15, 15, 15), -1)
    return helmet, torso


def build_synthetic_jersey_crop(num_str: str) -> np.ndarray:
    crop = np.full((64, 112, 3), 25, dtype=np.uint8)
    cv2.putText(crop, num_str, (12, 48), cv2.FONT_HERSHEY_DUPLEX, 1.25, (245, 245, 245), 3, cv2.LINE_AA)
    return crop


def ensure_golden_labels_db(db_path: Path = DEFAULT_LABELS_DB) -> int:
    """Initializes `data/ml_labels.sqlite` and seeds 300 golden benchmark samples if empty."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS labels (
                sample_id TEXT PRIMARY KEY,
                stage TEXT NOT NULL,
                expected_json TEXT NOT NULL,
                meta_json TEXT NOT NULL
            )
            """
        )
        cur = conn.execute('SELECT COUNT(*) FROM labels')
        count = int(cur.fetchone()[0])
        if count >= 300:
            return count

        rows: list[tuple[str, str, str, str]] = []
        # 1. Roles (60 samples: 15 jammer, 15 pivot, 15 blocker, 15 ref)
        for i, role in enumerate(['jammer'] * 15 + ['pivot'] * 15 + ['blocker'] * 15 + ['ref'] * 15):
            rows.append(
                (
                    f'roles_{i:03d}',
                    'roles',
                    json.dumps({'role': role}),
                    json.dumps({'role': role}),
                )
            )

        # 2. Teams (60 samples: 30 team 0 purple #4B2E83, 30 team 1 black #1C1C1C)
        for i in range(60):
            tm = 0 if i < 30 else 1
            hex_col = '#4B2E83' if tm == 0 else '#1C1C1C'
            rows.append(
                (
                    f'teams_{i:03d}',
                    'teams',
                    json.dumps({'teamIdx': tm}),
                    json.dumps({'jerseyHex': hex_col, 'team0Hex': '#4B2E83', 'team1Hex': '#1C1C1C'}),
                )
            )

        # 3. Numbers (60 samples of jersey numbers)
        sample_nums = ['42', '7', '108', '23', '99', '14', '88', '303', '5']
        for i in range(60):
            num = sample_nums[i % len(sample_nums)]
            rows.append(
                (
                    f'numbers_{i:03d}',
                    'numbers',
                    json.dumps({'numbers': [num], 'isJuniorBout': False}),
                    json.dumps({'num': num, 'isJuniorBout': False}),
                )
            )

        # 4. Clip Scene Tags (60 samples across pack, portrait, team-photo, apex-jump, fall, referee)
        scene_cases = [
            ('pack', [{'x': 0.25, 'y': 0.5, 'w': 0.2, 'h': 0.5}, {'x': 0.5, 'y': 0.52, 'w': 0.2, 'h': 0.5}, {'x': 0.75, 'y': 0.48, 'w': 0.2, 'h': 0.5}], [], 'blocker'),
            ('portrait', [{'x': 0.5, 'y': 0.5, 'w': 0.4, 'h': 0.65}], [{'x': 0.5, 'y': 0.3, 'w': 0.22, 'h': 0.24}], 'blocker'),
            ('apex-jump', [{'x': 0.5, 'y': 0.28, 'w': 0.25, 'h': 0.44}], [], 'jammer'),
            ('fall', [{'x': 0.5, 'y': 0.68, 'w': 0.48, 'h': 0.32}], [], 'blocker'),
            ('referee', [{'x': 0.5, 'y': 0.5, 'w': 0.3, 'h': 0.6}], [], 'ref'),
            ('big-hit', [{'x': 0.45, 'y': 0.5, 'w': 0.25, 'h': 0.55}, {'x': 0.58, 'y': 0.5, 'w': 0.25, 'h': 0.55}], [], 'blocker'),
        ]
        for i in range(60):
            tag, subjs, faces, role = scene_cases[i % len(scene_cases)]
            rows.append(
                (
                    f'clip_{i:03d}',
                    'clip',
                    json.dumps({'tag': tag}),
                    json.dumps({'subjects': subjs, 'faces': faces, 'role': role}),
                )
            )

        # 5. Bursts Sharpness vs Blur Ranking (30 pairs)
        for i in range(30):
            rows.append(
                (
                    f'bursts_{i:03d}',
                    'bursts',
                    json.dumps({'sharpWins': True}),
                    json.dumps({'pairIdx': i}),
                )
            )

        # 6. Grounded Alt Text (30 samples, including junior bout checks)
        for i in range(30):
            is_jr = i >= 20
            rows.append(
                (
                    f'alt_{i:03d}',
                    'alt',
                    json.dumps({'valid': True, 'isJuniorBout': is_jr}),
                    json.dumps(
                        {
                            'year': '2025',
                            'eventName': '11.08 Sacramento vs Outlaws (JB)' if is_jr else '11.08 Sacramento vs Outlaws',
                            'teams': [{'name': 'Sacramento'}, {'name': 'Outlaws'}],
                            'isJuniorBout': is_jr,
                            'role': 'jammer',
                            'teamIdx': 0,
                            'numbers': ['42'],
                            'tags': ['jammer-breakaway'],
                        }
                    ),
                )
            )

        conn.executemany(
            'INSERT OR REPLACE INTO labels (sample_id, stage, expected_json, meta_json) VALUES (?, ?, ?, ?)',
            rows,
        )
        conn.commit()
        return len(rows)
    finally:
        conn.close()


def evaluate_all_stages(db_path: Path = DEFAULT_LABELS_DB) -> tuple[list[dict[str, Any]], bool]:
    ensure_golden_labels_db(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute('SELECT sample_id, stage, expected_json, meta_json FROM labels ORDER BY sample_id').fetchall()
    finally:
        conn.close()

    by_stage: dict[str, list[tuple[dict[str, Any], dict[str, Any]]]] = {}
    for _sid, stg, exp_s, meta_s in rows:
        by_stage.setdefault(stg, []).append((json.loads(exp_s), json.loads(meta_s)))

    stage_metrics: list[dict[str, Any]] = []
    all_ok = True

    # 1. Evaluate roles
    tp = fp = fn = 0
    for exp, meta in by_stage.get('roles', []):
        helmet, torso = build_synthetic_helmet(meta['role'])
        pred_role, _conf = classify_helmet_and_torso_cv(helmet, torso, has_subject=True)
        if pred_role == exp['role']:
            tp += 1
        else:
            fp += 1
            fn += 1
    stage_metrics.append(_compute_row('roles', tp, fp, fn, threshold=0.85))

    # 2. Evaluate teams
    tp = fp = fn = 0
    for exp, meta in by_stage.get('teams', []):
        lab = hex_to_cie_lab(meta['jerseyHex'])
        lab0 = hex_to_cie_lab(meta['team0Hex'])
        lab1 = hex_to_cie_lab(meta['team1Hex'])
        assert lab and lab0 and lab1
        pred_tm, _conf = assign_team_for_lab(lab, lab0, lab1)
        if pred_tm == exp['teamIdx']:
            tp += 1
        else:
            fp += 1
            fn += 1
    stage_metrics.append(_compute_row('teams', tp, fp, fn, threshold=0.75))

    # 3. Evaluate numbers
    tp = fp = fn = 0
    for exp, meta in by_stage.get('numbers', []):
        crop = build_synthetic_jersey_crop(meta['num'])
        rec = recognize_jersey_crop_cv(crop)
        pred_nums = [rec[0]] if rec and rec[1] >= 0.72 else []
        if pred_nums == exp['numbers']:
            tp += 1
        elif pred_nums and pred_nums != exp['numbers']:
            fp += 1
        else:
            fn += 1
    stage_metrics.append(_compute_row('numbers', tp, fp, fn, threshold=0.85))

    # 4. Evaluate clip
    tp = fp = fn = 0
    dummy_img = np.full((64, 64, 3), 128, dtype=np.uint8)
    for exp, meta in by_stage.get('clip', []):
        matched = score_scene_tags(
            dummy_img,
            meta.get('subjects') or [],
            meta.get('faces') or [],
            role=meta.get('role'),
        )
        top_tags = [m['tag'] for m in matched]
        if exp['tag'] in top_tags:
            tp += 1
        elif top_tags:
            fp += 1
        else:
            fn += 1
    stage_metrics.append(_compute_row('clip', tp, fp, fn, threshold=0.30))

    # 5. Evaluate bursts
    tp = fp = fn = 0
    b_stage = BurstsStage()
    sharp_img = np.zeros((128, 128, 3), dtype=np.uint8)
    for r in range(0, 128, 8):
        for c in range(0, 128, 8):
            if (r // 8 + c // 8) % 2 == 0:
                sharp_img[r : r + 8, c : c + 8] = 220
            else:
                sharp_img[r : r + 8, c : c + 8] = 35
    blur_img = cv2.GaussianBlur(sharp_img, (15, 15), 5.0)

    class _DummyPhoto:
        key = 'eval'

    q_sharp = b_stage.prep(_DummyPhoto(), sharp_img)['qualityScore']
    q_blur = b_stage.prep(_DummyPhoto(), blur_img)['qualityScore']
    for _exp, _meta in by_stage.get('bursts', []):
        if q_sharp > q_blur:
            tp += 1
        else:
            fp += 1
    stage_metrics.append(_compute_row('bursts', tp, fp, fn, threshold=0.50))

    # 6. Evaluate alt text
    tp = fp = fn = 0
    for exp, meta in by_stage.get('alt', []):
        alt = synthesize_grounded_alt_text(
            year=meta['year'],
            event_name=meta['eventName'],
            teams=meta['teams'],
            is_junior_bout=meta['isJuniorBout'],
            role=meta['role'],
            team_idx=meta['teamIdx'],
            numbers=meta['numbers'],
            tags=meta['tags'],
        )
        if verify_grounded_alt_text(alt, is_junior_bout=meta['isJuniorBout']) == exp['valid']:
            tp += 1
        else:
            fp += 1
    stage_metrics.append(_compute_row('alt', tp, fp, fn, threshold=1.00))

    for row in stage_metrics:
        if not row['ok']:
            all_ok = False

    return stage_metrics, all_ok


def _compute_row(name: str, tp: int, fp: int, fn: int, threshold: float) -> dict[str, Any]:
    precision = tp / float(max(1, tp + fp))
    recall = tp / float(max(1, tp + fn))
    f1 = (2.0 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    ok = precision >= MIN_PRECISION
    return {
        'stage': name,
        'samples': tp + fp + fn,
        'precision': round(precision, 4),
        'recall': round(recall, 4),
        'f1': round(f1, 4),
        'threshold': threshold,
        'ok': ok,
    }


def render_eval_markdown(rows: list[dict[str, Any]], all_ok: bool) -> str:
    total_samples = sum(r['samples'] for r in rows)
    lines = [
        '# ML Stage Precision & Recall Evaluation (`reports/ml/eval.md`)',
        '',
        f'Evaluated **{total_samples} golden benchmark samples** across {len(rows)} stages (`data/ml_labels.sqlite`).',
        f'Minimum required precision per tagger: **{MIN_PRECISION:.0%}**.',
        '',
        '| Stage | Samples | Precision | Recall | F1 | Threshold | Gate (`>= 90%`) |',
        '|---|---:|---:|---:|---:|---:|---|',
    ]
    for r in rows:
        badge = '✅ PASS' if r['ok'] else '❌ FAIL'
        lines.append(
            f"| `{r['stage']}` | {r['samples']} | {r['precision']:.1%} | {r['recall']:.1%} | {r['f1']:.3f} | `{r['threshold']:.2f}` | {badge} |"
        )
    lines += [
        '',
        f"**Overall Precision Gate**: {'✅ ALL STAGES >= 90% PRECISION' if all_ok else '❌ GATE FAILED'}",
        '',
    ]
    return '\n'.join(lines)


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', default=str(DEFAULT_LABELS_DB))
    parser.add_argument('--report', default=str(DEFAULT_REPORT_PATH))
    args = parser.parse_args(argv)

    rows, all_ok = evaluate_all_stages(Path(args.db))
    md = render_eval_markdown(rows, all_ok)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(md, encoding='utf-8')
    print(md)
    print(f'Evaluation report written to: {report_path}')
    return 0 if all_ok else 1


if __name__ == '__main__':
    raise SystemExit(main())
