import { useState, useEffect } from 'react';
import type { EventData } from '../types';
import { fetchAlbum } from '../utils/albumData';

interface UseEventAlbumOptions {
    ev: EventData;
    isVisible: boolean;
    selectedYear: string;
    eventName: string;
    setEv: React.Dispatch<React.SetStateAction<EventData>>;
}

export function useEventAlbum({ ev, isVisible, selectedYear, eventName, setEv }: UseEventAlbumOptions) {
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (!isVisible || (ev.album && ev.album.length > 0) || !ev.albumSlug || fetchError || retryCount >= 2) {
            return;
        }

        const controller = new AbortController();
        const loadYear = ev.originalYear || selectedYear;

        const timer = setTimeout(() => {
            setLoading(true);
        }, 0);

        fetchAlbum(loadYear, ev.albumSlug, controller.signal)
            .then((albumData) => {
                clearTimeout(timer);
                setEv((prev) => ({ ...prev, album: albumData }));
                setLoading(false);
            })
            .catch((err: unknown) => {
                clearTimeout(timer);
                if ((err as Error).name === 'AbortError') return;
                console.error(`Failed to load album for ${eventName}:`, err);
                setLoading(false);
                setRetryCount((prev) => {
                    if (prev >= 1) setFetchError(true);
                    return prev + 1;
                });
            });

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [isVisible, selectedYear, ev.albumSlug, ev.originalYear, eventName, ev.album, fetchError, retryCount, setEv]);

    return { loading, fetchError };
}
