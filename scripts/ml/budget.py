"""Time budget for a full ML reprocess: 12,000 photos in under 2 hours.

Implemented stages are measured (via `run.py --sample N --budget`) and projected to 12k photos;
planned stages reserve their budget so the total stays honest as taggers land. The VLM alt-text
job is excluded from the 2-hour target and runs as its own resumable job (roadmap decision).
"""

TARGET_PHOTOS = 12_000
TARGET_SECONDS = 2 * 60 * 60

# seconds for TARGET_PHOTOS; 'measured' stages must stay within their row
BUDGET = {
    'hash': {'seconds': 60, 'status': 'measured', 'note': 'sha256 of every source (cold)'},
    'subjects': {'seconds': 480, 'status': 'measured', 'note': 'SCRFD-10G tiled + YOLOX-L + scoring'},
    'phash': {'seconds': 180, 'status': 'planned', 'note': 'perceptual hash + burst sharpness'},
    'clip': {'seconds': 600, 'status': 'planned', 'note': 'CLIP image embed + zero-shot tags (batch 32)'},
    'jammer': {'seconds': 480, 'status': 'planned', 'note': 'jammer/pivot YOLO (batch 16)'},
    'ocr': {'seconds': 1200, 'status': 'planned', 'note': 'jersey OCR on person crops (batched)'},
    'headroom': {'seconds': 300, 'status': 'reserve', 'note': 'I/O, photos.json, variance'},
}
EXCLUDED = {'alt_text': 'VLM alt text: separate resumable job, not part of the 2-hour target'}


def evaluate(measured):
    """measured: {row: projected seconds for TARGET_PHOTOS}. Returns (rows, total, ok)."""
    rows, total, ok = [], 0.0, True
    for name, spec in BUDGET.items():
        if name in measured:
            secs = measured[name]
            row_ok = secs <= spec['seconds']
            status = 'measured'
        else:
            secs = float(spec['seconds'])
            row_ok = spec['status'] != 'measured'  # a measured row with no measurement is a failure
            status = spec['status'] if row_ok else 'missing'
        ok &= row_ok
        total += secs
        rows.append({'name': name, 'budget': spec['seconds'], 'projected': secs, 'status': status,
                     'ok': row_ok, 'note': spec['note']})
    for name, secs in measured.items():
        if name not in BUDGET:
            rows.append({'name': name, 'budget': 0, 'projected': secs, 'status': 'unbudgeted',
                         'ok': False, 'note': 'add a BUDGET row for this stage'})
            ok = False
            total += secs
    ok &= total <= TARGET_SECONDS
    return rows, total, ok


def fmt(secs):
    m, s = divmod(int(round(secs)), 60)
    return f'{m}m {s:02d}s'


def render(rows, total, ok, sample_n, rate):
    lines = [
        f'# ML reprocess budget: {TARGET_PHOTOS:,} photos in {fmt(TARGET_SECONDS)}',
        '',
        f'Projected from a {sample_n}-photo sample ({rate:.1f} img/s through the shared pass).',
        '',
        '| Stage | Budget | Projected | Status | Notes |',
        '|---|---:|---:|---|---|',
    ]
    for r in rows:
        mark = '✅' if r['ok'] else '❌'
        lines.append(f"| {r['name']} | {fmt(r['budget'])} | {fmt(r['projected'])} | {mark} {r['status']} | {r['note']} |")
    lines += [
        f"| **Total** | **{fmt(TARGET_SECONDS)}** | **{fmt(total)}** | {'✅' if ok else '❌'} | |",
        '',
        *(f'- Excluded: {v}' for v in EXCLUDED.values()),
        '',
    ]
    return '\n'.join(lines)
