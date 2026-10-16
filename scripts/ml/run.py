"""Incremental ML pipeline runner.

  python scripts/ml/run.py                    process uncached photos for every stage, update photos.json
  python scripts/ml/run.py --stages subjects  only the listed stages
  python scripts/ml/run.py --sample 500       benchmark 500 random photos (implies --force --dry-run)
  python scripts/ml/run.py --sample 500 --budget
                                              project a full 12k reprocess against the 2-hour budget
                                              (writes reports/ml/budget.md, exits 1 if over)
  python scripts/ml/run.py --stats            cache statistics
  python scripts/ml/run.py --gc               drop results for deleted photos / old fingerprints

Results are cached in data/ml_cache.sqlite keyed by (sha256 of the source JPEG, stage,
stage fingerprint). Renaming or moving photos never recomputes; editing a photo or changing a
stage's params/models/version recomputes exactly what changed. Each photo is decoded once per
run and fed to every stage that needs it.
"""

import argparse
import concurrent.futures
import json
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2  # noqa: E402

from pathlib import Path  # noqa: E402

from ml import budget as bud  # noqa: E402
from ml import photos as ph  # noqa: E402
from ml.cache import MLCache  # noqa: E402
from ml.export_sidecars import export_all_sidecars  # noqa: E402
from ml.hashing import resolve_hashes, sha256_file  # noqa: E402
from ml.runtime import TIMERS  # noqa: E402
from ml.scheduler import run_inline, run_pipelined  # noqa: E402
from ml.stages.alt_text import AltTextStage  # noqa: E402
from ml.stages.bursts import BurstsStage  # noqa: E402
from ml.stages.clip import ClipStage  # noqa: E402
from ml.stages.numbers import NumbersStage  # noqa: E402
from ml.stages.roles import RolesStage  # noqa: E402
from ml.stages.subjects import SubjectsStage  # noqa: E402
from ml.stages.teams import TeamsStage  # noqa: E402

CACHE_PATH = os.path.join('data', 'ml_cache.sqlite')
BUDGET_REPORT = os.path.join('reports', 'ml', 'budget.md')
SIDECAR_DIR = os.path.join('public', 'data', 'tags')
SIDECAR_STAGE_NAMES = ('bursts', 'teams', 'roles', 'numbers', 'clip', 'alt')
STAGES = {
    'subjects': SubjectsStage,
    'bursts': BurstsStage,
    'teams': TeamsStage,
    'roles': RolesStage,
    'numbers': NumbersStage,
    'clip': ClipStage,
    'alt': AltTextStage,
}


def parse_args(argv=None):
    default_stages = ','.join(s for s in STAGES if s != 'alt') or ','.join(STAGES)
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--stages', default=default_stages, help=f'comma-separated ({", ".join(STAGES)})')
    p.add_argument('--event', default=None, help='only process a specific <year>/<event> folder')
    p.add_argument('--force', action='store_true', help='ignore cached results and recompute')
    p.add_argument('--limit', type=int, default=0, help='only process the first N uncached photos')
    p.add_argument('--sample', type=int, default=0,
                   help='benchmark N random photos (seeded); implies --force --dry-run')
    p.add_argument('--budget', action='store_true',
                   help='with --sample: project a full reprocess against the 2-hour budget')
    p.add_argument('--dry-run', action='store_true', help='do not write photos.json, exports or results')
    p.add_argument('--cpu', action='store_true', help='disable GPU inference')
    p.add_argument('--workers', type=int, default=os.cpu_count() or 8)
    p.add_argument('--executor', choices=('pipelined', 'inline'), default='pipelined')
    p.add_argument('--gc', action='store_true', help='delete orphaned and outdated cache rows')
    p.add_argument('--stats', action='store_true', help='print cache statistics and exit')
    p.add_argument('--cache', default=CACHE_PATH, help=argparse.SUPPRESS)
    args = p.parse_args(argv)
    if args.budget and not args.sample:
        args.sample = 500
    if args.sample:
        args.force = True
        args.dry_run = True
    return args


def print_stats(cache):
    s = cache.stats()
    print(f'ML cache {cache.path}: {s["bytes"] / 1e6:.1f} MB, {s["memo"]} memoised hashes')
    for stage, fp, n, payload, blob in s['stages']:
        print(f'  {stage:<12} {fp}  {n:>6} rows  {payload / 1e6:6.1f} MB json  {blob / 1e6:6.1f} MB blob')


