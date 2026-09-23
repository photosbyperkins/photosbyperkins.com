import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useAppStore } from '../../store/useAppStore';
import '../../styles/_code-license.scss';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
    }),
};

export default function CodeLicenseModal() {
    const isCodeLicenseOpen = useAppStore((state) => state.isCodeLicenseOpen);
    const closeCodeLicense = useAppStore((state) => state.closeCodeLicense);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);
    const [copied, setCopied] = useState(false);

    const copyrightName = import.meta.env.VITE_COPYRIGHT_NAME || 'Michael Perkins';
    const currentYear = new Date().getFullYear();
    const githubLicenseUrl =
        import.meta.env.VITE_CODE_LICENSE_URL ||
        'https://github.com/photosbyperkins/photosbyperkins.com/blob/main/LICENSE.md';

    const licenseText = `MIT License

Copyright (c) ${currentYear} ${copyrightName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

    useBodyScrollLock(isCodeLicenseOpen);

    useEffect(() => {
        if (isCodeLicenseOpen) {
            previousFocusRef.current = document.activeElement;
            requestAnimationFrame(() => closeBtnRef.current?.focus());

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    closeCodeLicense();
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
    }, [isCodeLicenseOpen, closeCodeLicense]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(licenseText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard fallback
        }
    };

    return (
        <AnimatePresence>
            {isCodeLicenseOpen && (
                <motion.div
                    className="code-license-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Code License"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                    <div className="code-license-overlay__header-bar">
                        <div className="container code-license-overlay__header-bar-inner">
                            <motion.h2
                                className="section-label"
                                custom={0}
                                initial="hidden"
                                animate="visible"
                                variants={fadeUp}
                            >
                                CODE LICENSE
                            </motion.h2>
                            <div className="code-license-overlay__actions">
                                <a
                                    href={githubLicenseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="code-license-overlay__action-btn"
                                    aria-label="View on GitHub"
                                    title="View on GitHub"
                                >
                                    <ExternalLink size={20} />
                                </a>
                                <button
                                    ref={closeBtnRef}
                                    type="button"
                                    className="code-license-overlay__action-btn"
                                    onClick={closeCodeLicense}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <section className="code-license" id="code-license">
                        <div className="container">
                            <div className="code-license__container">
                                <motion.div
                                    className="code-license__intro"
                                    custom={0}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <span className="code-license__badge">Open Source Software</span>
                                    <h1>MIT License</h1>
                                    <p className="code-license__subtitle">
                                        Source code license for photosbyperkins.com
                                    </p>
                                </motion.div>

                                <motion.div
                                    className="code-license__card"
                                    custom={1}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <pre>{licenseText}</pre>
                                </motion.div>

                                <motion.div
                                    className="code-license__actions"
                                    custom={2}
                                    initial="hidden"
                                    animate="visible"
                                    variants={fadeUp}
                                >
                                    <button
                                        type="button"
                                        className={`code-license__btn ${copied ? 'code-license__btn--copied' : ''}`}
                                        onClick={handleCopy}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? 'Copied to Clipboard' : 'Copy License'}
                                    </button>
                                    <a
                                        href={githubLicenseUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="code-license__btn"
                                    >
                                        <ExternalLink size={16} />
                                        View on GitHub
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
