import { useState, useEffect } from 'react';
import type { EventData } from '../types';

declare const __BUILD_NUMBER__: string;

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
        if (
            isVisible &&
            (!ev.album || ev.album.length === 0) &&
            ev.albumSlug &&
            !loading &&
            !fetchError &&
            retryCount < 2
        ) {
            const timer = setTimeout(() => {
                setLoading(true);
                const loadYear = ev.originalYear || selectedYear;
                fetch(`/data/albums/${loadYear}/${ev.albumSlug}.json?v=${__BUILD_NUMBER__}`)
                    .then((res) => {
                        if (res.status === 429) throw new Error('Too Many Requests');
                        if (!res.ok) throw new Error('Failed to load');
                        return res.json();
                    })
                    .then((albumData) => {
                        setEv((prev) => ({ ...prev, album: albumData }));
                        setLoading(false);
                    })
                    .catch((err) => {
                        console.error(`Failed to load album for ${eventName}:`, err);
                        setLoading(false);
                        setRetryCount((prev) => prev + 1);
                        if (retryCount >= 1) {
                            setFetchError(true);
                        }
                    });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [
        isVisible,
        selectedYear,
        ev.albumSlug,
        ev.originalYear,
        eventName,
        ev.album,
        loading,
        fetchError,
        retryCount,
        setEv,
    ]);

    return { loading, fetchError };
}
