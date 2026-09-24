import { motion } from 'framer-motion';
import { Copy, Check, Scale, ShieldCheck, Share2, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ModalShell from './ModalShell';
import { modalFadeUp } from './modalAnimation';
import '../../styles/_code-license.scss';

export default function CodeLicenseModal() {
    const isCodeLicenseOpen = useAppStore((state) => state.isCodeLicenseOpen);
    const closeCodeLicense = useAppStore((state) => state.closeCodeLicense);
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
        <ModalShell
            isOpen={isCodeLicenseOpen}
            onClose={closeCodeLicense}
            title="CODE LICENSE"
            ariaLabel="Code License"
            className="code-license-overlay"
            contentClassName="code-license"
            maxWidth="default"
            externalUrl={githubLicenseUrl}
            externalTitle="View on GitHub"
        >
            <div className="code-license__container">
                <motion.div
                    className="code-license__intro"
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <p className="code-license__subtitle">
                        All source code powering photosbyperkins.com is openly licensed under the{' '}
                        <strong>MIT License</strong>.
                    </p>
                </motion.div>

                <motion.div
                    className="code-license__grid"
                    custom={1}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    {/* Permissions Card */}
                    <div className="code-license__card">
                        <div className="code-license__card-header">
                            <Scale size={18} />
                            <h3>You are free to:</h3>
                        </div>
                        <div className="code-license__items">
                            <div className="code-license__item">
                                <Share2 size={18} className="code-license__item-icon" />
                                <div className="code-license__item-content">
                                    <strong>Commercial &amp; Private Use</strong>
                                    Use, run, copy, merge, publish, and sell the software for any personal or commercial
                                    project.
                                </div>
                            </div>
                            <div className="code-license__item">
                                <RefreshCw size={18} className="code-license__item-icon" />
                                <div className="code-license__item-content">
                                    <strong>Modify &amp; Sublicense</strong>
                                    Modify, adapt, and transform the codebase, and distribute work under your own terms.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conditions Card */}
                    <div className="code-license__card">
                        <div className="code-license__card-header">
                            <ShieldCheck size={18} />
                            <h3>Under these terms:</h3>
                        </div>
                        <div className="code-license__items">
                            <div className="code-license__item">
                                <UserCheck size={18} className="code-license__item-icon" />
                                <div className="code-license__item-content">
                                    <strong>License &amp; Copyright Notice</strong>
                                    Include the original copyright and permission notice in all copies or substantial
                                    portions.
                                </div>
                            </div>
                            <div className="code-license__item">
                                <ShieldAlert size={18} className="code-license__item-icon" />
                                <div className="code-license__item-content">
                                    <strong>No Warranty (As-Is)</strong>
                                    The software is provided "as is" without warranty, and the author cannot be held
                                    liable.
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Full License Text Card with single clear copy button */}
                <motion.div
                    className="code-license__raw-card"
                    custom={2}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <div className="code-license__raw-header">
                        <h3>Full License Text</h3>
                        <button
                            type="button"
                            className={`code-license__btn ${copied ? 'code-license__btn--copied' : ''}`}
                            onClick={handleCopy}
                            aria-label="Copy full MIT license text"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied to Clipboard' : 'Copy License'}
                        </button>
                    </div>
                    <pre>{licenseText}</pre>
                </motion.div>
            </div>
        </ModalShell>
    );
}
