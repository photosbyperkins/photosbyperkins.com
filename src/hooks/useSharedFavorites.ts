import { useState, useEffect } from 'react';
import { decodeFavoritesHash } from '../utils/favoritesUrl';
import type { PhotoInput } from '../types';

declare const __BUILD_NUMBER__: string;

export function useSharedFavorites() {
    const [sharedFavorites, setSharedFavorites] = useState<PhotoInput[] | undefined>(undefined);

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash.startsWith('#photos=')) return;

        const encoded = hash.slice('#photos='.length);
        (async () => {
            try {
                const groups = await decodeFavoritesHash(encoded);
                if (!groups || groups.length === 0) return;

                const resolved: PhotoInput[] = [];

                for (const group of groups) {
                    const [year, slug] = group.albumKey.split('/');
                    if (!year || !slug) continue;

                    const albumRes = await fetch(`/data/albums/${year}/${slug}.json?build=${__BUILD_NUMBER__}`);
                    if (!albumRes.ok) continue;
                    const album: PhotoInput[] = await albumRes.json();

                    // Match photos by stem: strip .jpg and leading zeros to match encoder
                    const idSet = new Set(group.photoIds);
                    for (const photo of album) {
                        const original = typeof photo === 'string' ? photo : photo.original;
                        const filename = original.split('/').pop() || '';
                        const stem = filename
                            .replace(/\.jpe?g$/i, '')
                            .replace(/^photo_0*(\d+)$/, (_, num: string) => num)
                            .replace(/_(0*)(\d+)$/, (_, _zeros: string, num: string) => '_' + parseInt(_zeros + num));
                        if (idSet.has(stem)) {
                            resolved.push(photo);
                            idSet.delete(stem);
                            if (idSet.size === 0) break;
                        }
                    }
                }

                if (resolved.length > 0) {
                    setSharedFavorites(resolved);
                }
            } catch (err) {
                console.error('Failed to resolve shared favorites:', err);
            }
        })();
    }, []);

    const clearSharedFavorites = () => {
        setSharedFavorites(undefined);
        window.history.replaceState(null, '', window.location.pathname);
    };

    return { sharedFavorites, clearSharedFavorites };
}
