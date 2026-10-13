"""End-to-end runner behaviour on a tiny synthetic library (no models needed)."""

import json
import os

import cv2
import numpy as np
import pytest

from ml import run as runner
from ml.stage import Stage


class MeanStage(Stage):
    """Deterministic fake stage: no models, payload = mean pixel value."""
    name = 'mean'
    version = 1
    recipe = 'thumb'
    calls = 0

    def __init__(self, use_gpu=True):
        super().__init__()
        self.param = 1

    @property
    def params(self):
        return {'param': self.param}

    def describe(self):
        return 'mean'

    def requests(self, decoded):
        return []

    def postprocess(self, decoded, reqs, outputs):
        MeanStage.calls += 1
        return {'mean': round(float(decoded.img.mean()), 3)}

    def apply(self, photo, payload):
        photo.pop('mean', None)
        if payload:
            photo['mean'] = payload['mean']

    @staticmethod
    def summary_key(payload):
        return 'ok' if payload else 'none'


def _write_library(root, names):
    photos = {'2026': {'bout': {'album': []}}}
    for i, name in enumerate(names):
        src = root / 'photos' / '2026' / 'bout' / f'{name}.jpg'
        src.parent.mkdir(parents=True, exist_ok=True)
        src.write_bytes(f'source-bytes-{name}'.encode())
        thumb = root / 'build' / 'thumbnails' / '2026' / 'bout' / f'{name}.png'
        thumb.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(thumb), np.full((8, 8, 3), 10 * (i + 1), np.uint8))
        photos['2026']['bout']['album'].append({
            'source': f'photos/2026/bout/{name}.jpg',
            'thumb': f'/thumbnails/2026/bout/{name}.png',
            'original': f'/photos/2026/bout/{name}.jpg',
        })
    (root / 'data').mkdir(exist_ok=True)
    (root / 'data' / 'photos.json').write_text(json.dumps(photos))
    return photos


