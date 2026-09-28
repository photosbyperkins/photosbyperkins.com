import type { StateCreator } from 'zustand';
import type { PaddedStyleOptions, StoryPhotoFilterId } from '../../utils/storyCanvas';
import type {
    StoryFrameCategory,
    StoryFrameColorChoice,
    StoryFrameId,
} from '../../components/sections/Portfolio/storyFrames/types';

export interface StorySettings {
    mode: 'crop' | 'padded';
    presetId?: string;
    cropZoom?: number;
    paddedConfig: PaddedStyleOptions;
    filterId: StoryPhotoFilterId;
    filterStrength?: number;
    frameId: StoryFrameId;
    frameCategory: StoryFrameCategory | 'all';
    frameColorChoice: StoryFrameColorChoice;
    frameCustomColor: string;
    badgeTheme: 'dark' | 'light';
    showAttribution: boolean;
    showScoreboard: boolean;
    showScores: boolean;
}

export const DEFAULT_STORY_SETTINGS: StorySettings = {
    mode: 'crop',
    presetId: 'center',
    cropZoom: 1.0,
    paddedConfig: {
        style: 'frosted',
        position: 'center',
        cardScale: 0.92,
        cardCornerRadius: 24,
        customColor: '#0a0a14',
    },
    filterId: 'none',
    filterStrength: 1.0,
    frameId: 'none',
    frameCategory: 'all',
    frameColorChoice: 'signature',
    frameCustomColor: '#ffffff',
    badgeTheme: 'dark',
    showAttribution: true,
    showScoreboard: true,
    showScores: true,
};

export interface StorySlice {
    storySettings: StorySettings;
    setStorySettings: (settings: Partial<StorySettings>) => void;
    resetStorySettings: () => void;
}

export const createStorySlice: StateCreator<StorySlice, [], [], StorySlice> = (set) => ({
    storySettings: DEFAULT_STORY_SETTINGS,
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
            };
            if (settings.filterStrength !== undefined) {
                nextSettings.filterStrength = Math.max(0.1, Math.min(1.0, settings.filterStrength));
            }
            return { storySettings: nextSettings };
        }),
    resetStorySettings: () => set({ storySettings: DEFAULT_STORY_SETTINGS }),
});
