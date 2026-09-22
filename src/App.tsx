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

function Footer() {
    const openAiPolicy = useAppStore((state) => state.openAiPolicy);

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
                            <a
                                href={
                                    import.meta.env.VITE_LICENSE_URL ||
                                    'https://creativecommons.org/licenses/by-sa/4.0/'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="footer__license footer__link"
                            >
                                {import.meta.env.VITE_LICENSE_LABEL || 'Photos licensed under CC BY-SA 4.0'}
                            </a>
                            <span className="footer__link-divider" aria-hidden="true">
                                •
                            </span>
                            <button type="button" onClick={openAiPolicy} className="footer__link footer__ai-policy-btn">
                                AI Policy
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

        setTimeout(() => {
            let targetId = location.pathname.split('/')[1] || 'recap';
            if (location.pathname.startsWith('/portfolio')) targetId = 'portfolio';
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'auto' });
        }, 100);
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
            </Suspense>
        </>
    );
}
