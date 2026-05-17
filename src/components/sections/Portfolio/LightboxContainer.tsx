import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../../store/useAppStore';
import Lightbox from './Lightbox';

export default function LightboxContainer() {
    const lightbox = useAppStore((state) => state.lightbox);
    const closeLightbox = useAppStore((state) => state.closeLightbox);
    const setLightboxIndex = useAppStore((state) => state.setLightboxIndex);

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
