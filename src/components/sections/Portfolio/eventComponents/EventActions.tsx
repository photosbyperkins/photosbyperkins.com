import React from 'react';
import { Save, Star, Share2 } from 'lucide-react';
import { FullAlbumIcon } from '../../../ui/icons';
import { useAppStore } from '../../../../store/useAppStore';
import { buildFavoritesShareUrl } from '../../../../utils/favoritesUrl';

declare const __BUILD_NUMBER__: string;

export interface EventActionsProps {
    eventName: string;
    date?: string | null;
    zip?: string;
    canShare: boolean;
    selectedYear: string;
    hasAlbumPhotos: boolean;
    isZipping: boolean;
    zipProgress: number;
    onDownloadFavorites: () => void;
    isGridView: boolean;
    onToggleGridView: (e: React.MouseEvent) => void;
}

export const EventActions = React.memo(function EventActions({
    eventName,
    date,
    zip,
    canShare,
    selectedYear,
    hasAlbumPhotos,
    isZipping,
    zipProgress,
    onDownloadFavorites,
    isGridView,
    onToggleGridView,
}: EventActionsProps) {
    const isFavorites = eventName === 'Favorites';

    const handleShareAlbum = async () => {
        const shareUrl = `${window.location.origin}/portfolio/${encodeURIComponent(selectedYear)}/${encodeURIComponent(eventName)}`;
        try {
            await navigator.share({
                title: eventName,
                text: `Check out photos from ${eventName}`,
                url: shareUrl,
            });
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        }
    };

    const handleShareFavorites = async () => {
        const favorites = useAppStore.getState().favorites;
        const shareUrl = await buildFavoritesShareUrl(favorites);
        try {
            await navigator.share({
                title: 'My Favorite Photos',
                text: `Check out my ${favorites.length} favorite photos!`,
                url: shareUrl,
            });
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        }
    };

    return (
        <div className="portfolio__event-meta">
            {date && <span className="portfolio__stat-tag">{date}</span>}

            {zip && !canShare && !isFavorites && (
                <a
                    href={`${zip}?v=${__BUILD_NUMBER__}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="portfolio__zip-btn"
                    title="Download All Original Photos (.zip)"
                >
                    <Save size={16} />
                </a>
            )}

            {canShare && !isFavorites && (
                <button
                    className="portfolio__zip-btn"
                    onClick={handleShareAlbum}
                    title="Share Album"
                    aria-label="Share Album"
                >
                    <Share2 size={16} />
                </button>
            )}

            {isFavorites && canShare && hasAlbumPhotos && (
                <button
                    className="portfolio__zip-btn"
                    onClick={handleShareFavorites}
                    title="Share Favorites"
                    aria-label="Share Favorites"
                >
                    <Share2 size={16} />
                </button>
            )}

            {isFavorites && !canShare && hasAlbumPhotos && (
                <button
                    className="portfolio__zip-btn"
                    onClick={onDownloadFavorites}
                    disabled={isZipping}
                    title="Download Favorites as .zip"
                    style={{
                        cursor: isZipping ? 'wait' : 'pointer',
                        backgroundImage: isZipping
                            ? 'linear-gradient(to bottom, var(--color-accent) 100%, transparent 100%)'
                            : 'none',
                        backgroundSize: `100% ${isZipping ? zipProgress : 0}%`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'top center',
                        transition: 'background-size 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out',
                        borderColor: isZipping ? 'var(--color-accent)' : undefined,
                        color: isZipping ? (zipProgress > 50 ? '#fff' : 'var(--color-accent)') : undefined,
                    }}
                >
                    <Save size={16} />
                </button>
            )}

            {!isFavorites && (
                <div className="portfolio__segmented-toggle">
                    <button
                        className={`portfolio__segment-btn ${!isGridView ? 'active' : ''}`}
                        onClick={onToggleGridView}
                        aria-label="Show Featured Photos"
                        aria-pressed={!isGridView}
                        title="Show Featured Photos"
                    >
                        <Star size={16} />
                    </button>
                    <button
                        className={`portfolio__segment-btn ${isGridView ? 'active' : ''}`}
                        onClick={onToggleGridView}
                        aria-label="Show Full Album"
                        aria-pressed={isGridView}
                        title="Show Full Album"
                    >
                        <FullAlbumIcon size={16} />
                    </button>
                </div>
            )}
        </div>
    );
});
