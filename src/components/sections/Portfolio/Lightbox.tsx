import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, animate, useTransform, type PanInfo } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { X, Download, Share2, Heart } from 'lucide-react';
import LightboxSlide, { type LightboxSlideHandle } from './LightboxSlide';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
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
    const reducedMotion = useReducedMotion();
    const previousFocusRef = useRef<Element | null>(null);
    const lightboxRef = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<LightboxSlideHandle>(null);
    const recentlyDragged = useRef<{ x: number; y: number } | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [canZoom, setCanZoom] = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [mainImageLoaded, setMainImageLoaded] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    const checkIfFavorite = useCallback(
        (photo: PhotoInput) => {
            const src = typeof photo === 'string' ? photo : photo.original;
            return favorites.some((f) => {
                const fInput = typeof f === 'object' && 'photo' in f ? f.photo : f;
                const fOriginal = typeof fInput === 'string' ? fInput : fInput.original;
                return fOriginal === src;
            });
        },
        [favorites]
    );

    const getThumbSrc = useCallback((photo: PhotoInput) => {
        const url = typeof photo === 'string' ? photo : photo?.thumb || photo?.original;
        return url ? `${url}?v=${__BUILD_NUMBER__}` : undefined;
    }, []);

    // Derive scrubber sprite URL — all photos in a normal event share one sprite.
    // Falls back to individual thumbs for Favorites (mixed-event) views.
    const spriteUrl = useMemo(() => {
        if (images.length === 0) return null;
        const first = images[0];
        if (typeof first === 'string' || !first.thumb || first.spriteIndex == null) return null;
        // Ensure ALL images have spriteIndex and share the same event directory
        const dir = first.thumb.substring(0, first.thumb.lastIndexOf('/'));
        const allMatch = images.every((img) => {
            if (typeof img === 'string' || img.spriteIndex == null) return false;
            const imgDir = img.thumb.substring(0, img.thumb.lastIndexOf('/'));
            return imgDir === dir;
        });
        if (!allMatch) return null;
        const spriteDir = dir.replace(/^\/thumbnails\//, '/scrubber/');
        return `${spriteDir}/sprite.webp?v=${__BUILD_NUMBER__}`;
    }, [images]);

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

    // Map the horizontal swipe down to a 72px physical tracking shift
    const dragShift = useTransform(x, [-windowWidth, 0, windowWidth], [-72, 0, 72]);

    // How many slices to render (enough to fill the viewport + generous buffer)
    const visibleSlices = Math.max(5, Math.ceil(windowWidth / 72) + 6);
    // Ensure odd number so there's a perfectly centered item
    const sliceCount = visibleSlices % 2 === 0 ? visibleSlices + 1 : visibleSlices;
    const maxDist = Math.floor(sliceCount / 2);

    // The center slice (offset 0) is at position maxDist in the rendered array.
    // Its center is at (maxDist * 72 + 36) from the track's left edge.
    // To place that at the viewport center:
    const trackX = useTransform(dragShift, (shift) => windowWidth / 2 - (maxDist * 72 + 36) + shift);

    // Drive scrubber thumb opacities from drag progress
    // Current active thumb fades from 1 → 0.5 as drag progresses
    const thumbOpacity0 = useTransform(x, [-windowWidth, 0, windowWidth], [0.5, 1, 0.5]);
    // Previous thumb (offset -1) brightens when dragging right (going to previous)
    const thumbOpacityPrev = useTransform(x, [0, windowWidth], [0.5, 1]);
    // Next thumb (offset +1) brightens when dragging left (going to next)
    const thumbOpacityNext = useTransform(x, [-windowWidth, 0], [1, 0.5]);

    const total = images.length;

    const paginate = useCallback(
        async (newDirection: number) => {
            if (isAnimating) return;
            setIsAnimating(true);
            setIsZoomed(false);

            const nextIndex = (index + newDirection + images.length) % images.length;

            // Animate the track
            await animate(x, newDirection > 0 ? -window.innerWidth : window.innerWidth, reducedMotion ? {
                type: 'tween',
                duration: 0,
            } : {
                type: 'spring',
                stiffness: 450,
                damping: 40,
                restDelta: 0.5,
            });

            // Preload the ambient thumbnail for the destination photo to avoid flash
            const nextThumbSrc = getThumbSrc(images[nextIndex]);
            if (nextThumbSrc) {
                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = nextThumbSrc;
                    // Safety timeout — don't block navigation for slow thumbs
                    setTimeout(resolve, 200);
                });
            }

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

    // Focus trap: save previous focus, focus lightbox, restore on unmount
    useEffect(() => {
        previousFocusRef.current = document.activeElement;
        lightboxRef.current?.focus();

        const handleFocusTrap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !lightboxRef.current) return;
            const focusable = lightboxRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleFocusTrap);
        return () => {
            window.removeEventListener('keydown', handleFocusTrap);
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus();
            }
        };
    }, []);

    const currentPhoto = images[index];

    const isFavorite = checkIfFavorite(currentPhoto);

    // Drive the playhead heart crossfade from drag progress
    const prevPhoto = images[(index - 1 + images.length) % images.length];
    const nextPhoto = images[(index + 1) % images.length];
    const isPrevFavorite = checkIfFavorite(prevPhoto);
    const isNextFavorite = checkIfFavorite(nextPhoto);

    const filledHeartOpacity = useTransform(x, (latest) => {
        const progress = Math.min(1, Math.abs(latest) / windowWidth);
        const current = isFavorite ? 1 : 0;
        if (latest > 0) {
            // Dragging right → going to previous
            const target = isPrevFavorite ? 1 : 0;
            return current + (target - current) * progress;
        } else if (latest < 0) {
            // Dragging left → going to next
            const target = isNextFavorite ? 1 : 0;
            return current + (target - current) * progress;
        }
        return current;
    });
    const emptyHeartOpacity = useTransform(filledHeartOpacity, (v) => 1 - v);
    const filledHeartScale = useTransform(filledHeartOpacity, (v) => 0.8 + v * 0.2);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMainImageLoaded(false);
    }, [index]);

    // ASYNC PRELOADER: Smart background album fetcher
    // Preloads the DISPLAY-RESOLUTION WebPs (not thumbnails) so swiping
    // to nearby photos is instant.  Prioritises nearest neighbours then
    // fans out across the entire album sequentially.
    const getDisplaySrc = useCallback((photo: PhotoInput) => {
        const url = typeof photo === 'string' ? photo : photo.original;
        if (!url) return undefined;
        const webpUrl = url.replace(/^(?:\/)?photos\//i, '/webp/').replace(/\.jpe?g$/i, '.webp');
        return `${webpUrl}?v=${__BUILD_NUMBER__}`;
    }, []);

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
                const src = getDisplaySrc(images[idx]);
                if (src) {
                    const img = new Image();
                    img.src = src;
                }
            });

            // Asynchronously trickle-load the rest of the album sequentially
            const queued = allIdxs.slice(2);
            for (const idx of queued) {
                if (isCancelled) break;

                const src = getDisplaySrc(images[idx]);
                if (!src) continue;

                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = src;
                });

                // Micro-pause to yield to main UI thread / react rendering
                await new Promise((r) => setTimeout(r, 10));
            }
        };

        preloadAlbum();

        return () => {
            isCancelled = true;
        };
    }, [mainImageLoaded, index, images, total, getDisplaySrc]);

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
                style={exif && maxExifChars > 0 ? { minWidth: `${maxExifChars * 5.0}px` } : undefined}
            >
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
            ref={lightboxRef}
            className={`portfolio__lightbox ${isTheaterMode ? 'is-theater-mode' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Photo lightbox"
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            onPointerDown={(e) => {
                recentlyDragged.current = { x: e.clientX, y: e.clientY };
            }}
            onClick={(e) => {
                const start = recentlyDragged.current;
                if (start && typeof start === 'object') {
                    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
                    if (dist > 5) return; // Was a drag, not a click
                }
                onClose();
            }}
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
                                        // Build path-based deep link: /portfolio/:year/:event/:photo
                                        const shareUrl = `${window.location.origin}/portfolio/${encodeURIComponent(year)}/${encodeURIComponent(eventName)}/${index}`;

                                        try {
                                            const obj = images[index];
                                            const originalSrc = typeof obj === 'string' ? obj : obj.original;
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
                    </div>
                </div>

                {exif && (
                    <div className="portfolio__lightbox-top-center" onClick={(e) => e.stopPropagation()}>
                        {dataDisplayUI}
                    </div>
                )}

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

            <div className="portfolio__lightbox-scrubber" onClick={(e) => e.stopPropagation()}>
                {/* Sliding track — thumbnails slide under the fixed playhead */}
                <motion.div className="portfolio__lightbox-scrubber-track" style={{ x: trackX }}>
                    {(() => {
                        const offsets: number[] = [];
                        for (let o = -maxDist; o <= maxDist; o++) {
                            offsets.push(o);
                        }

                        return offsets.map((offset) => {
                            const wrappedIndex = (((index + offset) % images.length) + images.length) % images.length;
                            const img = images[wrappedIndex];
                            const isImgFavorite = checkIfFavorite(img);
                            const isActive = offset === 0;

                            // Determine drag-driven opacity for this thumb
                            const thumbOpacity =
                                offset === 0
                                    ? thumbOpacity0
                                    : offset === -1
                                      ? thumbOpacityPrev
                                      : offset === 1
                                        ? thumbOpacityNext
                                        : undefined;

                            const bgStyle =
                                spriteUrl && typeof img !== 'string' && img.spriteIndex != null
                                    ? {
                                          backgroundImage: `url("${spriteUrl}")`,
                                          backgroundPosition: `${-(img.spriteIndex * 72)}px 0`,
                                          backgroundSize: `auto 48px`,
                                      }
                                    : { backgroundImage: `url("${getThumbSrc(img)}")` };

                            return (
                                <motion.div
                                    key={`${offset}`}
                                    className={`portfolio__lightbox-scrubber-thumb${isActive ? ' is-active' : ''}`}
                                    onClick={() => onSetIndex(wrappedIndex)}
                                    style={{ ...bgStyle, opacity: thumbOpacity ?? 0.5 }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Go to photo ${wrappedIndex + 1}`}
                                >
                                    {isImgFavorite && (
                                        <div
                                            className="portfolio__lightbox-scrubber-heart is-active"
                                            style={{ pointerEvents: 'none' }}
                                        >
                                            <Heart
                                                size={28}
                                                fill="var(--color-accent)"
                                                color="var(--color-accent)"
                                                strokeWidth={1.5}
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        });
                    })()}
                </motion.div>

                {/* Fixed playhead — outline + heart, always centered */}
                <div className="portfolio__lightbox-scrubber-playhead">
                    <button
                        className={`portfolio__lightbox-scrubber-heart${isFavorite ? ' is-active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite({
                                photo: images[index],
                                eventName: eventName || '',
                                year: year || '',
                            });
                        }}
                        aria-label="Toggle Favorite"
                    >
                        {/* Empty heart — driven by drag progress */}
                        <motion.div
                            className="portfolio__lightbox-scrubber-heart-layer"
                            style={{ opacity: emptyHeartOpacity }}
                        >
                            <Heart size={28} fill="rgba(0, 0, 0, 0.4)" color="#ffffff" strokeWidth={1.5} />
                        </motion.div>
                        {/* Filled heart — driven by drag progress */}
                        <motion.div
                            className="portfolio__lightbox-scrubber-heart-layer"
                            style={{ opacity: filledHeartOpacity, scale: filledHeartScale }}
                        >
                            <Heart size={28} fill="var(--color-accent)" color="var(--color-accent)" strokeWidth={1.5} />
                        </motion.div>
                    </button>
                    <span className="portfolio__lightbox-scrubber-counter">
                        {index + 1} / {total}
                    </span>
                </div>
            </div>
        </motion.div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
}
