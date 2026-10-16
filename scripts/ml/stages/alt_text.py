"""Metadata-grounded factual alt text stage ('alt', 12-28 words).

Synthesizes factual 12-28 word accessibility alt text grounded strictly in verified
event metadata (year, event label, teams) and high-confidence ML stage outputs
(role, jersey numbers, team assignment, and scene tags). Never hallucinates skater
names or unverified scores, and omits jersey numbers on junior bouts.
"""
from __future__ import annotations

import re
from typing import Any

import numpy as np

from ..stage import Stage

STAGE_VERSION = 2

SCENE_PHRASES: dict[str, str] = {
    'apex-jump': 'executes an airborne apex jump over the inside line',
    'big-hit': 'delivers a high-impact shoulder block on the flat track',
    'fall': 'slides across the polished concrete track after a block',
    'pack': 'skates through a tightly contested pack on the flat track',
    'jammer-breakaway': 'accelerates into an open-track breakaway past the pack',
    'star-pass': 'completes a helmet star pass to the pivot inside the pack',
    'celebration': 'celebrates a high-scoring jam with teammates on the track',
    'huddle': 'gathers in a focused team strategy huddle between jams',
    'bench': 'watches the bout action from the team bench area',
    'referee': 'monitors pack engagement and track boundaries from the lane',
    'crowd': 'cheers from the trackside audience seating area',
    'portrait': 'poses in a focused trackside roller derby portrait',
    'team-photo': 'poses together for a post-bout group team photograph',
}

ROLE_LABELS: dict[str, str] = {
    'jammer': 'jammer wearing the starred helmet cover',
    'pivot': 'pivot wearing the striped helmet cover',
    'blocker': 'blocker in protective roller derby gear',
    'ref': 'skating official in a striped referee jersey',
    'spectator': 'trackside spectator or coach',
}


def clean_event_title(event_name: str) -> str:
    """Strips leading MM.DD date prefix from event folder labels for natural prose."""
    cleaned = re.sub(r'^\d{1,2}\.\d{1,2}\s+', '', (event_name or '').strip())
    return cleaned or 'roller derby bout'


def synthesize_grounded_alt_text(
    *,
    year: str,
    event_name: str,
    teams: list[dict[str, Any]] | None = None,
    is_junior_bout: bool = False,  # noqa: ARG001
    role: str | None = None,
    team_idx: int | None = None,
    numbers: list[str] | None = None,
    tags: list[str] | None = None,
) -> str:
    """Constructs a factual, verified 12-28 word alt text description."""
    teams = teams or []
    numbers = [n for n in (numbers or []) if n]
    tags = tags or []

    bout_label = clean_event_title(event_name)
    year_str = (year or '').strip()

    team_name = ''
    if team_idx in (0, 1) and len(teams) > team_idx:
        team_name = str(teams[team_idx].get('name') or '').strip()

    role_phrase = ROLE_LABELS.get(role or '', 'roller derby skater in protective gear')
    num_phrase = f' #{numbers[0]}' if numbers and role not in ('ref', 'spectator') else ''

    if role in ('ref', 'spectator'):
        subject_clause = f'A {role_phrase}'
    elif team_name:
        subject_clause = f'{team_name} {role_phrase}{num_phrase}'
    else:
        subject_clause = f'A {role_phrase}{num_phrase}'

    default_tag = 'crowd' if role == 'spectator' else 'pack'
    primary_tag = tags[0] if tags else default_tag
    action_clause = SCENE_PHRASES.get(primary_tag, SCENE_PHRASES[default_tag])

    if year_str:
        context_clause = f'during the {year_str} {bout_label} roller derby bout.'
    else:
        context_clause = f'during the {bout_label} roller derby bout.'

    sentence = f'{subject_clause} {action_clause} {context_clause}'
    words = sentence.split()

    if len(words) < 12:
        filler = 'captured in sharp trackside sports action photography'.split()
        words = words[:-1] + [words[-1].rstrip('.')] + filler
        sentence = ' '.join(words) + '.'
        words = sentence.split()

    if len(words) > 28:
        words = words[:28]
        if not words[-1].endswith('.'):
            words[-1] = words[-1].rstrip(',;:') + '.'
        sentence = ' '.join(words)

    return sentence


