import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ProgressiveImage from '../../ui/ProgressiveImage';
import type { PhotoInput, EventScore } from '../../../types';

declare const __BUILD_NUMBER__: string;

interface VirtualizedAlbumGridProps {
    photos: PhotoInput[];
    eventName: string;
    selectedYear: string;
    maxExifChars?: number;
    localScore?: EventScore;
    openLightbox: (
        images: PhotoInput[],
        idx: number,
        name: string,
        year: string,
        maxExif?: number,
        localScore?: EventScore
    ) => void;
}

const getCycleSize = (width: number) => {
    if (width < 768) return 3;
    if (width < 1024) return 4;
    return 5;
};

// Overscan buffer (in rows). 6 rows on mobile = 18 photos buffer above and below.
const OVERSCAN = 6;

/**
 * Renders a window-scrolled virtualized album grid without DOM translation or scroll sync lag.
 * Rows are anchored at static document coordinates so native mobile compositor scrolling
 * remains 100% smooth (60-120fps) without judder or rubber-banding jank.
 */
export default function VirtualizedAlbumGrid({
    photos,
    eventName,
    selectedYear,
    maxExifChars,
    localScore,
    openLightbox,
}: VirtualizedAlbumGridProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const [cycleSize, setCycleSize] = useState(() => {
        if (typeof window === 'undefined') return 3;
        return getCycleSize(window.innerWidth);
    });

    const [actualRowSize, setActualRowSize] = useState(() => {
        if (typeof window === 'undefined') return 100;
        const w = window.innerWidth;
        const cols = getCycleSize(w);
        return ((w + 4) / cols) * (2 / 3);
    });

    // Observe container width to dynamically update column count and row height
    useEffect(() => {
        const el = parentRef.current;
        if (!el) return;

        const updateDimensions = () => {
            const w = el.clientWidth;
            if (w <= 0) return;
            const cols = getCycleSize(w);
            setCycleSize(cols);
            setActualRowSize(((w + 4) / cols) * (2 / 3));
        };

        const ro = new ResizeObserver(updateDimensions);
        ro.observe(el);
        updateDimensions();

        return () => ro.disconnect();
    }, []);

    const rows = useMemo(() => {
        const groups: PhotoInput[][] = [];
        for (let i = 0; i < photos.length; i += cycleSize) {
            groups.push(photos.slice(i, i + cycleSize));
        }
        return groups;
    }, [photos, cycleSize]);

    const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 20]);

    const updateRange = useCallback(() => {
        if (!parentRef.current || actualRowSize <= 0) return;
        const rect = parentRef.current.getBoundingClientRect();
        const vh = window.innerHeight;

        // Skip updating if container is far offscreen
        if (rect.bottom < -vh * 2 || rect.top > vh * 3) {
            return;
        }

        const scrollOffset = -rect.top;
        const start = Math.max(0, Math.floor(scrollOffset / actualRowSize) - OVERSCAN);
        const end = Math.min(rows.length, Math.ceil((scrollOffset + vh) / actualRowSize) + OVERSCAN);

        setVisibleRange((prev) => {
            if (prev[0] === start && prev[1] === end) return prev;
            return [start, end];
        });
    }, [actualRowSize, rows.length]);

    useEffect(() => {
        let rafId: number | null = null;

        const handleScroll = () => {
            if (rafId === null) {
                rafId = window.requestAnimationFrame(() => {
                    rafId = null;
                    updateRange();
                });
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        updateRange(); // Initial position

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [updateRange]);

    const totalHeight = actualRowSize * rows.length;
    const [startRow, endRow] = visibleRange;
    const clampedStart = Math.min(startRow, rows.length);
    const clampedEnd = Math.min(Math.max(endRow, clampedStart), rows.length);
    const visibleRows = rows.slice(clampedStart, clampedEnd);

    return (
        <div
            ref={parentRef}
            className="portfolio__event-grid--virtual-container"
            style={{
                height: totalHeight,
                position: 'relative',
                width: '100%',
            }}
        >
            {visibleRows.map((rowPhotos, i) => {
                const rowIndex = clampedStart + i;
                const top = rowIndex * actualRowSize;
                const startIndex = rowIndex * cycleSize;

                return (
                    <div
                        key={rowIndex}
                        className="portfolio__event-grid portfolio__event-grid--virtual-row"
                        style={{
                            position: 'absolute',
                            top,
                            left: 0,
                            right: 0,
                            height: actualRowSize,
                            paddingBottom: '4px',
                        }}
                    >
                        {rowPhotos.map((url, colIdx) => {
                            const globalIdx = startIndex + colIdx;
                            const origUrl = typeof url === 'string' ? url : url.original;
                            const rawThumbUrl = typeof url === 'string' ? url : url.thumb || url.original;
                            const thumbUrl = rawThumbUrl.includes('?v=')
                                ? rawThumbUrl
                                : `${rawThumbUrl}?v=${__BUILD_NUMBER__}`;
                            const focusX = typeof url === 'string' ? undefined : url.focusX;
                            const focusY = typeof url === 'string' ? undefined : url.focusY;

                            return (
                                <button
                                    key={origUrl}
                                    className="portfolio__grid-item"
                                    aria-label={`View ${eventName} photo ${globalIdx + 1}`}
                                    onClick={() =>
                                        openLightbox(
                                            photos,
                                            globalIdx,
                                            eventName,
                                            selectedYear,
                                            maxExifChars,
                                            localScore
                                        )
                                    }
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        padding: 0,
                                        margin: 0,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        outline: 'none',
                                    }}
                                >
                                    <ProgressiveImage
                                        src={thumbUrl}
                                        placeholder={null}
                                        alt={`${eventName} photo ${globalIdx + 1}`}
                                        objectPosition={
                                            focusX != null && focusY != null
                                                ? `${focusX * 100}% ${focusY * 100}%`
                                                : 'center'
                                        }
                                    />
                                </button>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
