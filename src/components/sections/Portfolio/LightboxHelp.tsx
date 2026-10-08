import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { X } from '../../ui/icons';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { DURATION, EASE_OUT_EXPO, EASE_IN_OUT, EASE_IN } from '../../../utils/motion';
import React from 'react';

export interface LightboxHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS: { keys: React.ReactNode; label: string }[] = [
    {
        keys: (
            <>
                <kbd>→</kbd> / <kbd>Space</kbd>
            </>
        ),
        label: 'Next photo',
    },
    { keys: <kbd>←</kbd>, label: 'Previous photo' },
    {
        keys: (
            <>
                <kbd>F</kbd> / <kbd>L</kbd>
            </>
        ),
        label: 'Toggle favorite',
    },
    { keys: <kbd>Z</kbd>, label: 'Toggle 100% zoom' },
    { keys: <kbd>T</kbd>, label: 'Toggle theater mode' },
    { keys: <kbd>D</kbd>, label: 'Download original photo' },
    { keys: <kbd>C</kbd>, label: 'Story Maker' },
    { keys: <kbd>Esc</kbd>, label: 'Close lightbox' },
    { keys: <kbd>?</kbd>, label: 'Toggle this help' },
];

export default function LightboxHelp({ isOpen, onClose }: LightboxHelpProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    useFocusTrap(cardRef, isOpen, closeBtnRef);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="portfolio__lightbox-help-overlay"
                    role="dialog"
                    aria-label="Keyboard Shortcuts"
                    aria-modal="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_IN_OUT } }}
                    transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    <motion.div
                        ref={cardRef}
                        className="portfolio__lightbox-help-card"
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.99, transition: { duration: 0.14, ease: EASE_IN } }}
                        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="portfolio__lightbox-help-header">
                            <h3>Keyboard Shortcuts</h3>
                            <button
                                ref={closeBtnRef}
                                className="portfolio__lightbox-help-close"
                                onClick={onClose}
                                aria-label="Close shortcuts"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="portfolio__lightbox-help-grid">
                            {SHORTCUTS.map((item, idx) => (
                                <div key={idx} className="portfolio__lightbox-help-item">
                                    {item.keys}
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
