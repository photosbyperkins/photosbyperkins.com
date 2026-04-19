import { create } from 'zustand';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: ThemePreference;
    activeTheme: 'light' | 'dark'; // The actual resolved theme
    setTheme: (theme: ThemePreference) => void;
}

const THEME_KEY = 'photo-theme-preference';

// Helper to get system preference
const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const getInitialTheme = (): ThemePreference => {
    if (typeof window === 'undefined') return 'system';
    try {
        const saved = localStorage.getItem(THEME_KEY) as ThemePreference;
        if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
        // Ignore restricted access
    }
    return 'system';
};

// Helper to apply theme to DOM
const applyThemeToDOM = (theme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#fafafa');
};

export const useThemeStore = create<ThemeState>((set, get) => {
    const initialTheme = getInitialTheme();
    const resolvedTheme = initialTheme === 'system' ? getSystemTheme() : initialTheme;

    // Initial DOM application (though index.html script handles FOUC, this ensures React syncs)
    applyThemeToDOM(resolvedTheme);

    if (typeof window !== 'undefined') {
        const mql = window.matchMedia('(prefers-color-scheme: light)');
        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            const state = get();
            if (state.theme === 'system') {
                const newSystemTheme = e.matches ? 'light' : 'dark';
                set({ activeTheme: newSystemTheme });
                applyThemeToDOM(newSystemTheme);
            }
        };

        if (mql.addEventListener) {
            mql.addEventListener('change', handleChange);
        } else if (mql.addListener) {
            // Deprecated fallback for older Safari
            mql.addListener(handleChange);
        }
    }

    return {
        theme: initialTheme,
        activeTheme: resolvedTheme,
        setTheme: (newTheme: ThemePreference) => {
            const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
            set({ theme: newTheme, activeTheme: resolved });
            try {
                localStorage.setItem(THEME_KEY, newTheme);
            } catch {
                // Ignore restricted access
            }
            applyThemeToDOM(resolved);
        },
    };
});
