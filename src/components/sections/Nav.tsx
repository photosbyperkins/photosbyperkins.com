import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAppStore } from '../../store/useAppStore';
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

    // Track active section and sync to URL
    useEffect(() => {
        const sections = ['hero', 'portfolio', 'about'];
        const observed = new Set<string>();

        const observer = new IntersectionObserver(
            (entries) => {
                // Find all entries that are currently laser-intersecting the centerline
                const visibleEntries = entries.filter((e) => e.isIntersecting);
                if (visibleEntries.length === 0) return;

                // Pick the top visible entry natively (centerline guarantees accuracy)
                const bestEntry = visibleEntries[0];

                let path = bestEntry.target.id === 'hero' ? '/' : `/${bestEntry.target.id}`;
                if (bestEntry.target.id === 'portfolio') {
                    path = lastPortfolioRef.current;
                }
                const currentPath = locationRef.current;

                // Only replace state if route has changed and we are ignoring deep portfolio links
                if (currentPath !== path) {
                    if (bestEntry.target.id === 'portfolio' && currentPath.startsWith('/portfolio/')) {
                        return;
                    }
                    locationRef.current = path; // Optimistic lock
                    navigate(path, { replace: true, state: { preventScroll: true } });
                }
            },
            { rootMargin: '-49% 0px -49% 0px', threshold: 0 }
        );

        const observeSections = () => {
            sections.forEach((id) => {
                if (!observed.has(id)) {
                    const el = document.getElementById(id);
                    if (el) {
                        observer.observe(el);
                        observed.add(id);
                    }
                }
            });
            return observed.size === sections.length;
        };

        let interval: ReturnType<typeof setInterval>;

        if (!observeSections()) {
            interval = setInterval(() => {
                if (observeSections()) clearInterval(interval);
            }, 500);
        }

        return () => {
            if (interval) clearInterval(interval);
            observer.disconnect();
        };
    }, [navigate]);

    return (
        <>
            <div ref={sentinelRef} style={{ height: 0, position: 'absolute', width: '100%' }} aria-hidden="true" />
            <nav className="nav" ref={navRef}>
                <div className="container">
                    <div className="nav__inner">
                        <div className="nav__logo">
                            <img src="/favicon.svg?v=2" alt="" className="nav__logo-icon" />
                            <span className="nav__logo-text">
                                PHOTOS BY <span className="nav__logo-accent">PERKINS</span>
                            </span>
                        </div>

                        <div className="nav__right">
                            <div className="nav__controls">
                                <ThemeToggle variant="nav" />
                                <button
                                    onClick={openAbout}
                                    className="nav__icon-btn"
                                    aria-label="About Me"
                                    title="About Me"
                                >
                                    <Info size={20} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="nav-extension-portal" className="nav__extension-portal" />
                </div>
            </nav>
        </>
    );
}
