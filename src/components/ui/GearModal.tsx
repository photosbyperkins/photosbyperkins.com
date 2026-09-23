import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useAppStore } from '../../store/useAppStore';
import '../../styles/_gear-modal.scss';

export default function GearModal() {
    const activeGear = useAppStore((state) => state.activeGear);
    const closeGearModal = useAppStore((state) => state.closeGearModal);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useBodyScrollLock(Boolean(activeGear));

    useEffect(() => {
        if (activeGear) {
            previousFocusRef.current = document.activeElement;

            requestAnimationFrame(() => closeBtnRef.current?.focus());

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    closeGearModal();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                if (previousFocusRef.current instanceof HTMLElement) {
                    previousFocusRef.current.focus();
                }
            };
        }
    }, [activeGear, closeGearModal]);

    return (
        <AnimatePresence>
            {activeGear && (
                <motion.div
                    className="gear-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label={activeGear.name}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="gear-modal">
                        <div className="container gear-modal__container">
                            <header className="gear-modal__header">
                                <h1 className="section-label gear-modal__label">
                                    <span className="gear-modal__name-full">{activeGear.name}</span>
                                    <span className="gear-modal__name-compact">
                                        {activeGear.compactName || activeGear.name}
                                    </span>
                                </h1>
                                <div className="gear-modal__actions">
                                    <a
                                        href={activeGear.officialUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="gear-modal__action-btn"
                                        title="Open official product page"
                                        aria-label="Open official product page"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                    <button
                                        ref={closeBtnRef}
                                        className="gear-modal__action-btn gear-modal__close-btn"
                                        onClick={closeGearModal}
                                        aria-label="Close"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </header>

                            <div className="gear-modal__card">
                                <div className="gear-modal__spec-grid">
                                    {Object.entries(activeGear.specs).map(([key, val]) => (
                                        <div key={key} className="gear-modal__spec-item">
                                            <div className="gear-modal__spec-label">{key}</div>
                                            <div className="gear-modal__spec-val">{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
