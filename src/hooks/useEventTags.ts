import { useEffect, useState } from 'react';
import type { EventTagSidecar } from '../types';
import { fetchEventTagSidecar, getCachedEventTagSidecar } from '../utils/tagSidecar';

export function useEventTags(year?: string, albumSlug?: string, enabled = true): {
    sidecar: EventTagSidecar | null;
    isLoading: boolean;
} {
    const cached = enabled && year && albumSlug ? getCachedEventTagSidecar(year, albumSlug) : null;
    const [fetchedSidecar, setFetchedSidecar] = useState<{
        key: string;
        data: EventTagSidecar | null;
    } | null>(null);

    const requestKey = enabled && year && albumSlug ? `${year}/${albumSlug}` : '';

    useEffect(() => {
        if (!enabled || !year || !albumSlug) {
            return;
        }
        const alreadyCached = getCachedEventTagSidecar(year, albumSlug);
        if (alreadyCached !== undefined) {
            return;
        }

        let cancelled = false;
        const key = `${year}/${albumSlug}`;
        fetchEventTagSidecar(year, albumSlug).then((res) => {
            if (!cancelled) {
                setFetchedSidecar({ key, data: res });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [year, albumSlug, enabled]);

    if (!enabled || !year || !albumSlug) {
        return { sidecar: null, isLoading: false };
    }
    if (cached !== undefined) {
        return { sidecar: cached, isLoading: false };
    }
    if (fetchedSidecar?.key === requestKey) {
        return { sidecar: fetchedSidecar.data, isLoading: false };
    }
    return { sidecar: null, isLoading: true };
}

