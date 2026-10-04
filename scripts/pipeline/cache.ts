import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_FILE = path.join(process.cwd(), 'data', 'build_cache.json');

export const CURRENT_CACHE_VERSION = 2;

export interface AlbumCacheEntry {
    hash: string;
    photoCount: number;
    lastBuilt?: string;
    extra?: Record<string, unknown>;
}

export interface BuildCache {
    version: number;
    exif: Record<string, { mtime: number; size: number; exif: Record<string, unknown> }>;
    albums: Record<string, AlbumCacheEntry>;
}

let cacheInstance: BuildCache | null = null;

export function loadBuildCache(): BuildCache {
    if (cacheInstance) return cacheInstance;

    if (fs.existsSync(CACHE_FILE)) {
        try {
            const raw = fs.readFileSync(CACHE_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (
                parsed &&
                typeof parsed === 'object' &&
                parsed.version === CURRENT_CACHE_VERSION &&
                parsed.albums &&
                parsed.exif
            ) {
                cacheInstance = parsed as BuildCache;
                return cacheInstance;
            }
        } catch {
            // ignore corrupt cache
        }
    }

    cacheInstance = {
        version: CURRENT_CACHE_VERSION,
        exif: {},
        albums: {},
    };
    return cacheInstance;
}

export function saveBuildCache(cache?: BuildCache): void {
    const toSave = cache || cacheInstance;
    if (!toSave) return;

    try {
        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(toSave, null, 2));
    } catch (err) {
        console.error('Failed to save build cache:', err);
    }
}

/**
 * Computes a fast partial hash of a file's head and tail content.
 * Avoids reading entire multi-megabyte files while providing deterministic content verification
 * that is resilient across git checkouts and copy operations (unlike mtime).
 */
function computeQuickFileHash(filePath: string, size: number): string {
    if (size === 0) return '0';
    const CHUNK_SIZE = 8192;
    if (size <= CHUNK_SIZE * 2) {
        try {
            const buf = fs.readFileSync(filePath);
            return crypto.createHash('md5').update(buf).digest('hex').slice(0, 12);
        } catch {
            return 'err';
        }
    }

    let fd: number | null = null;
    try {
        fd = fs.openSync(filePath, 'r');
        const hash = crypto.createHash('md5');
        const headBuf = Buffer.alloc(CHUNK_SIZE);
        fs.readSync(fd, headBuf, 0, CHUNK_SIZE, 0);
        hash.update(headBuf);

        const tailBuf = Buffer.alloc(CHUNK_SIZE);
        fs.readSync(fd, tailBuf, 0, CHUNK_SIZE, size - CHUNK_SIZE);
        hash.update(tailBuf);

        return hash.digest('hex').slice(0, 12);
    } catch {
        return 'err';
    } finally {
        if (fd !== null) {
            try {
                fs.closeSync(fd);
            } catch {
                // ignore close error
            }
        }
    }
}

/**
 * Computes a deterministic content hash for a directory based on relative paths, file sizes,
 * and content digests (stable across git clones and file copy operations).
 */
export function computeDirHash(dirPath: string): string {
    if (!fs.existsSync(dirPath)) return '';

    const entries: string[] = [];

    function scan(current: string) {
        const files = fs.readdirSync(current, { withFileTypes: true });
        for (const f of files) {
            const full = path.join(current, f.name);
            if (f.isDirectory()) {
                scan(full);
            } else if (f.isFile()) {
                try {
                    const stat = fs.statSync(full);
                    const rel = path.relative(dirPath, full).replace(/\\/g, '/');
                    const digest = computeQuickFileHash(full, stat.size);
                    entries.push(`${rel}:${stat.size}:${digest}`);
                } catch {
                    // ignore inaccessible file
                }
            }
        }
    }

    scan(dirPath);
    entries.sort();

    return crypto.createHash('sha256').update(entries.join('|')).digest('hex').slice(0, 16);
}

/**
 * Checks whether an album's contents have changed since the last build.
 */
export function isAlbumUnchanged(albumKey: string, currentHash: string): boolean {
    const cache = loadBuildCache();
    const entry = cache.albums[albumKey];
    if (!entry) return false;
    return entry.hash === currentHash;
}

/**
 * Updates the recorded hash for an album in the build cache.
 */
export function setAlbumCache(albumKey: string, entry: AlbumCacheEntry): void {
    const cache = loadBuildCache();
    cache.albums[albumKey] = entry;
}
