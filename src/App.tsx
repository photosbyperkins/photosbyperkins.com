import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from './components/sections/Nav';
import About from './components/sections/About';
import Portfolio from './components/sections/Portfolio';
import { GithubIcon } from './components/ui/icons';

function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__inner">
                    <div className="footer__copy-group">
                        <span className="footer__copy">
                            © {new Date().getFullYear()}{' '}
                            {import.meta.env.VITE_COPYRIGHT_NAME || import.meta.env.VITE_SITE_APP_TITLE || 'Jane Doe'}
                        </span>
                        <a
                            href={import.meta.env.VITE_LICENSE_URL || 'https://creativecommons.org/licenses/by-sa/4.0/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer__license"
                        >
                            {import.meta.env.VITE_LICENSE_LABEL || 'Photos licensed under CC BY-SA 4.0'}
                        </a>
                    </div>
                    <a
                        href="https://github.com/photosbyperkins/photosbyperkins.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer__github"
                        aria-label="GitHub Repository"
                    >
                        <GithubIcon size={24} />
                    </a>
                </div>
            </div>
        </footer>
    );
}

export interface HeroImageInput {
    src: string;
    focusX?: number;
    focusY?: number;
}

interface IndexData {
    years: string[];
    heroImages: HeroImageInput[];
}

function ScrollToMountTarget() {
    const location = useLocation();

    useEffect(() => {
        const state = location.state as { preventScroll?: boolean } | null;
        if (state?.preventScroll) return;

        setTimeout(() => {
            let targetId = location.pathname.split('/')[1] || 'hero';
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
            .then((res) => res.json())
            .then((data) => setIndexData(data))
            .catch((err) => console.error('Failed to load photo index:', err));
    }, []);

    return (
        <>
            <ScrollToMountTarget />
            <main>
                <Nav />
                {indexData && <Portfolio years={indexData.years} />}
            </main>
            <Footer />
            <About />
        </>
    );
}
