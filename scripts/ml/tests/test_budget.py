from ml import budget as bud


def test_within_budget_passes_and_planned_rows_reserve_time():
    rows, total, ok = bud.evaluate({'hash': 10, 'subjects': 300})
    assert ok
    planned = sum(s['seconds'] for n, s in bud.BUDGET.items() if n not in ('hash', 'subjects'))
    assert total == 310 + planned
    assert total <= bud.TARGET_SECONDS


def test_stage_over_its_row_fails():
    rows, _, ok = bud.evaluate({'hash': 10, 'subjects': bud.BUDGET['subjects']['seconds'] + 1})
    assert not ok
    assert next(r for r in rows if r['name'] == 'subjects')['ok'] is False


def test_missing_measurement_for_measured_stage_fails():
    _, _, ok = bud.evaluate({'hash': 10})
    assert not ok


def test_unbudgeted_stage_fails():
    rows, _, ok = bud.evaluate({'hash': 10, 'subjects': 300, 'mystery': 5})
    assert not ok
    assert any(r['status'] == 'unbudgeted' for r in rows)


def test_budget_table_fits_target():
    assert sum(s['seconds'] for s in bud.BUDGET.values()) <= bud.TARGET_SECONDS


def test_render_mentions_exclusions():
    rows, total, ok = bud.evaluate({'hash': 10, 'subjects': 300})
    md = bud.render(rows, total, ok, 500, 33.0)
    assert '| subjects |' in md and 'alt text' in md.lower() and '**Total**' in md
