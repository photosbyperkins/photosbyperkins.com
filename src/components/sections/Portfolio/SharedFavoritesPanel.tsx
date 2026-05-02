import { AnimatePresence, motion } from 'framer-motion';
import { X, Save, Heart } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useCanShare } from '../../../hooks/useCanShare';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import ProgressiveImage from '../../ui/ProgressiveImage';
import type { PhotoInput } from '../../../types';

const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const } },
};

interface SharedFavoritesPanelProps {
    photos: PhotoInput[];
    onClose: () => void;
}

export default function SharedFavoritesPanel({ photos, onClose }: SharedFavoritesPanelProps) {
    const canShare = useCanShare();
    const openLightbox = usePortfolioStore((state) => state.openLightbox);
    const isLightboxOpen = usePortfolioStore((state) => state.lightbox.isOpen);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

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

    // Focus trap & escape key
    useEffect(() => {
        closeBtnRef.current?.focus();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isZipping) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isZipping]);

    // Lock body scroll (re-apply when lightbox closes since it also manages overflow)
    useEffect(() => {
        if (!isLightboxOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLightboxOpen]);

    const handleAddToFavorites = useCallback(() => {
        const store = usePortfolioStore.getState();
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

    return (
        <AnimatePresence>
            <motion.div
                className="shared-favorites-overlay"
                role="dialog"
                aria-modal="true"
                aria-label="Shared Favorites"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                style={{ display: isLightboxOpen ? 'none' : undefined }}
            >
                <div className="shared-favorites-overlay__header-bar">
                    <div className="container shared-favorites-overlay__header-bar-inner">
                        <motion.h2
                            className="section-label"
                            custom={0}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                        >
                            <span style={{ color: 'var(--color-accent)' }}>SHARED</span> FAVORITES
                        </motion.h2>

                        <button
                            ref={closeBtnRef}
                            className="shared-favorites-overlay__back-btn"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="shared-favorites-overlay__body">
                    <div className="container portfolio__event">
                        <div className="portfolio__event-grid">
                            {photos.map((photo, i) => {
                                const origUrl = typeof photo === 'string' ? photo : photo.original;
                                const thumbUrl = typeof photo === 'string' ? photo : photo.thumb || photo.original;
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
                </div>

                <div className="shared-favorites-overlay__footer-bar">
                    <div className="container shared-favorites-overlay__footer-bar-inner">
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
                                    transition:
                                        'background-size 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out',
                                    borderColor: isZipping ? 'var(--color-accent)' : undefined,
                                    color: isZipping ? (zipProgress > 50 ? '#fff' : 'var(--color-accent)') : undefined,
                                }}
                            >
                                <Save size={14} />
                                <span>Save as .zip</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
