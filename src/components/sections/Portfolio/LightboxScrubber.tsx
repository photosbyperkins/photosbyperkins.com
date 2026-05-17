import { motion, type MotionValue, useMotionValue, animate } from 'framer-motion';
import { flushSync } from 'react-dom';
import { Heart } from 'lucide-react';
import type { PhotoInput } from '../../../types';

interface LightboxScrubberProps {
    images: PhotoInput[];
    index: number;
    maxDist: number;
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
    toggleFavorite: () => void;
    isFavorite: boolean;
}

export default function LightboxScrubber({
    images,
    index,
    maxDist,
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
    toggleFavorite,
    isFavorite,
}: LightboxScrubberProps) {
    const total = images.length;
    const localDragX = useMotionValue(0);

    return (
        <div className="portfolio__lightbox-scrubber" onClick={(e) => e.stopPropagation()}>
            {/* Sliding track — thumbnails slide under the fixed playhead */}
            <motion.div className="portfolio__lightbox-scrubber-track" style={{ x: trackX }}>
                <motion.div
                    drag="x"
                    dragConstraints={{ left: -10000, right: 10000 }}
                    dragElastic={0}
                    dragMomentum={false}
                    style={{ x: localDragX, display: 'flex' }}
                    onDragEnd={(e, info) => {
                        const shiftPhotos = Math.round(-info.offset.x / 72);
                        if (shiftPhotos !== 0) {
                            const newIndex = (((index + shiftPhotos) % images.length) + images.length) % images.length;
                            flushSync(() => {
                                onSetIndex(newIndex);
                            });
                        }

                        // We must offset the instant jump of the track re-render
                        localDragX.set(info.offset.x + shiftPhotos * 72);
                        animate(localDragX, 0, { type: 'spring', stiffness: 400, damping: 40 });
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
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSetIndex(wrappedIndex);
                                        }
                                    }}
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
            </motion.div>

            {/* Fixed playhead — outline + heart, always centered */}
            <div className="portfolio__lightbox-scrubber-playhead">
                <button
                    className={`portfolio__lightbox-scrubber-heart${isFavorite ? ' is-active' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
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
    );
}
