import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_FILE = path.join(process.cwd(), 'data', 'build_cache.json');

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
            cacheInstance = JSON.parse(raw);
            return cacheInstance!;
        } catch {
            // ignore corrupt cache
        }
    }

    cacheInstance = {
        version: 1,
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
 * Computes a deterministic content hash for a directory based on file names, sizes, and mtimes.
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
                const stat = fs.statSync(full);
                entries.push(`${f.name}:${stat.size}:${stat.mtimeMs}`);
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
