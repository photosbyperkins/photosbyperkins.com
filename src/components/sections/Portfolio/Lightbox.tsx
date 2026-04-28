import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, animate, useTransform, type PanInfo } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { X, ChevronLeft, ChevronRight, Download, Share2, Heart, Maximize, Minimize } from 'lucide-react';
import LightboxSlide, { type LightboxSlideHandle } from './LightboxSlide';
import type { PhotoInput } from '../../../types';

declare const __BUILD_NUMBER__: string;

interface LightboxProps {
    images: PhotoInput[];
    index: number;
    year?: string;
    eventName?: string;
    maxExifChars?: number;
    onClose: () => void;
    onSetIndex: (idx: number) => void;
}

import { useCanShare } from '../../../hooks/useCanShare';
import { useDebounce } from '../../../hooks/useDebounce';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import { getPhotoDisplayUrl } from '../../../utils/formatters';

export default function Lightbox({
    images,
    index,
    year,
    eventName,
    maxExifChars = 0,
    onClose,
    onSetIndex,
}: LightboxProps) {
    const canShare = useCanShare();
    const { favorites, toggleFavorite } = usePortfolioStore();

    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<LightboxSlideHandle>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [canZoom, setCanZoom] = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [mainImageLoaded, setMainImageLoaded] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    const handleResize = useDebounce(() => {
        setWindowWidth(window.innerWidth);
    }, 150);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const currentOpacity = useTransform(x, [-windowWidth, 0, windowWidth], [0, 1, 0]);
    const prevOpacity = useTransform(x, [0, windowWidth], [0, 1]);
    const nextOpacity = useTransform(x, [-windowWidth, 0], [1, 0]);

    const getThumbSrc = (photo: PhotoInput) => {
        const url = typeof photo === 'string' ? photo : photo?.thumb || photo?.original;
        return url ? `${url}?v=${__BUILD_NUMBER__}` : undefined;
    };

    const total = images.length;

    const paginate = useCallback(
        async (newDirection: number) => {
            if (isAnimating) return;
            setIsAnimating(true);
            setIsZoomed(false);

            const nextIndex = (index + newDirection + images.length) % images.length;

            // Animate the track
            await animate(x, newDirection > 0 ? -window.innerWidth : window.innerWidth, {
                type: 'spring',
                stiffness: 450,
                damping: 40,
                restDelta: 0.5,
            });

            // Update index and reset position
            onSetIndex(nextIndex);
            x.set(0);
            setIsAnimating(false);
        },
        [isAnimating, index, images.length, x, onSetIndex]
    );

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') paginate(-1);
            if (e.key === 'ArrowRight') paginate(1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, index, images.length, isAnimating, paginate]);

    // Lock body scroll when Lightbox is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;

        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
        };
    }, []);

    const currentPhoto = images[index];
    const currentSrc = typeof currentPhoto === 'string' ? currentPhoto : currentPhoto.original;
    const isFavorite = favorites.some((f) => {
        const fInput = typeof f === 'object' && 'photo' in f ? f.photo : f;
        const fOriginal = typeof fInput === 'string' ? fInput : fInput.original;
        return fOriginal === currentSrc;
    });
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMainImageLoaded(false);
    }, [index]);

    // ASYNC PRELOADER: Smart background album fetcher
    // Implements an expanding radius preload that prioritizes nearest neighbors
    // to the current photo, fanning out across the entire album without
    // suffocating the network queue by awaiting images sequentially.
    useEffect(() => {
        if (!mainImageLoaded) return; // Wait for the high-res image the user is staring at to finish loading FIRST!

        let isCancelled = false;

        const preloadAlbum = async () => {
            if (total <= 1) return;

            // Sort all indices by distance from current index
            const allIdxs: number[] = [];
            for (let i = 0; i < total; i++) {
                if (i !== index) allIdxs.push(i);
            }

            allIdxs.sort((a, b) => {
                const distA = Math.min((a - index + total) % total, (index - a + total) % total);
                const distB = Math.min((b - index + total) % total, (index - b + total) % total);
                if (distA === distB) {
                    // Tie-breaker: prioritize forward images
                    const isAForward = (a - index + total) % total === distA;
                    return isAForward ? -1 : 1;
                }
                return distA - distB;
            });

            // Fire off immediate next/prev directly into the browser network pipeline
            const immediate = allIdxs.slice(0, 2);
            immediate.forEach((idx) => {
                const thumbSrc = getThumbSrc(images[idx]);
                if (thumbSrc) {
                    const img = new Image();
                    img.src = thumbSrc;
                }
            });

            // Asynchronously trickle-load the rest of the album sequentially
            const queued = allIdxs.slice(2);
            for (const idx of queued) {
                if (isCancelled) break;

                const thumbSrc = getThumbSrc(images[idx]);
                if (!thumbSrc) continue;

                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = thumbSrc;
                });

                // Micro-pause to yield to main UI thread / react rendering
                await new Promise((r) => setTimeout(r, 10));
            }
        };

        preloadAlbum();

        return () => {
            isCancelled = true;
        };
    }, [mainImageLoaded, index, images, total]);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const obj = images[index];
        if (!obj) return;
        const src = typeof obj === 'string' ? obj : obj.original;
        const link = document.createElement('a');
        link.href = `${src}?v=${__BUILD_NUMBER__}`;
        link.download = src.split('/').pop() || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const onDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
        const swipeThreshold = 50;
        if (offset.x < -swipeThreshold || velocity.x < -500) {
            paginate(1);
        } else if (offset.x > swipeThreshold || velocity.x > 500) {
            paginate(-1);
        } else {
            // Snap back to center
            animate(x, 0, { type: 'spring', stiffness: 450, damping: 40 });
        }
    };

    const exif = typeof currentPhoto === 'object' ? currentPhoto.exif : null;

    const dataDisplayUI = (
        <div className="portfolio__lightbox-data-display">
            <div
                className="portfolio__lightbox-data-info"
                style={exif && maxDataChars > 0 ? { minWidth: `${maxDataChars * 5.0}px` } : undefined}
            >
                <span className="portfolio__lightbox-counter" style={{ marginBottom: exif ? '1px' : '0' }}>
                    {index + 1} of {total}
                </span>
                <span className="portfolio__lightbox-data-row-top">
                    {[exif?.cameraModel, exif?.lens].filter(Boolean).join(' • ')}
                </span>
                <span className="portfolio__lightbox-data-row-bottom">
                    {[exif?.focalLength, exif?.aperture, exif?.shutterSpeed, exif?.iso].filter(Boolean).join(' • ')}
                </span>
            </div>
        </div>
    );

    const content = (
        <motion.div
            className={`portfolio__lightbox ${isTheaterMode ? 'is-theater-mode' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <div className="portfolio__lightbox-ambient">
                <motion.div
                    className="portfolio__lightbox-ambient-img"
                    style={{
                        backgroundImage: `url("${getThumbSrc(images[(index - 1 + images.length) % images.length])}")`,
                        opacity: prevOpacity,
                    }}
                />
                <motion.div
                    className="portfolio__lightbox-ambient-img"
                    style={{ backgroundImage: `url("${getThumbSrc(currentPhoto)}")`, opacity: currentOpacity }}
                />
                <motion.div
                    className="portfolio__lightbox-ambient-img"
                    style={{
                        backgroundImage: `url("${getThumbSrc(images[(index + 1) % images.length])}")`,
                        opacity: nextOpacity,
                    }}
                />
                <div className="portfolio__lightbox-ambient-glass" />
            </div>

            <Helmet>
                <title>
                    {eventName} {year ? `(${year})` : ''} |{' '}
                    {import.meta.env.VITE_SITE_APP_TITLE || 'Photography Portfolio'}
                </title>
                <meta
                    property="og:title"
                    content={`${eventName} | ${import.meta.env.VITE_SITE_APP_TITLE || 'Photography Portfolio'}`}
                />
                <meta
                    name="description"
                    content={`Action photography from ${eventName}${year ? `, ${year}` : ''}. ${import.meta.env.VITE_LIGHTBOX_DESC_SUFFIX || ''}`}
                />
            </Helmet>
            <div
                className="portfolio__lightbox-top-bar"
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <div className="portfolio__lightbox-top-left">
                    <div className="portfolio__lightbox-action-group">
                        {canShare ? (
                            <button
                                className="portfolio__lightbox-action"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (year && eventName) {
                                        let baseUrl = window.location.href.split('?')[0];
                                        if (!window.location.pathname.startsWith('/portfolio/')) {
                                            baseUrl = `${window.location.origin}/portfolio/${year}`;
                                        }
                                        const shareUrl = new URL(baseUrl);
                                        shareUrl.searchParams.set('event', eventName || '');
                                        shareUrl.searchParams.set('photo', index.toString());

                                        try {
                                            const obj = images[index];
                                            const originalSrc = typeof obj === 'string' ? obj : obj.original;
                                            // Use the WebP version — already loaded by the lightbox, smaller, and gives room to crop.
                                            const webpSrc = getPhotoDisplayUrl(originalSrc);
                                            const filename = webpSrc.split('/').pop() || 'photo.webp';
                                            const response = await fetch(webpSrc);
                                            const blob = await response.blob();
                                            const file = new File([blob], filename, {
                                                type: blob.type || 'image/webp',
                                            });

                                            const shareData: ShareData = {
                                                title: `Photo from ${eventName}`,
                                                url: shareUrl.toString(),
                                            };

                                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                shareData.files = [file];
                                            }

                                            await navigator.share(shareData);
                                        } catch (err) {
                                            console.error('Error sharing:', err);
                                        }
                                    }
                                }}
                                aria-label="Share"
                            >
                                <Share2 size={18} />
                            </button>
                        ) : (
                            <button
                                className="portfolio__lightbox-action"
                                onClick={handleDownload}
                                aria-label="Download"
                            >
                                <Download size={18} />
                            </button>
                        )}
                        <button
                            className={`portfolio__lightbox-action ${isFavorite ? 'portfolio__lightbox-action--active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite({
                                    photo: images[index],
                                    eventName: eventName || '',
                                    year: year || '',
                                });
                            }}
                            aria-label="Toggle Favorite"
                            style={{ color: isFavorite ? 'var(--color-accent)' : 'inherit' }}
                        >
                            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                    </div>
                </div>

                <div className="portfolio__lightbox-top-right">
                    <button
                        className="portfolio__lightbox-action"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div
                className="portfolio__lightbox-track-container"
                ref={containerRef}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <motion.div
                    className="portfolio__lightbox-track"
                    style={{ x }}
                    drag={isAnimating || isZoomed ? false : 'x'}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={onDragEnd}
                >
                    {/* Previous Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--prev">
                        <LightboxSlide
                            image={images[(index - 1 + images.length) % images.length]}
                            alt={eventName ? `Previous photo from ${eventName}` : 'Previous photo'}
                            onSingleClick={() => setIsTheaterMode((prev) => !prev)}
                        />
                    </div>

                    {/* Current Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--current">
                        <LightboxSlide
                            ref={slideRef}
                            image={images[index]}
                            alt={
                                eventName
                                    ? `Photo ${index + 1} from ${eventName}${year ? `, ${year}` : ''}`
                                    : `Photo ${index + 1}`
                            }
                            onZoomChange={setIsZoomed}
                            onCanZoomChange={setCanZoom}
                            onLoad={() => setMainImageLoaded(true)}
                            onSingleClick={() => setIsTheaterMode((prev) => !prev)}
                        />
                    </div>

                    {/* Next Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--next">
                        <LightboxSlide
                            image={images[(index + 1) % images.length]}
                            alt={eventName ? `Next photo from ${eventName}` : 'Next photo'}
                            onSingleClick={() => setIsTheaterMode((prev) => !prev)}
                        />
                    </div>
                </motion.div>
            </div>

            <div className="portfolio__lightbox-footer" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', pointerEvents: 'none' }}>
                    <button
                        className="portfolio__lightbox-footer-nav"
                        style={{ pointerEvents: 'auto' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            paginate(-1);
                        }}
                        aria-label="Previous"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {dataDisplayUI}

                    <button
                        className="portfolio__lightbox-footer-nav"
                        style={{ pointerEvents: 'auto' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            paginate(1);
                        }}
                        aria-label="Next"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </motion.div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
}
