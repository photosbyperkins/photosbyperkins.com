import type { StateCreator } from 'zustand';
import type { PaddedStyleOptions, StoryPhotoFilterId, StoryPhotoFilterTabCategory } from '../../utils/storyCanvas';
import type {
    StoryFrameColorChoice,
    StoryFrameFilterCategory,
    StoryFrameId,
} from '../../components/sections/Portfolio/storyFrames/types';

export type BurstDividerStyle = 'hairline' | 'gutter' | 'filmstrip';

export interface BurstStoryConfig {
    dividerStyle: BurstDividerStyle;
    showTimeStamps: boolean;
    selectedIndices: (number | null)[];
    panOffsets?: { x: number; y: number; zoom?: number }[];
    panelCount?: 2 | 3;
}

export interface StorySettings {
    mode: 'solo' | 'crop' | 'padded' | 'burst';
    presetId?: string;
    cropZoom?: number;
    paddedConfig: PaddedStyleOptions;
    burstConfig: BurstStoryConfig;
    filterId: StoryPhotoFilterId;
    filterStrength?: number;
    filterCategory: StoryPhotoFilterTabCategory;
    frameId: StoryFrameId;
    frameCategory: StoryFrameFilterCategory;
    frameColorChoice: StoryFrameColorChoice;
    frameCustomColor: string;
    badgeTheme: 'dark' | 'light';
    showAttribution: boolean;
    showScoreboard: boolean;
    showScores: boolean;
}

export const DEFAULT_STORY_SETTINGS: StorySettings = {
    mode: 'solo',
    presetId: 'center',
    cropZoom: 1.0,
    paddedConfig: {
        style: 'frosted',
        cardScale: 0.92,
        cardCornerRadius: 24,
        customColor: '#0a0a14',
    },
    burstConfig: {
        dividerStyle: 'hairline',
        showTimeStamps: true,
        selectedIndices: [0, 1, 2],
    },
    filterId: 'none',
    filterStrength: 1.0,
    filterCategory: 'all',
    frameId: 'none',
    frameCategory: 'all',
    frameColorChoice: 'signature',
    frameCustomColor: '#ffffff',
    badgeTheme: 'dark',
    showAttribution: true,
    showScoreboard: true,
    showScores: true,
};

export const RECENT_FRAMES_STORAGE_KEY = 'story-recent-frames';
export const RECENT_FILTERS_STORAGE_KEY = 'story-recent-filters';

export const extractRecentFrames = (): StoryFrameId[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(RECENT_FRAMES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch {
        // ignore
    }
    return [];
};

export const extractRecentFilters = (): StoryPhotoFilterId[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(RECENT_FILTERS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch {
        // ignore
    }
    return [];
};

export interface StorySlice {
    storySettings: StorySettings;
    recentFrameIds: StoryFrameId[];
    recentFilterIds: StoryPhotoFilterId[];
    setStorySettings: (settings: Partial<StorySettings>) => void;
    resetStorySettings: () => void;
    addRecentFrame: (frameId: StoryFrameId) => void;
    clearRecentFrames: () => void;
    addRecentFilter: (filterId: StoryPhotoFilterId) => void;
    clearRecentFilters: () => void;
}

export const createStorySlice: StateCreator<StorySlice, [], [], StorySlice> = (set) => ({
    storySettings: DEFAULT_STORY_SETTINGS,
    recentFrameIds: extractRecentFrames(),
    recentFilterIds: extractRecentFilters(),
    setStorySettings: (settings) =>
        set((state) => {
            const nextSettings = {
                ...state.storySettings,
                ...settings,
                ...(settings.paddedConfig
                    ? {
                          paddedConfig: {
                              ...state.storySettings.paddedConfig,
                              ...settings.paddedConfig,
                          },
                      }
                    : {}),
                ...(settings.burstConfig
                    ? {
                          burstConfig: {
                              ...state.storySettings.burstConfig,
                              ...settings.burstConfig,
                          },
                      }
                    : {}),
            };
            if (settings.filterStrength !== undefined) {
                nextSettings.filterStrength = Math.max(0.1, Math.min(1.0, settings.filterStrength));
            }
            return { storySettings: nextSettings };
        }),
    resetStorySettings: () => set({ storySettings: DEFAULT_STORY_SETTINGS }),
    addRecentFrame: (frameId: StoryFrameId) => {
        if (!frameId || frameId === 'none') return;
        set((state) => {
            const filtered = (state.recentFrameIds || []).filter((id) => id !== frameId);
            const next = [frameId, ...filtered].slice(0, 20);
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(RECENT_FRAMES_STORAGE_KEY, JSON.stringify(next));
                } catch {
                    // ignore
                }
            }
            return { recentFrameIds: next };
        });
    },
    clearRecentFrames: () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(RECENT_FRAMES_STORAGE_KEY);
            } catch {
                // ignore
            }
        }
        set({ recentFrameIds: [] });
    },
    addRecentFilter: (filterId: StoryPhotoFilterId) => {
        if (!filterId || filterId === 'none') return;
        set((state) => {
            const filtered = (state.recentFilterIds || []).filter((id) => id !== filterId);
            const next = [filterId, ...filtered].slice(0, 20);
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(RECENT_FILTERS_STORAGE_KEY, JSON.stringify(next));
                } catch {
                    // ignore
                }
            }
            return { recentFilterIds: next };
        });
    },
    clearRecentFilters: () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(RECENT_FILTERS_STORAGE_KEY);
            } catch {
                // ignore
            }
        }
        set({ recentFilterIds: [] });
    },
});