def print_breakdown(n, wall, workers):
    print(f'Breakdown ({n} photos, {wall:.1f}s wall, {n / max(wall, 1e-6):.1f} img/s; '
          f'thread-seconds summed across {workers} workers):')
    for key, total in sorted(TIMERS.totals.items()):
        if key == 'wall':
            continue
        print(f'  {key:<28} {total:8.1f}s  {1000 * total / max(1, n):7.1f} ms/photo')
    gpu_busy = sum(v for k, v in TIMERS.totals.items() if k.startswith('infer.run.'))
    print(f'  GPU busy (sum of session.run / wall): {gpu_busy / max(wall, 1e-6):.0%}')


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')  # piped output on Windows is cp1252
        except (AttributeError, ValueError):
            pass
    args = parse_args(argv)
    cache = MLCache(args.cache)
    try:
        if args.stats:
            print_stats(cache)
            return 0
        return run(args, cache)
    finally:
        cache.close()


def import_legacy(cache, stage, fp, items, key_by_thumb):
    """One-time import of pre-cache .faces_cache.json entries whose thumbnail is unchanged."""
    if stage.name != 'subjects' or cache.has_stage_history(stage.name):
        return 0
    legacy = ph.load_legacy_faces()
    n = 0
    for thumb, entry in legacy.items():
        it = items.get(thumb)
        key = key_by_thumb.get(thumb)
        if not it or not key or entry.get('v') != stage.version or not os.path.exists(it['thumb_path']):
            continue
        if entry.get('sig') != ph.file_signature(it['thumb_path']):
            continue
        cache.put(stage.name, fp, key, ph.legacy_payload(entry))
        n += 1
    cache.flush()
    return n


