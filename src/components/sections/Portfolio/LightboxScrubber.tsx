import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, type MotionValue, useMotionValue, animate } from 'framer-motion';
import { flushSync } from 'react-dom';
import { Heart } from '../../ui/icons';
import type { PhotoInput } from '../../../types';
import { triggerHaptic, triggerScrubberHaptic } from '../../../utils/haptics';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { SPRING_SETTLE } from '../../../utils/motion';

export const SCRUBBER_COLUMNS = 50;
export const MAX_SPRITE_FRAMES = 4250;

interface ThumbProps {
    offset: number;
    wrappedIndex: number;
    img: PhotoInput;
    spriteUrl: string | null;
    totalCols: number;
    totalRows: number;
    getThumbSrc: (photo: PhotoInput) => string | undefined;
    isThumbActive: boolean;
    isImgFavorite: boolean;
    burst?: { index: number; total: number };
    motionOpacity?: MotionValue<number>;
    staticOpacity?: number;
    onThumbClick: (offset: number, wrappedIndex: number) => void;
}

const Thumb = memo(
    function Thumb({
        offset,
        wrappedIndex,
        img,
        spriteUrl,
        totalCols,
        totalRows,
        getThumbSrc,
        isThumbActive,
        isImgFavorite,
        burst,
        motionOpacity,
        staticOpacity,
        onThumbClick,
    }: ThumbProps) {
        const handleClick = () => onThumbClick(offset, wrappedIndex);

        const onKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onThumbClick(offset, wrappedIndex);
            }
        };

        const col = img && typeof img !== 'string' && img.spriteIndex != null ? img.spriteIndex % SCRUBBER_COLUMNS : 0;
        const row =
            img && typeof img !== 'string' && img.spriteIndex != null
                ? Math.floor(img.spriteIndex / SCRUBBER_COLUMNS)
                : 0;

        const bgStyle =
            spriteUrl && typeof img !== 'string' && img.spriteIndex != null
                ? {
                      backgroundImage: `url("${spriteUrl}")`,
                      backgroundPosition: `${-(col * 72)}px ${-(row * 48)}px`,
                      backgroundSize: `${totalCols * 72}px ${totalRows * 48}px`,
                  }
                : {
                      backgroundImage: `url("${getThumbSrc(img)}")`,
                      backgroundPosition:
                          typeof img === 'object' && img.focusX != null && img.focusY != null
                              ? `${(img.focusX * 100).toFixed(1)}% ${(img.focusY * 100).toFixed(1)}%`
                              : 'center',
                  };

        const className = `portfolio__lightbox-scrubber-thumb${isThumbActive ? ' is-active' : ''}${burst ? ' portfolio__lightbox-scrubber-thumb--burst' : ''}`;
        const ariaLabel = `Go to photo ${wrappedIndex + 1}${burst ? ` (Burst frame ${burst.index + 1} of ${burst.total})` : ''}`;

        const content = (
            <>
                {burst && (
                    <div
                        className={`portfolio__lightbox-scrubber-burst-bar${
                            burst.index === 0 ? ' is-start' : ''
                        }${burst.index === burst.total - 1 ? ' is-end' : ''}`}
                        aria-hidden="true"
                    />
                )}
                {isImgFavorite && (
                    <div
                        className="portfolio__lightbox-scrubber-heart is-active portfolio__lightbox-scrubber-heart--thumb"
                        style={{ pointerEvents: 'none' }}
                    >
                        <Heart size={28} fill="var(--color-accent)" color="var(--color-accent)" strokeWidth={1.5} />
                    </div>
                )}
            </>
        );

        if (Math.abs(offset) <= 1 && motionOpacity) {
            return (
                <motion.div
                    className={className}
                    onClick={handleClick}
                    onKeyDown={onKeyDown}
                    style={{ ...bgStyle, opacity: motionOpacity }}
                    role="button"
                    tabIndex={0}
                    aria-label={ariaLabel}
                >
                    {content}
                </motion.div>
            );
        }

        return (
            <div
                className={className}
                onClick={handleClick}
                onKeyDown={onKeyDown}
                style={{ ...bgStyle, opacity: staticOpacity ?? 0.5 }}
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
            >
                {content}
            </div>
        );
    },
    (prev, next) =>
        prev.offset === next.offset &&
        prev.wrappedIndex === next.wrappedIndex &&
        prev.img === next.img &&
        prev.isThumbActive === next.isThumbActive &&
        prev.isImgFavorite === next.isImgFavorite &&
        prev.burst === next.burst &&
        prev.staticOpacity === next.staticOpacity &&
        prev.motionOpacity === next.motionOpacity &&
        prev.spriteUrl === next.spriteUrl &&
        prev.totalCols === next.totalCols &&
        prev.totalRows === next.totalRows &&
        prev.getThumbSrc === next.getThumbSrc &&
        prev.onThumbClick === next.onThumbClick
);

