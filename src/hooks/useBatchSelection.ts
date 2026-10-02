import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PhotoRecord } from '../types';

export interface UseBatchSelectionOptions {
    photos: PhotoRecord[];
    eventName?: string;
}

export interface UseBatchSelectionReturn {
    isSelectMode: boolean;
    selectedUrls: Set<string>;
    selectedCount: number;
    isAllSelected: boolean;
    selectedPhotos: PhotoRecord[];
    enterSelectMode: () => void;
    exitSelectMode: () => void;
    toggleSelectMode: () => void;
    togglePhoto: (photo: PhotoRecord, index: number, isShift?: boolean) => void;
    selectAll: () => void;
    deselectAll: () => void;
    clearSelection: () => void;
}

/**
 * Manages multi-photo selection state in full album view.
 * Supports individual toggle, Shift+Click contiguous range selection,
 * Select All / Deselect All, and keyboard Escape cancellation.
 */
export function useBatchSelection({ photos, eventName }: UseBatchSelectionOptions): UseBatchSelectionReturn {
    const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => new Set());
    const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

    // Reset selection if album/event changes
    const [prevEventName, setPrevEventName] = useState(eventName);
    if (prevEventName !== eventName) {
        setPrevEventName(eventName);
        setIsSelectMode(false);
        setSelectedUrls(new Set());
        setLastSelectedIdx(null);
    }

    // Keyboard shortcut: Escape exits select mode
    useEffect(() => {
        if (!isSelectMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsSelectMode(false);
                setSelectedUrls(new Set());
                setLastSelectedIdx(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelectMode]);

    const enterSelectMode = useCallback(() => {
        setIsSelectMode(true);
    }, []);

    const exitSelectMode = useCallback(() => {
        setIsSelectMode(false);
        setSelectedUrls(new Set());
        setLastSelectedIdx(null);
    }, []);

    const toggleSelectMode = useCallback(() => {
        setIsSelectMode((prev) => {
            if (prev) {
                setSelectedUrls(new Set());
                setLastSelectedIdx(null);
            }
            return !prev;
        });
    }, []);

    const togglePhoto = useCallback(
        (photo: PhotoRecord, index: number, isShift?: boolean) => {
            // Auto-enter select mode if not already active
            setIsSelectMode(true);

            setSelectedUrls((prev) => {
                const next = new Set(prev);

                if (isShift && lastSelectedIdx !== null && lastSelectedIdx !== index) {
                    const start = Math.min(lastSelectedIdx, index);
                    const end = Math.max(lastSelectedIdx, index);
                    for (let i = start; i <= end; i++) {
                        const p = photos[i];
                        if (p && p.original) {
                            next.add(p.original);
                        }
                    }
                } else {
                    if (next.has(photo.original)) {
                        next.delete(photo.original);
                    } else {
                        next.add(photo.original);
                    }
                }

                return next;
            });

            setLastSelectedIdx(index);
        },
        [photos, lastSelectedIdx]
    );

    const selectAll = useCallback(() => {
        const allUrls = new Set(photos.map((p) => p.original).filter(Boolean));
        setSelectedUrls(allUrls);
        setIsSelectMode(true);
    }, [photos]);

    const deselectAll = useCallback(() => {
        setSelectedUrls(new Set());
        setLastSelectedIdx(null);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedUrls(new Set());
        setLastSelectedIdx(null);
    }, []);

    const selectedPhotos = useMemo(() => {
        if (selectedUrls.size === 0) return [];
        return photos.filter((p) => selectedUrls.has(p.original));
    }, [photos, selectedUrls]);

    const selectedCount = selectedUrls.size;
    const isAllSelected = photos.length > 0 && selectedCount === photos.length;

    return {
        isSelectMode,
        selectedUrls,
        selectedCount,
        isAllSelected,
        selectedPhotos,
        enterSelectMode,
        exitSelectMode,
        toggleSelectMode,
        togglePhoto,
        selectAll,
        deselectAll,
        clearSelection,
    };
}