@pytest.fixture
def lib(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(runner, 'STAGES', {'mean': MeanStage})
    MeanStage.calls = 0
    _write_library(tmp_path, ['a', 'b', 'c'])
    return tmp_path


def _run(*extra):
    return runner.main(['--stages', 'mean', '--workers', '2', '--executor', 'inline', *extra])


def _photos(root):
    return json.loads((root / 'data' / 'photos.json').read_text())['2026']['bout']['album']


def test_first_run_processes_then_second_run_is_fully_cached(lib):
    assert _run() == 0
    assert MeanStage.calls == 3
    assert [p['mean'] for p in _photos(lib)] == [10.0, 20.0, 30.0]
    assert _run() == 0
    assert MeanStage.calls == 3


def test_renaming_a_photo_reuses_its_cached_result(lib):
    _run()
    data = json.loads((lib / 'data' / 'photos.json').read_text())
    photo = data['2026']['bout']['album'][0]
    os.replace(lib / 'photos/2026/bout/a.jpg', lib / 'photos/2026/bout/renamed.jpg')
    os.replace(lib / 'build/thumbnails/2026/bout/a.png', lib / 'build/thumbnails/2026/bout/renamed.png')
    photo['source'] = 'photos/2026/bout/renamed.jpg'
    photo['thumb'] = '/thumbnails/2026/bout/renamed.png'
    photo.pop('mean')
    (lib / 'data' / 'photos.json').write_text(json.dumps(data))
    _run()
    assert MeanStage.calls == 3
    assert _photos(lib)[0]['mean'] == 10.0


def test_editing_source_bytes_recomputes_only_that_photo(lib):
    _run()
    (lib / 'photos/2026/bout/b.jpg').write_bytes(b'edited in lightroom')
    _run()
    assert MeanStage.calls == 4


def test_param_change_recomputes_everything_without_version_bump(lib, monkeypatch):
    _run()
    monkeypatch.setattr(MeanStage, 'params', property(lambda self: {'param': 2}))
    _run()
    assert MeanStage.calls == 6


def test_dry_run_and_sample_write_nothing(lib):
    before = (lib / 'data' / 'photos.json').read_text()
    _run('--dry-run')
    assert (lib / 'data' / 'photos.json').read_text() == before
    _run('--sample', '2')
    assert MeanStage.calls == 5
    _run()
    assert MeanStage.calls == 8  # nothing from the dry runs was cached


def test_pipelined_executor_matches_inline(lib):
    assert runner.main(['--stages', 'mean', '--workers', '2', '--executor', 'pipelined']) == 0
    assert [p['mean'] for p in _photos(lib)] == [10.0, 20.0, 30.0]


@pytest.mark.parametrize('executor', ['inline', 'pipelined'])
def test_stages_share_one_decode_and_only_missing_stages_run(lib, monkeypatch, executor):
    class Other(MeanStage):
        name = 'other'
        calls = 0

        def postprocess(self, decoded, reqs, outputs):
            Other.calls += 1
            return {'other': 1}

        def apply(self, photo, payload):
            photo['other'] = (payload or {}).get('other')

    from ml import scheduler
    decodes = []
    real = scheduler.load_bgr
    monkeypatch.setattr(scheduler, 'load_bgr', lambda p: decodes.append(p) or real(p))
    monkeypatch.setattr(runner, 'STAGES', {'mean': MeanStage, 'other': Other})
    args = ['--workers', '2', '--executor', executor]

    runner.main(['--stages', 'mean', *args])
    assert len(decodes) == 3 and MeanStage.calls == 3
    runner.main(['--stages', 'mean,other', *args])
    assert len(decodes) == 6 and MeanStage.calls == 3 and Other.calls == 3  # 'mean' cached
    decodes.clear()
    Other.calls = 0
    runner.main(['--stages', 'mean,other', '--force', *args])
    assert len(decodes) == 3 and Other.calls == 3  # both stages, one decode per photo
    assert all(p['other'] == 1 and 'mean' in p for p in _photos(lib))


def test_legacy_faces_cache_is_imported_once_and_export_has_no_sig(lib, monkeypatch):
    class FakeSubjects(MeanStage):
        name = 'subjects'
        version = 2

    monkeypatch.setattr(runner, 'STAGES', {'subjects': FakeSubjects})
    from ml import photos as ph
    thumbs = {p['thumb']: os.path.join('build', p['thumb'].lstrip('/')) for p in _photos(lib)}
    legacy = {t: {'mean': 99.0, 'v': 2, 'sig': ph.file_signature(path)} for t, path in thumbs.items()}
    first = next(iter(legacy))
    legacy[first]['sig'] = 'stale'  # thumbnail changed since: must be recomputed
    (lib / 'data' / '.faces_cache.json').write_text(json.dumps(legacy))

    assert runner.main(['--stages', 'subjects', '--workers', '2', '--executor', 'inline']) == 0
    assert MeanStage.calls == 1
    exported = json.loads((lib / 'data' / '.faces_cache.json').read_text())
    assert set(exported) == set(thumbs)
    assert all(e['v'] == 2 and 'sig' not in e for e in exported.values())
    assert exported[first]['mean'] == 10.0
    # Second run: the export is not re-imported and everything is cached.
    runner.main(['--stages', 'subjects', '--workers', '2', '--executor', 'inline'])
    assert MeanStage.calls == 1


def test_gc_removes_deleted_photos(lib):
    _run()
    data = json.loads((lib / 'data' / 'photos.json').read_text())
    data['2026']['bout']['album'].pop()
    (lib / 'data' / 'photos.json').write_text(json.dumps(data))
    _run('--gc')
    from ml.cache import MLCache
    with MLCache(os.path.join('data', 'ml_cache.sqlite')) as c:
        (_, _, rows, _, _), = c.stats()['stages']
    assert rows == 2
