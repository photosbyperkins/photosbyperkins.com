import { LRUCache } from './LRUCache';
import { getBuildNumber } from './build';
import type { PhotoRecord } from '../types';

const albumMemoryCache = new LRUCache<string, PhotoRecord[]>(50);
const inFlightFetches = new Map<string, Promise<PhotoRecord[]>>();

export function getCachedAlbum(year: string, albumSlug: string): PhotoRecord[] | undefined {
    return albumMemoryCache.get(`${year}/${albumSlug}`);
}

export function setCachedAlbum(year: string, albumSlug: string, album: PhotoRecord[]): void {
    albumMemoryCache.set(`${year}/${albumSlug}`, album);
}

export function _clearAlbumCache(): void {
    albumMemoryCache.clear();
    inFlightFetches.clear();
}

export async function fetchAlbum(year: string, albumSlug: string, signal?: AbortSignal): Promise<PhotoRecord[]> {
    const key = `${year}/${albumSlug}`;
    const cached = albumMemoryCache.get(key);
    if (cached) {
        return cached;
    }

    if (signal?.aborted) {
        throw new DOMException('The user aborted a request.', 'AbortError');
    }

    const inFlight = inFlightFetches.get(key);
    if (inFlight) {
        if (!signal) return inFlight;
        return new Promise<PhotoRecord[]>((resolve, reject) => {
            const abortHandler = () => reject(new DOMException('The user aborted a request.', 'AbortError'));
            signal.addEventListener('abort', abortHandler, { once: true });
            inFlight
                .then((res) => {
                    signal.removeEventListener('abort', abortHandler);
                    resolve(res);
                })
                .catch((err) => {
                    signal.removeEventListener('abort', abortHandler);
                    reject(err);
                });
        });
    }

    const fetchPromise = (async () => {
        try {
            const res = await fetch(`/data/albums/${year}/${albumSlug}.json?build=${getBuildNumber()}`);
            if (res.status === 429) throw new Error('Too Many Requests');
            if (!res.ok) throw new Error('Failed to load');
            const data = (await res.json()) as PhotoRecord[];
            albumMemoryCache.set(key, data);
            return data;
        } finally {
            inFlightFetches.delete(key);
        }
    })();

    inFlightFetches.set(key, fetchPromise);

    if (!signal) return fetchPromise;

    return new Promise<PhotoRecord[]>((resolve, reject) => {
        const abortHandler = () => reject(new DOMException('The user aborted a request.', 'AbortError'));
        signal.addEventListener('abort', abortHandler, { once: true });
        fetchPromise
            .then((res) => {
                signal.removeEventListener('abort', abortHandler);
                resolve(res);
            })
            .catch((err) => {
                signal.removeEventListener('abort', abortHandler);
                reject(err);
            });
    });
}
