import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPhotoOriginalUrl } from '../utils/formatters';
import type { PhotoInput, FavoriteStoreItem } from '../types';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface AppStore {
    // App Slice
    isAboutOpen: boolean;
    openAbout: () => void;
    closeAbout: () => void;

    // Theme Slice
    theme: ThemePreference;
    activeTheme: 'light' | 'dark';
    setTheme: (theme: ThemePreference) => void;

    // Portfolio Slice
    lightbox: {
        images: PhotoInput[];
        index: number;
        eventName: string;
        year: string;
        isOpen: boolean;
        maxExifChars?: number;
    };
    sharedPhoto: { eventName: string; photoIndex?: number } | null;
    favorites: FavoriteStoreItem[];

    openLightbox: (images: PhotoInput[], index: number, eventName: string, year: string, maxExifChars?: number) => void;
    closeLightbox: () => void;
    setLightboxIndex: (index: number) => void;
    setSharedPhoto: (sharedPhoto: { eventName: string; photoIndex?: number } | null) => void;
    toggleFavorite: (item: FavoriteStoreItem) => void;
    clearFavorites: () => void;
}

// Helper to get system preference
const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
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

// Extract legacy favorites during initialization
const extractLegacyFavorites = (): FavoriteStoreItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('portfolio-favorites');
        if (raw) {
            const parsed = JSON.parse(raw);
            const favs = parsed?.state?.favorites;
            if (Array.isArray(favs) && favs.length > 0) {
                return favs;
            }
        }
    } catch {
        // ignore
    }
    return [];
};

// Extract legacy theme
const extractLegacyTheme = (): ThemePreference => {
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

const clearLegacyKeys = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('portfolio-favorites');
        localStorage.removeItem('photo-theme-preference');
    } catch {
        // ignore
    }
};

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            // --- APP SLICE ---
            isAboutOpen: false,
            openAbout: () => set({ isAboutOpen: true }),
            closeAbout: () => set({ isAboutOpen: false }),

            // --- THEME SLICE ---
            // Fallback to legacy theme if it exists during first init
            theme: extractLegacyTheme(),
            activeTheme:
                extractLegacyTheme() === 'system' ? getSystemTheme() : (extractLegacyTheme() as 'light' | 'dark'),
            setTheme: (newTheme: ThemePreference) => {
                const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
                set({ theme: newTheme, activeTheme: resolved });
                applyThemeToDOM(resolved);
            },

            // --- PORTFOLIO SLICE ---
            lightbox: {
                images: [],
                index: 0,
                eventName: '',
                year: '',
                isOpen: false,
            },
            sharedPhoto: null,
            // Fallback to legacy favorites on first init
            favorites: extractLegacyFavorites(),

            openLightbox: (images, index, eventName, year, maxExifChars) =>
                set({ lightbox: { images, index, eventName, year, isOpen: true, maxExifChars } }),

            closeLightbox: () => set((state) => ({ lightbox: { ...state.lightbox, isOpen: false } })),

            setLightboxIndex: (index) => set((state) => ({ lightbox: { ...state.lightbox, index } })),

            setSharedPhoto: (sharedPhoto) => set({ sharedPhoto }),

            toggleFavorite: (item) =>
                set((state) => {
                    const photoOriginal = getPhotoOriginalUrl(item);
                    const isFav = state.favorites.some((f) => getPhotoOriginalUrl(f) === photoOriginal);

                    if (isFav) {
                        return {
                            favorites: state.favorites.filter((f) => getPhotoOriginalUrl(f) !== photoOriginal),
                        };
                    } else {
                        return { favorites: [...state.favorites, item] };
                    }
                }),

            clearFavorites: () => set({ favorites: [] }),
        }),
        {
            name: 'photo-app-store',
            partialize: (state) => ({
                favorites: state.favorites,
                theme: state.theme,
            }),
            onRehydrateStorage: () => (state) => {
                // Remove legacy keys now that we've hydrated or captured them
                clearLegacyKeys();

                if (state) {
                    const resolvedTheme = state.theme === 'system' ? getSystemTheme() : state.theme;
                    state.activeTheme = resolvedTheme;
                    applyThemeToDOM(resolvedTheme);
                }
            },
        }
    )
);

// Listen to system theme changes globally
if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    mql.addEventListener('change', (e) => {
        const state = useAppStore.getState();
        if (state.theme === 'system') {
            const newSystemTheme = e.matches ? 'light' : 'dark';
            useAppStore.setState({ activeTheme: newSystemTheme });
            applyThemeToDOM(newSystemTheme);
        }
    });
}
