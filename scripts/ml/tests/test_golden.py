"""Golden parity: the refactored subjects stage must reproduce the pre-refactor detector.

Expected outputs live in golden/subjects.json (generated from detectFaces.py ALGO_VERSION 2).
Photos are read from the local build/ and photos/ folders; entries whose files are missing or
whose source bytes changed are skipped, and the whole test skips on machines without photos.
"""

import json
import math
import os

import pytest

from ml.hashing import sha256_file
from ml.runtime import ort
from ml.scheduler import run_inline, run_pipelined
from ml.stages.subjects import SubjectsStage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GOLDEN = os.path.join(os.path.dirname(__file__), 'golden', 'subjects.json')

BOX_TOL = 0.002
CONF_TOL = 0.01
SCORE_RTOL = 1e-3


def _entries():
    with open(GOLDEN, encoding='utf-8') as f:
        data = json.load(f)
    usable = []
    for e in data['entries']:
        thumb = os.path.join(ROOT, 'build', e['thumb'].lstrip('/'))
        source = os.path.join(ROOT, e['source'])
        if os.path.exists(thumb) and os.path.exists(source) and sha256_file(source) == e['sourceSha256']:
            usable.append(e)
    return usable


ENTRIES = _entries()
pytestmark = pytest.mark.skipif(ort is None or len(ENTRIES) < 40, reason='onnxruntime or golden photos not available locally')


def _close(a, b, rtol):
    return math.isclose(a, b, rel_tol=rtol, abs_tol=1e-9)


def _boxes_match(got, exp):
    if len(got) != len(exp):
        return False
    for g, e in zip(got, exp):
        if any(abs(g[k] - e[k]) > BOX_TOL for k in ('x', 'y', 'w', 'h')):
            return False
        if abs(g['confidence'] - e['confidence']) > CONF_TOL:
            return False
    return True


def _mismatch(got, exp):
    if got is None:
        return 'no result'
    if got.get('src') != exp.get('src'):
        return f"src {got.get('src')} != {exp.get('src')}"
    for k in ('x', 'y'):
        if (got.get(k) is None) != (exp.get(k) is None) or (
                got.get(k) is not None and abs(got[k] - exp[k]) > BOX_TOL):
            return f'{k} {got.get(k)} != {exp.get(k)}'
    for k in ('score', 'recapScore'):
        if not _close(got.get(k, 0.0), exp.get(k, 0.0), SCORE_RTOL):
            return f'{k} {got.get(k)} != {exp.get(k)}'
    for k in ('faces', 'subjects'):
        if not _boxes_match(got.get(k, []), exp.get(k, [])):
            return f'{k} differ'
    return None


@pytest.fixture(scope='module')
def stage():
    s = SubjectsStage(use_gpu=True)
    s.load()
    return s


@pytest.mark.parametrize('executor', ['pipelined', 'inline'])
def test_golden_parity(stage, executor, monkeypatch):
    monkeypatch.chdir(ROOT)  # stage resolves build/processed/... relative to the repo root
    work = [(e['sourceSha256'], os.path.join('build', e['thumb'].lstrip('/')), [stage]) for e in ENTRIES]
    run = run_pipelined(work, workers=8) if executor == 'pipelined' else run_inline(work, workers=8)
    got = {item.key: item.results['subjects'][0] for item in run}
    failures = []
    for e in ENTRIES:
        why = _mismatch(got.get(e['sourceSha256']), e['expected'])
        if why:
            failures.append(f"{e['thumb']}: {why}")
    assert not failures, '\n'.join(failures)
    sources = {(got[e['sourceSha256']] or {}).get('src') or 'none' for e in ENTRIES}
    assert {'face', 'person', 'saliency', 'none'} <= sources  # fixture covers every branch
