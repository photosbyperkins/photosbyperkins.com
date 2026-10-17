import { motion, useIsPresent } from 'framer-motion';
import { ChevronLeft, ChevronRight } from '../../ui/icons';
import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import LightboxSlide, { type LightboxSlideHandle } from './LightboxSlide';
import LightboxAmbient from './LightboxAmbient';
import LightboxHeader from './LightboxHeader';
import LightboxScrubber, { SCRUBBER_COLUMNS, MAX_SPRITE_FRAMES } from './LightboxScrubber';
import LightboxHelp from './LightboxHelp';
import type { PhotoInput, EventScore } from '../../../types';
import { withBuild, triggerPhotoDownload } from '../../../utils/build';
import { triggerHaptic } from '../../../utils/haptics';
import { DURATION, EASE_OUT_EXPO, EASE_IN_OUT, EASE_IN } from '../../../utils/motion';
import ErrorBoundary from '../../ui/ErrorBoundary';

const StoryExportModal = lazy(() => import('./StoryExportModal'));

interface LightboxProps {
    images: PhotoInput[];
    index: number;
    year?: string;
    eventName?: string;
    maxExifChars?: number;
    localScore?: EventScore;
    onClose: () => void;
    onSetIndex: (idx: number) => void;
}

import { useCanShare } from '../../../hooks/useCanShare';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAppStore } from '../../../store/useAppStore';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useLightboxNavigation } from '../../../hooks/useLightboxNavigation';
import { useImagePreloader } from '../../../hooks/useImagePreloader';
import { useLightboxGestures } from '../../../hooks/useLightboxGestures';
import { getPhotoDisplayUrl } from '../../../utils/formatters';

const initialPathSegments = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
let isInitialDeepLinkMount =
    initialPathSegments[0] === 'portfolio' &&
    initialPathSegments.length >= 4 &&
    initialPathSegments[1] !== 'team' &&
    initialPathSegments[1] !== 'gear' &&
    initialPathSegments[1] !== 'find';

