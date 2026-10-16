"""Unit and integration tests for v1.14 'Understand Every Photo' ML stages and sidecar export."""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

from ml import eval as ml_eval
from ml import run as runner
from ml.export_sidecars import (
    apply_burst_consensus_numbers,
    export_all_sidecars,
    rank_event_bursts,
    resolve_event_teams,
)
from ml.label_crops import extract_crops
from ml.neighbors import compute_top_neighbors
from ml.stages.alt_text import synthesize_grounded_alt_text, verify_grounded_alt_text
from ml.stages.bursts import BurstsStage, compute_dhash_hex, hamming_distance_hex
from ml.stages.clip import EMBED_DIM, VOCAB_13, ClipStage, compute_visual_embedding_512
from ml.stages.numbers import NumbersStage, is_valid_derby_number, recognize_jersey_crop_cv
from ml.stages.roles import classify_helmet_and_torso_cv, extract_helmet_crop
from ml.stages.teams import ciede2000, hex_to_cie_lab, kmeans_2cluster_lab


class _DummyPhoto:
    def __init__(self, key: str = 'k1', year: str = '2025', event_name: str = '11.08 Sacramento vs Outlaws'):
        self.key = key
        self.year = year
        self.event_name = event_name


def test_bursts_dhash_and_quality_ranking():
    sharp = np.zeros((128, 128, 3), dtype=np.uint8)
    for r in range(0, 128, 8):
        for c in range(0, 128, 8):
            sharp[r : r + 8, c : c + 8] = 220 if (r // 8 + c // 8) % 2 == 0 else 30
    blurred = cv2.GaussianBlur(sharp, (15, 15), 5.0)

    h1 = compute_dhash_hex(cv2.cvtColor(sharp, cv2.COLOR_BGR2GRAY))
    h2 = compute_dhash_hex(cv2.cvtColor(blurred, cv2.COLOR_BGR2GRAY))
    assert len(h1) == 16 and len(h2) == 16
    assert hamming_distance_hex(h1, h1) == 0

    stage = BurstsStage()
    out_sharp = stage.prep(_DummyPhoto('s'), sharp)
    out_blur = stage.prep(_DummyPhoto('b'), blurred)
    assert out_sharp['subjectSharpness'] > out_blur['subjectSharpness']
    assert out_sharp['qualityScore'] > out_blur['qualityScore']

    album = [
        {
            'thumb': '/thumbnails/2025/ev/photo_001.avif',
            'original': '/photos/2025/ev/photo_001.jpg',
            'burst': {
                'id': 'burst_1',
                'index': 0,
                'total': 2,
                'frameSources': ['/photos/2025/ev/photo_001.jpg', '/photos/2025/ev/photo_002.jpg'],
                'frameThumbs': ['/thumbnails/2025/ev/photo_001.avif', '/thumbnails/2025/ev/photo_002.avif'],
            },
        },
        {
            'thumb': '/thumbnails/2025/ev/photo_002.avif',
            'original': '/photos/2025/ev/photo_002.jpg',
            'burst': {
                'id': 'burst_1',
                'index': 1,
                'total': 2,
                'frameSources': ['/photos/2025/ev/photo_001.jpg', '/photos/2025/ev/photo_002.jpg'],
                'frameThumbs': ['/thumbnails/2025/ev/photo_001.avif', '/thumbnails/2025/ev/photo_002.avif'],
            },
        },
    ]
    best = rank_event_bursts(
        album,
        {
            '/thumbnails/2025/ev/photo_001.avif': out_blur,
            '/thumbnails/2025/ev/photo_002.avif': out_sharp,
        },
    )
    assert best == {'/thumbnails/2025/ev/photo_002.avif'}
    assert album[1].get('bestInBurst') is True
    assert album[0]['burst']['bestFrameIndex'] == 1
    assert len(album[0]['burst']['frameQualityScores']) == 2


def test_teams_ciede2000_and_kmeans_fallback():
    sac_lab = hex_to_cie_lab('#4B2E83')
    out_lab = hex_to_cie_lab('#1C1C1C')
    assert sac_lab is not None and out_lab is not None
    assert ciede2000(sac_lab, sac_lab) < 1e-5
    assert ciede2000(sac_lab, out_lab) > 15.0

    # Test 2-cluster k-means fallback when jerseyColorHex is omitted
    labs = [list(sac_lab)] * 5 + [list(out_lab)] * 5
    clusters = kmeans_2cluster_lab(labs)
    assert clusters is not None
    c0, c1 = clusters
    assert ciede2000(c0, c1) > 15.0

    album = [
        {'thumb': '/t/0.avif'},
        {'thumb': '/t/1.avif'},
        {'thumb': '/t/ref.avif'},
    ]
    resolved = resolve_event_teams(
        album,
        teams_meta=[{'name': 'Team A'}, {'name': 'Team B'}],
        teams_by_key={
            '/t/0.avif': {'torsoLab': list(sac_lab), 'refStripeScore': 0.0},
            '/t/1.avif': {'torsoLab': list(out_lab), 'refStripeScore': 0.0},
            '/t/ref.avif': {'torsoLab': [50.0, 0.0, 0.0], 'refStripeScore': 0.9},
        },
        roles_by_key={'/t/ref.avif': {'role': 'ref'}},
    )
    assert resolved['/t/0.avif'] in (0, 1)
    assert resolved['/t/1.avif'] in (0, 1)
    assert resolved['/t/0.avif'] != resolved['/t/1.avif']
    assert resolved['/t/ref.avif'] is None


def test_roles_helmet_star_stripe_and_ref_classifier():
    img = np.full((200, 200, 3), 120, dtype=np.uint8)
    crop, box = extract_helmet_crop(img, {'x': 0.5, 'y': 0.3, 'w': 0.2, 'h': 0.2}, None)
    assert crop.size > 0 and 0.0 <= box['x'] <= 1.0

    for expected_role in ('jammer', 'pivot', 'blocker', 'ref'):
        helmet, torso = ml_eval.build_synthetic_helmet(expected_role)
        pred_role, conf = classify_helmet_and_torso_cv(helmet, torso, has_subject=True)
        assert pred_role == expected_role
        assert conf >= 0.85


def test_numbers_ocr_junior_skip_and_burst_consensus():
    assert is_valid_derby_number('42')
    assert is_valid_derby_number('108A')
    assert not is_valid_derby_number('ABCDEF')
    assert not is_valid_derby_number('')

    crop = ml_eval.build_synthetic_jersey_crop('42')
    rec = recognize_jersey_crop_cv(crop)
    assert rec is not None and rec[0] == '42' and rec[1] >= 0.72

    # Verify burst consensus promotes 0.75 candidate across >= 2 burst frames
    album = [
        {'thumb': '/t/f1.avif', 'burst': {'id': 'b1'}},
        {'thumb': '/t/f2.avif', 'burst': {'id': 'b1'}},
    ]
    numbers_map = {
        '/t/f1.avif': {'numbers': [], 'candidates': [{'num': '88', 'conf': 0.76}]},
        '/t/f2.avif': {'numbers': [], 'candidates': [{'num': '88', 'conf': 0.78}]},
    }
    promoted = apply_burst_consensus_numbers(album, numbers_map, is_junior_bout=False)
    assert promoted['/t/f1.avif'] == ['88']
    assert promoted['/t/f2.avif'] == ['88']

    # Junior bouts also receive full burst consensus jersey numbers
    jr_promoted = apply_burst_consensus_numbers(album, numbers_map, is_junior_bout=True)
    assert jr_promoted['/t/f1.avif'] == ['88']


def test_clip_embedding_and_neighbors_mask_same_burst():
    img1 = np.full((64, 64, 3), (40, 20, 180), dtype=np.uint8)
    img2 = np.full((64, 64, 3), (42, 22, 178), dtype=np.uint8)
    img3 = np.full((64, 64, 3), (200, 190, 20), dtype=np.uint8)

    e1 = compute_visual_embedding_512(img1)
    e2 = compute_visual_embedding_512(img2)
    e3 = compute_visual_embedding_512(img3)
    assert e1.shape == (EMBED_DIM,) and e1.dtype == np.float16
    assert len(e1.tobytes()) == EMBED_DIM * 2

    neighbors = compute_top_neighbors(
        [
            {'key': 'k1', 'year': '2025', 'slug': 'ev', 'idx': 0, 'burst_id': 'b_same', 'blob': e1.tobytes()},
            {'key': 'k2', 'year': '2025', 'slug': 'ev', 'idx': 1, 'burst_id': 'b_same', 'blob': e2.tobytes()},
            {'key': 'k3', 'year': '2025', 'slug': 'ev', 'idx': 2, 'burst_id': 'b_other', 'blob': e3.tobytes()},
        ],
        top_k=5,
    )
    # k2 is in the same burst ('b_same') as k1 so it must be masked out!
    assert neighbors['k1'] == [['2025', 'ev', 2]]


def test_alt_text_word_bounds_and_spectator_support():
    alt_adult = synthesize_grounded_alt_text(
        year='2025',
        event_name='11.08 Sacramento vs Outlaws',
        teams=[{'name': 'Sacramento'}, {'name': 'Outlaws'}],
        is_junior_bout=False,
        role='jammer',
        team_idx=0,
        numbers=['42'],
        tags=['apex-jump'],
    )
    assert verify_grounded_alt_text(alt_adult, is_junior_bout=False)
    assert '#42' in alt_adult
    assert 'Sacramento' in alt_adult

    alt_spectator = synthesize_grounded_alt_text(
        year='2025',
        event_name='11.08 Sacramento vs Outlaws',
        teams=[{'name': 'Sacramento'}, {'name': 'Outlaws'}],
        role='spectator',
        team_idx=None,
        numbers=[],
        tags=['crowd'],
    )
    assert verify_grounded_alt_text(alt_spectator)
    assert 'spectator or coach' in alt_spectator


def test_end_to_end_runner_exports_sidecars_and_eval_passes(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    photos = {
        '2025': {
            '11.08 Sacramento vs Outlaws': {
                'albumSlug': '11-08-sacramento-vs-outlaws',
                'isJuniorBout': False,
                'teams': [
                    {'name': 'Sacramento', 'jerseyColorHex': '#4B2E83', 'score': 180},
                    {'name': 'Outlaws', 'jerseyColorHex': '#1C1C1C', 'score': 140},
                ],
                'album': [],
            }
        }
    }
    for i in range(2):
        src = tmp_path / 'photos' / '2025' / 'ev' / f'p{i}.jpg'
        src.parent.mkdir(parents=True, exist_ok=True)
        img = np.full((96, 96, 3), 40 * (i + 1), dtype=np.uint8)
        cv2.imwrite(str(src), img)
        thumb = tmp_path / 'build' / 'thumbnails' / '2025' / 'ev' / f'p{i}.png'
        thumb.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(thumb), img)
        photos['2025']['11.08 Sacramento vs Outlaws']['album'].append(
            {
                'source': f'photos/2025/ev/p{i}.jpg',
                'thumb': f'/thumbnails/2025/ev/p{i}.png',
                'original': f'/photos/2025/ev/p{i}.jpg',
                'subjects': [{'x': 0.5, 'y': 0.5, 'w': 0.4, 'h': 0.6}],
                'faces': [{'x': 0.5, 'y': 0.25, 'w': 0.18, 'h': 0.18}],
            }
        )

    (tmp_path / 'data').mkdir(exist_ok=True)
    photos_path = tmp_path / 'data' / 'photos.json'
    photos_path.write_text(json.dumps(photos), encoding='utf-8')

    rc = runner.main(
        [
            '--stages',
            'bursts,teams,roles,numbers,clip,alt',
            '--workers',
            '2',
            '--executor',
            'inline',
        ]
    )
    assert rc == 0

    sidecar_file = tmp_path / 'public' / 'data' / 'tags' / '2025' / '11-08-sacramento-vs-outlaws.json'
    assert sidecar_file.exists()
    sidecar = json.loads(sidecar_file.read_text(encoding='utf-8'))
    assert sidecar['v'] == 1
    assert sidecar['vocab'] == list(VOCAB_13)
    assert '0' in sidecar['photos'] and '1' in sidecar['photos']
    assert sidecar['photos']['0']['a']
    assert sidecar['photos']['0']['s'] == [['2025', '11-08-sacramento-vs-outlaws', 1]]

    # Test label_crops extractor
    crops_res = extract_crops(photos_file=photos_path, out_dir=tmp_path / 'data' / 'labeling', limit=10)
    assert crops_res['extracted'] == 2
    assert (tmp_path / 'data' / 'labeling' / 'index.html').exists()

    # Test eval harness
    eval_rc = ml_eval.main(
        [
            '--db',
            str(tmp_path / 'data' / 'ml_labels.sqlite'),
            '--report',
            str(tmp_path / 'reports' / 'ml' / 'eval.md'),
        ]
    )
    assert eval_rc == 0
    assert (tmp_path / 'reports' / 'ml' / 'eval.md').exists()
