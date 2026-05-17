import { X, Download, Share2 } from 'lucide-react';
import type { PhotoInput } from '../../../types';
import { getPhotoDisplayUrl } from '../../../utils/formatters';

declare const __BUILD_NUMBER__: string;

interface LightboxHeaderProps {
    images: PhotoInput[];
    index: number;
    year?: string;
    eventName?: string;
    maxExifChars?: number;
    canShare: boolean;
    onClose: () => void;
}

export default function LightboxHeader({
    images,
    index,
    year,
    eventName,
    maxExifChars = 0,
    canShare,
    onClose,
}: LightboxHeaderProps) {
    const currentPhoto = images[index];
    const exif = typeof currentPhoto === 'object' ? currentPhoto.exif : null;

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

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (year && eventName) {
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
                </div>
            </div>

            {exif && (
                <div className="portfolio__lightbox-top-center" onClick={(e) => e.stopPropagation()}>
                    <div className="portfolio__lightbox-data-display">
                        <div
                            className="portfolio__lightbox-data-info"
                            style={exif && maxExifChars > 0 ? { minWidth: `${maxExifChars * 5.0}px` } : undefined}
                        >
                            <span className="portfolio__lightbox-data-row-top">
                                {[exif?.cameraModel, exif?.lens].filter(Boolean).join(' • ')}
                            </span>
                            <span className="portfolio__lightbox-data-row-bottom">
                                {[exif?.focalLength, exif?.aperture, exif?.shutterSpeed, exif?.iso]
                                    .filter(Boolean)
                                    .join(' • ')}
                            </span>
                        </div>
                    </div>
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
    );
}
