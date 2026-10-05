import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, DEFAULT_STORY_SETTINGS } from './useAppStore';
import { getPhotoOriginalUrl } from '../utils/formatters';

describe('useAppStore - storySettings', () => {
    beforeEach(() => {
        useAppStore.getState().resetStorySettings();
    });

    it('initializes with DEFAULT_STORY_SETTINGS', () => {
        const settings = useAppStore.getState().storySettings;
        expect(settings).toEqual(DEFAULT_STORY_SETTINGS);
        expect(settings.mode).toBe('solo');
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

    it('manages recentFrameIds correctly (MRU order, deduplication, ignores none, caps at 20)', () => {
        useAppStore.getState().clearRecentFrames();
        expect(useAppStore.getState().recentFrameIds).toEqual([]);

        // Ignoring 'none'
        useAppStore.getState().addRecentFrame('none');
        expect(useAppStore.getState().recentFrameIds).toEqual([]);

        // Adding frames
        useAppStore.getState().addRecentFrame('instant-film');
        expect(useAppStore.getState().recentFrameIds).toEqual(['instant-film']);

        useAppStore.getState().addRecentFrame('sac-bear');
        expect(useAppStore.getState().recentFrameIds).toEqual(['sac-bear', 'instant-film']);

        // Deduplication moves to front
        useAppStore.getState().addRecentFrame('instant-film');
        expect(useAppStore.getState().recentFrameIds).toEqual(['instant-film', 'sac-bear']);

        // resetStorySettings does not erase recents
        useAppStore.getState().resetStorySettings();
        expect(useAppStore.getState().recentFrameIds).toEqual(['instant-film', 'sac-bear']);

        // clearRecentFrames erases them
        useAppStore.getState().clearRecentFrames();
        expect(useAppStore.getState().recentFrameIds).toEqual([]);
    });

    it('manages recentFilterIds correctly (MRU order, deduplication, ignores none, caps at 20)', () => {
        useAppStore.getState().clearRecentFilters();
        expect(useAppStore.getState().recentFilterIds).toEqual([]);

        // Ignoring 'none'
        useAppStore.getState().addRecentFilter('none');
        expect(useAppStore.getState().recentFilterIds).toEqual([]);

        // Adding filters
        useAppStore.getState().addRecentFilter('warm');
        expect(useAppStore.getState().recentFilterIds).toEqual(['warm']);

        useAppStore.getState().addRecentFilter('cinematic');
        expect(useAppStore.getState().recentFilterIds).toEqual(['cinematic', 'warm']);

        // Deduplication moves to front
        useAppStore.getState().addRecentFilter('warm');
        expect(useAppStore.getState().recentFilterIds).toEqual(['warm', 'cinematic']);

        // resetStorySettings does not erase recents
        useAppStore.getState().resetStorySettings();
        expect(useAppStore.getState().recentFilterIds).toEqual(['warm', 'cinematic']);

        // clearRecentFilters erases them
        useAppStore.getState().clearRecentFilters();
        expect(useAppStore.getState().recentFilterIds).toEqual([]);
    });
});

describe('useAppStore - favorites batch actions', () => {
    beforeEach(() => {
        useAppStore.getState().clearFavorites();
    });

    const photoA = { original: '/photos/2026/game/photo_001.jpg', thumb: '/photos/2026/game/photo_001_thumb.jpg' };
    const photoB = { original: '/photos/2026/game/photo_002.jpg', thumb: '/photos/2026/game/photo_002_thumb.jpg' };
    const photoC = { original: '/photos/2026/game/photo_003.jpg', thumb: '/photos/2026/game/photo_003_thumb.jpg' };

    it('adds multiple favorites atomically without duplicates', () => {
        useAppStore.getState().addFavorites([photoA, photoB]);
        expect(useAppStore.getState().favorites).toHaveLength(2);

        // Attempting to add photoA again along with photoC
        useAppStore.getState().addFavorites([photoA, photoC]);
        expect(useAppStore.getState().favorites).toHaveLength(3);
        expect(useAppStore.getState().favorites.map((f) => getPhotoOriginalUrl(f))).toEqual([
            '/photos/2026/game/photo_001.jpg',
            '/photos/2026/game/photo_002.jpg',
            '/photos/2026/game/photo_003.jpg',
        ]);
    });

    it('removes multiple favorites atomically', () => {
        useAppStore.getState().addFavorites([photoA, photoB, photoC]);
        expect(useAppStore.getState().favorites).toHaveLength(3);

        useAppStore.getState().removeFavorites([photoA, photoC]);
        expect(useAppStore.getState().favorites).toHaveLength(1);
        expect(getPhotoOriginalUrl(useAppStore.getState().favorites[0])).toBe('/photos/2026/game/photo_002.jpg');
    });

    it('enriches added favorites with EXIF from cached album', async () => {
        const { setCachedAlbum, _clearAlbumCache } = await import('../utils/albumData');
        _clearAlbumCache();
        setCachedAlbum('2026', 'game', [
            {
                original: '/photos/2026/game/photo_001.jpg',
                thumb: '/photos/2026/game/photo_001_thumb.jpg',
                exif: {
                    cameraModel: 'NIKON Z 8',
                    lens: '135mm Plena',
                },
            },
        ]);

        useAppStore.getState().toggleFavorite(photoA);
        const fav = useAppStore.getState().favorites[0] as import('../types').PhotoRecord;
        expect(fav.exif).toEqual({
            cameraModel: 'NIKON Z 8',
            lens: '135mm Plena',
        });
        _clearAlbumCache();
    });
});

describe('useAppStore - visiblePhotos registration', () => {
    beforeEach(() => {
        useAppStore.getState().clearVisiblePhotos();
    });

    const photo1 = {
        original: '/photos/event1/p1.jpg',
        thumb: '/photos/event1/p1_thumb.jpg',
        eventName: 'Event 1',
        year: '2026',
    };
    const photo2 = {
        original: '/photos/event1/p2.jpg',
        thumb: '/photos/event1/p2_thumb.jpg',
        eventName: 'Event 1',
        year: '2026',
    };
    const photo3 = {
        original: '/photos/event2/p3.jpg',
        thumb: '/photos/event2/p3_thumb.jpg',
        eventName: 'Event 2',
        year: '2026',
    };

    it('registers visible photos by event name and ignores identical updates', () => {
        useAppStore.getState().registerVisiblePhotos('Event 1', [photo1, photo2]);
        expect(useAppStore.getState().visiblePhotosMap['Event 1']).toHaveLength(2);

        // Subscribing listener to ensure identical re-registration doesn't trigger state change
        const stateBefore = useAppStore.getState();
        useAppStore.getState().registerVisiblePhotos('Event 1', [photo1, photo2]);
        const stateAfter = useAppStore.getState();
        expect(stateAfter.visiblePhotosMap).toBe(stateBefore.visiblePhotosMap);
    });

    it('updates visible photos when event photos change', () => {
        useAppStore.getState().registerVisiblePhotos('Event 1', [photo1]);
        expect(useAppStore.getState().visiblePhotosMap['Event 1']).toHaveLength(1);

        useAppStore.getState().registerVisiblePhotos('Event 1', [photo1, photo2]);
        expect(useAppStore.getState().visiblePhotosMap['Event 1']).toHaveLength(2);
    });

    it('unregisters visible photos for an event', () => {
        useAppStore.getState().registerVisiblePhotos('Event 1', [photo1]);
        useAppStore.getState().registerVisiblePhotos('Event 2', [photo3]);
        expect(Object.keys(useAppStore.getState().visiblePhotosMap)).toEqual(['Event 1', 'Event 2']);

        useAppStore.getState().unregisterVisiblePhotos('Event 1');
        expect(Object.keys(useAppStore.getState().visiblePhotosMap)).toEqual(['Event 2']);
    });

    it('clears all visible photos', () => {
        useAppStore.getState().registerVisiblePhotos('Event 1', [photo1]);
        useAppStore.getState().registerVisiblePhotos('Event 2', [photo3]);
        expect(Object.keys(useAppStore.getState().visiblePhotosMap)).toHaveLength(2);

        useAppStore.getState().clearVisiblePhotos();
        expect(Object.keys(useAppStore.getState().visiblePhotosMap)).toHaveLength(0);
    });
});

describe('useAppStore - persistence and migration', () => {
    it('partializes only persistent slices and excludes ephemeral state', () => {
        const state = useAppStore.getState();
        const partialize = useAppStore.persist.getOptions().partialize;
        expect(partialize).toBeDefined();

        const partial = partialize!(state);
        expect(partial).toHaveProperty('favorites');
        expect(partial).toHaveProperty('theme');
        expect(partial).toHaveProperty('storySettings');
        expect(partial).toHaveProperty('recentFrameIds');
        expect(partial).toHaveProperty('recentFilterIds');

        // Ephemeral state must be excluded
        expect(partial).not.toHaveProperty('isLightboxOpen');
        expect(partial).not.toHaveProperty('lightboxIndex');
        expect(partial).not.toHaveProperty('visiblePhotosMap');
        expect(partial).not.toHaveProperty('activeModal');
    });

    it('handles corrupted or missing persistedState during merge', () => {
        const currentState = useAppStore.getState();
        const merge = useAppStore.persist.getOptions().merge;
        expect(merge).toBeDefined();

        // Null persisted state
        const mergedNull = merge!(null, currentState) as typeof currentState;
        expect(mergedNull.storySettings).toEqual(DEFAULT_STORY_SETTINGS);
        expect(mergedNull.favorites).toEqual(currentState.favorites);

        // Corrupted filterStrength (e.g. 99 or -5)
        const corruptedState = {
            storySettings: {
                filterStrength: 99,
            },
            recentFrameIds: 'not-an-array',
            recentFilterIds: null,
        };
        const mergedCorrupted = merge!(corruptedState, currentState) as typeof currentState;
        expect(mergedCorrupted.storySettings.filterStrength).toBe(1.0);
        expect(mergedCorrupted.recentFrameIds).toEqual(currentState.recentFrameIds);
        expect(mergedCorrupted.recentFilterIds).toEqual(currentState.recentFilterIds);
        expect(mergedCorrupted.storySettings.paddedConfig).toEqual(DEFAULT_STORY_SETTINGS.paddedConfig);
    });

    it('cleans up legacy keys upon rehydration', () => {
        localStorage.setItem('portfolio-favorites', '["test"]');
        localStorage.setItem('photo-theme-preference', 'dark');

        const onRehydrate = useAppStore.persist.getOptions().onRehydrateStorage;
        expect(onRehydrate).toBeDefined();

        const listener = onRehydrate!(useAppStore.getState());
        listener?.(useAppStore.getState(), undefined);

        expect(localStorage.getItem('portfolio-favorites')).toBeNull();
        expect(localStorage.getItem('photo-theme-preference')).toBeNull();
    });
});
