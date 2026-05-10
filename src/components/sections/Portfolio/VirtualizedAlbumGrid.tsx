import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useCallback, useState } from 'react';
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

    const [cycleSize] = useState(5);

    // Group photos into responsive rows
    const rows = useMemo(() => {
        const groups: PhotoInput[][] = [];
        for (let i = 0; i < photos.length; i += cycleSize) {
            groups.push(photos.slice(i, i + cycleSize));
        }
        return groups;
    }, [photos, cycleSize]);

    // Estimate row height based on the exact grid math
    const estimateRowSize = useCallback(() => {
        const w = parentRef.current?.clientWidth ?? 1200;
        // Total height = rows * (rowUnit + 4px gap)
        // Since rowUnit = ((w + 4) / cols) * (2/3) - 4
        // rowUnit + 4 = ((w + 4) / cols) * (2/3)
        // 5-photo cycle takes exactly 6 rows
        return 6 * (((w + 4) / 5) * (2 / 3));
    }, []);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current?.closest('[style*="overflow"]') ?? window.document.documentElement,
        estimateSize: estimateRowSize,
        overscan: 3,
        // CRITICAL BUGFIX: react-virtual v3 forces a layout-sync scroll to 0 during _willUpdate
        // when the container height changes drastically. Since we use window-level scrolling,
        // we NEVER want the virtualizer to hijack the window scroll position.
        scrollToFn: () => {},
    });

    // Disable item size change adjustments just in case
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => false;

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
                    const startIndex = virtualRow.index * cycleSize;

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
                                paddingBottom: '4px',
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