def run(args, cache):
    if not os.path.exists(ph.PHOTOS_FILE):
        print('photos.json not found.')
        return 0
    cv2.setNumThreads(1)  # parallelism comes from the worker pools

    names = [s.strip() for s in args.stages.split(',') if s.strip()]
    unknown = [n for n in names if n not in STAGES]
    if unknown:
        print(f'Unknown stage(s): {", ".join(unknown)}')
        return 2
    stages = [STAGES[n](use_gpu=not args.cpu) for n in names]

    with open(ph.PHOTOS_FILE, 'r', encoding='utf-8') as f:
        photos_data = json.load(f)
    items = ph.collect(photos_data, event_filter=getattr(args, 'event', None))

    # --- content hashes ------------------------------------------------------
    t0 = time.time()
    sources = sorted({it['source'] for it in items.values() if it['source']})
    hashes, n_hashed = resolve_hashes(cache, sources, workers=min(16, args.workers))
    key_by_thumb = {}
    missing_source = missing_thumb = 0
    for thumb, it in items.items():
        key = hashes.get(it['source']) if it['source'] else None
        if key is None:
            missing_source += 1
            continue
        key_by_thumb[thumb] = key
        if not os.path.exists(it['thumb_path']):
            missing_thumb += 1
    print(f'ML pipeline: {len(items)} photos, {len(set(key_by_thumb.values()))} unique sources '
          f'({n_hashed} hashed in {time.time() - t0:.1f}s), {missing_source} missing sources, '
          f'{missing_thumb} missing thumbnails')

    # --- per-stage lookup ----------------------------------------------------
    path_by_key = {}
    for thumb, key in key_by_thumb.items():
        if key not in path_by_key and os.path.exists(items[thumb]['thumb_path']):
            path_by_key[key] = items[thumb]['thumb_path']
    keys = set(key_by_thumb.values())
    fps, results, blobs, todo_by_stage = {}, {}, {}, {}
    for stage in stages:
        fp = fps[stage.name] = stage.fingerprint()
        if not args.dry_run:
            cache.register_stage(stage.name, fp, stage.params)
            imported = import_legacy(cache, stage, fp, items, key_by_thumb)
            if imported:
                print(f'[{stage.name}] imported {imported} entries from {ph.LEGACY_FACES_CACHE}')
        if args.force:
            results[stage.name] = {}
            blobs[stage.name] = {}
        elif stage.name == 'clip':
            raw_many = cache.get_many(stage.name, fp, keys, with_blob=True)
            results[stage.name] = {k: v[0] for k, v in raw_many.items()}
            blobs[stage.name] = {k: v[1] for k, v in raw_many.items()}
        else:
            results[stage.name] = cache.get_many(stage.name, fp, keys)
            blobs[stage.name] = {}
        todo_by_stage[stage.name] = {k for k in path_by_key if k not in results[stage.name]}

    # Wire shared lookups (subjects, event metadata, junior bout flags) into stages that accept them
    subject_lookup = dict(results.get('subjects', {}))
    if not subject_lookup and 'subjects' in STAGES and STAGES['subjects'] is SubjectsStage:
        subj_fp = SubjectsStage(use_gpu=not args.cpu).fingerprint()
        subject_lookup = cache.get_many('subjects', subj_fp, keys)

    role_lookup = dict(results.get('roles', {}))
    team_lookup = dict(results.get('teams', {}))
    numbers_lookup = dict(results.get('numbers', {}))
    clip_lookup = dict(results.get('clip', {}))
    event_teams_lookup = {}
    junior_bout_lookup = {}
    event_meta_lookup = {}
    for thumb, it in items.items():
        key = key_by_thumb.get(thumb)
        if not key:
            continue
        # Populate fallback subject boxes from existing photo records if not in cache
        if key not in subject_lookup and it['photos']:
            p0 = it['photos'][0]
            if p0.get('subjects') or p0.get('faces'):
                subject_lookup[key] = {
                    'subjects': p0.get('subjects') or [],
                    'faces': p0.get('faces') or [],
                }
        event_teams_lookup[key] = it.get('teams') or []
        junior_bout_lookup[key] = bool(it.get('is_junior_bout', False))
        event_meta_lookup[key] = {
            'year': it.get('year', ''),
            'event_name': it.get('event_name', ''),
            'teams': it.get('teams') or [],
            'isJuniorBout': bool(it.get('is_junior_bout', False)),
        }

    for stage in stages:
        if hasattr(stage, '_subject_lookup'):
            stage._subject_lookup = subject_lookup
        if hasattr(stage, '_event_teams_lookup'):
            stage._event_teams_lookup = event_teams_lookup
        if hasattr(stage, '_junior_bout_lookup'):
            stage._junior_bout_lookup = junior_bout_lookup
        if hasattr(stage, '_role_lookup'):
            stage._role_lookup = role_lookup
        if hasattr(stage, '_team_lookup'):
            stage._team_lookup = team_lookup
        if hasattr(stage, '_numbers_lookup'):
            stage._numbers_lookup = numbers_lookup
        if hasattr(stage, '_clip_lookup'):
            stage._clip_lookup = clip_lookup
        if hasattr(stage, '_event_meta_lookup'):
            stage._event_meta_lookup = event_meta_lookup

    # One work item per photo, listing every stage that still needs it (decode once).
    todo_keys = sorted(set().union(*todo_by_stage.values())) if stages else []
    if args.limit:
        todo_keys = todo_keys[:args.limit]
    if args.sample:
        todo_keys = sorted(random.Random(0).sample(todo_keys, min(args.sample, len(todo_keys))))
    work = []
    for key in todo_keys:
        needed = [s for s in stages if key in todo_by_stage[s.name]]
        work.append((key, path_by_key[key], needed))
    for stage in stages:
        n = sum(1 for w in work if stage in w[2])
        print(f'[{stage.name}] fingerprint {fps[stage.name]}: {len(results[stage.name])} cached, {n} to process')

    # --- process -------------------------------------------------------------
    wall = 0.0
    if work:
        active = [s for s in stages if any(s in w[2] for w in work)]
        for s in active:
            s.load()
            print(f'  [{s.name}] {s.describe()}')
        executor = 'inline' if args.cpu else args.executor
        print(f'  executor={executor} workers={args.workers}')
        TIMERS.clear()
        failed = {s.name: 0 for s in stages}
        counts = {s.name: {} for s in stages}
        start = time.time()
        runner = run_inline(work, args.workers) if executor == 'inline' else run_pipelined(work, args.workers)
        for done, item in enumerate(runner, 1):
            for stage in item.stages:
                payload, err = item.results.get(stage.name, (None, RuntimeError('no result')))
                if err is not None or payload is None:
                    failed[stage.name] += 1
                    print(f'  [{stage.name}] error processing {item.thumb_path}: {err}')
                    continue
                blob = payload.pop('_blob', None) if isinstance(payload, dict) else None
                results[stage.name][item.key] = payload
                if blob is not None:
                    blobs.setdefault(stage.name, {})[item.key] = blob
                if stage.name == 'subjects':
                    subject_lookup[item.key] = payload
                elif stage.name == 'roles':
                    role_lookup[item.key] = payload
                elif stage.name == 'teams':
                    team_lookup[item.key] = payload
                elif stage.name == 'numbers':
                    numbers_lookup[item.key] = payload
                elif stage.name == 'clip':
                    clip_lookup[item.key] = payload
                if not args.dry_run:
                    cache.put(stage.name, fps[stage.name], item.key, payload, blob=blob)
                k = stage.summary_key(payload)
                counts[stage.name][k] = counts[stage.name].get(k, 0) + 1
            if done % 500 == 0 or done == len(work):
                rate = done / max(1e-6, time.time() - start)
                print(f'  {done}/{len(work)} ({rate:.1f} img/s) ' +
                      ' '.join(f'{n}={c}' for n, c in counts.items() if c))
        cache.flush()
        wall = time.time() - start
        print(f'Processed {len(work)} photos in {wall:.1f}s; failures: {failed}')
        print_breakdown(len(work), wall, args.workers)

    # --- apply ---------------------------------------------------------------
    by_thumb_all = {}
    blobs_by_thumb = {}
    for stage in stages:
        payload_by_thumb, coverage = {}, {}
        for thumb, it in items.items():
            key = key_by_thumb.get(thumb)
            payload = results[stage.name].get(key) if key else None
            if payload is not None:
                payload_by_thumb[thumb] = payload
            if stage.name == 'clip' and key and key in blobs.get('clip', {}):
                blobs_by_thumb[thumb] = blobs['clip'][key]
            for photo in it['photos']:
                stage.apply(photo, payload)
            k = stage.summary_key(payload)
            coverage[k] = coverage.get(k, 0) + 1
        by_thumb_all[stage.name] = payload_by_thumb
        total = max(1, len(items))
        print(f'[{stage.name}] coverage: ' +
              ', '.join(f'{k}={v} ({v / total:.1%})' for k, v in sorted(coverage.items())))
        if stage.name == 'subjects' and not args.dry_run:
            n = ph.export_faces_cache(items, payload_by_thumb)
            print(f'[{stage.name}] exported {n} entries to {ph.LEGACY_FACES_CACHE}')

    if args.gc and not args.dry_run:
        removed = cache.gc(keys, fps, live_paths=set(sources))
        print(f'GC: removed {removed["results"]} result rows, {removed["memo"]} hash memo rows')

    exit_code = 0
    if args.budget:
        exit_code = report_budget(stages, len(work), wall, args.workers, sources)

    ph.refresh_burst_focus(photos_data)
    ph.select_heroes(photos_data)
    if args.dry_run:
        print('Dry run: nothing written.')
        return exit_code
    ph.save_json(ph.PHOTOS_FILE, photos_data, indent=2)

    if any(n in SIDECAR_STAGE_NAMES for n in names):
        sidecars_written = export_all_sidecars(
            Path(ph.PHOTOS_FILE),
            Path(SIDECAR_DIR),
            bursts_by_key=by_thumb_all.get('bursts', {}),
            teams_by_key=by_thumb_all.get('teams', {}),
            roles_by_key=by_thumb_all.get('roles', {}),
            numbers_by_key=by_thumb_all.get('numbers', {}),
            clip_by_key=by_thumb_all.get('clip', {}),
            clip_blobs_by_key=blobs_by_thumb,
            alt_by_key=by_thumb_all.get('alt', {}),
            event_filter=getattr(args, 'event', None),
        )
        print(f'[sidecars] exported {sidecars_written} event tag sidecar(s) to {SIDECAR_DIR}')

    # Per-photo failures are logged, not fatal (a bad file must not break the build).
    return exit_code


