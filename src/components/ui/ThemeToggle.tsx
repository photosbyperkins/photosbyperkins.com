import { motion } from 'framer-motion';
import { useState, useEffect, useId } from 'react';
import { useThemeStore } from '../../store/useThemeStore';

interface ThemeToggleProps {
    variant?: 'floating' | 'nav';
}

export default function ThemeToggle({ variant = 'floating' }: ThemeToggleProps) {
    const { activeTheme, setTheme } = useThemeStore();
    const [scrolled, setScrolled] = useState(false);
    const uniqueId = useId();

    useEffect(() => {
        if (variant === 'nav') return;
        const onScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [variant]);

    const toggleTheme = () => {
        setTheme(activeTheme === 'light' ? 'dark' : 'light');
    };

    const isNav = variant === 'nav';
    const baseClass = isNav ? 'theme-toggle-nav' : 'theme-toggle-floating';
    const visibilityClass = isNav ? '' : scrolled ? 'is-visible' : 'is-hidden';

    const isDark = activeTheme === 'dark';
    const size = isNav ? 20 : 22;

    const springConfig = { type: 'spring' as const, stiffness: 150, damping: 15 };

    const maskId = `moon-mask-${uniqueId.replace(/:/g, '')}`;

    return (
        <button
            className={`${baseClass} ${!isDark ? 'is-light' : ''} ${visibilityClass}`.trim()}
            onClick={toggleTheme}
            aria-label="Toggle theme"
        >
            <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{
                    rotate: isDark ? 40 : 90,
                }}
                transition={springConfig}
                style={{ originX: '50%', originY: '50%' }}
            >
                <mask id={maskId}>
                    <rect x="0" y="0" width="100%" height="100%" fill="white" stroke="none" />
                    <motion.circle
                        initial={false}
                        animate={{
                            cx: isDark ? 13.5 : 28,
                            cy: isDark ? 4.5 : -5,
                        }}
                        r="9"
                        fill="black"
                        stroke="black"
                        transition={springConfig}
                    />
                </mask>
                <motion.circle
                    cx="12"
                    cy="12"
                    fill="currentColor"
                    stroke="none"
                    initial={false}
                    animate={{
                        cx: isDark ? 10.5 : 12,
                        cy: isDark ? 10.5 : 12,
                        r: isDark ? 9 : 5,
                    }}
                    transition={springConfig}
                    mask={`url(#${maskId})`}
                />

                <motion.g
                    initial={false}
                    animate={{
                        opacity: isDark ? 0 : 1,
                        scale: isDark ? 0 : 1,
                    }}
                    transition={springConfig}
                    style={{ originX: '12px', originY: '12px' }}
                >
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </motion.g>
            </motion.svg>
        </button>
    );
}
