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
from .stages.numbers import is_valid_derby_number
from .stages.teams import assign_team_for_lab, hex_to_cie_lab, kmeans_2cluster_lab

DEFAULT_JERSEY_OVERRIDES_PATHS = (
    Path('data') / 'jersey_overrides.json',
    Path('data') / 'labeling' / 'jersey_overrides.json',
)


def slugify_label(text: str) -> str:
    s = (text or '').strip().lower()
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'[^\w-]+', '', s)
    s = re.sub(r'--+', '-', s)
    return s.strip('-') or 'event'


def normalize_team_name(text: str) -> str:
    s = re.sub(r'[()]', '', text or '')
    return re.sub(r'\s+', ' ', s).strip()


def is_partial_derby_number(text: str) -> bool:
    """Returns True if `text` is a partial derby number containing `?` (e.g. `'42?'`, `'?42'`, `'4?1'`, `'7?'`)."""
    cleaned = (text or '').strip().upper()
    if '?' not in cleaned:
        return False
    core = cleaned.replace('?', '')
    if not (1 <= len(core) <= 3):
        return False
    return is_valid_derby_number(core)


def _normalize_override_token(tok: str, force_partial: bool = False) -> str | None:
    cleaned = re.sub(r'[*~_]+', '?', tok.strip().lstrip('#').upper())
    cleaned = re.sub(r'\?+', '?', cleaned)
    if not cleaned:
        return None
    if force_partial and '?' not in cleaned:
        cleaned = f'{cleaned}?'
    if '?' in cleaned:
        return cleaned if is_partial_derby_number(cleaned) else None
    return cleaned if is_valid_derby_number(cleaned) else None


def partial_matches_full_number(partial_tok: str, full_num: str) -> bool:
    """Checks whether a partial token (e.g. `'42?'`, `'?51'`, `'4?1'`, `'7?'`) matches a full number."""
    p = (partial_tok or '').strip().upper()
    f = (full_num or '').strip().upper()
    if '?' not in p or '?' in f:
        return False
    core = p.replace('?', '')
    if not core or len(f) <= len(core):
        return False
    if p.startswith('?') and not p.endswith('?') and '?' not in p[1:]:
        return f.endswith(core)
    if not p.startswith('?') and not p.endswith('?') and '?' in p:
        pattern = '^' + '[0-9A-Z]+'.join(re.escape(part) for part in p.split('?')) + '$'
        return bool(re.match(pattern, f))
    return f.startswith(core) or f.endswith(core) or core in f


def parse_override_numbers(raw: Any) -> list[str] | None:
    """Parses a manual jersey override entry into a list of valid/partial derby numbers (or `[]` if rejected)."""
    if raw is None:
        return None
    force_partial = False
    if isinstance(raw, dict):
        status = str(raw.get('status') or '').strip().lower()
        if status in ('reject', 'rejected', 'skip', 'none', 'false_positive'):
            return []
        if status == 'partial':
            force_partial = True
        raw = raw.get('numbers') if 'numbers' in raw else raw.get('number')
    if isinstance(raw, list):
        tokens = [str(x).strip() for x in raw if str(x).strip()]
    elif isinstance(raw, str):
        cleaned = raw.strip()
        if cleaned.lower() in ('', 'skip', 'reject', 'rejected', 'none', 'false_positive'):
            return []
        if cleaned.lower().startswith('partial:'):
            force_partial = True
            cleaned = cleaned[len('partial:') :].strip()
        tokens = [tok.strip() for tok in re.split(r'[,;\s]+', cleaned) if tok.strip()]
    else:
        return None
    out: list[str] = []
    for tok in tokens:
        norm = _normalize_override_token(tok, force_partial=force_partial)
        if norm and norm not in out:
            out.append(norm)
    return out


def load_jersey_overrides(overrides_path: Path | None = None) -> dict[str, list[str]]:
    """Loads manual jersey number overrides from `data/jersey_overrides.json` if present."""
    candidates = [overrides_path] if overrides_path is not None else list(DEFAULT_JERSEY_OVERRIDES_PATHS)
    merged: dict[str, list[str]] = {}
    for path in candidates:
        if path is None or not path.exists():
            continue
        try:
            raw_data = json.loads(path.read_text(encoding='utf-8'))
        except Exception:
            continue
        if not isinstance(raw_data, dict):
            continue
        for key, val in raw_data.items():
            parsed = parse_override_numbers(val)
            if parsed is not None:
                merged[str(key)] = parsed
    return merged


