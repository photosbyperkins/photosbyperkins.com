import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import '../../styles/_iframe-overlay.scss';

export default function IframeOverlay() {
    const iframeUrl = useAppStore((state) => state.iframeUrl);
    const closeIframe = useAppStore((state) => state.closeIframe);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);
    const [prevUrl, setPrevUrl] = useState(iframeUrl);
    const [isLoading, setIsLoading] = useState(true);

    if (iframeUrl !== prevUrl) {
        setPrevUrl(iframeUrl);
        setIsLoading(true);
    }

    useEffect(() => {
        if (iframeUrl) {
            previousFocusRef.current = document.activeElement;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '8px'; // Prevent jumping from scrollbar disappearing

            // Auto-focus close button after render
            requestAnimationFrame(() => closeBtnRef.current?.focus());

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    closeIframe();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                window.removeEventListener('keydown', handleKeyDown);
                if (previousFocusRef.current instanceof HTMLElement) {
                    previousFocusRef.current.focus();
                }
            };
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    }, [iframeUrl, closeIframe]);

    return (
        <AnimatePresence>
            {iframeUrl && (
                <motion.div
                    className="iframe-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="External Link Overlay"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="iframe-overlay__header-bar">
                        <div className="container iframe-overlay__header-bar-inner">
                            <h2 className="section-label">WFTDA STATS</h2>
                            <div className="iframe-overlay__actions">
                                <a
                                    href={iframeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="iframe-overlay__action-btn"
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <button
                                    ref={closeBtnRef}
                                    className="iframe-overlay__action-btn iframe-overlay__close-btn"
                                    onClick={closeIframe}
                                    aria-label="Close"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="iframe-overlay__content">
                        {isLoading && <div className="iframe-overlay__loading">Loading...</div>}
                        <iframe
                            src={iframeUrl}
                            className={`iframe-overlay__iframe ${isLoading ? 'iframe-overlay__iframe--loading' : ''}`}
                            onLoad={() => setIsLoading(false)}
                            title="External content"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
