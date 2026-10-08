import React from 'react';
import { motion } from 'framer-motion';
import { Save, Star, Share2, FullAlbumIcon } from '../../../ui/icons';
import { SPRING_SNAPPY } from '../../../../utils/motion';
import { useAppStore } from '../../../../store/useAppStore';
import { buildFavoritesShareUrl } from '../../../../utils/favoritesUrl';
import { withBuild } from '../../../../utils/build';

export interface EventActionsProps {
    eventName: string;
    zip?: string;
    canShare: boolean;
    selectedYear: string;
    hasAlbumPhotos: boolean;
    isZipping: boolean;
    zipProgress: number;
    onDownloadFavorites: () => void;
    onShareFavorites?: () => void;
    isGridView: boolean;
    onToggleGridView: (e: React.MouseEvent) => void;
    isFavoritesTab?: boolean;
}

export const EventActions = React.memo(function EventActions({
    eventName,
    zip,
    canShare,
    selectedYear,
    hasAlbumPhotos,
    isZipping,
    zipProgress,
    onDownloadFavorites,
    onShareFavorites,
    isGridView,
    onToggleGridView,
    isFavoritesTab,
}: EventActionsProps) {
    const isFavorites = eventName === 'Favorites';
    const isFavoritesMode = isFavorites || Boolean(isFavoritesTab);

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
        if (onShareFavorites) {
            onShareFavorites();
            return;
        }
        const favorites = useAppStore.getState().favorites;
        const shareUrl = await buildFavoritesShareUrl(favorites);
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'My Favorite Photos',
                    text: `Check out my ${favorites.length} favorite photos!`,
                    url: shareUrl,
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share failed:', err);
            }
        }
    };

    return (
        <div className="portfolio__event-meta">
            {zip && !canShare && !isFavoritesMode && (
                <a
                    href={withBuild(zip, true)}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="portfolio__zip-btn"
                    title="Download All Original Photos (.zip)"
                >
                    <Save size={16} />
                </a>
            )}

            {canShare && !isFavoritesMode && (
                <button
                    className="portfolio__zip-btn"
                    onClick={handleShareAlbum}
                    title="Share Album"
                    aria-label="Share Album"
                >
                    <Share2 size={16} />
                </button>
            )}

            {isFavoritesMode && !canShare && hasAlbumPhotos && (
                <button
                    className="portfolio__zip-btn"
                    onClick={onDownloadFavorites}
                    disabled={isZipping}
                    title={isFavoritesTab ? "Download All Original Photos (.zip)" : "Download Favorites as .zip"}
                    aria-label={isFavoritesTab ? "Download All Original Photos (.zip)" : "Download Favorites as .zip"}
                    style={{
                        cursor: isZipping ? 'wait' : 'pointer',
                        ['--p' as string]: isZipping ? `${zipProgress / 100}` : 0,
                        borderColor: isZipping ? 'var(--color-accent)' : undefined,
                        color: isZipping ? (zipProgress > 50 ? '#fff' : 'var(--color-accent)') : undefined,
                    }}
                >
                    <Save size={16} />
                </button>
            )}

            {isFavoritesMode && canShare && hasAlbumPhotos && (
                <button
                    className="portfolio__zip-btn"
                    onClick={handleShareFavorites}
                    title="Share Favorites"
                    aria-label="Share Favorites"
                >
                    <Share2 size={16} />
                </button>
            )}

            {!isFavorites && (
                <div className="portfolio__segmented-toggle" role="group" aria-label="Album view mode">
                    <button
                        type="button"
                        className={`portfolio__segment-btn ${!isGridView ? 'active' : ''}`}
                        onClick={isGridView ? onToggleGridView : undefined}
                        aria-label="Show Featured Photos"
                        aria-pressed={!isGridView}
                        title="Show Featured Photos"
                    >
                        {!isGridView && (
                            <motion.span
                                className="portfolio__segment-pill"
                                layoutId={`event-toggle-${selectedYear}-${eventName}`}
                                transition={SPRING_SNAPPY}
                            />
                        )}
                        <Star size={16} />
                    </button>
                    <button
                        type="button"
                        className={`portfolio__segment-btn ${isGridView ? 'active' : ''}`}
                        onClick={!isGridView ? onToggleGridView : undefined}
                        aria-label="Show Full Album"
                        aria-pressed={isGridView}
                        title="Show Full Album"
                    >
                        {isGridView && (
                            <motion.span
                                className="portfolio__segment-pill"
                                layoutId={`event-toggle-${selectedYear}-${eventName}`}
                                transition={SPRING_SNAPPY}
                            />
                        )}
                        <FullAlbumIcon size={16} />
                    </button>
                </div>
            )}
        </div>
    );
});
