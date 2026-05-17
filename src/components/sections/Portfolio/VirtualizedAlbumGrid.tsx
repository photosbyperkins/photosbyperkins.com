import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { List } from 'react-window';
import ProgressiveImage from '../../ui/ProgressiveImage';
import type { PhotoInput } from '../../../types';

interface VirtualizedAlbumGridProps {
    photos: PhotoInput[];
    eventName: string;
    selectedYear: string;
    maxExifChars?: number;
    openLightbox: (images: PhotoInput[], idx: number, name: string, year: string, maxExif?: number) => void;
}

/**
 * Renders a virtualized album grid using react-window.
 * Handles window-level scrolling via a custom wrapper.
 */
export default function VirtualizedAlbumGrid({
    photos,
    eventName,
    selectedYear,
    maxExifChars,
    openLightbox,
}: VirtualizedAlbumGridProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const [cycleSize, setCycleSize] = useState(() => {
        if (typeof window === 'undefined') return 3;
        const w = window.innerWidth;
        if (w < 768) return 3;
        if (w < 1024) return 4;
        return 5;
    });

    const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            if (w < 768) setCycleSize(3);
            else if (w < 1024) setCycleSize(4);
            else setCycleSize(5);
            setWindowHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const rows = useMemo(() => {
        const groups: PhotoInput[][] = [];
        for (let i = 0; i < photos.length; i += cycleSize) {
            groups.push(photos.slice(i, i + cycleSize));
        }
        return groups;
    }, [photos, cycleSize]);

    // Calculate row height
    const rowSize = useMemo(() => {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
        // Approximation of the container width (container has max-width and padding usually)
        // For simplicity we estimate based on window width or a ref if available.
        // Let's use a dynamic getter in the render or a fixed estimate.
        // The original logic used parentRef.current?.clientWidth ?? 1200
        // We will compute it on mount/resize.
        return 1 * (((w + 4) / cycleSize) * (2 / 3));
    }, [cycleSize]);

    // Calculate actual row size after mount to be precise
    const [actualRowSize, setActualRowSize] = useState(rowSize);
    useEffect(() => {
        if (parentRef.current) {
            const w = parentRef.current.clientWidth;
            setActualRowSize(1 * (((w + 4) / cycleSize) * (2 / 3)));
        }
    }, [cycleSize, windowHeight]);

    // Window scroll sync state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listRef = useRef<any>(null);
    const [offsetY, setOffsetY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (parentRef.current && listRef.current) {
                const rect = parentRef.current.getBoundingClientRect();
                const maxOffset = Math.max(0, actualRowSize * rows.length - windowHeight);
                const offset = Math.max(0, Math.min(-rect.top, maxOffset));

                setOffsetY(offset);
                if (listRef.current.element) {
                    listRef.current.element.scrollTop = offset;
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initialize
        return () => window.removeEventListener('scroll', handleScroll);
    }, [actualRowSize, rows.length, windowHeight]);

    const totalHeight = actualRowSize * rows.length;

    const Row = useCallback(
        ({ index, style }: { index: number; style: React.CSSProperties }) => {
            const rowPhotos = rows[index];
            const startIndex = index * cycleSize;

            return (
                <div
                    className="portfolio__event-grid portfolio__event-grid--virtual-row"
                    style={{
                        ...style,
                        width: '100%',
                        paddingBottom: '4px',
                    }}
                >
                    {rowPhotos.map((url, i) => {
                        const globalIdx = startIndex + i;
                        const origUrl = typeof url === 'string' ? url : url.original;
                        const thumbUrl = typeof url === 'string' ? url : url.thumb || url.original;
                        const focusX = typeof url === 'string' ? undefined : url.focusX;
                        const focusY = typeof url === 'string' ? undefined : url.focusY;

                        return (
                            <button
                                key={origUrl}
                                className="portfolio__grid-item"
                                aria-label={`View ${eventName} photo ${globalIdx + 1}`}
                                onClick={() => openLightbox(photos, globalIdx, eventName, selectedYear, maxExifChars)}
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
                                    onClick={() =>
                                        openLightbox(photos, globalIdx, eventName, selectedYear, maxExifChars)
                                    }
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
        },
        [rows, cycleSize, eventName, selectedYear, maxExifChars, photos, openLightbox]
    );

    return (
        <div
            ref={parentRef}
            className="portfolio__event-grid--virtual-container"
            style={{ height: totalHeight, position: 'relative' }}
        >
            <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0, height: windowHeight, zIndex: 1 }}>
                <List
                    listRef={listRef}
                    rowCount={rows.length}
                    rowHeight={actualRowSize}
                    style={{ width: '100%', height: windowHeight, overflow: 'hidden' }}
                    overscanCount={3}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rowComponent={Row as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rowProps={{} as any}
                />
            </div>
        </div>
    );
}
