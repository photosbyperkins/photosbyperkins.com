"""Precomputed Top-K Similar-Photo Neighbors via exact cosine similarity (E @ E.T).

Loads 512-d float16 embeddings from the SQLite `results.blob` column for the `clip`
stage, normalizes them to unit float32 vectors, computes the cosine similarity
matrix in chunks to keep memory small, masks out self and same-burst frames,
and returns the top-12 visually similar `[year, slug, idx]` references per photo.
"""
from __future__ import annotations

from typing import Any

import numpy as np

from .stages.clip import EMBED_DIM

TOP_K_NEIGHBORS = 12


def unpack_embedding_blob(blob: bytes | None) -> np.ndarray | None:
    if not blob or len(blob) != EMBED_DIM * 2:
        return None
    vec = np.frombuffer(blob, dtype=np.float16).astype(np.float32)
    norm = float(np.linalg.norm(vec))
    if norm <= 1e-7 or not np.isfinite(norm):
        return None
    return vec / norm


def compute_top_neighbors(
    items: list[dict[str, Any]],
    top_k: int = TOP_K_NEIGHBORS,
    chunk_size: int = 1024,
) -> dict[str, list[list[Any]]]:
    """Computes top-K visually similar neighbors for each photo key.

    Each entry in `items` must contain:
      - 'key': str (photo cache key, e.g. thumb path)
      - 'year': str
      - 'slug': str
      - 'idx': int (0-based index within the event album)
      - 'burst_id': str | None (optional burst ID to exclude same-burst frames)
      - 'blob': bytes | None (1024-byte float16 embedding)
    """
    valid_items: list[dict[str, Any]] = []
    vectors: list[np.ndarray] = []

    for it in items:
        vec = unpack_embedding_blob(it.get('blob'))
        if vec is not None:
            valid_items.append(it)
            vectors.append(vec)

    n = len(valid_items)
    if n <= 1:
        return {it['key']: [] for it in items}

    E = np.vstack(vectors).astype(np.float32)  # (N, 512) unit-norm
    burst_ids = [it.get('burst_id') or '' for it in valid_items]
    refs = [[str(it['year']), str(it['slug']), int(it['idx'])] for it in valid_items]

    k = min(top_k, n - 1)
    out: dict[str, list[list[Any]]] = {}

    for start in range(0, n, chunk_size):
        end = min(n, start + chunk_size)
        sims = E[start:end] @ E.T  # (chunk, N)

        for local_i, global_i in enumerate(range(start, end)):
            row = sims[local_i].copy()
            row[global_i] = -2.0  # mask self
            b_id = burst_ids[global_i]
            if b_id:
                for j, other_b in enumerate(burst_ids):
                    if other_b == b_id:
                        row[j] = -2.0

            # Partition top-k indices
            if k <= 0:
                out[valid_items[global_i]['key']] = []
                continue

            cand_idx = np.argpartition(-row, k)[:k]
            cand_idx = cand_idx[np.argsort(-row[cand_idx])]
            neighbors = [refs[int(j)] for j in cand_idx if row[int(j)] > -1.0]
            out[valid_items[global_i]['key']] = neighbors

    return out
