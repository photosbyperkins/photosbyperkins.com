"""Stage contract shared by the runner and scheduler.

A stage turns one decoded photo into a cacheable JSON payload:

    reqs    = stage.requests(decoded)            # CPU: build model inputs (Request list)
    outputs = [model outputs per request]        # GPU/CPU: executed by the runner/scheduler
    payload = stage.postprocess(decoded, reqs, outputs)   # CPU: decode, score -> dict
    stage.apply(photo, payload)                  # write into a photos.json record

Stages never call models directly, which lets the scheduler batch requests from many photos
into one GPU call and keep a single thread on the GPU.
"""

from dataclasses import dataclass, field
from typing import Any

import cv2


@dataclass
class Request:
    model: str          # key into stage.models
    blob: Any           # model input (leading batch dim of 1 for ONNX models)
    meta: Any = None    # stage-private data needed to decode the output


@dataclass
class Decoded:
    """One photo, decoded once and shared by every stage."""
    key: str            # content hash
    thumb_path: str     # local thumbnail path (build/thumbnails/...)
    img: Any            # BGR uint8
    _gray: Any = field(default=None, repr=False)

    @property
    def gray(self):
        if self._gray is None:
            self._gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)
        return self._gray


class Stage:
    name = ''
    version = 1
    recipe = ''

    def __init__(self):
        self.models = {}

    @property
    def params(self):
        return {}

    def model_hashes(self):
        """{model key: sha256} for the models this stage will use (identity, not file reads)."""
        return {}

    def fingerprint(self):
        from ml.fingerprint import stage_fingerprint
        return stage_fingerprint(self.name, self.version, self.params, self.model_hashes(), self.recipe)

    def load(self):
        """Create model sessions (called only when there is uncached work)."""

    def requests(self, decoded):
        raise NotImplementedError

    def postprocess(self, decoded, reqs, outputs):
        raise NotImplementedError

    def apply(self, photo, payload):
        raise NotImplementedError