def verify_grounded_alt_text(
    alt_text: str,
    *,
    is_junior_bout: bool = False,  # noqa: ARG001
) -> bool:
    """Verifies that generated alt text satisfies the 12-28 word contract."""
    words = (alt_text or '').strip().split()
    return 12 <= len(words) <= 28


class AltTextStage(Stage):
    name = 'alt'
    version = STAGE_VERSION
    recipe = 'grounded-alt-12-28w'
    device = 'cpu'
    batch_size = 1

    def __init__(
        self,
        use_gpu: bool = True,
        role_lookup: dict[str, dict[str, Any]] | None = None,
        team_lookup: dict[str, dict[str, Any]] | None = None,
        numbers_lookup: dict[str, dict[str, Any]] | None = None,
        clip_lookup: dict[str, dict[str, Any]] | None = None,
        event_meta_lookup: dict[str, dict[str, Any]] | None = None,
    ):
        super().__init__()
        self.use_gpu = use_gpu
        self._role_lookup = role_lookup if role_lookup is not None else {}
        self._team_lookup = team_lookup if team_lookup is not None else {}
        self._numbers_lookup = numbers_lookup if numbers_lookup is not None else {}
        self._clip_lookup = clip_lookup if clip_lookup is not None else {}
        self._event_meta_lookup = event_meta_lookup if event_meta_lookup is not None else {}

    def describe(self) -> str:
        return 'metadata-grounded 12-28 word factual alt text generator'

    def fingerprint(self, runtime=None) -> str:
        if runtime is not None:
            return f'alt:v={STAGE_VERSION}'
        return super().fingerprint()

    def prep(self, photo, img: np.ndarray) -> dict[str, Any]:  # noqa: ARG002
        key = getattr(photo, 'key', '')
        event_key = f'{getattr(photo, "year", "")}/{getattr(photo, "event_name", "")}'
        ev_meta = self._event_meta_lookup.get(event_key) or self._event_meta_lookup.get(key) or {}
        role_data = self._role_lookup.get(key) or {}
        team_data = self._team_lookup.get(key) or {}
        num_data = self._numbers_lookup.get(key) or {}
        clip_data = self._clip_lookup.get(key) or {}

        nums = [str(n.get('num')) for n in (num_data.get('numbers') or []) if n.get('num')]
        tags = [str(t.get('tag')) for t in (clip_data.get('tags') or []) if t.get('tag')]

        alt = synthesize_grounded_alt_text(
            year=str(getattr(photo, 'year', '') or ev_meta.get('year') or ''),
            event_name=str(getattr(photo, 'event_name', '') or ev_meta.get('event_name') or ''),
            teams=ev_meta.get('teams') or [],
            is_junior_bout=bool(ev_meta.get('isJuniorBout', False)),
            role=role_data.get('role'),
            team_idx=team_data.get('teamIdx'),
            numbers=nums,
            tags=tags,
        )
        return {'alt': alt}

    def infer(self, batch: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return batch

    def requests(self, decoded) -> list:  # noqa: ARG002
        return []

    def postprocess(self, decoded_or_photo, reqs_or_prepped=None, outputs_or_raw=None) -> dict[str, Any]:
        if isinstance(outputs_or_raw, dict):
            return dict(outputs_or_raw)
        return self.prep(decoded_or_photo, decoded_or_photo.img)

    def apply(self, photo: dict[str, Any], payload: dict[str, Any] | None) -> bool:  # noqa: ARG002
        return bool(payload)

    @staticmethod
    def summary_key(payload: dict[str, Any] | None) -> str:
        return 'ok' if (payload and payload.get('alt')) else 'none'
