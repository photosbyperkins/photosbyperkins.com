import { motion, type MotionValue } from 'framer-motion';
import type { PhotoInput } from '../../../types';

interface LightboxAmbientProps {
    images: PhotoInput[];
    index: number;
    getAmbientBg: (photo: PhotoInput) => React.CSSProperties;
    prevOpacity: MotionValue<number>;
    currentOpacity: MotionValue<number>;
    nextOpacity: MotionValue<number>;
}

export default function LightboxAmbient({
    images,
    index,
    getAmbientBg,
    prevOpacity,
    currentOpacity,
    nextOpacity,
}: LightboxAmbientProps) {
    const prevPhoto = images[(index - 1 + images.length) % images.length];
    const currentPhoto = images[index];
    const nextPhoto = images[(index + 1) % images.length];

    return (
        <div className="portfolio__lightbox-ambient">
            <motion.div
                className="portfolio__lightbox-ambient-img"
                style={{
                    ...getAmbientBg(prevPhoto),
                    opacity: prevOpacity,
                }}
            />
            <motion.div
                className="portfolio__lightbox-ambient-img"
                style={{ ...getAmbientBg(currentPhoto), opacity: currentOpacity }}
            />
            <motion.div
                className="portfolio__lightbox-ambient-img"
                style={{
                    ...getAmbientBg(nextPhoto),
                    opacity: nextOpacity,
                }}
            />
            <div className="portfolio__lightbox-ambient-glass" />
        </div>
    );
}
