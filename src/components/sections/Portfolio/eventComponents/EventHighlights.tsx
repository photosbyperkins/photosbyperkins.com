import React from 'react';
import ProgressiveImage from '../../../ui/ProgressiveImage';
import type { PhotoRecord, EventScore } from '../../../../types';

declare const __BUILD_NUMBER__: string;

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
                const thumbUrl = rawThumbUrl.includes('?v=') ? rawThumbUrl : `${rawThumbUrl}?v=${__BUILD_NUMBER__}`;
                const albumIndex = albumIndexMap.get(origUrl) ?? -1;

                const focusX = photo.focusX;
                const focusY = photo.focusY;

                return (
                    <div
                        key={origUrl}
                        className={`portfolio__featured-item ${isLast && totalPhotos > 5 ? 'has-overlay-mobile' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${eventName} featured photo ${i + 1}`}
                        onClick={() =>
                            openLightbox(
                                albumImages,
                                albumIndex !== -1 ? albumIndex : 0,
                                eventName,
                                selectedYear,
                                maxExifChars,
                                eventScore
                            )
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
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
                        {isLast && totalPhotos > 5 && (
                            <div className="portfolio__featured-overlay portfolio__featured-overlay--mobile">
                                <span>+{totalPhotos - 5}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
