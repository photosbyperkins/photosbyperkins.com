import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, animate, useTransform, type PanInfo } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { X, ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';
import LightboxSlide, { type LightboxSlideHandle } from './LightboxSlide';
import type { PhotoInput } from '../../../types';

declare const __BUILD_NUMBER__: string;

interface LightboxProps {
    images: PhotoInput[];
    index: number;
    year?: string;
    eventName?: string;
    onClose: () => void;
    onSetIndex: (idx: number) => void;
}

import { useCanShare } from '../../../hooks/useCanShare';

export default function Lightbox({ images, index, year, eventName, onClose, onSetIndex }: LightboxProps) {
    const canShare = useCanShare();

    const x = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<LightboxSlideHandle>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentOpacity = useTransform(x, [-windowWidth, 0, windowWidth], [0, 1, 0]);
    const prevOpacity = useTransform(x, [0, windowWidth], [0, 1]);
    const nextOpacity = useTransform(x, [-windowWidth, 0], [1, 0]);

    const getImgSrc = (photo: PhotoInput) => {
        const url = typeof photo === 'string' ? photo : photo?.original;
        return url ? `${url}?v=${__BUILD_NUMBER__}` : undefined;
    };

    const maxDataChars = useMemo(() => {
        if (!images) return 0;
        let max = 0;
        images.forEach((img) => {
            if (typeof img !== 'string' && img.exif) {
                const topStr = [img.exif.cameraModel, img.exif.lens].filter(Boolean).join(' • ');
                const bottomStr = [img.exif.focalLength, img.exif.aperture, img.exif.shutterSpeed, img.exif.iso]
                    .filter(Boolean)
                    .join(' • ');
                if (topStr.length > max) max = topStr.length;
                if (bottomStr.length > max) max = bottomStr.length;
            }
        });
        return max;
    }, [images]);

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

    // ASYNC PRELOADER: Smart background album fetcher
    // Implements an expanding radius preload that prioritizes nearest neighbors
    // to the current photo, fanning out across the entire album without
    // suffocating the network queue by awaiting images sequentially.
    useEffect(() => {
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

            const getWebpSrc = (idx: number) => {
                const obj = images[idx];
                if (!obj) return null;
                const src = typeof obj === 'string' ? obj : obj.original;
                return src.replace(/^(?:\/)?photos\//i, '/webp/').replace(/\.jpe?g$/i, '.webp');
            };

            // Fire off immediate next/prev directly into the browser network pipeline
            const immediate = allIdxs.slice(0, 2);
            immediate.forEach((idx) => {
                const src = getWebpSrc(idx);
                if (src) {
                    const img = new Image();
                    img.src = `${src}?v=${__BUILD_NUMBER__}`;
                }
            });

            // Asynchronously trickle-load the rest of the album sequentially
            const queued = allIdxs.slice(2);
            for (const idx of queued) {
                if (isCancelled) break;

                const src = getWebpSrc(idx);
                if (!src) continue;

                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = `${src}?v=${__BUILD_NUMBER__}`;
                });

                // Micro-pause to yield to main UI thread / react rendering
                await new Promise((r) => setTimeout(r, 10));
            }
        };

        preloadAlbum();

        return () => {
            isCancelled = true;
        };
    }, [index, images, total]);

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

    const currentPhoto = images[index];
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

    return (
        <motion.div
            className="portfolio__lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
        >
            <div className="portfolio__lightbox-ambient">
                <motion.img
                    src={getImgSrc(images[(index - 1 + images.length) % images.length])}
                    style={{ opacity: prevOpacity }}
                    alt=""
                />
                <motion.img src={getImgSrc(currentPhoto)} style={{ opacity: currentOpacity }} alt="" />
                <motion.img
                    src={getImgSrc(images[(index + 1) % images.length])}
                    style={{ opacity: nextOpacity }}
                    alt=""
                />
                <div className="portfolio__lightbox-ambient-glass" />
            </div>

            <Helmet>
                <title>
                    {eventName} {year ? `(${year})` : ''} | Photos by Perkins
                </title>
                <meta property="og:title" content={`${eventName} | Photos by Perkins`} />
                <meta
                    name="description"
                    content={`Action photography from ${eventName}${year ? `, ${year}` : ''}. Captured by Sacramento Roller Derby photographer Michael Perkins.`}
                />
            </Helmet>
            <div
                className="portfolio__lightbox-top-bar"
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <div className="portfolio__lightbox-top-left">
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
                                        const src = typeof obj === 'string' ? obj : obj.original;
                                        const filename = src.split('/').pop() || 'photo.jpg';
                                        const response = await fetch(src);
                                        const blob = await response.blob();
                                        const file = new File([blob], filename, {
                                            type: blob.type || 'image/jpeg',
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
                        <button className="portfolio__lightbox-action" onClick={handleDownload} aria-label="Download">
                            <Download size={18} />
                        </button>
                    )}
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
                        />
                    </div>

                    {/* Next Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--next">
                        <LightboxSlide
                            image={images[(index + 1) % images.length]}
                            alt={eventName ? `Next photo from ${eventName}` : 'Next photo'}
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
}
