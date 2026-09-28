import type { StateCreator } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeSlice {
    theme: ThemePreference;
    activeTheme: 'light' | 'dark';
    setTheme: (theme: ThemePreference) => void;
}

export const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const applyThemeToDOM = (theme: 'light' | 'dark') => {
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

export const extractLegacyTheme = (): ThemePreference => {
    if (typeof window === 'undefined') return 'system';
    try {
        const raw = localStorage.getItem('photo-theme-preference');
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
            return raw as ThemePreference;
        }
    } catch {
        // ignore
    }
    return 'system';
};

export const createThemeSlice: StateCreator<ThemeSlice, [], [], ThemeSlice> = (set) => ({
    theme: extractLegacyTheme(),
    activeTheme: extractLegacyTheme() === 'system' ? getSystemTheme() : (extractLegacyTheme() as 'light' | 'dark'),
    setTheme: (newTheme: ThemePreference) => {
        const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
        set({ theme: newTheme, activeTheme: resolved });
        applyThemeToDOM(resolved);
    },
});
