import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useCallback } from 'react';
import ProgressiveImage from '../../ui/ProgressiveImage';
import type { PhotoInput } from '../../../types';

declare const __BUILD_NUMBER__: string;

const CYCLE_SIZE = 10; // Fibonacci packing: 2 large + 3 medium + 5 small
const MOBILE_CYCLE_SIZE = 5; // Mobile: 2 large + 3 small

interface VirtualizedAlbumGridProps {
    photos: PhotoInput[];
    eventName: string;
    selectedYear: string;
    maxExifChars?: number;
    openLightbox: (images: PhotoInput[], idx: number, name: string, year: string, maxExif?: number) => void;
}

/**
 * Renders a virtualized album grid for large albums (50+ photos).
 * Groups photos into rows of 10 (matching the Fibonacci cycle in CSS)
 * and only renders rows that are visible in the viewport.
 */
export default function VirtualizedAlbumGrid({
    photos,
    eventName,
    selectedYear,
    maxExifChars,
    openLightbox,
}: VirtualizedAlbumGridProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    // Group photos into rows of CYCLE_SIZE
    const rows = useMemo(() => {
        const groups: PhotoInput[][] = [];
        for (let i = 0; i < photos.length; i += CYCLE_SIZE) {
            groups.push(photos.slice(i, i + CYCLE_SIZE));
        }
        return groups;
    }, [photos]);

    // Estimate row height based on the grid math:
    // Desktop: 31-col grid, each col = (containerWidth - 120px gaps) / 31
    // A full 10-photo cycle spans 15 rows tall (large) + 10 rows (medium) at row height = colWidth * 2/3
    // The total CSS height for one cycle ≈ (15 * rowUnit) + (10 * rowUnit) where groups stack
    // Simplified: roughly 1.5 * containerWidth for desktop cycles, 2.5x for mobile
    const estimateRowSize = useCallback(() => {
        const w = parentRef.current?.clientWidth ?? 1200;
        const isMobile = w <= 600;

        if (isMobile) {
            // Mobile: 5-col grid, 2 large (span 3x3) + 3 small (span 2x2)
            // Each cycle visually spans about 5 rows of (colWidth * 2/3) tall
            const colW = (w - 16) / 5; // 4 gaps of 4px
            const rowUnit = colW * (2 / 3);
            // 2 large items at 3 rows each = 6 rows, 3 small at 2 rows each = 6 rows
            // But they pack dense, so roughly 5 rows visible height
            return rowUnit * 5 + 4 * 4; // 5 rowUnits + gaps
        }

        // Desktop: 31-col grid
        const colW = (w - 120) / 31; // 30 gaps of 4px
        const rowUnit = colW * (2 / 3);
        // Fibonacci cycle packs into ~15 row-units tall (the large items span 15)
        return rowUnit * 15 + 14 * 4; // 15 rowUnits + gaps
    }, []);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current?.closest('[style*="overflow"]') ?? window.document.documentElement,
        estimateSize: estimateRowSize,
        overscan: 3,
    });

    return (
        <div ref={parentRef} className="portfolio__event-grid--virtual-container">
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const rowPhotos = rows[virtualRow.index];
                    const startIndex = virtualRow.index * CYCLE_SIZE;

                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            className="portfolio__event-grid portfolio__event-grid--virtual-row"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {rowPhotos.map((url, i) => {
                                const globalIdx = startIndex + i;
                                const origUrl = typeof url === 'string' ? url : url.original;
                                const thumbUrl = typeof url === 'string' ? url : url.thumb || url.original;
                                const focusX = typeof url === 'string' ? undefined : url.focusX;
                                const focusY = typeof url === 'string' ? undefined : url.focusY;

                                return (
                                    <div
                                        key={origUrl}
                                        className="portfolio__grid-item"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`View ${eventName} photo ${globalIdx + 1}`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openLightbox(photos, globalIdx, eventName, selectedYear, maxExifChars);
                                            }
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
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
