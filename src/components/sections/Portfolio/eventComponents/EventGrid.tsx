import React from 'react';
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
}: EventGridProps) {
    return (
        <div className="portfolio__event-grid">
            {albumImages.map((photo: PhotoRecord, i) => {
                const origUrl = photo.original;
                const rawThumbUrl = photo.thumb || photo.original;
                const thumbUrl = rawThumbUrl.includes('?v=') ? rawThumbUrl : `${rawThumbUrl}?v=${__BUILD_NUMBER__}`;

                const focusX = photo.focusX;
                const focusY = photo.focusY;

                return (
                    <button
                        type="button"
                        key={origUrl}
                        className="portfolio__grid-item"
                        aria-label={`View ${eventName} photo ${i + 1}`}
                        onClick={() =>
                            openLightbox(albumImages, i, eventName, selectedYear, maxExifChars, eventScore)
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openLightbox(albumImages, i, eventName, selectedYear, maxExifChars, eventScore);
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
                    </button>
                );
            })}
            {loading && <div className="portfolio__loading">Loading photos...</div>}
            {fetchError && <div className="portfolio__error">Error loading photos. Please try refreshing.</div>}
        </div>
    );
});

export default EventGrid;
