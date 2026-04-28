import { AnimatePresence } from 'framer-motion';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import Lightbox from './Lightbox';

export default function LightboxContainer() {
    const lightbox = usePortfolioStore((state) => state.lightbox);
    const closeLightbox = usePortfolioStore((state) => state.closeLightbox);
    const setLightboxIndex = usePortfolioStore((state) => state.setLightboxIndex);

    return (
        <AnimatePresence>
            {lightbox.isOpen && (
                <Lightbox
                    images={lightbox.images}
                    index={lightbox.index}
                    year={lightbox.year}
                    eventName={lightbox.eventName}
                    maxExifChars={lightbox.maxExifChars}
                    onClose={closeLightbox}
                    onSetIndex={setLightboxIndex}
                />
            )}
        </AnimatePresence>
    );
}