interface LightboxScrubberProps {
    images: PhotoInput[];
    index: number;
    maxDist: number;
    /** Max scrub drag in px. Defaults to half the rendered slice range. */
    maxDrag?: number;
    spriteUrl: string | null;
    getThumbSrc: (photo: PhotoInput) => string | undefined;
    checkIfFavorite: (photo: PhotoInput) => boolean;
    trackX: MotionValue<number>;
    thumbOpacity0: MotionValue<number>;
    thumbOpacityPrev: MotionValue<number>;
    thumbOpacityNext: MotionValue<number>;
    emptyHeartOpacity: MotionValue<number>;
    filledHeartOpacity: MotionValue<number>;
    filledHeartScale: MotionValue<number>;
    onSetIndex: (index: number) => void;
    onPaginate?: (direction: number) => void;
    toggleFavorite: () => void;
    isFavorite: boolean;
    isChangingSlide?: boolean;
    isPopping?: boolean;
}

export default function LightboxScrubber({
    images,
    index,
    maxDist,
    maxDrag: maxDragProp,
    spriteUrl,
    getThumbSrc,
    checkIfFavorite,
    trackX,
    thumbOpacity0,
    thumbOpacityPrev,
    thumbOpacityNext,
    emptyHeartOpacity,
    filledHeartOpacity,
    filledHeartScale,
    onSetIndex,
    onPaginate,
    toggleFavorite,
    isFavorite,
    isChangingSlide = false,
    isPopping = false,
}: LightboxScrubberProps) {
    const reducedMotion = useReducedMotion();
    const total = images.length;
    const totalCols = Math.max(1, Math.min(images.length, SCRUBBER_COLUMNS));
    const totalRows = Math.max(1, Math.ceil(images.length / SCRUBBER_COLUMNS));
    const localDragX = useMotionValue(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubShift, setScrubShift] = useState(0);
    const scrubShiftRef = useRef(0);
    const [isIndexChanging, setIsIndexChanging] = useState(false);
    const prevIndexRef = useRef(index);

    useEffect(() => {
        if (prevIndexRef.current !== index) {
            prevIndexRef.current = index;
            setIsIndexChanging(true);
            const timer = setTimeout(() => {
                setIsIndexChanging(false);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [index]);

    const isChanging = Boolean(isChangingSlide || isScrubbing || isIndexChanging);
    const isActive = isFavorite && !isChanging;
    const showPopping = Boolean(isPopping && !isChanging);

    const activeOffset = isScrubbing ? scrubShift : 0;
    const currentDisplayIndex = isScrubbing && total > 0 ? (((index + scrubShift) % total) + total) % total : index;

    const handleThumbClick = useCallback(
        (offset: number, wrappedIndex: number) => {
            if (onPaginate && Math.abs(offset) === 1) {
                onPaginate(offset);
                return;
            }
            flushSync(() => {
                onSetIndex(wrappedIndex);
            });
            if (reducedMotion) {
                localDragX.set(0);
            } else {
                localDragX.set(offset * 72);
                animate(localDragX, 0, SPRING_SETTLE);
            }
        },
        [onPaginate, onSetIndex, reducedMotion, localDragX]
    );

    const maxDrag = maxDragProp ?? Math.max(72, Math.floor(maxDist / 2) * 72);

    return (
        <div className="portfolio__lightbox-scrubber" onClick={(e) => e.stopPropagation()}>
            {/* Sliding track — thumbnails slide under the fixed playhead */}
            <motion.div className="portfolio__lightbox-scrubber-track" style={{ x: trackX }}>
                <motion.div
                    drag="x"
                    dragConstraints={{ left: -maxDrag, right: maxDrag }}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{ x: localDragX, display: 'flex' }}
                    onDragStart={() => {
                        setIsScrubbing(true);
                        scrubShiftRef.current = 0;
                        setScrubShift(0);
                    }}
                    onDrag={() => {
                        // Read the clamped track position, not the raw pointer offset,
                        // so the highlight matches the slice under the playhead.
                        const shift = Math.round(-localDragX.get() / 72);
                        if (shift !== scrubShiftRef.current) {
                            scrubShiftRef.current = shift;
                            setScrubShift(shift);
                            triggerScrubberHaptic();
                        }
                    }}
                    onDragEnd={() => {
                        setIsScrubbing(false);
                        scrubShiftRef.current = 0;
                        setScrubShift(0);
                        const dragX = localDragX.get();
                        const shiftPhotos = Math.round(-dragX / 72);
                        if (shiftPhotos !== 0) {
                            const newIndex = (((index + shiftPhotos) % images.length) + images.length) % images.length;
                            flushSync(() => {
                                onSetIndex(newIndex);
                            });
                        }

                        // Offset the instant jump of the track re-render
                        if (reducedMotion) {
                            localDragX.set(0);
                        } else {
                            localDragX.set(dragX + shiftPhotos * 72);
                            animate(localDragX, 0, SPRING_SETTLE);
                        }
                    }}
                >
                    {(() => {
                        const offsets: number[] = [];
                        for (let o = -maxDist; o <= maxDist; o++) {
                            offsets.push(o);
                        }

                        return offsets.map((offset) => {
                            const wrappedIndex = (((index + offset) % images.length) + images.length) % images.length;
                            const img = images[wrappedIndex];
                            const isImgFavorite = checkIfFavorite(img);
                            const isThumbActive = offset === activeOffset;
                            const burst = typeof img === 'object' ? img.burst : undefined;

                            // Determine drag-driven opacity for this thumb
                            const motionOpacity =
                                !isScrubbing && offset === 0
                                    ? thumbOpacity0
                                    : !isScrubbing && offset === -1
                                      ? thumbOpacityPrev
                                      : !isScrubbing && offset === 1
                                        ? thumbOpacityNext
                                        : undefined;

                            const staticOpacity = isScrubbing ? (offset === activeOffset ? 1 : 0.5) : 0.5;

                            return (
                                <Thumb
                                    key={`${offset}`}
                                    offset={offset}
                                    wrappedIndex={wrappedIndex}
                                    img={img}
                                    spriteUrl={spriteUrl}
                                    totalCols={totalCols}
                                    totalRows={totalRows}
                                    getThumbSrc={getThumbSrc}
                                    isThumbActive={isThumbActive}
                                    isImgFavorite={isImgFavorite}
                                    burst={burst}
                                    motionOpacity={motionOpacity}
                                    staticOpacity={staticOpacity}
                                    onThumbClick={handleThumbClick}
                                />
                            );
                        });
                    })()}
                </motion.div>
            </motion.div>

            {/* Fixed playhead — outline + heart, always centered */}
            <div className="portfolio__lightbox-scrubber-playhead">
                <button
                    className={`portfolio__lightbox-scrubber-heart${isActive ? ' is-active' : ''}${showPopping ? ' is-popping' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('tap');
                        toggleFavorite();
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
                        className="portfolio__lightbox-scrubber-heart-layer portfolio__lightbox-scrubber-heart-layer--filled"
                        style={{ opacity: filledHeartOpacity, scale: filledHeartScale }}
                    >
                        <Heart size={28} fill="var(--color-accent)" color="var(--color-accent)" strokeWidth={1.5} />
                    </motion.div>
                </button>
                <span className="portfolio__lightbox-scrubber-counter">
                    {currentDisplayIndex + 1} / {total}
                </span>
            </div>
        </div>
    );
}
