import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import ThemeToggle from '../ui/ThemeToggle';
import '../../styles/_nav.scss';

export default function Nav() {
    const sentinelRef = React.useRef<HTMLDivElement>(null);
    const navRef = React.useRef<HTMLElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const openAbout = useAppStore((state) => state.openAbout);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (navRef.current) {
                    if (!entry.isIntersecting) {
                        navRef.current.classList.add('is-stuck');
                    } else {
                        navRef.current.classList.remove('is-stuck');
                    }
                }
            },
            { threshold: 0 }
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, []);

    const locationRef = React.useRef(location.pathname);
    const lastPortfolioRef = React.useRef(
        location.pathname.startsWith('/portfolio') ? location.pathname : '/portfolio'
    );

    React.useEffect(() => {
        locationRef.current = location.pathname;
        if (location.pathname.startsWith('/portfolio')) {
            lastPortfolioRef.current = location.pathname;
        }
    }, [location.pathname]);

    const handleSectionChange = React.useCallback(
        (activeId: string) => {
            let path = activeId === 'recap' ? '/' : `/${activeId}`;
            if (activeId === 'portfolio') {
                path = lastPortfolioRef.current;
            }
            const currentPath = locationRef.current;

            // Only replace state if route has changed and we are ignoring deep portfolio links
            if (currentPath !== path) {
                if (activeId === 'portfolio' && currentPath.startsWith('/portfolio/')) {
                    return;
                }
                locationRef.current = path; // Optimistic lock
                navigate(path, { replace: true, state: { preventScroll: true } });
            }
        },
        [navigate]
    );

    useScrollSpy(['recap', 'portfolio', 'about'], handleSectionChange);

    return (
        <>
            <div ref={sentinelRef} style={{ height: 0, position: 'absolute', width: '100%' }} aria-hidden="true" />
            <nav className="nav" ref={navRef}>
                <div className="container">
                    <div className="nav__inner">
                        <button className="nav__logo" onClick={openAbout} aria-label="About Me">
                            <img src="/favicon.svg?v=2" alt="" className="nav__logo-icon" />
                            <span className="nav__logo-text">
                                {import.meta.env.VITE_NAV_LOGO_TEXT || 'JANE'}{' '}
                                <span className="nav__logo-accent">
                                    {import.meta.env.VITE_NAV_LOGO_ACCENT || 'DOE'}
                                </span>
                            </span>
                        </button>

                        <div className="nav__right">
                            <div className="nav__controls">
                                <ThemeToggle variant="nav" />
                            </div>
                        </div>
                    </div>

                    <div id="nav-extension-portal" className="nav__extension-portal" />
                </div>
            </nav>
        </>
    );
}
