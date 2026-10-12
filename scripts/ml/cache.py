"""Content-addressed ML result cache (SQLite, WAL).

Tables
  hash_memo   path -> sha256, reused while (size, mtime_ns) are unchanged
  results     (content_hash, stage, fingerprint) -> JSON payload (+ optional binary blob)
  stage_meta  fingerprints seen per stage, with the params that produced them (for debugging)

All access goes through one connection owned by the thread that created the cache; worker
threads hand results back to that thread (see run.py), so no cross-thread locking is needed.
"""

import json
import os
import sqlite3
import time

SCHEMA = """
CREATE TABLE IF NOT EXISTS hash_memo (
    path TEXT PRIMARY KEY,
    size INTEGER NOT NULL,
    mtime_ns INTEGER NOT NULL,
    sha256 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS results (
    content_hash TEXT NOT NULL,
    stage TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    payload TEXT NOT NULL,
    blob BLOB,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (content_hash, stage, fingerprint)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS stage_meta (
    stage TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    params TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    PRIMARY KEY (stage, fingerprint)
);
"""

_CHUNK = 500  # SQLite variable limit is 32k; keep IN (...) lists small


class MLCache:
    def __init__(self, path, commit_every=64):
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        self.path = path
        self.commit_every = commit_every
        self._pending = 0
        self.db = sqlite3.connect(path)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('PRAGMA synchronous=NORMAL')
        self.db.executescript(SCHEMA)
        self.db.commit()

    # -- lifecycle ---------------------------------------------------------

    def flush(self):
        self.db.commit()
        self._pending = 0

    def close(self):
        self.flush()
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def _tick(self, n=1):
        self._pending += n
        if self._pending >= self.commit_every:
            self.flush()

    # -- hash memo ---------------------------------------------------------

    def memo_get_many(self, paths):
        """Return {path: (size, mtime_ns, sha256)} for known paths."""
        out = {}
        paths = list(paths)
        for i in range(0, len(paths), _CHUNK):
            chunk = paths[i:i + _CHUNK]
            q = f'SELECT path, size, mtime_ns, sha256 FROM hash_memo WHERE path IN ({",".join("?" * len(chunk))})'
            for path, size, mtime_ns, sha in self.db.execute(q, chunk):
                out[path] = (size, mtime_ns, sha)
        return out

    def memo_put_many(self, rows):
        """rows: iterable of (path, size, mtime_ns, sha256)."""
        rows = list(rows)
        self.db.executemany(
            'INSERT INTO hash_memo (path, size, mtime_ns, sha256) VALUES (?, ?, ?, ?) '
            'ON CONFLICT(path) DO UPDATE SET size=excluded.size, mtime_ns=excluded.mtime_ns, sha256=excluded.sha256',
            rows,
        )
        self._tick(len(rows))

    # -- results -----------------------------------------------------------

    def register_stage(self, stage, fingerprint, params):
        self.db.execute(
            'INSERT OR IGNORE INTO stage_meta (stage, fingerprint, params, first_seen) VALUES (?, ?, ?, ?)',
            (stage, fingerprint, json.dumps(params, sort_keys=True, default=str), int(time.time())),
        )
        self.db.commit()

    def has_stage_history(self, stage):
        """True if any result was ever stored for this stage (any fingerprint)."""
        return self.db.execute('SELECT 1 FROM results WHERE stage = ? LIMIT 1', (stage,)).fetchone() is not None

    def get_many(self, stage, fingerprint, hashes, with_blob=False):
        """Return {content_hash: payload_dict} (or (payload, blob) when with_blob)."""
        out = {}
        hashes = list(hashes)
        cols = 'content_hash, payload, blob' if with_blob else 'content_hash, payload'
        for i in range(0, len(hashes), _CHUNK):
            chunk = hashes[i:i + _CHUNK]
            q = (f'SELECT {cols} FROM results WHERE stage = ? AND fingerprint = ? '
                 f'AND content_hash IN ({",".join("?" * len(chunk))})')
            for row in self.db.execute(q, [stage, fingerprint, *chunk]):
                payload = json.loads(row[1])
                out[row[0]] = (payload, row[2]) if with_blob else payload
        return out

    def put(self, stage, fingerprint, content_hash, payload, blob=None):
        self.db.execute(
            'INSERT OR REPLACE INTO results (content_hash, stage, fingerprint, payload, blob, created_at) '
            'VALUES (?, ?, ?, ?, ?, ?)',
            (content_hash, stage, fingerprint, json.dumps(payload, separators=(',', ':')), blob, int(time.time())),
        )
        self._tick()

    # -- maintenance -------------------------------------------------------

    def gc(self, live_hashes, current_fingerprints, live_paths=None):
        """Delete results for photos no longer present or fingerprints no longer current.

        live_hashes           set of content hashes referenced by photos.json
        current_fingerprints  {stage: fingerprint} to keep; other stages are left untouched
        live_paths            if given, hash_memo rows for other paths are deleted
        Returns {'results': n, 'memo': n}.
        """
        self.flush()
        live = set(live_hashes)
        removed = 0
        for stage, fp in current_fingerprints.items():
            removed += self.db.execute(
                'DELETE FROM results WHERE stage = ? AND fingerprint != ?', (stage, fp)).rowcount
            removed += self.db.execute(
                'DELETE FROM stage_meta WHERE stage = ? AND fingerprint != ?', (stage, fp)).rowcount * 0
        stale = [h for (h,) in self.db.execute('SELECT DISTINCT content_hash FROM results') if h not in live]
        for i in range(0, len(stale), _CHUNK):
            chunk = stale[i:i + _CHUNK]
            removed += self.db.execute(
                f'DELETE FROM results WHERE content_hash IN ({",".join("?" * len(chunk))})', chunk).rowcount
        memo_removed = 0
        if live_paths is not None:
            keep = set(live_paths)
            gone = [p for (p,) in self.db.execute('SELECT path FROM hash_memo') if p not in keep]
            for i in range(0, len(gone), _CHUNK):
                chunk = gone[i:i + _CHUNK]
                memo_removed += self.db.execute(
                    f'DELETE FROM hash_memo WHERE path IN ({",".join("?" * len(chunk))})', chunk).rowcount
        self.db.commit()
        self.db.execute('VACUUM')
        return {'results': removed, 'memo': memo_removed}

    def stats(self):
        rows = self.db.execute(
            'SELECT stage, fingerprint, COUNT(*), SUM(LENGTH(payload)), SUM(COALESCE(LENGTH(blob), 0)) '
            'FROM results GROUP BY stage, fingerprint ORDER BY stage, fingerprint').fetchall()
        memo = self.db.execute('SELECT COUNT(*) FROM hash_memo').fetchone()[0]
        return {'stages': rows, 'memo': memo,
                'bytes': os.path.getsize(self.path) if os.path.exists(self.path) else 0}
