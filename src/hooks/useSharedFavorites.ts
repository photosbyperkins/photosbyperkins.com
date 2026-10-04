import { useState, useEffect } from 'react';
import { decodeFavoritesHash, photoStem } from '../utils/favoritesUrl';
import { getBuildNumber } from '../utils/build';
import type { PhotoInput } from '../types';

export function useSharedFavorites() {
    const [sharedFavorites, setSharedFavorites] = useState<PhotoInput[] | undefined>(undefined);

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash.startsWith('#photos=')) return;

        let isCancelled = false;
        const encoded = hash.slice('#photos='.length);

        (async () => {
            try {
                const groups = await decodeFavoritesHash(encoded);
                if (!groups || groups.length === 0 || isCancelled) return;

                const validGroups = groups.filter((g) => {
                    const [year, slug] = g.albumKey.split('/');
                    return year && slug && /^\d{4}$/.test(year) && /^[a-zA-Z0-9_-]+$/.test(slug);
                });

                const build = getBuildNumber();
                const albumResults = await Promise.all(
                    validGroups.map(async (group) => {
                        const [year, slug] = group.albumKey.split('/');
                        try {
                            const res = await fetch(`/data/albums/${year}/${slug}.json?build=${build}`);
                            if (!res.ok) return { group, album: [] as PhotoInput[] };
                            const album: PhotoInput[] = await res.json();
                            return { group, album };
                        } catch {
                            return { group, album: [] as PhotoInput[] };
                        }
                    })
                );

                if (isCancelled) return;

                const resolved: PhotoInput[] = [];
                for (const { group, album } of albumResults) {
                    const idSet = new Set(group.photoIds);
                    for (const photo of album) {
                        const original = typeof photo === 'string' ? photo : photo.original;
                        const filename = original.split('/').pop() || '';
                        const stem = photoStem(filename);
                        if (idSet.has(stem)) {
                            resolved.push(photo);
                            idSet.delete(stem);
                            if (idSet.size === 0) break;
                        }
                    }
                }

                if (!isCancelled && resolved.length > 0) {
                    setSharedFavorites(resolved);
                }
            } catch (err) {
                console.error('Failed to resolve shared favorites:', err);
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, []);

    const clearSharedFavorites = () => {
        setSharedFavorites(undefined);
        window.history.replaceState(null, '', window.location.pathname);
    };

    return { sharedFavorites, clearSharedFavorites };
}
