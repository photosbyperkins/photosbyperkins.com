import React from 'react';
import { Check } from '../../../ui/icons';
import ProgressiveImage from '../../../ui/ProgressiveImage';
import type { PhotoRecord, EventScore } from '../../../../types';
import { withBuild } from '../../../../utils/build';

export interface EventHighlightsProps {
    featuredPhotos: PhotoRecord[];
    albumImages: PhotoRecord[];
    albumIndexMap: Map<string, number>;
    eventName: string;
    selectedYear: string;
    totalPhotos: number;
    maxExifChars?: number;
    eventScore?: EventScore;
    evIdx: number;
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

export const EventHighlights = React.memo(function EventHighlights({
    featuredPhotos,
    albumImages,
    albumIndexMap,
    eventName,
    selectedYear,
    totalPhotos,
    maxExifChars,
    eventScore,
    evIdx,
    loading,
    fetchError,
    openLightbox,
    isSelectMode = false,
    selectedUrls,
    selectionIndexMap,
    onToggleSelect,
}: EventHighlightsProps) {
    if (featuredPhotos.length === 0) {
        return (
            <div className="portfolio__event-placeholder portfolio__event-placeholder--featured">
                {loading ? 'Loading photos...' : fetchError ? 'Error loading photos' : ''}
            </div>
        );
    }

    return (
        <div className="portfolio__event-featured">
            {featuredPhotos.map((photo, i) => {
                const isLast = i === 4;
                const origUrl = photo.original;
                const rawThumbUrl = photo.thumb || photo.original;
                const thumbUrl = withBuild(rawThumbUrl);
                const albumIndex = albumIndexMap.get(origUrl) ?? -1;

                const focusX = photo.focusX;
                const focusY = photo.focusY;
                const isSelected = selectedUrls?.has(origUrl) ?? false;
                const selectionNum = origUrl ? selectionIndexMap?.get(origUrl) : undefined;
                const showNumber = (selectedUrls?.size ?? 0) <= 3 && selectionNum != null;

                return (
                    <div
                        key={origUrl}
                        style={{ '--reveal-delay': `${Math.min(i, 8) * 35}ms` } as React.CSSProperties}
                        className={`portfolio__featured-item ${isLast && totalPhotos > 5 ? 'has-overlay-mobile' : ''}${
                            isSelected ? ' portfolio__featured-item--selected' : ''
                        }${isSelectMode ? ' portfolio__featured-item--select-mode' : ''}`}
                        role={isSelectMode ? 'checkbox' : 'button'}
                        aria-checked={isSelectMode ? isSelected : undefined}
                        tabIndex={0}
                        aria-label={
                            isSelectMode
                                ? `${eventName} featured photo ${i + 1}, ${isSelected ? 'selected' : 'not selected'}`
                                : `View ${eventName} featured photo ${i + 1}`
                        }
                        onClick={(e) => {
                            if (isSelectMode) {
                                onToggleSelect?.(photo, i, e.shiftKey);
                            } else if (e.shiftKey && onToggleSelect) {
                                onToggleSelect(photo, i, true);
                            } else {
                                openLightbox(
                                    albumImages,
                                    albumIndex !== -1 ? albumIndex : 0,
                                    eventName,
                                    selectedYear,
                                    maxExifChars,
                                    eventScore
                                );
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (isSelectMode) {
                                    onToggleSelect?.(photo, i, e.shiftKey);
                                } else {
                                    openLightbox(
                                        albumImages,
                                        albumIndex !== -1 ? albumIndex : 0,
                                        eventName,
                                        selectedYear,
                                        maxExifChars,
                                        eventScore
                                    );
                                }
                            }
                        }}
                    >
                        <ProgressiveImage
                            src={thumbUrl}
                            placeholder={null}
                            alt={`${eventName} featured photo ${i + 1}`}
                            priority={evIdx === 0 && i < 2}
                            objectPosition={
                                focusX != null && focusY != null ? `${focusX * 100}% ${focusY * 100}%` : 'center'
                            }
                        />
                        {isLast && totalPhotos > 5 && !isSelectMode && (
                            <div className="portfolio__featured-overlay portfolio__featured-overlay--mobile">
                                <span>+{totalPhotos - 5}</span>
                            </div>
                        )}
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
                    </div>
                );
            })}
        </div>
    );
});
