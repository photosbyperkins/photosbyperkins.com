import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createModalSlice, type ModalSlice } from './slices/modalSlice';
import { createThemeSlice, type ThemeSlice, getSystemTheme, applyThemeToDOM } from './slices/themeSlice';
import { createPortfolioSlice, type PortfolioSlice } from './slices/portfolioSlice';
import { createStorySlice, type StorySlice, DEFAULT_STORY_SETTINGS } from './slices/storySlice';

export type { ThemePreference } from './slices/themeSlice';
export type { StorySettings } from './slices/storySlice';
export { DEFAULT_STORY_SETTINGS } from './slices/storySlice';

export type AppStore = ModalSlice & ThemeSlice & PortfolioSlice & StorySlice;

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
        (...a) => ({
            ...createModalSlice(...a),
            ...createThemeSlice(...a),
            ...createPortfolioSlice(...a),
            ...createStorySlice(...a),
        }),
        {
            name: 'photo-app-store',
            storage: createJSONStorage(() => {
                if (typeof window !== 'undefined' && window.localStorage) {
                    return window.localStorage;
                }
                const memoryStorage: Record<string, string> = {};
                return {
                    getItem: (name: string) => memoryStorage[name] ?? null,
                    setItem: (name: string, value: string) => {
                        memoryStorage[name] = value;
                    },
                    removeItem: (name: string) => {
                        delete memoryStorage[name];
                    },
                };
            }),
            partialize: (state) => ({
                favorites: state.favorites,
                theme: state.theme,
                storySettings: state.storySettings,
                recentFrameIds: state.recentFrameIds,
                recentFilterIds: state.recentFilterIds,
            }),
            merge: (persistedState, currentState) => {
                const persisted = (persistedState as Partial<AppStore>) || {};
                const persistedFilterStrength = persisted.storySettings?.filterStrength;
                return {
                    ...currentState,
                    ...persisted,
                    recentFrameIds: Array.isArray(persisted.recentFrameIds) && persisted.recentFrameIds.length > 0
                        ? persisted.recentFrameIds
                        : currentState.recentFrameIds,
                    recentFilterIds: Array.isArray(persisted.recentFilterIds) && persisted.recentFilterIds.length > 0
                        ? persisted.recentFilterIds
                        : currentState.recentFilterIds,
                    storySettings: {
                        ...DEFAULT_STORY_SETTINGS,
                        ...(persisted.storySettings || {}),
                        ...(persistedFilterStrength !== undefined
                            ? { filterStrength: Math.max(0.1, Math.min(1.0, persistedFilterStrength)) }
                            : {}),
                        paddedConfig: {
                            ...DEFAULT_STORY_SETTINGS.paddedConfig,
                            ...(persisted.storySettings?.paddedConfig || {}),
                        },
                    },
                };
            },
            onRehydrateStorage: () => (state) => {
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
