import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

import '../../styles/_about.scss';

declare const __BUILD_NUMBER__: string;

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, delay: i * 0.15, ease: 'easeOut' as const },
    }),
};

export default function About() {
    const isAboutOpen = useAppStore((state) => state.isAboutOpen);
    const closeAbout = useAppStore((state) => state.closeAbout);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
        if (isAboutOpen) {
            previousFocusRef.current = document.activeElement;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '8px'; // Prevent jumping from scrollbar disappearing

            // Auto-focus close button after render
            requestAnimationFrame(() => closeBtnRef.current?.focus());

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    closeAbout();
                }
            };
            document.addEventListener('keydown', handleKeyDown);

            return () => {
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                document.removeEventListener('keydown', handleKeyDown);
                if (previousFocusRef.current instanceof HTMLElement) {
                    previousFocusRef.current.focus();
                }
            };
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    }, [isAboutOpen, closeAbout]);

    return (
        <AnimatePresence>
            {isAboutOpen && (
                <motion.div
                    className="about-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="About the photographer"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="about-overlay__header-bar">
                        <div className="container about-overlay__header-bar-inner">
                            <motion.h2
                                className="section-label"
                                custom={0}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                            >
                                BEHIND THE LENS
                            </motion.h2>
                            <button
                                ref={closeBtnRef}
                                className="about-overlay__back-btn"
                                onClick={closeAbout}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                    <section className="about" id="about">
                        <div className="container">
                            <div className="about__grid">
                                {/* Photo column */}
                                <motion.div
                                    className="about__photo-wrapper"
                                    custom={0}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <div className="about__photo-frame">
                                        <img
                                            className="about__photo"
                                            src={`/photos/profile_photo.jpg?v=${__BUILD_NUMBER__}`}
                                            alt={import.meta.env.VITE_ABOUT_PHOTO_ALT || 'Photographer Profile Photo'}
                                        />
                                    </div>
                                </motion.div>

                                {/* Text column */}
                                <div className="about__text">
                                    <motion.div
                                        className="about__body"
                                        custom={1}
                                        initial="hidden"
                                        animate="visible"
                                        variants={fadeUp}
                                    >
                                        {import.meta.env.VITE_ABOUT_ME ? (
                                            import.meta.env.VITE_ABOUT_ME.split('\n').map(
                                                (paragraph: string, i: number) => {
                                                    if (!paragraph.trim()) return null;
                                                    return <p key={i}>{paragraph}</p>;
                                                }
                                            )
                                        ) : (
                                            <p>Welcome to my photography portfolio!</p>
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </section>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
