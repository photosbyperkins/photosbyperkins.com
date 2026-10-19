import { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './components/sections/Nav';
import Footer from './components/sections/Footer';
import PwaStatusToast from './components/ui/PwaStatusToast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { getBuildNumber } from './utils/build';
import { useAppStore } from './store/useAppStore';
import { useApplyPendingUpdate } from './utils/appUpdate';

const About = lazy(() => import('./components/sections/About'));
let ResolvedPortfolio: React.ComponentType<{ years: string[] }> | null = null;
const portfolioPromise = import('./components/sections/Portfolio').then((m) => {
    ResolvedPortfolio = m.default;
    return m;
});
const LazyPortfolio = lazy(() => portfolioPromise);
const IframeOverlay = lazy(() => import('./components/ui/IframeOverlay'));
const AiPolicyModal = lazy(() => import('./components/ui/AiPolicyModal'));
const CodeLicenseModal = lazy(() => import('./components/ui/CodeLicenseModal'));
const PhotoLicenseModal = lazy(() => import('./components/ui/PhotoLicenseModal'));
const GearModal = lazy(() => import('./components/ui/GearModal'));

function useHasEverBeenTrue(value: boolean): boolean {
    const [hasBeenTrue, setHasBeenTrue] = useState(value);
    if (value && !hasBeenTrue) {
        setHasBeenTrue(true);
    }
    return hasBeenTrue;
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

        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }, 50);
        return () => clearTimeout(timer);
    }, [location]);
    return null;
}

const initialIndexData: IndexData | null =
    typeof window !== 'undefined' && (window as unknown as { __INITIAL_INDEX__?: IndexData }).__INITIAL_INDEX__
        ? (window as unknown as { __INITIAL_INDEX__?: IndexData }).__INITIAL_INDEX__!
        : null;

// eslint-disable-next-line react-refresh/only-export-components
export const appReadyPromise: Promise<unknown> =
    typeof window !== 'undefined' && initialIndexData?.years
        ? Promise.race([
              portfolioPromise.then((m) => m.warmPortfolioRoute?.(initialIndexData.years)),
              new Promise((resolve) => setTimeout(resolve, 180)),
          ]).catch(() => {})
        : Promise.resolve();

export default function App() {
    const location = useLocation();
    const [indexData, setIndexData] = useState<IndexData | null>(initialIndexData);
    const [fetchError, setFetchError] = useState(false);
    const isMountedRef = useRef(true);

    useApplyPendingUpdate();

    const isAboutOpen = useAppStore((state) => state.isAboutOpen);
    const isAiPolicyOpen = useAppStore((state) => state.isAiPolicyOpen);
    const isCodeLicenseOpen = useAppStore((state) => state.isCodeLicenseOpen);
    const isPhotoLicenseOpen = useAppStore((state) => state.isPhotoLicenseOpen);
    const activeGear = useAppStore((state) => state.activeGear);
    const iframeUrl = useAppStore((state) => state.iframeUrl);

    const hasOpenedAbout = useHasEverBeenTrue(isAboutOpen);
    const hasOpenedAiPolicy = useHasEverBeenTrue(isAiPolicyOpen);
    const hasOpenedCodeLicense = useHasEverBeenTrue(isCodeLicenseOpen);
    const hasOpenedPhotoLicense = useHasEverBeenTrue(isPhotoLicenseOpen);
    const hasOpenedGear = useHasEverBeenTrue(Boolean(activeGear));
    const hasOpenedIframe = useHasEverBeenTrue(Boolean(iframeUrl));

    const closeAllModals = useCallback(() => {
        const state = useAppStore.getState();
        state.closeAbout();
        state.closeAiPolicy();
        state.closeCodeLicense();
        state.closePhotoLicense();
        state.closeGearModal();
        state.closeIframe();
    }, []);

    const loadIndex = useCallback(() => {
        if (initialIndexData) return;
        fetch(`/data/index.json?build=${getBuildNumber()}`)
            .then((res) => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then((data: IndexData) => {
                if (data?.years) {
                    portfolioPromise.then((m) => m.warmPortfolioRoute?.(data.years)).catch(() => {});
                }
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
        if (!indexData) {
            loadIndex();
        }
        return () => {
            isMountedRef.current = false;
        };
    }, [indexData, loadIndex]);

    const PortfolioComponent = ResolvedPortfolio ?? LazyPortfolio;

    return (
        <>
            <ScrollToMountTarget />
            <main style={{ minHeight: '100vh' }}>
                <Nav />
                {indexData && (
                    <ErrorBoundary name="Portfolio" variant="section" resetKeys={[location.pathname]}>
                        <Suspense fallback={null}>
                            <PortfolioComponent years={indexData.years} />
                        </Suspense>
                    </ErrorBoundary>
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
            <ErrorBoundary name="AppModals" variant="overlay" onDismiss={closeAllModals}>
                <Suspense fallback={null}>
                    {hasOpenedAbout && <About />}
                    {hasOpenedIframe && <IframeOverlay />}
                    {hasOpenedAiPolicy && <AiPolicyModal />}
                    {hasOpenedCodeLicense && <CodeLicenseModal />}
                    {hasOpenedPhotoLicense && <PhotoLicenseModal />}
                    {hasOpenedGear && <GearModal />}
                </Suspense>
            </ErrorBoundary>
        </>
    );
}
