import os

import pytest

from ml.cache import MLCache
from ml.fingerprint import stage_fingerprint
from ml.hashing import resolve_hashes, sha256_file
from ml.stages import subjects


# -- fingerprints ------------------------------------------------------------

def test_fingerprint_is_stable_and_order_independent():
    a = stage_fingerprint('s', 1, {'a': 1, 'b': 0.5}, {'m': 'abc'}, 'r')
    b = stage_fingerprint('s', 1, {'b': 0.5, 'a': 1}, {'m': 'abc'}, 'r')
    assert a == b
    assert len(a) == 12


@pytest.mark.parametrize('change', [
    dict(version=2),
    dict(params={'a': 1, 'b': 0.51}),
    dict(models={'m': 'abd'}),
    dict(recipe='r2'),
    dict(name='t'),
])
def test_fingerprint_changes_with_any_input(change):
    base = dict(name='s', version=1, params={'a': 1, 'b': 0.5}, models={'m': 'abc'}, recipe='r')
    assert stage_fingerprint(**base) != stage_fingerprint(**{**base, **change})


def test_subjects_fingerprint_tracks_params_and_backend(monkeypatch):
    stage = subjects.SubjectsStage(use_gpu=False)
    fp = stage.fingerprint()
    monkeypatch.setitem(subjects.PARAMS, 'FACE_SCORE_MIN', 0.55)
    assert stage.fingerprint() != fp
    monkeypatch.setitem(subjects.PARAMS, 'FACE_SCORE_MIN', 0.5)
    assert stage.fingerprint() == fp
    stage.backend = 'ort' if stage.backend == 'opencv' else 'opencv'
    assert stage.fingerprint() != fp


def test_subjects_module_has_no_unlisted_tuning_constants():
    """Module-level numeric constants must live in PARAMS so they reach the fingerprint."""
    stray = [k for k, v in vars(subjects).items()
             if k.isupper() and isinstance(v, (int, float)) and not isinstance(v, bool)
             and k not in ('STAGE_VERSION',)]
    assert stray == []


# -- cache -------------------------------------------------------------------

@pytest.fixture
def cache(tmp_path):
    c = MLCache(str(tmp_path / 'c.sqlite'))
    yield c
    c.close()


def test_put_get_roundtrip_and_fingerprint_isolation(cache):
    cache.put('subjects', 'fp1', 'h1', {'x': 0.5})
    cache.put('subjects', 'fp1', 'h2', {'x': 0.25}, blob=b'\x00\x01')
    assert cache.get_many('subjects', 'fp1', ['h1', 'h2', 'h3']) == {'h1': {'x': 0.5}, 'h2': {'x': 0.25}}
    assert cache.get_many('subjects', 'fp1', ['h2'], with_blob=True) == {'h2': ({'x': 0.25}, b'\x00\x01')}
    assert cache.get_many('subjects', 'fp2', ['h1']) == {}
    assert cache.get_many('other', 'fp1', ['h1']) == {}


def test_get_many_handles_more_hashes_than_sqlite_variable_limit(cache):
    for i in range(1200):
        cache.put('s', 'f', f'h{i}', {'i': i})
    got = cache.get_many('s', 'f', [f'h{i}' for i in range(1500)])
    assert len(got) == 1200 and got['h1199'] == {'i': 1199}


def test_uncommitted_rows_are_bounded_by_commit_every(tmp_path):
    path = str(tmp_path / 'c.sqlite')
    c = MLCache(path, commit_every=4)
    for i in range(10):
        c.put('s', 'f', f'h{i}', {'i': i})
    # Simulate a crash: a second connection sees only committed rows (8 of 10).
    other = MLCache(path)
    assert len(other.get_many('s', 'f', [f'h{i}' for i in range(10)])) == 8
    other.close()
    c.close()


def test_gc_drops_orphans_and_old_fingerprints(cache):
    cache.put('subjects', 'old', 'h1', {})
    cache.put('subjects', 'new', 'h1', {})
    cache.put('subjects', 'new', 'gone', {})
    cache.put('tags', 'any', 'h1', {})
    cache.memo_put_many([('a.jpg', 1, 1, 'h1'), ('b.jpg', 1, 1, 'gone')])
    removed = cache.gc({'h1'}, {'subjects': 'new'}, live_paths={'a.jpg'})
    assert removed == {'results': 2, 'memo': 1}
    assert cache.get_many('subjects', 'new', ['h1', 'gone']) == {'h1': {}}
    assert cache.get_many('tags', 'any', ['h1']) == {'h1': {}}  # stages not listed are untouched
    assert cache.has_stage_history('subjects')


# -- hashing -----------------------------------------------------------------

def test_hash_memo_skips_unchanged_and_rehashes_changed(cache, tmp_path):
    p = tmp_path / 'a.jpg'
    p.write_bytes(b'hello')
    hashes, n = resolve_hashes(cache, [str(p)])
    assert n == 1 and hashes[str(p)] == sha256_file(str(p))
    _, n = resolve_hashes(cache, [str(p)])
    assert n == 0
    p.write_bytes(b'hellp')  # same size, new mtime + content
    os.utime(p, ns=(1, 1))
    hashes2, n = resolve_hashes(cache, [str(p)])
    assert n == 1 and hashes2[str(p)] != hashes[str(p)]


def test_missing_files_are_omitted(cache, tmp_path):
    hashes, n = resolve_hashes(cache, [str(tmp_path / 'nope.jpg')])
    assert hashes == {} and n == 0
