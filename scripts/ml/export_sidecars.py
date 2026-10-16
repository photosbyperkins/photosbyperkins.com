"""Exports compact lazy per-event ML tag sidecars to `/public/data/tags/<year>/<slug>.json`.

Also performs event/burst-level post-processing across cached per-photo ML payloads:
  1. Burst Best-Shot Ranking (`b: 1`, `bestFrameIndex`, `frameQualityScores`)
  2. Burst Consensus Boost for jersey OCR (`conf >= 0.72` across >= 2 burst frames -> promoted)
  3. 2-Cluster CIE L*a*b* K-Means fallback when `event.json` lacks explicit `jerseyColorHex`
  4. Top-12 Similar-Photo Neighbor assignment (`s: [[year, slug, idx], ...]`)
  5. Metadata-grounded 12-28 word alt text (`a: str`)
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

from .neighbors import compute_top_neighbors
from .stages.alt_text import synthesize_grounded_alt_text
from .stages.clip import VOCAB_13
from .stages.teams import assign_team_for_lab, hex_to_cie_lab, kmeans_2cluster_lab


def slugify_label(text: str) -> str:
    s = (text or '').strip().lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-') or 'event'


def apply_burst_consensus_numbers(
    album: list[dict[str, Any]],
    numbers_by_key: dict[str, dict[str, Any]],
    is_junior_bout: bool = False,  # noqa: ARG001
) -> dict[str, list[str]]:
    """Applies Burst Consensus Boost across frames sharing a `burst.id`."""

    # Group photo keys by burst.id
    burst_groups: dict[str, list[str]] = {}
    for item in album:
        if not isinstance(item, dict):
            continue
        key = str(item.get('thumb') or '')
        if not key:
            continue
        burst = item.get('burst')
        if isinstance(burst, dict) and burst.get('id'):
            b_id = str(burst['id'])
            burst_groups.setdefault(b_id, []).append(key)

    consensus_by_burst: dict[str, list[str]] = {}
    for b_id, keys in burst_groups.items():
        if len(keys) < 2:
            continue
        counts: Counter[str] = Counter()
        for k in keys:
            payload = numbers_by_key.get(k) or {}
            frame_nums = {
                str(entry.get('num'))
                for entry in (payload.get('numbers') or []) + (payload.get('candidates') or [])
                if entry.get('num') and float(entry.get('conf', 0.0)) >= 0.72
            }
            for num in frame_nums:
                counts[num] += 1
        promoted = [num for num, cnt in counts.most_common() if cnt >= 2]
        if promoted:
            consensus_by_burst[b_id] = promoted

    final_numbers: dict[str, list[str]] = {}
    for item in album:
        if not isinstance(item, dict):
            continue
        key = str(item.get('thumb') or '')
        if not key:
            continue
        payload = numbers_by_key.get(key) or {}
        emitted = [
            str(e.get('num'))
            for e in (payload.get('numbers') or [])
            if e.get('num') and float(e.get('conf', 0.0)) >= 0.85
        ]
        burst = item.get('burst')
        b_id = str(burst.get('id')) if isinstance(burst, dict) and burst.get('id') else ''
        for c_num in consensus_by_burst.get(b_id, []):
            if c_num not in emitted:
                emitted.append(c_num)
        final_numbers[key] = emitted[:3]

    return final_numbers


def rank_event_bursts(
    album: list[dict[str, Any]],
    bursts_by_key: dict[str, dict[str, Any]],
) -> set[str]:
    """Ranks frames within each burst by `qualityScore` and updates `burst.bestFrameIndex` in-place.

    Returns the set of photo `thumb` keys that are the highest-ranked frame in their burst.
    """
    # Map frame source path -> thumb key and quality score
    source_to_thumb: dict[str, str] = {}
    for item in album:
        if not isinstance(item, dict):
            continue
        thumb = str(item.get('thumb') or '')
        orig = str(item.get('original') or '')
        src = str(item.get('source') or '')
        if thumb:
            source_to_thumb[thumb] = thumb
            if orig:
                source_to_thumb[orig] = thumb
            if src:
                source_to_thumb[src] = thumb

    best_keys: set[str] = set()
    burst_members: dict[str, list[tuple[int, str, float, dict[str, Any]]]] = {}

    for idx, item in enumerate(album):
        if not isinstance(item, dict):
            continue
        thumb = str(item.get('thumb') or '')
        q_payload = bursts_by_key.get(thumb) or {}
        q_score = float(q_payload.get('qualityScore', 0.5))
        item['qualityScore'] = round(q_score, 4)

        burst = item.get('burst')
        if isinstance(burst, dict) and burst.get('id'):
            b_id = str(burst['id'])
            burst_members.setdefault(b_id, []).append((idx, thumb, q_score, item))

            # Also populate frameQualityScores and bestFrameIndex across burst.frameSources
            frame_sources = burst.get('frameSources') or []
            frame_thumbs = burst.get('frameThumbs') or []
            if frame_sources:
                frame_scores: list[float] = []
                for f_idx, f_src in enumerate(frame_sources):
                    f_thumb = (
                        frame_thumbs[f_idx]
                        if f_idx < len(frame_thumbs) and frame_thumbs[f_idx]
                        else source_to_thumb.get(str(f_src), '')
                    )
                    fq = float((bursts_by_key.get(f_thumb) or {}).get('qualityScore', q_score))
                    frame_scores.append(round(fq, 4))
                burst['frameQualityScores'] = frame_scores
                best_f_idx = int(max(range(len(frame_scores)), key=lambda i: frame_scores[i]))
                burst['bestFrameIndex'] = best_f_idx

    for _b_id, members in burst_members.items():
        best_member = max(members, key=lambda m: (m[2], -m[0]))
        best_keys.add(best_member[1])
        for _idx, m_thumb, _q, m_item in members:
            if m_thumb == best_member[1]:
                m_item['bestInBurst'] = True
            else:
                m_item.pop('bestInBurst', None)

    return best_keys


def resolve_event_teams(
    album: list[dict[str, Any]],
    teams_meta: list[dict[str, Any]],
    teams_by_key: dict[str, dict[str, Any]],
    roles_by_key: dict[str, dict[str, Any]],
) -> dict[str, int | None]:
    """Resolves `teamIdx` (0, 1, or None) for each photo in an event album."""
    lab0 = hex_to_cie_lab(str(teams_meta[0].get('jerseyColorHex') or '')) if len(teams_meta) >= 1 else None
    lab1 = hex_to_cie_lab(str(teams_meta[1].get('jerseyColorHex') or '')) if len(teams_meta) >= 2 else None

    if not (lab0 and lab1):
        # Fallback: 2-cluster k-means over non-referee torsoLab vectors in this bout
        candidate_labs: list[list[float]] = []
        for item in album:
            if not isinstance(item, dict):
                continue
            key = str(item.get('thumb') or '')
            role = (roles_by_key.get(key) or {}).get('role')
            t_payload = teams_by_key.get(key) or {}
            if role in ('ref', 'spectator') or float(t_payload.get('refStripeScore', 0.0)) >= 0.72:
                continue
            t_lab = t_payload.get('torsoLab')
            if isinstance(t_lab, list) and len(t_lab) == 3:
                candidate_labs.append(t_lab)
        clusters = kmeans_2cluster_lab(candidate_labs)
        if clusters is not None:
            lab0, lab1 = clusters

    resolved: dict[str, int | None] = {}
    for item in album:
        if not isinstance(item, dict):
            continue
        key = str(item.get('thumb') or '')
        role = (roles_by_key.get(key) or {}).get('role')
        if role in ('ref', 'spectator'):
            resolved[key] = None
            continue
        t_payload = teams_by_key.get(key) or {}
        if t_payload.get('teamIdx') in (0, 1):
            resolved[key] = int(t_payload['teamIdx'])
            continue
        t_lab = t_payload.get('torsoLab')
        if lab0 and lab1 and isinstance(t_lab, list) and len(t_lab) == 3:
            idx, _conf = assign_team_for_lab(
                t_lab,
                lab0,
                lab1,
                float(t_payload.get('refStripeScore', 0.0)),
            )
            resolved[key] = idx
        else:
            resolved[key] = None

    return resolved


def export_all_sidecars(
    photos_json_path: Path,
    output_root: Path,
    *,
    bursts_by_key: dict[str, dict[str, Any]],
    teams_by_key: dict[str, dict[str, Any]],
    roles_by_key: dict[str, dict[str, Any]],
    numbers_by_key: dict[str, dict[str, Any]],
    clip_by_key: dict[str, dict[str, Any]],
    clip_blobs_by_key: dict[str, bytes | None],
    alt_by_key: dict[str, dict[str, Any]] | None = None,
    event_filter: str | None = None,
) -> int:
    """Exports `/public/data/tags/<year>/<slug>.json` sidecars and updates burst rankings in `photos.json`."""
    if not photos_json_path.exists():
        return 0

    data = json.loads(photos_json_path.read_text(encoding='utf-8'))
    vocab_list = list(VOCAB_13)
    vocab_index = {tag: i for i, tag in enumerate(vocab_list)}

    # 1. Precompute top-12 visually similar neighbors across all available clip embeddings
    neighbor_items: list[dict[str, Any]] = []
    for year, events in data.items():
        if not isinstance(events, dict):
            continue
        for event_name, ev in events.items():
            if not isinstance(ev, dict):
                continue
            slug = ev.get('albumSlug') or slugify_label(event_name)
            album = ev.get('album') or []
            for idx, item in enumerate(album):
                if not isinstance(item, dict):
                    continue
                key = str(item.get('thumb') or '')
                if not key:
                    continue
                burst = item.get('burst')
                b_id = f"{year}/{slug}:{burst.get('id')}" if isinstance(burst, dict) and burst.get('id') else ''
                neighbor_items.append(
                    {
                        'key': key,
                        'year': str(year),
                        'slug': str(slug),
                        'idx': int(idx),
                        'burst_id': b_id,
                        'blob': clip_blobs_by_key.get(key),
                    }
                )

    neighbors_by_key = compute_top_neighbors(neighbor_items)
    norm_filter = (event_filter or '').strip().lower().replace('\\', '/')
    written_count = 0
    photos_json_mutated = False

    for year, events in data.items():
        if not isinstance(events, dict):
            continue
        for event_name, ev in events.items():
            if not isinstance(ev, dict):
                continue
            slug = ev.get('albumSlug') or slugify_label(event_name)
            if norm_filter:
                candidates = (
                    f'{year}/{event_name}'.lower(),
                    f'{year}/{slug}'.lower(),
                    event_name.lower(),
                    slug.lower(),
                )
                if not any(c == norm_filter or norm_filter in c for c in candidates):
                    continue

            album = ev.get('album') or []
            if not album:
                continue

            is_junior = bool(ev.get('isJuniorBout', False))
            if not is_junior and re.search(r'\b(?:jr\.?|juniors?|jrda|u1[2-9]|youth)\b|\(\s*jb\s*\)', event_name, re.I):
                is_junior = True

            teams_meta = ev.get('teams') or []
            best_burst_keys = rank_event_bursts(album, bursts_by_key)
            photos_json_mutated = True

            final_numbers_map = apply_burst_consensus_numbers(album, numbers_by_key, is_junior_bout=is_junior)
            resolved_teams_map = resolve_event_teams(album, teams_meta, teams_by_key, roles_by_key)

            photos_sidecar: dict[str, dict[str, Any]] = {}
            for idx, item in enumerate(album):
                if not isinstance(item, dict):
                    continue
                key = str(item.get('thumb') or '')
                if not key:
                    continue

                entry: dict[str, Any] = {}
                role_payload = roles_by_key.get(key) or {}
                role = role_payload.get('role')
                if role in ('jammer', 'pivot', 'blocker', 'ref', 'spectator'):
                    entry['r'] = role

                nums = final_numbers_map.get(key) or []
                if nums:
                    entry['n'] = nums

                tm = resolved_teams_map.get(key)
                if tm in (0, 1):
                    entry['tm'] = tm

                clip_payload = clip_by_key.get(key) or {}
                raw_tags = [str(t.get('tag')) for t in (clip_payload.get('tags') or []) if t.get('tag')]
                tag_indices = [vocab_index[t] for t in raw_tags if t in vocab_index]
                if tag_indices:
                    entry['t'] = tag_indices

                # Alt text: use cached alt stage output or synthesize grounded alt text
                alt_payload = (alt_by_key or {}).get(key) or {}
                alt_str = alt_payload.get('alt') or synthesize_grounded_alt_text(
                    year=str(year),
                    event_name=str(event_name),
                    teams=teams_meta,
                    is_junior_bout=is_junior,
                    role=role,
                    team_idx=tm,
                    numbers=nums,
                    tags=raw_tags,
                )
                if alt_str:
                    entry['a'] = alt_str

                sim = neighbors_by_key.get(key) or []
                if sim:
                    entry['s'] = sim

                q_val = (bursts_by_key.get(key) or {}).get('qualityScore')
                if q_val is not None:
                    entry['q'] = round(float(q_val), 3)

                if key in best_burst_keys:
                    entry['b'] = 1

                photos_sidecar[str(idx)] = entry

            sidecar_payload = {
                'v': 1,
                'year': str(year),
                'slug': str(slug),
                'eventName': str(event_name),
                'isJuniorBout': is_junior,
                'teams': teams_meta,
                'vocab': vocab_list,
                'photos': photos_sidecar,
            }

            target_file = output_root / str(year) / f'{slug}.json'
            target_file.parent.mkdir(parents=True, exist_ok=True)
            target_file.write_text(
                json.dumps(sidecar_payload, separators=(',', ':')),
                encoding='utf-8',
            )
            written_count += 1

    if photos_json_mutated:
        photos_json_path.write_text(json.dumps(data, indent=2), encoding='utf-8')

    find_root = output_root.parent / 'find'
    export_find_indexes(output_root, find_root)

    return written_count


def export_find_indexes(tags_root: Path, find_root: Path) -> int:
    """Compiles `/public/data/find/index.json` and `/public/data/find/<teamSlug>.json` from tag sidecars."""
    if not tags_root.exists():
        return 0

    teams_acc: dict[str, dict[str, Any]] = {}
    sidecar_files = sorted(tags_root.rglob('*.json'))

    for sc_file in sidecar_files:
        try:
            sc = json.loads(sc_file.read_text(encoding='utf-8'))
        except Exception:
            continue
        if not isinstance(sc, dict) or sc.get('v') != 1:
            continue

        year = str(sc.get('year') or sc_file.parent.name)
        slug = str(sc.get('slug') or sc_file.stem)
        event_name = str(sc.get('eventName') or slug)
        vocab = sc.get('vocab') if isinstance(sc.get('vocab'), list) else []
        teams_meta = sc.get('teams') if isinstance(sc.get('teams'), list) else []
        photos_map = sc.get('photos') if isinstance(sc.get('photos'), dict) else {}

        # Ensure both event teams are registered even if a photo isn't assigned yet
        event_team_slugs: list[str] = []
        for tm_idx, tm_obj in enumerate(teams_meta[:2]):
            if not isinstance(tm_obj, dict):
                continue
            t_name = str(tm_obj.get('name') or '').strip()
            if not t_name:
                continue
            t_slug = slugify_label(t_name)
            event_team_slugs.append(t_slug)
            t_hex = tm_obj.get('jerseyColorHex')
            acc = teams_acc.setdefault(
                t_slug,
                {
                    'name': t_name,
                    'slug': t_slug,
                    'colorHex': t_hex if isinstance(t_hex, str) and t_hex else None,
                    'events': [],
                    'event_index_by_key': {},
                    'photos': [],
                    'number_counts': Counter(),
                },
            )
            if not acc['colorHex'] and isinstance(t_hex, str) and t_hex:
                acc['colorHex'] = t_hex

        for idx_str, p_entry in photos_map.items():
            if not isinstance(p_entry, dict):
                continue
            try:
                p_idx = int(idx_str)
            except ValueError:
                continue

            tm_val = p_entry.get('tm')
            nums = [str(n) for n in (p_entry.get('n') or []) if n]
            role = p_entry.get('r')
            tag_indices = p_entry.get('t') if isinstance(p_entry.get('t'), list) else []
            tags = [str(vocab[i]) for i in tag_indices if isinstance(i, int) and 0 <= i < len(vocab)]
            best_burst = 1 if p_entry.get('b') == 1 else 0

            target_team_slugs: list[str] = []
            if tm_val in (0, 1) and tm_val < len(event_team_slugs):
                target_team_slugs = [event_team_slugs[tm_val]]
            elif nums and event_team_slugs:
                # Include numbered skater in participating event teams if uniform color was ambiguous
                target_team_slugs = list(dict.fromkeys(event_team_slugs))

            for t_slug in target_team_slugs:
                acc = teams_acc.get(t_slug)
                if not acc:
                    continue
                ev_key = f'{year}/{slug}'
                if ev_key not in acc['event_index_by_key']:
                    acc['event_index_by_key'][ev_key] = len(acc['events'])
                    acc['events'].append(
                        {
                            'y': year,
                            's': slug,
                            't': event_name,
                        }
                    )
                ev_idx = acc['event_index_by_key'][ev_key]
                photo_rec: dict[str, Any] = {'e': ev_idx, 'i': p_idx}
                if nums:
                    photo_rec['n'] = nums
                    for n_str in nums:
                        acc['number_counts'][n_str] += 1
                if role:
                    photo_rec['r'] = role
                if tags:
                    photo_rec['g'] = tags
                if best_burst:
                    photo_rec['b'] = 1
                acc['photos'].append(photo_rec)

    find_root.mkdir(parents=True, exist_ok=True)
    index_teams: list[dict[str, Any]] = []

    for t_slug, acc in sorted(teams_acc.items(), key=lambda kv: (-len(kv[1]['photos']), kv[0])):
        top_numbers = [num for num, _cnt in acc['number_counts'].most_common(24)]
        team_payload = {
            'v': 1,
            'team': acc['name'],
            'slug': t_slug,
            'colorHex': acc['colorHex'],
            'events': acc['events'],
            'photos': acc['photos'],
        }
        (find_root / f'{t_slug}.json').write_text(
            json.dumps(team_payload, separators=(',', ':')),
            encoding='utf-8',
        )
        index_teams.append(
            {
                'name': acc['name'],
                'slug': t_slug,
                'colorHex': acc['colorHex'],
                'photoCount': len(acc['photos']),
                'eventCount': len(acc['events']),
                'topNumbers': top_numbers,
            }
        )

    (find_root / 'index.json').write_text(
        json.dumps({'v': 1, 'teams': index_teams}, separators=(',', ':')),
        encoding='utf-8',
    )
    return len(index_teams)

