import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Copy, Check, Share2, RefreshCw, UserCheck, ShieldCheck, Scale } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useAppStore } from '../../store/useAppStore';
import '../../styles/_photo-license.scss';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
    }),
};

export default function PhotoLicenseModal() {
    const isPhotoLicenseOpen = useAppStore((state) => state.isPhotoLicenseOpen);
    const closePhotoLicense = useAppStore((state) => state.closePhotoLicense);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);
    const [copied, setCopied] = useState(false);

    const copyrightName = import.meta.env.VITE_COPYRIGHT_NAME || 'Michael Perkins';
    const photosLicenseUrl =
        import.meta.env.VITE_LICENSE_URL || 'https://creativecommons.org/licenses/by-sa/4.0/';
    const attributionSnippet = `Photo by ${copyrightName} / photosbyperkins.com (CC BY-SA 4.0)`;

    useBodyScrollLock(isPhotoLicenseOpen);

    useEffect(() => {
        if (isPhotoLicenseOpen) {
            previousFocusRef.current = document.activeElement;
            requestAnimationFrame(() => closeBtnRef.current?.focus());

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    closePhotoLicense();
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
    }, [isPhotoLicenseOpen, closePhotoLicense]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(attributionSnippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard fallback
        }
    };

    return (
        <AnimatePresence>
            {isPhotoLicenseOpen && (
                <motion.div
                    className="photo-license-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Photo License"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="photo-license-overlay__header-bar">
                        <div className="container photo-license-overlay__header-bar-inner">
                            <motion.h2
                                className="section-label"
                                custom={0}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                            >
                                PHOTO LICENSE
                            </motion.h2>
                            <div className="photo-license-overlay__actions">
                                <a
                                    href={photosLicenseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="photo-license-overlay__action-btn"
                                    aria-label="View on Creative Commons"
                                    title="View on Creative Commons"
                                >
                                    <ExternalLink size={20} />
                                </a>
                                <button
                                    ref={closeBtnRef}
                                    type="button"
                                    className="photo-license-overlay__action-btn"
                                    onClick={closePhotoLicense}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <section className="photo-license" id="photo-license">
                        <div className="container">
                            <div className="photo-license__container">
                                <motion.div
                                    className="photo-license__intro"
                                    custom={0}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <span className="photo-license__badge">Creative Commons</span>
                                    <h1>CC BY-SA 4.0</h1>
                                    <p className="photo-license__subtitle">
                                        All photography featured on photosbyperkins.com is openly licensed under the{' '}
                                        <strong>Creative Commons Attribution-ShareAlike 4.0 International</strong>{' '}
                                        license unless otherwise indicated.
                                    </p>
                                </motion.div>

                                <motion.div
                                    className="photo-license__grid"
                                    custom={1}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    {/* Permissions Card */}
                                    <div className="photo-license__card">
                                        <div className="photo-license__card-header">
                                            <Scale size={18} />
                                            <h3>You are free to:</h3>
                                        </div>
                                        <div className="photo-license__items">
                                            <div className="photo-license__item">
                                                <Share2 size={18} className="photo-license__item-icon" />
                                                <div className="photo-license__item-content">
                                                    <strong>Share &amp; Redistribute</strong>
                                                    Copy and redistribute the material in any medium or format for any purpose, including commercial uses.
                                                </div>
                                            </div>
                                            <div className="photo-license__item">
                                                <RefreshCw size={18} className="photo-license__item-icon" />
                                                <div className="photo-license__item-content">
                                                    <strong>Adapt &amp; Remix</strong>
                                                    Remix, transform, crop, and build upon the material for any purpose, even commercially.
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conditions Card */}
                                    <div className="photo-license__card">
                                        <div className="photo-license__card-header">
                                            <ShieldCheck size={18} />
                                            <h3>Under these terms:</h3>
                                        </div>
                                        <div className="photo-license__items">
                                            <div className="photo-license__item">
                                                <UserCheck size={18} className="photo-license__item-icon" />
                                                <div className="photo-license__item-content">
                                                    <strong>Attribution (BY)</strong>
                                                    Give appropriate credit, provide a link to the license, and indicate if changes were made.
                                                </div>
                                            </div>
                                            <div className="photo-license__item">
                                                <RefreshCw size={18} className="photo-license__item-icon" />
                                                <div className="photo-license__item-content">
                                                    <strong>ShareAlike (SA)</strong>
                                                    If you remix or build upon the photos, you must distribute your contributions under the same license.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Attribution Helper Box */}
                                <motion.div
                                    className="photo-license__attribution-card"
                                    custom={2}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <h3>Recommended Attribution Credit</h3>
                                    <p>
                                        When sharing on social media, blogs, websites, or editorial publications, please use the following credit line:
                                    </p>
                                    <div className="photo-license__snippet-box">
                                        <code>{attributionSnippet}</code>
                                        <button
                                            type="button"
                                            className={`photo-license__btn ${copied ? 'photo-license__btn--copied' : ''}`}
                                            onClick={handleCopy}
                                        >
                                            {copied ? <Check size={16} /> : <Copy size={16} />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Actions */}
                                <motion.div
                                    className="photo-license__actions"
                                    custom={3}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <button
                                        type="button"
                                        className={`photo-license__btn ${copied ? 'photo-license__btn--copied' : ''}`}
                                        onClick={handleCopy}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Attribution Copied' : 'Copy Attribution'}
                                    </button>
                                    <a
                                        href={photosLicenseUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="photo-license__btn"
                                    >
                                        <ExternalLink size={16} />
                                        View Official Deed on Creative Commons
                                    </a>
                                </motion.div>
                            </div>
                        </div>
                    </section>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
