import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './components/sections/Nav';
import Footer from './components/sections/Footer';
import PwaStatusToast from './components/ui/PwaStatusToast';
import { getBuildNumber } from './utils/build';

const About = lazy(() => import('./components/sections/About'));
const Portfolio = lazy(() => import('./components/sections/Portfolio'));
const IframeOverlay = lazy(() => import('./components/ui/IframeOverlay'));
const AiPolicyModal = lazy(() => import('./components/ui/AiPolicyModal'));
const CodeLicenseModal = lazy(() => import('./components/ui/CodeLicenseModal'));
const PhotoLicenseModal = lazy(() => import('./components/ui/PhotoLicenseModal'));
const GearModal = lazy(() => import('./components/ui/GearModal'));

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

        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }, 50);
        return () => clearTimeout(timer);
    }, [location]);
    return null;
}

export default function App() {
    const [indexData, setIndexData] = useState<IndexData | null>(null);
    const [fetchError, setFetchError] = useState(false);
    const isMountedRef = useRef(true);

    const loadIndex = useCallback(() => {
        fetch(`/data/index.json?build=${getBuildNumber()}`)
            .then((res) => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then((data) => {
                if (isMountedRef.current) {
                    setIndexData(data);
                    setFetchError(false);
                }
            })
            .catch((err) => {
                console.error('Failed to load photo index:', err);
                if (isMountedRef.current) setFetchError(true);
            });
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        loadIndex();
        return () => {
            isMountedRef.current = false;
        };
    }, [loadIndex]);

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
                {fetchError && !indexData && (
                    <div className="portfolio__error" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                        <p style={{ marginBottom: '1rem' }}>Unable to load photo portfolio.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setFetchError(false);
                                loadIndex();
                            }}
                            style={{
                                padding: '0.5rem 1.25rem',
                                cursor: 'pointer',
                                background: 'var(--color-accent, #0070f3)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                            }}
                        >
                            Retry
                        </button>
                    </div>
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