export default function Lightbox({
    images,
    index,
    year,
    eventName,
    maxExifChars = 0,
    localScore,
    onClose,
    onSetIndex,
}: LightboxProps) {
    const [skipEntryAnim] = useState(() => {
        if (isInitialDeepLinkMount) {
            isInitialDeepLinkMount = false;
            return true;
        }
        return false;
    });
    const canShare = useCanShare();
    const favorites = useAppStore((state) => state.favorites);
    const toggleFavorite = useAppStore((state) => state.toggleFavorite);
    const scrubberHash = useAppStore((state) => state.lightbox?.scrubberHash);
    const reducedMotion = useReducedMotion();
    const lightboxRef = useRef<HTMLDivElement>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<LightboxSlideHandle>(null);
    const recentlyDragged = useRef<{ x: number; y: number } | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);

    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [mainImageLoaded, setMainImageLoaded] = useState(false);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    const favoriteUrlsSet = useMemo(() => {
        const set = new Set<string>();
        for (const f of favorites) {
            const fInput = typeof f === 'object' && 'photo' in f ? f.photo : f;
            const fOriginal = typeof fInput === 'string' ? fInput : fInput?.original;
            if (fOriginal) set.add(fOriginal);
        }
        return set;
    }, [favorites]);

    const checkIfFavorite = useCallback(
        (photo: PhotoInput) => {
            if (!photo) return false;
            const src = typeof photo === 'string' ? photo : photo?.original;
            return src ? favoriteUrlsSet.has(src) : false;
        },
        [favoriteUrlsSet]
    );

    const getThumbSrc = useCallback((photo: PhotoInput) => {
        if (!photo) return undefined;
        const url = typeof photo === 'string' ? photo : photo?.thumb || photo?.original;
        return url ? withBuild(url) : undefined;
    }, []);

    const [failedSpriteUrl, setFailedSpriteUrl] = useState<string | null>(null);
    const [scrubberReady, setScrubberReady] = useState(() => images.length <= 10);

    useEffect(() => {
        if (scrubberReady) return;
        const enableScrubber = () => setScrubberReady(true);
        window.addEventListener('pointerdown', enableScrubber, { passive: true, once: true });
        window.addEventListener('keydown', enableScrubber, { passive: true, once: true });
        let timer: ReturnType<typeof setTimeout> | null = null;
        if (mainImageLoaded) {
            timer = setTimeout(enableScrubber, 150);
        }
        return () => {
            window.removeEventListener('pointerdown', enableScrubber);
            window.removeEventListener('keydown', enableScrubber);
            if (timer) clearTimeout(timer);
        };
    }, [scrubberReady, mainImageLoaded]);

    // Derive scrubber sprite URL — all photos in a normal event share one sprite.
    // Falls back to individual thumbs for Favorites (mixed-event) views or oversized albums.
    const rawSpriteUrl = useMemo(() => {
        if (images.length === 0 || images.length > MAX_SPRITE_FRAMES) return null;
        const first = images[0];
        if (typeof first === 'string' || !first.thumb || first.spriteIndex == null) return null;
        // Ensure ALL images have contiguous 0-indexed spriteIndex values and share the same event directory
        const dir = first.thumb.substring(0, first.thumb.lastIndexOf('/'));
        const allMatch = images.every((img, i) => {
            if (typeof img === 'string' || img.spriteIndex !== i) return false;
            const imgDir = img.thumb.substring(0, img.thumb.lastIndexOf('/'));
            return imgDir === dir;
        });
        if (!allMatch) return null;
        const spriteDir = dir.replace(/^\/thumbnails\//, '/scrubber/');
        const hash = scrubberHash || (typeof first === 'object' && first ? first.scrubberHash : undefined);
        return withBuild(`${spriteDir}/sprite.webp${hash ? `?h=${hash}` : ''}`);
    }, [images, scrubberHash]);

    useEffect(() => {
        if (!rawSpriteUrl || !scrubberReady) return;
        const testImg = new Image();
        if ('fetchPriority' in testImg) {
            testImg.fetchPriority = 'low';
        }
        testImg.decoding = 'async';
        testImg.onerror = () => setFailedSpriteUrl(rawSpriteUrl);
        testImg.src = rawSpriteUrl;
    }, [rawSpriteUrl, scrubberReady]);

    const spriteUrl = !scrubberReady || failedSpriteUrl === rawSpriteUrl ? null : rawSpriteUrl;
    const effectiveGetThumbSrc = useCallback(
        (photo: PhotoInput) => (scrubberReady ? getThumbSrc(photo) : undefined),
        [scrubberReady, getThumbSrc]
    );

    /** Return CSS background style for the ambient blur layer.
     *  Uses the scrubber sprite frame when available (already loaded),
     *  falls back to individual thumbnails for Favorites/mixed views. */
    const getAmbientBg = useCallback(
        (photo: PhotoInput): React.CSSProperties => {
            if (!photo || !scrubberReady) return {};
            if (spriteUrl && typeof photo !== 'string' && photo.spriteIndex != null) {
                const totalCols = Math.min(images.length, SCRUBBER_COLUMNS);
                const totalRows = Math.ceil(images.length / SCRUBBER_COLUMNS);
                const col = photo.spriteIndex % SCRUBBER_COLUMNS;
                const row = Math.floor(photo.spriteIndex / SCRUBBER_COLUMNS);
                const posX = totalCols > 1 ? (col / (totalCols - 1)) * 100 : 0;
                const posY = totalRows > 1 ? (row / (totalRows - 1)) * 100 : 0;

                return {
                    backgroundImage: `url("${spriteUrl}")`,
                    backgroundSize: `${totalCols * 100}% ${totalRows * 100}%`,
                    backgroundPosition: `${posX}% ${posY}%`,
                };
            }
            const url = getThumbSrc(photo);
            return url ? { backgroundImage: `url("${url}")` } : {};
        },
        [scrubberReady, spriteUrl, getThumbSrc, images.length]
    );

    const handleResize = useDebounce(() => {
        setWindowWidth(window.innerWidth);
    }, 150);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [handleResize]);

    const [isDragging, setIsDragging] = useState(false);
    const [isPopping, setIsPopping] = useState(false);
    const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentPhoto = images[index];
    const effectiveEventName =
        (typeof currentPhoto === 'object' && currentPhoto?.eventName) || eventName;
    const effectiveYear =
        (typeof currentPhoto === 'object' && currentPhoto?.year) || year;

    const handleToggleFavorite = useCallback(() => {
        const photo = images[index];
        if (!photo) return;
        const currentlyFavorite = checkIfFavorite(photo);
        if (!currentlyFavorite) {
            setIsPopping(true);
            if (popTimerRef.current) clearTimeout(popTimerRef.current);
            popTimerRef.current = setTimeout(() => {
                setIsPopping(false);
            }, 400);
        }
        triggerHaptic('tap');
        toggleFavorite({
            photo,
            eventName: effectiveEventName || '',
            year: effectiveYear || '',
        });
    }, [checkIfFavorite, images, index, toggleFavorite, effectiveEventName, effectiveYear]);

    useEffect(() => {
        return () => {
            if (popTimerRef.current) clearTimeout(popTimerRef.current);
        };
    }, []);

    const handleToggleZoom = useCallback(() => {
        slideRef.current?.toggleZoom();
    }, []);

    const handleToggleTheater = useCallback(() => {
        setIsTheaterMode((prev) => !prev);
    }, []);

    const handleDownload = useCallback(() => {
        const obj = images[index];
        if (!obj) return;
        const src = typeof obj === 'string' ? obj : obj.original;
        triggerHaptic('success');
        triggerPhotoDownload(src);
    }, [images, index]);

    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isStoryExportOpen, setIsStoryExportOpen] = useState(false);
    const [storyExportSessionId, setStoryExportSessionId] = useState(0);

    const handleToggleHelp = useCallback(() => {
        if (canShare) return;
        setIsHelpOpen((prev) => !prev);
    }, [canShare]);

    const handleOpenStoryExport = useCallback(() => {
        setStoryExportSessionId((prev) => prev + 1);
        setIsStoryExportOpen(true);
    }, []);

    const isFavorite = checkIfFavorite(currentPhoto);

    const {
        x,
        isAnimating,
        maxDist,
        scrubMaxDrag,
        currentOpacity,
        prevOpacity,
        nextOpacity,
        trackX,
        thumbOpacity0,
        thumbOpacityPrev,
        thumbOpacityNext,
        filledHeartOpacity,
        emptyHeartOpacity,
        filledHeartScale,
        paginate,
        onDragEnd,
    } = useLightboxGestures({
        images,
        index,
        windowWidth,
        reducedMotion,
        spriteUrl,
        isFavorite,
        checkIfFavorite,
        getThumbSrc: effectiveGetThumbSrc,
        onSetIndex,
        onZoomReset: () => setIsZoomed(false),
    });

    const isPresent = useIsPresent();

    const handleClose = useCallback(() => {
        slideRef.current?.resetZoom?.();
        setIsZoomed(false);
        onClose();
    }, [onClose]);

    useLightboxNavigation({
        onClose: isStoryExportOpen
            ? () => setIsStoryExportOpen(false)
            : isHelpOpen
              ? () => setIsHelpOpen(false)
              : handleClose,
        onPaginate: paginate,
        isZoomed,
        isActive: isPresent && !isStoryExportOpen,
        isAnimating,
        isHelpOpen: !canShare && isHelpOpen,
        onToggleFavorite: handleToggleFavorite,
        onToggleZoom: handleToggleZoom,
        onToggleTheater: handleToggleTheater,
        onDownload: handleDownload,
        onToggleHelp: canShare ? undefined : handleToggleHelp,
        onOpenStoryExport: handleOpenStoryExport,
    });

    useBodyScrollLock(true);
    useFocusTrap(lightboxRef, !isStoryExportOpen && !isHelpOpen, undefined, {
        restoreFocus: !isStoryExportOpen && !isHelpOpen,
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMainImageLoaded(false);
    }, [index]);

    // ASYNC PRELOADER: Smart background album fetcher
    // Preloads the DISPLAY-RESOLUTION images (not thumbnails) so swiping
    // to nearby photos is instant.  Prioritises nearest neighbours then
    // fans out across the entire album sequentially.
    const getDisplaySrc = useCallback((photo: PhotoInput) => {
        const url = typeof photo === 'string' ? photo : photo.original;
        if (!url) return undefined;
        const displayUrl = getPhotoDisplayUrl(url);
        return withBuild(displayUrl);
    }, []);

    useImagePreloader({
        images,
        currentIndex: index,
        mainImageLoaded,
        getDisplaySrc,
    });

    // Update document title when the lightbox is open (correct approach for portal dialogs)
    useEffect(() => {
        const appTitle = import.meta.env.VITE_SITE_APP_TITLE || 'Photography Portfolio';
        const prevTitle = document.title;
        if (effectiveEventName) {
            document.title = `${effectiveEventName}${effectiveYear ? ` (${effectiveYear})` : ''} | ${appTitle}`;
        }
        return () => {
            document.title = prevTitle;
        };
    }, [effectiveEventName, effectiveYear]);

    const content = (
        <motion.div
            ref={lightboxRef}
            className={`portfolio__lightbox ${isTheaterMode ? 'is-theater-mode' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Photo lightbox"
            tabIndex={-1}
            initial={skipEntryAnim ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reducedMotion ? 0.15 : 0.22, ease: EASE_IN_OUT } }}
            transition={{ duration: reducedMotion ? 0.15 : DURATION.base, ease: EASE_OUT_EXPO }}
            style={{ pointerEvents: isPresent ? 'auto' : 'none' }}
            onPointerDown={(e) => {
                recentlyDragged.current = { x: e.clientX, y: e.clientY };
            }}
            onClick={(e) => {
                if (isStoryExportOpen) return;
                const start = recentlyDragged.current;
                if (start && typeof start === 'object') {
                    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
                    if (dist > 5) return; // Was a drag, not a click
                }
                handleClose();
            }}
        >
            <LightboxAmbient
                images={images}
                index={index}
                getAmbientBg={getAmbientBg}
                prevOpacity={prevOpacity}
                currentOpacity={currentOpacity}
                nextOpacity={nextOpacity}
            />

            {/* Left/Right Navigation Overlays */}
            <div
                className={`portfolio__lightbox-nav-overlay portfolio__lightbox-nav-overlay--left${isZoomed ? ' is-hidden' : ''}`}
                aria-hidden="true"
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isZoomed) paginate(-1);
                }}
            >
                <div className="portfolio__lightbox-nav-btn">
                    <ChevronLeft size={32} />
                </div>
            </div>
            <div
                className={`portfolio__lightbox-nav-overlay portfolio__lightbox-nav-overlay--right${isZoomed ? ' is-hidden' : ''}`}
                aria-hidden="true"
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isZoomed) paginate(1);
                }}
            >
                <div className="portfolio__lightbox-nav-btn">
                    <ChevronRight size={32} />
                </div>
            </div>

            <LightboxHeader
                images={images}
                index={index}
                year={effectiveYear}
                eventName={effectiveEventName}
                maxExifChars={maxExifChars}
                canShare={canShare}
                onClose={handleClose}
                onToggleHelp={canShare ? undefined : handleToggleHelp}
                onOpenStoryExport={handleOpenStoryExport}
            />

            <motion.div
                className="portfolio__lightbox-track-container"
                ref={containerRef}
                initial={skipEntryAnim ? false : { scale: 0.985 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.985, transition: { duration: DURATION.fast, ease: EASE_IN } }}
                transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <motion.div
                    className="portfolio__lightbox-track"
                    style={{ x }}
                    drag={isAnimating || isZoomed || !isPresent ? false : 'x'}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    dragMomentum={false}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={(e, info) => {
                        setIsDragging(false);
                        onDragEnd(e, info);
                    }}
                >
                    {/* Previous Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--prev">
                        <LightboxSlide
                            image={images[(index - 1 + images.length) % images.length]}
                            alt={effectiveEventName ? `Previous photo from ${effectiveEventName}` : 'Previous photo'}
                            deferLoad={!mainImageLoaded && !isAnimating && !isDragging}
                            onSingleClick={() => setIsTheaterMode((prev) => !prev)}
                        />
                    </div>

                    {/* Current Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--current">
                        <LightboxSlide
                            ref={slideRef}
                            image={images[index]}
                            alt={
                                effectiveEventName
                                    ? `Photo ${index + 1} from ${effectiveEventName}${effectiveYear ? `, ${effectiveYear}` : ''}`
                                    : `Photo ${index + 1}`
                            }
                            priority={true}
                            onZoomChange={setIsZoomed}
                            onLoad={() => setMainImageLoaded(true)}
                            onSingleClick={() => setIsTheaterMode((prev) => !prev)}
                        />
                    </div>

                    {/* Next Image */}
                    <div className="portfolio__lightbox-slide portfolio__lightbox-slide--next">
                        <LightboxSlide
                            image={images[(index + 1) % images.length]}
                            alt={effectiveEventName ? `Next photo from ${effectiveEventName}` : 'Next photo'}
                            deferLoad={!mainImageLoaded && !isAnimating && !isDragging}
                            onSingleClick={() => setIsTheaterMode((prev) => !prev)}
                        />
                    </div>
                </motion.div>
            </motion.div>

            <LightboxScrubber
                images={images}
                index={index}
                maxDist={maxDist}
                maxDrag={scrubMaxDrag}
                spriteUrl={spriteUrl}
                getThumbSrc={effectiveGetThumbSrc}
                checkIfFavorite={checkIfFavorite}
                trackX={trackX}
                thumbOpacity0={thumbOpacity0}
                thumbOpacityPrev={thumbOpacityPrev}
                thumbOpacityNext={thumbOpacityNext}
                emptyHeartOpacity={emptyHeartOpacity}
                filledHeartOpacity={filledHeartOpacity}
                filledHeartScale={filledHeartScale}
                onSetIndex={onSetIndex}
                onPaginate={paginate}
                isFavorite={isFavorite}
                isChangingSlide={isAnimating || isDragging}
                isPopping={isPopping}
                toggleFavorite={handleToggleFavorite}
            />

            <LightboxHelp isOpen={!canShare && isHelpOpen} onClose={() => setIsHelpOpen(false)} />

            {isStoryExportOpen && (
                <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <ErrorBoundary
                        name="StoryExportModal"
                        variant="overlay"
                        resetKeys={[index, storyExportSessionId]}
                        onDismiss={() => setIsStoryExportOpen(false)}
                    >
                        <Suspense fallback={null}>
                            <StoryExportModal
                                key={`story-export-${index}-${storyExportSessionId}`}
                                isOpen={isStoryExportOpen}
                                onClose={() => setIsStoryExportOpen(false)}
                                photo={images[index]}
                                eventName={effectiveEventName}
                                year={effectiveYear}
                                index={index}
                                localScore={localScore}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            )}
        </motion.div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
}
