import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './components/sections/Nav';
import PwaStatusToast from './components/ui/PwaStatusToast';
import { GithubIcon, FacebookIcon, InstagramIcon } from './components/ui/icons';
import { useAppStore } from './store/useAppStore';

const About = lazy(() => import('./components/sections/About'));
const Portfolio = lazy(() => import('./components/sections/Portfolio'));
const IframeOverlay = lazy(() => import('./components/ui/IframeOverlay'));
const AiPolicyModal = lazy(() => import('./components/ui/AiPolicyModal'));
const CodeLicenseModal = lazy(() => import('./components/ui/CodeLicenseModal'));
const PhotoLicenseModal = lazy(() => import('./components/ui/PhotoLicenseModal'));
const GearModal = lazy(() => import('./components/ui/GearModal'));

function Footer() {
    const openAiPolicy = useAppStore((state) => state.openAiPolicy);
    const openCodeLicense = useAppStore((state) => state.openCodeLicense);
    const openPhotoLicense = useAppStore((state) => state.openPhotoLicense);

    const photosLicenseLabel = import.meta.env.VITE_LICENSE_LABEL || 'Photo License';
    const codeLicenseLabel = import.meta.env.VITE_CODE_LICENSE_LABEL || 'Code License';

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__inner">
                    <div className="footer__copy-group">
                        <div className="footer__icon-row">
                            {import.meta.env.VITE_SOCIAL_GITHUB && (
                                <a
                                    href={import.meta.env.VITE_SOCIAL_GITHUB}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer__social"
                                    aria-label="GitHub"
                                >
                                    <GithubIcon size={20} />
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
                                    <FacebookIcon size={20} />
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
                                    <InstagramIcon size={20} />
                                </a>
                            )}
                        </div>
                        <span className="footer__copy">
                            © {new Date().getFullYear()}{' '}
                            {import.meta.env.VITE_COPYRIGHT_NAME || import.meta.env.VITE_SITE_APP_TITLE || 'Jane Doe'}
                        </span>
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
                </div>
            </div>
        </footer>
    );
}

interface IndexData {
    years: string[];
}

function ScrollToMountTarget() {
    const location = useLocation();

    useEffect(() => {
        const state = location.state as { preventScroll?: boolean } | null;
        if (state?.preventScroll) return;

        // If the route specifies a direct event (e.g. /portfolio/:year/:event or with :photo),
        // let the event component handle scrolling to avoid competing with fallback #portfolio
        const segments = location.pathname.split('/').filter(Boolean);
        if (segments[0] === 'portfolio' && segments.length >= 3 && segments[1] !== 'team' && segments[1] !== 'gear') {
            return;
        }

        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }, 50);
    }, [location]);
    return null;
}

export default function App() {
    const [indexData, setIndexData] = useState<IndexData | null>(null);

    useEffect(() => {
        fetch(`/data/index.json?build=${__BUILD_NUMBER__}`)
            .then((res) => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then((data) => setIndexData(data))
            .catch((err) => console.error('Failed to load photo index:', err));
    }, []);

    return (
        <>
            <ScrollToMountTarget />
            <main>
                <Nav />
                {indexData && (
                    <Suspense fallback={null}>
                        <Portfolio years={indexData.years} />
                    </Suspense>
                )}
            </main>
            <Footer />
            <PwaStatusToast />
            <Suspense fallback={null}>
                <About />
                <IframeOverlay />
                <AiPolicyModal />
                <CodeLicenseModal />
                <PhotoLicenseModal />
                <GearModal />
            </Suspense>
        </>
    );
}
