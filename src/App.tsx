import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './components/sections/Nav';
import Footer from './components/sections/Footer';
import PwaStatusToast from './components/ui/PwaStatusToast';

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
