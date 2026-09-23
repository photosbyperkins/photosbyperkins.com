import { motion } from 'framer-motion';
import { ExternalLink, Copy, Check, Share2, RefreshCw, UserCheck, ShieldCheck, Scale } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import ModalShell from './ModalShell';
import { modalFadeUp } from './modalAnimation';
import '../../styles/_photo-license.scss';

export default function PhotoLicenseModal() {
    const isPhotoLicenseOpen = useAppStore((state) => state.isPhotoLicenseOpen);
    const closePhotoLicense = useAppStore((state) => state.closePhotoLicense);
    const [copied, setCopied] = useState(false);

    const copyrightName = import.meta.env.VITE_COPYRIGHT_NAME || 'Michael Perkins';
    const photosLicenseUrl = import.meta.env.VITE_LICENSE_URL || 'https://creativecommons.org/licenses/by-sa/4.0/';
    const attributionSnippet = `Photo by ${copyrightName} / photosbyperkins.com (CC BY-SA 4.0)`;

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
        <ModalShell
            isOpen={isPhotoLicenseOpen}
            onClose={closePhotoLicense}
            title="PHOTO LICENSE"
            ariaLabel="Photo License"
            className="photo-license-overlay"
            contentClassName="photo-license"
            maxWidth="default"
            externalUrl={photosLicenseUrl}
            externalTitle="View on Creative Commons"
        >
            <div className="photo-license__container">
                <motion.div
                    className="photo-license__intro"
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <h1>CC BY-SA 4.0</h1>
                    <p className="photo-license__subtitle">
                        All photography featured on photosbyperkins.com is openly licensed under the{' '}
                        <strong>Creative Commons Attribution-ShareAlike 4.0 International</strong> license unless
                        otherwise indicated.
                    </p>
                </motion.div>

                <motion.div
                    className="photo-license__grid"
                    custom={1}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
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
                                    Copy and redistribute the material in any medium or format for any purpose,
                                    including commercial uses.
                                </div>
                            </div>
                            <div className="photo-license__item">
                                <RefreshCw size={18} className="photo-license__item-icon" />
                                <div className="photo-license__item-content">
                                    <strong>Adapt &amp; Remix</strong>
                                    Remix, transform, crop, and build upon the material for any purpose, even
                                    commercially.
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
                                    Give appropriate credit, provide a link to the license, and indicate if changes were
                                    made.
                                </div>
                            </div>
                            <div className="photo-license__item">
                                <RefreshCw size={18} className="photo-license__item-icon" />
                                <div className="photo-license__item-content">
                                    <strong>ShareAlike (SA)</strong>
                                    If you remix or build upon the photos, you must distribute your contributions under
                                    the same license.
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Attribution Helper Box with single clear copy button */}
                <motion.div
                    className="photo-license__attribution-card"
                    custom={2}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <h3>Recommended Attribution Credit</h3>
                    <p>
                        When sharing on social media, blogs, websites, or editorial publications, please use the
                        following credit line:
                    </p>
                    <div className="photo-license__snippet-box">
                        <code>{attributionSnippet}</code>
                        <button
                            type="button"
                            className={`photo-license__btn ${copied ? 'photo-license__btn--copied' : ''}`}
                            onClick={handleCopy}
                            aria-label="Copy attribution credit line"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied to Clipboard' : 'Copy Attribution'}
                        </button>
                    </div>
                </motion.div>

                {/* Primary Action */}
                <motion.div
                    className="photo-license__actions"
                    custom={3}
                    initial="hidden"
                    animate="visible"
                    variants={modalFadeUp}
                >
                    <a
                        href={photosLicenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="photo-license__btn photo-license__btn--primary"
                    >
                        <ExternalLink size={16} />
                        View Official Deed on Creative Commons
                    </a>
                </motion.div>
            </div>
        </ModalShell>
    );
}
