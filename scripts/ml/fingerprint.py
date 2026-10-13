"""Stage fingerprints: a short hash of everything that determines a stage's output."""

import hashlib
import json


def _canonical(value):
    """JSON-serialisable, order-independent representation (floats keep full precision)."""
    if isinstance(value, dict):
        return {str(k): _canonical(v) for k, v in sorted(value.items(), key=lambda kv: str(kv[0]))}
    if isinstance(value, (list, tuple)):
        return [_canonical(v) for v in value]
    if isinstance(value, float):
        return repr(value)
    return value


def stage_fingerprint(name, version, params=None, models=None, recipe=''):
    """Return a 12-hex-char fingerprint.

    name     stage name ('subjects')
    version  manual override; bump to force a recompute without changing anything else
    params   dict of tuning constants that affect output
    models   dict of model key -> sha256 of the model file actually used
    recipe   description of the input pixels (e.g. 'thumb-avif-1080+processed-jpeg-half')
    """
    doc = {
        'name': name,
        'version': version,
        'params': _canonical(params or {}),
        'models': _canonical(models or {}),
        'recipe': recipe,
    }
    blob = json.dumps(doc, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(blob).hexdigest()[:12]
