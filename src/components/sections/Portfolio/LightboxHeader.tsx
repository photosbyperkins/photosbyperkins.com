import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, HelpCircle, StoryCropIcon } from '../../ui/icons';
import { DURATION, EASE_OUT_EXPO, EASE_IN } from '../../../utils/motion';
import type { PhotoInput } from '../../../types';
import {
    getPhotoDisplayUrl,
    formatCameraModel,
    resolvePhotoInput,
    getPhotoOriginalUrl,
} from '../../../utils/formatters';
import { triggerPhotoDownload } from '../../../utils/build';
import { getCachedAlbum } from '../../../utils/albumData';

interface LightboxHeaderProps {
    images: PhotoInput[];
    index: number;
    year?: string;
    eventName?: string;
    maxExifChars?: number;
    canShare: boolean;
    onClose: () => void;
    onToggleHelp?: () => void;
    onOpenStoryExport?: () => void;
}

type ExifPart = readonly [field: string, value: string | undefined];

/**
 * One EXIF line ("Z8 • 70-200mm"). Each value is keyed by field + text, so when cycling
 * photos only the values that actually change remount and fade in; identical values
 * (and the separators) stay perfectly still. No exit animation — the old value is
 * replaced in place, avoiding overlap/reflow inside the inline text run.
 */
function ExifRow({ className, parts }: { className: string; parts: ExifPart[] }) {
    const present = parts.filter((p): p is readonly [string, string] => Boolean(p[1]));
    return (
        <span className={className}>
            {present.map(([field, value], i) => (
                <span key={field}>
                    {i > 0 && ' • '}
                    <span key={value} className="portfolio__lightbox-data-value">
                        {value}
                    </span>
                </span>
            ))}
        </span>
    );
}

export default function LightboxHeader({
    images,
    index,
    year,
    eventName,
    maxExifChars = 0,
    canShare,
    onClose,
    onToggleHelp,
    onOpenStoryExport,
}: LightboxHeaderProps) {
    const resolvedPhoto = resolvePhotoInput(images[index]);
    let exif = typeof resolvedPhoto === 'object' && resolvedPhoto !== null ? resolvedPhoto.exif : null;
    if (!exif) {
        const originalUrl = getPhotoOriginalUrl(images[index]);
        if (originalUrl) {
            const match = originalUrl.match(/\/photos\/(\d{4})\/([^/]+)\//);
            if (match) {
                const cached = getCachedAlbum(match[1], match[2]);
                const found = cached?.find((p) => p.original === originalUrl);
                if (found?.exif) {
                    exif = found.exif;
                }
            }
        }
    }

    // Determine if any photo in the album has EXIF (so we know whether to show a placeholder)
    const albumHasExif = images.some((img) => {
        const p = resolvePhotoInput(img);
        if (typeof p === 'object' && p !== null && p.exif) return true;
        const originalUrl = getPhotoOriginalUrl(img);
        if (originalUrl) {
            const match = originalUrl.match(/\/photos\/(\d{4})\/([^/]+)\//);
            if (match) {
                const cached = getCachedAlbum(match[1], match[2]);
                const found = cached?.find((photo) => photo.original === originalUrl);
                if (found?.exif) return true;
            }
        }
        return false;
    });

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const src = getPhotoOriginalUrl(images[index]);
        if (!src) return;
        triggerPhotoDownload(src);
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (year && eventName) {
            const shareUrl = `${window.location.origin}/portfolio/${encodeURIComponent(year)}/${encodeURIComponent(eventName)}/${index}`;

            try {
                const originalSrc = getPhotoOriginalUrl(images[index]);
                if (!originalSrc) return;
                const displaySrc = getPhotoDisplayUrl(originalSrc);
                const filename = displaySrc.split('/').pop() || 'photo.avif';
                const response = await fetch(displaySrc);
                const blob = await response.blob();
                const file = new File([blob], filename, {
                    type: blob.type || 'image/avif',
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
    };

    return (
        <div
            className="portfolio__lightbox-top-bar"
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <div className="portfolio__lightbox-top-left">
                <div className="portfolio__lightbox-action-group">
                    {canShare ? (
                        <button className="portfolio__lightbox-action" onClick={handleShare} aria-label="Share">
                            <Share2 size={18} />
                        </button>
                    ) : (
                        <button className="portfolio__lightbox-action" onClick={handleDownload} aria-label="Download">
                            <Download size={18} />
                        </button>
                    )}
                    {onOpenStoryExport && (
                        <button
                            className="portfolio__lightbox-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenStoryExport();
                            }}
                            aria-label="Story Maker (9:16)"
                            title="Story Maker (C)"
                        >
                            <StoryCropIcon size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="portfolio__lightbox-top-center" onClick={(e) => e.stopPropagation()}>
                <AnimatePresence mode="popLayout" initial={false}>
                    {exif ? (
                        <motion.div
                            className="portfolio__lightbox-data-display"
                            // Stable key: the container persists while cycling photos; only
                            // individual values that actually change fade in (see ExifRow).
                            key="exif"
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -2, transition: { duration: DURATION.instant, ease: EASE_IN } }}
                            transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                        >
                            <div
                                className="portfolio__lightbox-data-info"
                                style={maxExifChars > 0 ? { minWidth: `${maxExifChars * 5.0}px` } : undefined}
                            >
                                <ExifRow
                                    className="portfolio__lightbox-data-row-top"
                                    parts={[
                                        ['camera', formatCameraModel(exif.cameraModel)],
                                        ['lens', exif.lens],
                                    ]}
                                />
                                <ExifRow
                                    className="portfolio__lightbox-data-row-bottom"
                                    parts={[
                                        ['focal', exif.focalLength],
                                        ['aperture', exif.aperture],
                                        ['shutter', exif.shutterSpeed],
                                        ['iso', exif.iso],
                                    ]}
                                />
                            </div>
                        </motion.div>
                    ) : albumHasExif ? (
                        <motion.div
                            className="portfolio__lightbox-data-display portfolio__lightbox-data-display--empty"
                            key="exif-empty"
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 0.4, y: 0 }}
                            exit={{ opacity: 0, y: -2, transition: { duration: DURATION.instant, ease: EASE_IN } }}
                            transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                        >
                            <div className="portfolio__lightbox-data-info">
                                <span className="portfolio__lightbox-data-row-bottom">No camera data</span>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <div className="portfolio__lightbox-top-right">
                {onToggleHelp && (
                    <button
                        className="portfolio__lightbox-action portfolio__lightbox-help-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleHelp();
                        }}
                        aria-label="Keyboard Shortcuts"
                        title="Keyboard Shortcuts (?)"
                    >
                        <HelpCircle size={18} />
                    </button>
                )}
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
    );
}
