import React from 'react';
import { Check } from 'lucide-react';
import ProgressiveImage from '../../../ui/ProgressiveImage';
import type { PhotoRecord, EventScore } from '../../../../types';

declare const __BUILD_NUMBER__: string;

export interface EventGridProps {
    albumImages: PhotoRecord[];
    eventName: string;
    selectedYear: string;
    maxExifChars?: number;
    eventScore?: EventScore;
    loading: boolean;
    fetchError: boolean;
    openLightbox: (
        album: PhotoRecord[],
        index: number,
        eventName: string,
        selectedYear: string,
        maxExifChars?: number,
        scorePayload?: EventScore
    ) => void;
    isSelectMode?: boolean;
    selectedUrls?: Set<string>;
    selectionIndexMap?: Map<string, number>;
    onToggleSelect?: (photo: PhotoRecord, index: number, isShift?: boolean) => void;
}

export const EventGrid = React.memo(function EventGrid({
    albumImages,
    eventName,
    selectedYear,
    maxExifChars,
    eventScore,
    loading,
    fetchError,
    openLightbox,
    isSelectMode,
    selectedUrls,
    selectionIndexMap,
    onToggleSelect,
}: EventGridProps) {
    return (
        <div className="portfolio__event-grid">
            {albumImages.map((photo: PhotoRecord, i) => {
                const origUrl = photo.original;
                const rawThumbUrl = photo.thumb || photo.original;
                const thumbUrl = rawThumbUrl.includes('?v=') ? rawThumbUrl : `${rawThumbUrl}?v=${__BUILD_NUMBER__}`;

                const focusX = photo.focusX;
                const focusY = photo.focusY;
                const isSelected = selectedUrls?.has(origUrl) ?? false;
                const selectionNum = origUrl ? selectionIndexMap?.get(origUrl) : undefined;
                const showNumber = (selectedUrls?.size ?? 0) <= 3 && selectionNum != null;

                return (
                    <button
                        type="button"
                        key={origUrl}
                        className={`portfolio__grid-item${
                            isSelected ? ' portfolio__grid-item--selected' : ''
                        }${isSelectMode ? ' portfolio__grid-item--select-mode' : ''}`}
                        role={isSelectMode ? 'checkbox' : undefined}
                        aria-checked={isSelectMode ? isSelected : undefined}
                        aria-label={
                            isSelectMode
                                ? `${eventName} photo ${i + 1}, ${isSelected ? 'selected' : 'not selected'}`
                                : `View ${eventName} photo ${i + 1}`
                        }
                        onClick={(e) => {
                            if (isSelectMode) {
                                onToggleSelect?.(photo, i, e.shiftKey);
                            } else if (e.shiftKey && onToggleSelect) {
                                onToggleSelect(photo, i, true);
                            } else {
                                openLightbox(albumImages, i, eventName, selectedYear, maxExifChars, eventScore);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (isSelectMode) {
                                    onToggleSelect?.(photo, i, e.shiftKey);
                                } else {
                                    openLightbox(albumImages, i, eventName, selectedYear, maxExifChars, eventScore);
                                }
                            }
                        }}
                    >
                        <ProgressiveImage
                            src={thumbUrl}
                            placeholder={null}
                            alt={`${eventName} photo ${i + 1}`}
                            objectPosition={
                                focusX != null && focusY != null ? `${focusX * 100}% ${focusY * 100}%` : 'center'
                            }
                        />
                        {isSelectMode && (
                            <div
                                className={`portfolio__grid-select-badge${
                                    isSelected ? ' portfolio__grid-select-badge--active' : ''
                                }`}
                                aria-hidden="true"
                            >
                                {isSelected &&
                                    (showNumber ? (
                                        <span className="portfolio__grid-select-number">{selectionNum}</span>
                                    ) : (
                                        <Check size={14} strokeWidth={3} />
                                    ))}
                            </div>
                        )}
                    </button>
                );
            })}
            {loading && <div className="portfolio__loading">Loading photos...</div>}
            {fetchError && <div className="portfolio__error">Error loading photos. Please try refreshing.</div>}
        </div>
    );
});

export default EventGrid;
