import React from 'react';
import { GithubIcon, FacebookIcon, InstagramIcon } from '../ui/icons';
import { useAppStore } from '../../store/useAppStore';
import '../../styles/_footer.scss';

export default function Footer() {
    const openAiPolicy = useAppStore((state) => state.openAiPolicy);
    const openCodeLicense = useAppStore((state) => state.openCodeLicense);
    const openPhotoLicense = useAppStore((state) => state.openPhotoLicense);

    const photosLicenseLabel = import.meta.env.VITE_LICENSE_LABEL || 'Photo License';
    const codeLicenseLabel = import.meta.env.VITE_CODE_LICENSE_LABEL || 'Code License';
    const copyrightName =
        import.meta.env.VITE_COPYRIGHT_NAME || import.meta.env.VITE_SITE_APP_TITLE || 'Photos by Perkins';

    return (
        <footer className="footer">
            <div className="container footer__container">
                {/* 1. Copyright */}
                <div className="footer__group footer__group--copy">
                    <span className="footer__copy">
                        © {new Date().getFullYear()} {copyrightName}
                    </span>
                </div>

                <span className="footer__divider footer__divider--first" aria-hidden="true">
                    •
                </span>

                {/* 2. Legal / Policies */}
                <div className="footer__group footer__group--links">
                    <div className="footer__links">
                        <button type="button" onClick={openAiPolicy} className="footer__link footer__ai-policy-btn">
                            AI Policy
                        </button>
                        <span className="footer__link-divider" aria-hidden="true">
                            •
                        </span>
                        <button
                            type="button"
                            onClick={openCodeLicense}
                            className="footer__link footer__code-license-btn"
                        >
                            {codeLicenseLabel}
                        </button>
                        <span className="footer__link-divider" aria-hidden="true">
                            •
                        </span>
                        <button
                            type="button"
                            onClick={openPhotoLicense}
                            className="footer__link footer__license footer__license-btn"
                        >
                            {photosLicenseLabel}
                        </button>
                    </div>
                </div>

                <span className="footer__divider footer__divider--second" aria-hidden="true">
                    •
                </span>

                {/* 3. Social Channels */}
                <div className="footer__group footer__group--socials">
                    <div className="footer__social-row">
                        {import.meta.env.VITE_SOCIAL_GITHUB && (
                            <a
                                href={import.meta.env.VITE_SOCIAL_GITHUB}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer__social"
                                aria-label="GitHub"
                            >
                                <GithubIcon size={18} />
                            </a>
                        )}
                        {import.meta.env.VITE_SOCIAL_FACEBOOK && (
                            <a
                                href={import.meta.env.VITE_SOCIAL_FACEBOOK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer__social"
                                aria-label="Facebook"
                            >
                                <FacebookIcon size={18} />
                            </a>
                        )}
                        {import.meta.env.VITE_SOCIAL_INSTAGRAM && (
                            <a
                                href={import.meta.env.VITE_SOCIAL_INSTAGRAM}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer__social"
                                aria-label="Instagram"
                            >
                                <InstagramIcon size={18} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}