def measure_cold_hash(sources, workers, sample=300):
    """Projected seconds to sha256 TARGET_PHOTOS sources from scratch (ignores the memo)."""
    picked = random.Random(1).sample(sources, min(sample, len(sources)))
    if not picked:
        return 0.0
    t = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(sha256_file, picked))
    return (time.perf_counter() - t) / len(picked) * bud.TARGET_PHOTOS


def report_budget(stages, n, wall, workers, sources):
    if not n:
        print('Budget: nothing was processed; run with --sample N.')
        return 1
    per_photo = wall / n
    # Attribute the shared pass to stages by GPU time (the pass is GPU-bound) plus CPU time / workers.
    costs = {}
    for s in stages:
        gpu = sum(TIMERS.totals.get(f'infer.run.{getattr(m, "name", k)}', 0.0) for k, m in s.models.items())
        cpu = (TIMERS.totals.get(f'pre.{s.name}', 0.0) + TIMERS.totals.get(f'post.{s.name}', 0.0)) / workers
        costs[s.name] = gpu + cpu
    total_cost = sum(costs.values()) or 1.0
    measured = {name: per_photo * bud.TARGET_PHOTOS * c / total_cost for name, c in costs.items()}
    measured['hash'] = measure_cold_hash(sources, min(16, workers))
    rows, total, ok = bud.evaluate(measured)
    md = bud.render(rows, total, ok, n, n / max(wall, 1e-6))
    os.makedirs(os.path.dirname(BUDGET_REPORT), exist_ok=True)
    with open(BUDGET_REPORT, 'w', encoding='utf-8') as f:
        f.write(md)
    print('\n' + md)
    print(f'Budget report: {BUDGET_REPORT}')
    if not ok:
        print('❌ ML reprocess budget exceeded.')
        return 1
    print('✅ ML reprocess budget OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
