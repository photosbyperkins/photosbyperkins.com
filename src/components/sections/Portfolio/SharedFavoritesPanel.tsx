import { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Heart } from 'lucide-react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useAppStore } from '../../../store/useAppStore';
import ProgressiveImage from '../../ui/ProgressiveImage';
import ModalShell from '../../ui/ModalShell';
import type { PhotoInput } from '../../../types';

declare const __BUILD_NUMBER__: string;

interface SharedFavoritesPanelProps {
    photos: PhotoInput[];
    onClose: () => void;
}

export default function SharedFavoritesPanel({ photos, onClose }: SharedFavoritesPanelProps) {
    const canShare = useCanShare();
    const openLightbox = useAppStore((state) => state.openLightbox);
    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);

    // Zip download state
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);
    const [addedToFavorites, setAddedToFavorites] = useState(false);
    const zipWorkerRef = useRef<Worker | null>(null);

    useEffect(() => {
        return () => {
            zipWorkerRef.current?.terminate();
        };
    }, []);

    // Re-apply body scroll lock when lightbox closes
    useEffect(() => {
        if (!isLightboxOpen && photos.length > 0) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLightboxOpen, photos.length]);

    const handleAddToFavorites = useCallback(() => {
        const store = useAppStore.getState();
        for (const photo of photos) {
            const original = typeof photo === 'string' ? photo : photo.original;
            const isAlreadyFav = store.favorites.some((f) => {
                const fPhoto = f && typeof f === 'object' && 'photo' in f ? f.photo : f;
                const fOrig = typeof fPhoto === 'string' ? fPhoto : (fPhoto as { original: string }).original;
                return fOrig === original;
            });
            if (!isAlreadyFav) store.toggleFavorite(photo);
        }
        setAddedToFavorites(true);
    }, [photos]);

    const handleDownloadZip = useCallback(() => {
        if (isZipping) return;
        setIsZipping(true);
        setZipProgress(0);

        const worker = new Worker(new URL('../../../workers/zipWorker.ts', import.meta.url), { type: 'module' });
        zipWorkerRef.current = worker;

        worker.onmessage = (e) => {
            if (e.data.type === 'progress') {
                setZipProgress(Math.round(e.data.progress));
            } else if (e.data.type === 'done') {
                const { blob, filename } = e.data;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);

                setZipProgress(100);
                setTimeout(() => {
                    setIsZipping(false);
                    setZipProgress(0);
                }, 1500);

                worker.terminate();
                zipWorkerRef.current = null;
            } else if (e.data.type === 'error') {
                console.error('Zip error:', e.data.error);
                setIsZipping(false);
                worker.terminate();
                zipWorkerRef.current = null;
            }
        };

        const urls = photos.map((item) => (typeof item === 'string' ? item : item.original));
        worker.postMessage({ urls, filename: 'Shared-Favorites.zip' });
    }, [isZipping, photos]);

    const footer = (
        <>
            <button
                className={`shared-favorites-overlay__btn is-cta ${addedToFavorites ? 'is-done' : ''}`}
                onClick={handleAddToFavorites}
                disabled={addedToFavorites}
                title={addedToFavorites ? 'Added to Your Favorites' : 'Add to Your Favorites'}
                aria-label={addedToFavorites ? 'Added to Your Favorites' : 'Add to Your Favorites'}
            >
                <Heart size={14} />
                <span>{addedToFavorites ? 'Added' : 'Add to Your Favorites'}</span>
            </button>

            {!canShare && (
                <button
                    className="shared-favorites-overlay__btn"
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    title={isZipping ? `Downloading… ${zipProgress}%` : 'Download as .zip'}
                    aria-label="Download Shared Favorites as .zip"
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
                    <Save size={14} />
                    <span>Save as .zip</span>
                </button>
            )}
        </>
    );

    return (
        <ModalShell
            isOpen={Boolean(photos.length)}
            onClose={onClose}
            title={
                <>
                    <span style={{ color: 'var(--color-accent)' }}>SHARED</span> FAVORITES
                </>
            }
            ariaLabel="Shared Favorites"
            className="shared-favorites-overlay"
            contentClassName="shared-favorites-overlay__body"
            maxWidth="full"
            footer={footer}
            style={{ display: isLightboxOpen ? 'none' : undefined }}
        >
            <div className="portfolio__event">
                <div className="portfolio__event-grid">
                    {photos.map((photo, i) => {
                        const origUrl = typeof photo === 'string' ? photo : photo.original;
                        const rawThumbUrl = typeof photo === 'string' ? photo : photo.thumb || photo.original;
                        const thumbUrl = rawThumbUrl.includes('?v=')
                            ? rawThumbUrl
                            : `${rawThumbUrl}?v=${__BUILD_NUMBER__}`;
                        const focusX = typeof photo === 'string' ? undefined : photo.focusX;
                        const focusY = typeof photo === 'string' ? undefined : photo.focusY;

                        return (
                            <div
                                key={origUrl}
                                className="portfolio__grid-item"
                                role="button"
                                tabIndex={0}
                                aria-label={`View shared favorites photo ${i + 1}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openLightbox(photos, i, 'Shared Favorites', '');
                                    }
                                }}
                            >
                                <ProgressiveImage
                                    src={thumbUrl}
                                    placeholder={null}
                                    alt={`Shared favorites photo ${i + 1}`}
                                    onClick={() => openLightbox(photos, i, 'Shared Favorites', '')}
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
            </div>
        </ModalShell>
    );
}
