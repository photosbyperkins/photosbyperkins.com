import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, DEFAULT_STORY_SETTINGS } from './useAppStore';

describe('useAppStore - storySettings', () => {
    beforeEach(() => {
        useAppStore.getState().resetStorySettings();
    });

    it('initializes with DEFAULT_STORY_SETTINGS', () => {
        const settings = useAppStore.getState().storySettings;
        expect(settings).toEqual(DEFAULT_STORY_SETTINGS);
        expect(settings.mode).toBe('crop');
        expect(settings.badgeTheme).toBe('dark');
        expect(settings.filterStrength).toBe(1.0);
        expect(settings.showScoreboard).toBe(true);
        expect(settings.showAttribution).toBe(true);
    });

    it('updates storySettings partially without losing other settings', () => {
        useAppStore.getState().setStorySettings({
            mode: 'padded',
            badgeTheme: 'light',
            filterId: 'warm',
            filterStrength: 0.75,
            frameId: 'instant-film',
            showScores: false,
        });

        const updated = useAppStore.getState().storySettings;
        expect(updated.mode).toBe('padded');
        expect(updated.badgeTheme).toBe('light');
        expect(updated.filterId).toBe('warm');
        expect(updated.filterStrength).toBe(0.75);
        expect(updated.frameId).toBe('instant-film');
        expect(updated.showScores).toBe(false);
        // Untouched settings remain preserved
        expect(updated.showAttribution).toBe(true);
        expect(updated.paddedConfig.style).toBe('frosted');
    });

    it('updates nested paddedConfig correctly', () => {
        useAppStore.getState().setStorySettings({
            paddedConfig: {
                style: 'solid',
                position: 'elevated',
                cardScale: 0.85,
                cardCornerRadius: 20,
                customColor: '#1e293b',
            },
        });

        const updated = useAppStore.getState().storySettings;
        expect(updated.paddedConfig.style).toBe('solid');
        expect(updated.paddedConfig.position).toBe('elevated');
        expect(updated.paddedConfig.cardScale).toBe(0.85);
        expect(updated.paddedConfig.cardCornerRadius).toBe(20);
        expect(updated.paddedConfig.customColor).toBe('#1e293b');
    });

    it('clamps filterStrength to range [0.1, 1.0]', () => {
        useAppStore.getState().setStorySettings({ filterStrength: 0 });
        expect(useAppStore.getState().storySettings.filterStrength).toBe(0.1);

        useAppStore.getState().setStorySettings({ filterStrength: 0.05 });
        expect(useAppStore.getState().storySettings.filterStrength).toBe(0.1);

        useAppStore.getState().setStorySettings({ filterStrength: 1.2 });
        expect(useAppStore.getState().storySettings.filterStrength).toBe(1.0);

        useAppStore.getState().setStorySettings({ filterStrength: 0.45 });
        expect(useAppStore.getState().storySettings.filterStrength).toBe(0.45);
    });

    it('resets storySettings to defaults', () => {
        useAppStore.getState().setStorySettings({
            mode: 'padded',
            badgeTheme: 'light',
            filterId: 'noir',
            filterStrength: 0.4,
            showScoreboard: false,
        });

        expect(useAppStore.getState().storySettings.mode).toBe('padded');

        useAppStore.getState().resetStorySettings();

        expect(useAppStore.getState().storySettings).toEqual(DEFAULT_STORY_SETTINGS);
    });
});
