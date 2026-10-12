"""Content hashes for source photos, memoised by (path, size, mtime_ns)."""

import concurrent.futures
import hashlib
import os


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)  # hashlib releases the GIL for large buffers, so threads scale
    return h.hexdigest()


def resolve_hashes(cache, paths, workers=8):
    """Return {path: sha256} for existing files. Unchanged files reuse the memo; others are hashed
    in parallel and written back. Missing files are omitted. Returns (hashes, n_hashed)."""
    memo = cache.memo_get_many(paths)
    out, todo = {}, []
    for p in paths:
        try:
            st = os.stat(p)
        except OSError:
            continue
        known = memo.get(p)
        if known and known[0] == st.st_size and known[1] == st.st_mtime_ns:
            out[p] = known[2]
        else:
            todo.append((p, st.st_size, st.st_mtime_ns))
    if todo:
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
            digests = list(pool.map(lambda t: sha256_file(t[0]), todo))
        rows = []
        for (p, size, mtime_ns), sha in zip(todo, digests):
            out[p] = sha
            rows.append((p, size, mtime_ns, sha))
        cache.memo_put_many(rows)
        cache.flush()
    return out, len(todo)
