"""photos.json integration: collect work items, hero selection and the legacy-compatible export."""

import json
import os

PHOTOS_FILE = os.path.join('data', 'photos.json')
LEGACY_FACES_CACHE = os.path.join('data', '.faces_cache.json')

# Schema version of the thumb-keyed .faces_cache.json export read by
# scripts/pipeline/generatePhotoIndex.ts (FACE_CACHE_VERSION). It is a format version now;
# algorithm changes are tracked by the stage fingerprint in ml_cache.sqlite.
FACES_EXPORT_VERSION = 2


def save_json(path, data, indent=None):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, separators=(',', ':') if indent is None else None)
    os.replace(tmp, path)


def collect(photos_data):
    """Group photo records by thumbnail (a thumbnail can appear in both album and highlights).

    Returns {thumb: {'photos': [records], 'thumb_path': local path, 'source': local source path|None}}.
    """
    items = {}
    for events in photos_data.values():
        for event_data in events.values():
            for list_key in ('album', 'highlights'):
                for photo in event_data.get(list_key) or []:
                    if not (isinstance(photo, dict) and photo.get('thumb')):
                        continue
                    thumb = photo['thumb']
                    item = items.get(thumb)
                    if item is None:
                        item = items[thumb] = {
                            'photos': [],
                            'thumb_path': os.path.join('build', thumb.lstrip('/')),
                            'source': None,
                        }
                    item['photos'].append(photo)
                    if item['source'] is None and photo.get('source'):
                        item['source'] = photo['source'].lstrip('/').replace('\\', '/')
    return items


def select_heroes(photos_data):
    for events in photos_data.values():
        for event_data in events.values():
            candidates = [p for p in (event_data.get('highlights') or event_data.get('album') or [])
                          if isinstance(p, dict)]
            if not candidates:
                continue
            best = max(candidates, key=lambda p: p.get('faceScore', 0.0))
            event_data['hero'] = {
                'src': best.get('src') or best.get('original'),
                'focusX': best.get('focusX'),
                'focusY': best.get('focusY'),
            }


def file_signature(path):
    st = os.stat(path)
    return f'{st.st_size}:{st.st_mtime_ns}'


def load_legacy_faces(path=LEGACY_FACES_CACHE):
    """Entries written by the pre-cache detectFaces.py (they carry a 'sig'); exports don't."""
    if not os.path.exists(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}
    return {k: v for k, v in data.items() if isinstance(v, dict) and 'sig' in v}


def legacy_payload(entry):
    return {k: v for k, v in entry.items() if k not in ('v', 'sig')}


def export_faces_cache(items, payload_by_thumb, path=LEGACY_FACES_CACHE):
    """Write the thumb-keyed view consumed by generatePhotoIndex.ts (extractFaceData)."""
    out = {}
    for thumb in items:
        payload = payload_by_thumb.get(thumb)
        if payload is not None:
            out[thumb] = {**payload, 'v': FACES_EXPORT_VERSION}
    save_json(path, out)
    return len(out)