def apply_burst_consensus_numbers(
    album: list[dict[str, Any]],
    numbers_by_key: dict[str, dict[str, Any]],
    is_junior_bout: bool = False,  # noqa: ARG001
    jersey_overrides: dict[str, list[str]] | None = None,
) -> dict[str, list[str]]:
    """Applies Burst Consensus Boost & partial-occlusion prefix/suffix merging across `burst.id` frames."""
    overrides = jersey_overrides or {}

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
    superseded_by_burst: dict[str, set[str]] = {}
    burst_full_by_id: dict[str, list[str]] = {}
    for b_id, keys in burst_groups.items():
        if len(keys) < 2:
            continue
        counts: Counter[str] = Counter()
        per_frame_nums: dict[str, set[str]] = {}
        for k in keys:
            if k in overrides:
                frame_nums = set(overrides[k])
            else:
                payload = numbers_by_key.get(k) or {}
                frame_nums = {
                    str(entry.get('num')).strip().upper()
                    for entry in (payload.get('numbers') or []) + (payload.get('candidates') or [])
                    if entry.get('num') and float(entry.get('conf', 0.0)) >= 0.72
                }
            per_frame_nums[k] = frame_nums
            for num in frame_nums:
                if '?' not in num:
                    counts[num] += 1

        all_observed = list(counts.keys())
        burst_full_by_id[b_id] = [n for n in all_observed if len(n) >= 2]
        long_nums = [n for n in all_observed if len(n) >= 3]
        short_nums = [n for n in all_observed if 2 <= len(n) < 4]
        superseded: set[str] = set()
        for l_num in long_nums:
            matching_shorts = [
                s_num
                for s_num in short_nums
                if len(s_num) < len(l_num) and (l_num.startswith(s_num) or l_num.endswith(s_num))
            ]
            # Also check if any frame in the burst had an explicit partial token (e.g. '42?') matching l_num
            corroborated_frames = sum(
                1
                for f_nums in per_frame_nums.values()
                if l_num in f_nums
                or any(s_num in f_nums for s_num in matching_shorts)
                or any('?' in p_tok and partial_matches_full_number(p_tok, l_num) for p_tok in f_nums)
            )
            if corroborated_frames >= 2:
                counts[l_num] = max(counts[l_num], corroborated_frames)
                superseded.update(matching_shorts)

        promoted = [
            num
            for num, cnt in counts.most_common()
            if cnt >= 2 and num not in superseded
        ]
        if promoted:
            consensus_by_burst[b_id] = promoted
            if superseded:
                superseded_by_burst[b_id] = superseded

    # Bout-wide observation counts for candidate promotion & partial-occlusion resolution
    bout_counts: Counter[str] = Counter()
    high_conf_full_nums: set[str] = set()
    for item in album:
        if not isinstance(item, dict):
            continue
        key = str(item.get('thumb') or '')
        if not key:
            continue
        if key in overrides:
            obs = {n for n in overrides[key] if '?' not in n}
            for n in obs:
                if len(n) >= 2:
                    high_conf_full_nums.add(n)
        else:
            payload = numbers_by_key.get(key) or {}
            obs = set()
            for entry in (payload.get('numbers') or []) + (payload.get('candidates') or []):
                n_str = str(entry.get('num') or '').strip().upper()
                c_val = float(entry.get('conf', 0.0))
                if n_str and '?' not in n_str and c_val >= 0.72:
                    obs.add(n_str)
                    if len(n_str) >= 3 and c_val >= 0.90:
                        high_conf_full_nums.add(n_str)
        for n_str in obs:
            bout_counts[n_str] += 1

    confirmed_bout_longs = [
        n for n, cnt in bout_counts.most_common() if len(n) >= 3 and (cnt >= 2 or n in high_conf_full_nums)
    ]
    confirmed_bout_fulls = [
        n for n, cnt in bout_counts.most_common() if len(n) >= 2 and (cnt >= 2 or n in high_conf_full_nums)
    ]

    def _resolve_explicit_partial(p_tok: str, b_id: str) -> str:
        # 1. Try resolving within the same burst first
        if b_id and b_id in burst_full_by_id:
            burst_matches = [f for f in burst_full_by_id[b_id] if partial_matches_full_number(p_tok, f)]
            if len(burst_matches) == 1:
                return burst_matches[0]
        # 2. Try resolving against confirmed full numbers in the same bout
        bout_matches = [f for f in confirmed_bout_fulls if partial_matches_full_number(p_tok, f)]
        if len(bout_matches) == 1:
            return bout_matches[0]
        return p_tok

    final_numbers: dict[str, list[str]] = {}
    for item in album:
        if not isinstance(item, dict):
            continue
        key = str(item.get('thumb') or '')
        if not key:
            continue
        burst = item.get('burst')
        b_id = str(burst.get('id')) if isinstance(burst, dict) and burst.get('id') else ''

        if key in overrides:
            resolved_ov: list[str] = []
            for ov_tok in overrides[key][:3]:
                res_tok = _resolve_explicit_partial(ov_tok, b_id) if '?' in ov_tok else ov_tok
                if res_tok not in resolved_ov:
                    resolved_ov.append(res_tok)
            final_numbers[key] = resolved_ov
            continue

        payload = numbers_by_key.get(key) or {}
        superseded_for_frame = superseded_by_burst.get(b_id, set())

        emitted: list[str] = []
        for e in (payload.get('numbers') or []):
            n_str = str(e.get('num') or '').strip().upper()
            c_val = float(e.get('conf', 0.0))
            if not n_str or n_str in superseded_for_frame:
                continue
            if c_val >= 0.92 or (len(n_str) >= 2 and c_val >= 0.85):
                if n_str not in emitted:
                    emitted.append(n_str)

        # Promote borderline candidates if corroborated in >= 2 frames of the same bout
        for e in (payload.get('candidates') or []):
            n_str = str(e.get('num') or '').strip().upper()
            c_val = float(e.get('conf', 0.0))
            if (
                n_str
                and len(n_str) >= 2
                and c_val >= 0.75
                and bout_counts[n_str] >= 2
                and n_str not in superseded_for_frame
                and n_str not in emitted
            ):
                emitted.append(n_str)

        for c_num in consensus_by_burst.get(b_id, []):
            if c_num not in emitted:
                emitted.append(c_num)

        # Bout-wide partial-occlusion prefix/suffix resolution:
        # If a 2-digit read (seen only once in the bout) is a prefix/suffix of a confirmed 3-4 digit
        # bout roster number, resolve it to the full 3-4 digit number.
        resolved_emitted: list[str] = []
        for n_str in emitted:
            replacement = n_str
            if '?' in n_str:
                replacement = _resolve_explicit_partial(n_str, b_id)
            elif len(n_str) == 2 and bout_counts[n_str] <= 1:
                matching_longs = [
                    l_num
                    for l_num in confirmed_bout_longs
                    if l_num.startswith(n_str) or l_num.endswith(n_str)
                ]
                if len(matching_longs) == 1:
                    replacement = matching_longs[0]
            if replacement not in resolved_emitted:
                resolved_emitted.append(replacement)

        final_numbers[key] = resolved_emitted[:3]

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
    numbers_by_key: dict[str, dict[str, Any]] | None = None,
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
        if role == 'spectator':
            resolved[key] = None
            continue
        t_payload = teams_by_key.get(key) or {}
        if role != 'ref' and t_payload.get('teamIdx') in (0, 1):
            resolved[key] = int(t_payload['teamIdx'])
            continue
        t_lab = t_payload.get('torsoLab') if role != 'ref' else None
        ref_stripe = float(t_payload.get('refStripeScore', 0.0)) if role != 'ref' else 0.0
        if not (isinstance(t_lab, list) and len(t_lab) == 3) and numbers_by_key:
            num_payload = numbers_by_key.get(key) or {}
            for n_entry in (num_payload.get('numbers') or []) + (num_payload.get('candidates') or []):
                cand_lab = n_entry.get('torsoLab') if isinstance(n_entry, dict) else None
                if isinstance(cand_lab, list) and len(cand_lab) == 3:
                    t_lab = cand_lab
                    ref_stripe = 0.0
                    break
        if lab0 and lab1 and isinstance(t_lab, list) and len(t_lab) == 3:
            idx, _conf = assign_team_for_lab(
                t_lab,
                lab0,
                lab1,
                ref_stripe,
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
    jersey_overrides = load_jersey_overrides()
    norm_filter = (event_filter or '').strip().lower().replace('\\', '/')
    written_count = 0
    written_files: set[Path] = set()
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

            final_numbers_map = apply_burst_consensus_numbers(
                album,
                numbers_by_key,
                is_junior_bout=is_junior,
                jersey_overrides=jersey_overrides,
            )
            resolved_teams_map = resolve_event_teams(
                album,
                teams_meta,
                teams_by_key,
                roles_by_key,
                numbers_by_key,
            )

            # Adjacent jam-sequence propagation for front-facing jammers and pivots:
            # Since only one jammer and one pivot per team are on the track per jam, an unnumbered
            # jammer/pivot frame within ±2 adjacent frames of a confirmed number for the same (role, team)
            # inherits that number if unambiguous.
            base_numbers_map = {k: list(v) for k, v in final_numbers_map.items()}
            for idx, item in enumerate(album):
                if not isinstance(item, dict):
                    continue
                key = str(item.get('thumb') or '')
                if not key or base_numbers_map.get(key) or key in jersey_overrides:
                    continue
                role = (roles_by_key.get(key) or {}).get('role')
                tm = resolved_teams_map.get(key)
                if role not in ('jammer', 'pivot') or tm not in (0, 1):
                    continue
                adj_nums: set[str] = set()
                for j in range(max(0, idx - 2), min(len(album), idx + 3)):
                    if j == idx or not isinstance(album[j], dict):
                        continue
                    j_key = str(album[j].get('thumb') or '')
                    j_role = (roles_by_key.get(j_key) or {}).get('role')
                    j_tm = resolved_teams_map.get(j_key)
                    if j_role == role and j_tm == tm:
                        for n_val in base_numbers_map.get(j_key) or []:
                            adj_nums.add(n_val)
                if len(adj_nums) == 1:
                    final_numbers_map[key] = list(adj_nums)

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

                has_manual_override = key in jersey_overrides and bool(jersey_overrides[key])
                nums = (
                    (final_numbers_map.get(key) or [])
                    if (has_manual_override or role != 'spectator')
                    else []
                )
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
            written_files.add(target_file.resolve())
            written_count += 1

    if not norm_filter and output_root.exists():
        for existing_sc in output_root.rglob('*.json'):
            if existing_sc.resolve() not in written_files:
                try:
                    existing_sc.unlink()
                except OSError:
                    pass

    if photos_json_mutated:
        photos_json_path.write_text(json.dumps(data, indent=2), encoding='utf-8')

    find_root = output_root.parent / 'find'
    export_find_indexes(output_root, find_root, photos_data=data)

    return written_count


_LEAGUE_DEFAULT_COLORS: dict[str, str] = {
    'sacramento-roller-derby': '#1D4ED8',
    'sacramento-roller-derby-juniors': '#3B82F6',
    'sacramento-roller-derby-home-teams': '#2563EB',
    'sacramento-roller-derby-travel-teams': '#1E40AF',
    'sacramento-roller-derby-juniors-home-teams': '#60A5FA',
    'sacred-city': '#991B1B',
    'sacred-city-home-teams': '#B91C1C',
    'sacred-city-travel-teams': '#7F1D1D',
    'bay-area-derby': '#F59E0B',
    'outlaw-roller-derby': '#10B981',
    'santa-cruz-roller-derby': '#06B6D4',
    'wftda-sanctioned': '#EC4899',
    'junior-derby': '#8B5CF6',
    'adults-derby': '#EF4444',
}


def _match_custom_team_filters(
    event_name: str,
    custom_filters: list[dict[str, Any]],
    has_wftda_match: bool = False,
) -> list[tuple[str, str]]:
    """Returns `(name, slug)` pairs for parent league/group filters matching `event_name`."""
    main_title = re.sub(r'^(?:\[\d{4}\]\s*)?\d{2}\.\d{2}\s*-?\s*', '', event_name or '').strip()
    subject = main_title.lower()
    matched: list[tuple[str, str]] = []
    for flt in custom_filters:
        if not isinstance(flt, dict):
            continue
        name = str(flt.get('name') or '').strip()
        if not name:
            continue
        wftda_only = bool(flt.get('wftdaOnly', False))
        match_list = flt.get('match') if isinstance(flt.get('match'), list) else []
        not_match_list = flt.get('notMatch') if isinstance(flt.get('notMatch'), list) else []

        is_match = False
        if wftda_only:
            is_match = has_wftda_match
        elif match_list:
            is_match = ('*' in match_list) or any(str(m).lower() in subject for m in match_list if m)

        if is_match and not_match_list:
            if any(str(nm).lower() in subject for nm in not_match_list if nm):
                is_match = False

        if is_match:
            matched.append((name, slugify_label(name)))
    return matched


def export_find_indexes(
    tags_root: Path,
    find_root: Path,
    *,
    photos_data: dict[str, Any] | None = None,
    custom_filters: list[dict[str, Any]] | None = None,
) -> int:
    """Compiles `/public/data/find/index.json` and `/public/data/find/<teamSlug>.json` from tag sidecars."""
    if not tags_root.exists():
        return 0

    is_prod_tags = 'public' in tags_root.parts
    if photos_data is None and is_prod_tags:
        p_file = Path('data') / 'photos.json'
        if p_file.exists():
            try:
                photos_data = json.loads(p_file.read_text(encoding='utf-8'))
            except Exception:
                photos_data = None

    if custom_filters is None and is_prod_tags:
        cf_file = Path('data') / 'customTeamFilters.json'
        if cf_file.exists():
            try:
                custom_filters = json.loads(cf_file.read_text(encoding='utf-8'))
            except Exception:
                custom_filters = []

    # Build lookup of (year, slug) -> event dict from photos_data for framing & ThumbHash metadata
    event_lookup: dict[tuple[str, str], dict[str, Any]] = {}
    if isinstance(photos_data, dict):
        for yr, evs in photos_data.items():
            if not isinstance(evs, dict):
                continue
            for ev_title, ev_obj in evs.items():
                if not isinstance(ev_obj, dict):
                    continue
                ev_slug = str(ev_obj.get('albumSlug') or slugify_label(ev_title))
                event_lookup[(str(yr), ev_slug)] = ev_obj

    teams_acc: dict[str, dict[str, Any]] = {}
    all_acc: dict[str, Any] = {
        'events': [],
        'event_index_by_key': {},
        'photos': [],
        'seen_photo_keys': set(),
        'number_counts': Counter(),
        'numbered_photo_count': 0,
    }
    sidecar_files = sorted(tags_root.rglob('*.json'))

    def _ensure_team_acc(t_slug: str, t_name: str, t_hex: str | None = None, is_meta: bool = False) -> dict[str, Any]:
        default_hex = t_hex if isinstance(t_hex, str) and t_hex else _LEAGUE_DEFAULT_COLORS.get(t_slug)
        acc = teams_acc.setdefault(
            t_slug,
            {
                'name': t_name,
                'slug': t_slug,
                'colorHex': default_hex,
                'isMeta': bool(is_meta),
                'events': [],
                'event_index_by_key': {},
                'photos': [],
                'seen_photo_keys': set(),
                'number_counts': Counter(),
                'numbered_photo_count': 0,
            },
        )
        if not acc['colorHex'] and default_hex:
            acc['colorHex'] = default_hex
        if is_meta:
            acc['isMeta'] = True
        return acc

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

        ev_obj = event_lookup.get((year, slug)) or {}
        ev_album = ev_obj.get('album') if isinstance(ev_obj.get('album'), list) else []
        has_wftda = bool(ev_obj.get('wftdaMatch'))

        # Count occurrences of each number across this bout so single-frame single-digit contour noise is dropped on full bouts
        is_large_bout = len(photos_map) > 10
        bout_num_counts: Counter[str] = Counter()
        for p_entry in photos_map.values():
            if not isinstance(p_entry, dict) or p_entry.get('r') == 'spectator':
                continue
            for n_val in p_entry.get('n') or []:
                if n_val:
                    bout_num_counts[str(n_val).strip().upper()] += 1

        # Ensure both event teams are registered even if a photo isn't assigned yet
        event_team_slugs: list[str] = []
        for _tm_idx, tm_obj in enumerate(teams_meta[:2]):
            if not isinstance(tm_obj, dict):
                continue
            raw_name = str(tm_obj.get('name') or '').strip()
            t_name = normalize_team_name(raw_name)
            if not t_name:
                continue
            t_slug = slugify_label(t_name)
            event_team_slugs.append(t_slug)
            t_hex = tm_obj.get('jerseyColorHex')
            _ensure_team_acc(t_slug, t_name, t_hex if isinstance(t_hex, str) else None, is_meta=False)

        # Match parent league / meta filters from customTeamFilters.json
        meta_team_slugs: list[str] = []
        if custom_filters:
            for m_name, m_slug in _match_custom_team_filters(event_name, custom_filters, has_wftda_match=has_wftda):
                # Skip catch-all 'adults-derby' in Find My Photos to keep index focused on leagues & teams
                if m_slug == 'adults-derby':
                    continue
                meta_team_slugs.append(m_slug)
                _ensure_team_acc(m_slug, m_name, None, is_meta=True)

        for idx_str, p_entry in photos_map.items():
            if not isinstance(p_entry, dict):
                continue
            try:
                p_idx = int(idx_str)
            except ValueError:
                continue

            role = p_entry.get('r')
            tm_val = p_entry.get('tm')
            raw_nums = [str(n).strip().upper() for n in (p_entry.get('n') or []) if n]
            if role == 'spectator':
                nums: list[str] = []
            elif is_large_bout:
                # Keep partial numbers ('?'), multi-digit numbers, and burst/event-corroborated single-digit numbers
                nums = [n for n in raw_nums if '?' in n or len(n) >= 2 or bout_num_counts[n] >= 2]
            else:
                nums = raw_nums

            tag_indices = p_entry.get('t') if isinstance(p_entry.get('t'), list) else []
            tags = [str(vocab[i]) for i in tag_indices if isinstance(i, int) and 0 <= i < len(vocab)]
            best_burst = 1 if p_entry.get('b') == 1 else 0

            # Extract framing & ThumbHash from photos.json if available
            src_photo = ev_album[p_idx] if 0 <= p_idx < len(ev_album) and isinstance(ev_album[p_idx], dict) else {}
            focus_x = src_photo.get('focusX')
            focus_y = src_photo.get('focusY')
            thumb_hash = src_photo.get('thumbHash')
            img_w = src_photo.get('width')
            img_h = src_photo.get('height')
            src_thumb = str(src_photo.get('thumb') or '')
            thumb_stem = Path(src_thumb).stem if src_thumb else ''
            default_stem = f'photo_{p_idx + 1:03d}'
            custom_photo_num: int | str | None = None
            if thumb_stem and thumb_stem != default_stem:
                if thumb_stem.startswith('photo_') and thumb_stem[6:].isdigit():
                    custom_photo_num = int(thumb_stem[6:])
                else:
                    custom_photo_num = thumb_stem

            target_team_slugs: list[str] = []
            if tm_val in (0, 1) and tm_val < len(event_team_slugs):
                target_team_slugs = [event_team_slugs[tm_val]]
            elif nums and event_team_slugs:
                # Include numbered skater in participating event teams if uniform color was ambiguous
                target_team_slugs = list(dict.fromkeys(event_team_slugs))

            # Also include in matching parent leagues when assigned to a team or carrying a jersey number
            if target_team_slugs and meta_team_slugs:
                for m_slug in meta_team_slugs:
                    # Only assign to a specific league meta-filter if the assigned team belongs to that league (or if it's WFTDA/Junior)
                    if m_slug in ('wftda-sanctioned', 'junior-derby') or any(
                        m_slug.split('-home-')[0].split('-travel-')[0].split('-juniors')[0] in ts
                        for ts in target_team_slugs
                    ):
                        if m_slug not in target_team_slugs:
                            target_team_slugs.append(m_slug)

            for t_slug in target_team_slugs:
                acc = teams_acc.get(t_slug)
                if not acc:
                    continue
                ev_key = f'{year}/{slug}'
                dedup_key = f'{ev_key}:{p_idx}'
                if dedup_key in acc['seen_photo_keys']:
                    continue
                acc['seen_photo_keys'].add(dedup_key)

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
                if custom_photo_num is not None:
                    photo_rec['p'] = custom_photo_num
                if nums:
                    photo_rec['n'] = nums
                    acc['numbered_photo_count'] += 1
                    for n_str in nums:
                        if '?' not in n_str:
                            acc['number_counts'][n_str] += 1
                if role:
                    photo_rec['r'] = role
                if tags:
                    photo_rec['g'] = tags
                if best_burst:
                    photo_rec['b'] = 1
                if isinstance(focus_x, (int, float)) and abs(float(focus_x) - 0.5) >= 0.005:
                    photo_rec['x'] = round(float(focus_x), 3)
                if isinstance(focus_y, (int, float)) and abs(float(focus_y) - 0.5) >= 0.005:
                    photo_rec['y'] = round(float(focus_y), 3)
                if isinstance(thumb_hash, str) and thumb_hash:
                    photo_rec['h'] = thumb_hash
                if isinstance(img_w, int) and img_w > 0:
                    photo_rec['w'] = img_w
                if isinstance(img_h, int) and img_h > 0:
                    photo_rec['ht'] = img_h
                acc['photos'].append(photo_rec)

            # Also add every numbered photo (regardless of team color resolution) to the global 'all' jersey index
            if nums:
                ev_key = f'{year}/{slug}'
                dedup_key = f'{ev_key}:{p_idx}'
                if dedup_key not in all_acc['seen_photo_keys']:
                    all_acc['seen_photo_keys'].add(dedup_key)
                    if ev_key not in all_acc['event_index_by_key']:
                        all_acc['event_index_by_key'][ev_key] = len(all_acc['events'])
                        all_acc['events'].append(
                            {
                                'y': year,
                                's': slug,
                                't': event_name,
                            }
                        )
                    all_ev_idx = all_acc['event_index_by_key'][ev_key]
                    all_photo_rec: dict[str, Any] = {'e': all_ev_idx, 'i': p_idx, 'n': nums}
                    if custom_photo_num is not None:
                        all_photo_rec['p'] = custom_photo_num
                    if role:
                        all_photo_rec['r'] = role
                    if tags:
                        all_photo_rec['g'] = tags
                    if best_burst:
                        all_photo_rec['b'] = 1
                    if isinstance(focus_x, (int, float)) and abs(float(focus_x) - 0.5) >= 0.005:
                        all_photo_rec['x'] = round(float(focus_x), 3)
                    if isinstance(focus_y, (int, float)) and abs(float(focus_y) - 0.5) >= 0.005:
                        all_photo_rec['y'] = round(float(focus_y), 3)
                    if isinstance(thumb_hash, str) and thumb_hash:
                        all_photo_rec['h'] = thumb_hash
                    if isinstance(img_w, int) and img_w > 0:
                        all_photo_rec['w'] = img_w
                    if isinstance(img_h, int) and img_h > 0:
                        all_photo_rec['ht'] = img_h
                    all_acc['photos'].append(all_photo_rec)
                    all_acc['numbered_photo_count'] += 1
                    for n_str in nums:
                        if '?' not in n_str:
                            all_acc['number_counts'][n_str] += 1

    find_root.mkdir(parents=True, exist_ok=True)
    for stale_file in find_root.glob('*.json'):
        try:
            stale_file.unlink()
        except OSError:
            pass

    all_top_pairs = all_acc['number_counts'].most_common()
    all_top_numbers = [num for num, _cnt in all_top_pairs[:48]]
    all_number_counts_map = {num: cnt for num, cnt in all_top_pairs}
    (find_root / 'all.json').write_text(
        json.dumps(
            {
                'v': 1,
                'team': 'All Roller Derby Bouts',
                'slug': 'all',
                'colorHex': '#F59E0B',
                'isMeta': True,
                'events': all_acc['events'],
                'photos': all_acc['photos'],
            },
            separators=(',', ':'),
        ),
        encoding='utf-8',
    )

    index_teams: list[dict[str, Any]] = []

    for t_slug, acc in sorted(teams_acc.items(), key=lambda kv: (-len(kv[1]['photos']), kv[0])):
        top_pairs = acc['number_counts'].most_common(30)
        top_numbers = [num for num, _cnt in top_pairs[:24]]
        number_counts_map = {num: cnt for num, cnt in top_pairs}
        team_payload = {
            'v': 1,
            'team': acc['name'],
            'slug': t_slug,
            'colorHex': acc['colorHex'],
            'isMeta': bool(acc.get('isMeta', False)),
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
                'isMeta': bool(acc.get('isMeta', False)),
                'photoCount': len(acc['photos']),
                'numberedPhotoCount': int(acc['numbered_photo_count']),
                'eventCount': len(acc['events']),
                'topNumbers': top_numbers,
                'numberCounts': number_counts_map,
            }
        )

    (find_root / 'index.json').write_text(
        json.dumps(
            {
                'v': 1,
                'totalNumberedPhotos': int(all_acc['numbered_photo_count']),
                'topNumbers': all_top_numbers,
                'numberCounts': all_number_counts_map,
                'teams': index_teams,
            },
            separators=(',', ':'),
        ),
        encoding='utf-8',
    )
    return len(index_teams)

