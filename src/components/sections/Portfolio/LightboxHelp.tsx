import { motion, AnimatePresence } from 'framer-motion';
import { X } from '../../ui/icons';
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
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="portfolio__lightbox-help-overlay"
                    role="dialog"
                    aria-label="Keyboard Shortcuts"
                    aria-modal="true"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    <div className="portfolio__lightbox-help-card" onClick={(e) => e.stopPropagation()}>
                        <div className="portfolio__lightbox-help-header">
                            <h3>Keyboard Shortcuts</h3>
                            <button
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
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
