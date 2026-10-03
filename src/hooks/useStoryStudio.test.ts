import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryStudio } from './useStoryStudio';
import { useAppStore } from '../store/useAppStore';
import type { PhotoRecord } from '../types';

describe('useStoryStudio', () => {
    const mockOnClose = vi.fn();

    const samplePhoto: PhotoRecord = {
        original: '/photos/match.jpg',
        thumb: '/photos/match_thumb.jpg',
        focusX: 0.5,
        focusY: 0.5,
    };

    const defaultProps = {
        photoObj: samplePhoto,
        naturalDimensions: { width: 1920, height: 1080 },
        eventInfo: {
            title: 'Championship Match',
            date: '10.22',
            teams: ['Sacramento Roller Derby', 'Bay Area Derby'],
        },
        originalSrc: '/photos/match.jpg',
        localScore: { team1Score: 150, team2Score: 120 },
        loadedImage: null,
        year: '2024',
        canShare: true,
        onClose: mockOnClose,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.getState().resetStorySettings();
    });

    it('initializes with default layout tab and preset matching photo', () => {
        const { result } = renderHook(() => useStoryStudio(defaultProps));

        expect(result.current.activeStudioTab).toBe('layout');
        expect(result.current.activeMode).toBe('crop');
        expect(result.current.selectedPresetId).toBeDefined();
        expect(result.current.activeFilterId).toBe('none');
        expect(result.current.activeFrameId).toBe('none');
    });

    it('switches preset and updates crop geometry upon handleSelectPreset', () => {
        const { result } = renderHook(() => useStoryStudio(defaultProps));

        const altPreset = result.current.presets.find((p) => p.id !== result.current.selectedPresetId);
        expect(altPreset).toBeDefined();

        act(() => {
            result.current.handleSelectPreset(altPreset!);
        });

        expect(result.current.selectedPresetId).toBe(altPreset!.id);
        expect(result.current.activeMode).toBe(altPreset!.mode);
        expect(result.current.activeCrop).toEqual(altPreset!.crop);
    });

    it('updates crop to custom upon handleCropChange', () => {
        const { result } = renderHook(() => useStoryStudio(defaultProps));

        act(() => {
            result.current.handleCropChange({
                x: 0.1,
                y: 0.1,
                width: 0.5,
                height: 0.8,
                zoom: 1.5,
                centerX: 0.35,
                centerY: 0.5,
            });
        });

        expect(result.current.selectedPresetId).toBe('custom');
        expect(result.current.activeCrop.zoom).toBe(1.5);
    });

    it('resolves effective frame colors properly based on choice', () => {
        const { result } = renderHook(() => useStoryStudio(defaultProps));

        expect(result.current.effectiveFrameColor).toBeUndefined(); // signature

        act(() => {
            result.current.setFrameColorChoice('white');
        });
        expect(result.current.effectiveFrameColor).toBe('#ffffff');

        act(() => {
            result.current.setFrameColorChoice('gold');
        });
        expect(result.current.effectiveFrameColor).toBe('#f59e0b');

        act(() => {
            result.current.setFrameColorChoice('red');
        });
        expect(result.current.effectiveFrameColor).toBe('#e60000');

        act(() => {
            result.current.setFrameColorChoice('custom');
            result.current.setFrameCustomColor('#123456');
        });
        expect(result.current.effectiveFrameColor).toBe('#123456');
    });

    it('resets all studio parameters to defaults upon resetToDefaults', () => {
        const { result } = renderHook(() => useStoryStudio(defaultProps));

        act(() => {
            result.current.setActiveStudioTab('frames');
            result.current.setActiveFilterId('vivid');
            result.current.setActiveFrameId('derby-quads');
        });

        expect(result.current.activeStudioTab).toBe('frames');
        expect(result.current.activeFilterId).toBe('vivid');
        expect(result.current.activeFrameId).toBe('derby-quads');
        expect(result.current.isDefaultConfig).toBe(false);

        act(() => {
            result.current.resetToDefaults();
        });

        expect(result.current.activeStudioTab).toBe('layout');
        expect(result.current.activeFilterId).toBe('none');
        expect(result.current.activeFrameId).toBe('none');
        expect(result.current.isDefaultConfig).toBe(true);
    });

    describe('burst mode', () => {
        const sampleBurstPhoto: PhotoRecord = {
            original: '/photos/match_burst_2.jpg',
            thumb: '/photos/match_burst_2_thumb.jpg',
            focusX: 0.5,
            focusY: 0.45,
            burst: {
                id: 'burst_event_1',
                index: 1,
                total: 4,
                deltaSec: 0.84,
                frameSources: [
                    '/photos/match_burst_1.jpg',
                    '/photos/match_burst_2.jpg',
                    '/photos/match_burst_3.jpg',
                    '/photos/match_burst_4.jpg',
                ],
                frameThumbs: [
                    '/photos/match_burst_1_thumb.jpg',
                    '/photos/match_burst_2_thumb.jpg',
                    '/photos/match_burst_3_thumb.jpg',
                    '/photos/match_burst_4_thumb.jpg',
                ],
                frameDeltas: [0.0, 0.42, 0.84, 1.26],
            },
        };

        const burstProps = {
            ...defaultProps,
            photoObj: sampleBurstPhoto,
            originalSrc: sampleBurstPhoto.original,
        };

        it('automatically defaults activeMode to burst for photos with burst metadata', () => {
            const { result } = renderHook(() => useStoryStudio(burstProps));

            expect(result.current.activeMode).toBe('burst');
            expect(result.current.burstDividerStyle).toBe('hairline');
            expect(result.current.burstShowTimeStamps).toBe(true);
            // Index 1 with total 4 should center around frame 1 -> [0, 1, 2]
            expect(result.current.burstSelectedIndices).toEqual([0, 1, 2]);
            expect(result.current.currentConfig.burst?.dividerStyle).toBe('hairline');
            expect(result.current.currentConfig.burst?.showTimeStamps).toBe(true);
            expect(result.current.isDefaultConfig).toBe(true);
        });

        it('toggles burstDividerStyle and burstShowTimeStamps and updates currentConfig', () => {
            const { result } = renderHook(() => useStoryStudio(burstProps));

            act(() => {
                result.current.setBurstDividerStyle('filmstrip');
                result.current.setBurstShowTimeStamps(false);
            });

            expect(result.current.burstDividerStyle).toBe('filmstrip');
            expect(result.current.burstShowTimeStamps).toBe(false);
            expect(result.current.currentConfig.burst?.dividerStyle).toBe('filmstrip');
            expect(result.current.currentConfig.burst?.showTimeStamps).toBe(false);
            expect(result.current.isDefaultConfig).toBe(false);
        });

        it('shifts selected indices and recomputes relative timestamps', () => {
            const { result } = renderHook(() => useStoryStudio(burstProps));

            // Select frames [1, 2, 3] (deltas: [0.42, 0.84, 1.26])
            act(() => {
                result.current.setBurstSelectedIndices([1, 2, 3]);
            });

            expect(result.current.burstSelectedIndices).toEqual([1, 2, 3]);
            // Relative to base frame 1 (0.42s): [0.0, 0.42, 0.84]
            expect(result.current.currentConfig.burst?.timeStamps).toEqual([0.0, 0.42, 0.84]);
        });

        it('restores burst defaults when resetting to defaults on a burst photo', () => {
            const { result } = renderHook(() => useStoryStudio(burstProps));

            act(() => {
                result.current.setBurstDividerStyle('gutter');
                result.current.setBurstShowTimeStamps(false);
                result.current.setBurstSelectedIndices([1, 2, 3]);
                result.current.setActiveFilterId('vivid');
            });

            expect(result.current.burstDividerStyle).toBe('gutter');
            expect(result.current.isDefaultConfig).toBe(false);

            act(() => {
                result.current.resetToDefaults();
            });

            expect(result.current.activeMode).toBe('burst');
            expect(result.current.burstDividerStyle).toBe('hairline');
            expect(result.current.burstShowTimeStamps).toBe(true);
            expect(result.current.burstSelectedIndices).toEqual([0, 1, 2]);
            expect(result.current.activeFilterId).toBe('none');
            expect(result.current.isDefaultConfig).toBe(true);
        });

        it('manages burstPanOffsets and resets them to defaults derived from photo aspect ratio', () => {
            const { result } = renderHook(() => useStoryStudio(burstProps));

            // Default for 16:9 photo (1920x1080) derives to 1.17
            expect(result.current.burstPanOffsets).toEqual([
                { x: 0.5, y: 0.45, zoom: 1.17 },
                { x: 0.5, y: 0.45, zoom: 1.17 },
                { x: 0.5, y: 0.45, zoom: 1.17 },
            ]);
            expect(result.current.isDefaultConfig).toBe(true);

            act(() => {
                result.current.handleBurstPanChange(1, { x: 0.8, y: 0.2, zoom: 1.5 });
            });

            expect(result.current.burstPanOffsets[1]).toEqual({ x: 0.8, y: 0.2, zoom: 1.5 });
            expect(result.current.currentConfig.burst?.panOffsets?.[1]).toEqual({ x: 0.8, y: 0.2, zoom: 1.5 });
            expect(result.current.isDefaultConfig).toBe(false);

            act(() => {
                result.current.resetToDefaults();
            });

            expect(result.current.burstPanOffsets).toEqual([
                { x: 0.5, y: 0.45, zoom: 1.17 },
                { x: 0.5, y: 0.45, zoom: 1.17 },
                { x: 0.5, y: 0.45, zoom: 1.17 },
            ]);
            expect(result.current.isDefaultConfig).toBe(true);
        });

        it('derives precisely 1.25 default zoom for standard 3:2 DSLR/mirrorless burst photos', () => {
            const dslrBurstProps = {
                ...burstProps,
                naturalDimensions: { width: 3000, height: 2000 },
            };
            const { result } = renderHook(() => useStoryStudio(dslrBurstProps));

            expect(result.current.burstPanOffsets).toEqual([
                { x: 0.5, y: 0.45, zoom: 1.25 },
                { x: 0.5, y: 0.45, zoom: 1.25 },
                { x: 0.5, y: 0.45, zoom: 1.25 },
            ]);
            expect(result.current.isDefaultConfig).toBe(true);
        });

        it('initializes Duet mode with 2 panels when burst.total === 2', () => {
            const duetPhoto: PhotoRecord = {
                original: '/photos/match_duet_1.jpg',
                thumb: '/photos/match_duet_1_thumb.jpg',
                focusX: 0.5,
                focusY: 0.45,
                burst: {
                    id: 'burst_duet_1',
                    index: 0,
                    total: 2,
                    isDuet: true,
                    deltaSec: 0.42,
                    frameSources: ['/photos/match_duet_1.jpg', '/photos/match_duet_2.jpg'],
                    frameThumbs: ['/photos/match_duet_1_thumb.jpg', '/photos/match_duet_2_thumb.jpg'],
                    frameDeltas: [0.0, 0.42],
                },
            };

            const duetProps = {
                ...defaultProps,
                photoObj: duetPhoto,
                originalSrc: duetPhoto.original,
            };

            const { result } = renderHook(() => useStoryStudio(duetProps));

            expect(result.current.activeMode).toBe('burst');
            expect(result.current.burstPanelCount).toBe(2);
            expect(result.current.isDuet).toBe(true);
            expect(result.current.burstSelectedIndices).toEqual([0, 1]);
            expect(result.current.burstPanOffsets).toHaveLength(2);
            expect(result.current.currentConfig.burst?.panelCount).toBe(2);
            expect(result.current.isDefaultConfig).toBe(true);

            // Modifying and resetting
            act(() => {
                result.current.setBurstShowTimeStamps(false);
            });
            expect(result.current.isDefaultConfig).toBe(false);

            act(() => {
                result.current.resetToDefaults();
            });
            expect(result.current.burstSelectedIndices).toEqual([0, 1]);
            expect(result.current.burstPanOffsets).toHaveLength(2);
            expect(result.current.burstShowTimeStamps).toBe(true);
            expect(result.current.isDefaultConfig).toBe(true);
        });

        it('dynamically switches between 3-panel and 2-panel (Duet) modes with setBurstPanelCount', () => {
            const { result } = renderHook(() => useStoryStudio(burstProps));

            expect(result.current.burstPanelCount).toBe(3);
            expect(result.current.burstSelectedIndices).toHaveLength(3);
            expect(result.current.burstPanOffsets).toHaveLength(3);

            // Switch to Duet (2 panels)
            act(() => {
                result.current.setBurstPanelCount(2);
            });

            expect(result.current.burstPanelCount).toBe(2);
            expect(result.current.isDuet).toBe(true);
            expect(result.current.burstSelectedIndices).toHaveLength(2);
            expect(result.current.burstPanOffsets).toHaveLength(2);
            expect(result.current.currentConfig.burst?.panelCount).toBe(2);

            // Switch back to 3 panels
            act(() => {
                result.current.setBurstPanelCount(3);
            });

            expect(result.current.burstPanelCount).toBe(3);
            expect(result.current.isDuet).toBe(false);
            expect(result.current.burstSelectedIndices).toHaveLength(3);
            expect(result.current.burstPanOffsets).toHaveLength(3);
            expect(result.current.currentConfig.burst?.panelCount).toBe(3);
        });

        it('initializes Duet with context-aware frames around current photo index', () => {
            const longBurstProps = {
                ...burstProps,
                photoObj: {
                    ...burstProps.photoObj,
                    burst: {
                        id: 'burst-long',
                        index: 5,
                        total: 8,
                        frameSources: Array.from({ length: 8 }, (_, i) => `/frame-${i}.jpg`),
                        frameThumbs: Array.from({ length: 8 }, (_, i) => `/thumb-${i}.jpg`),
                        frameDeltas: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4],
                        isDuet: true,
                    },
                },
            };

            const { result } = renderHook(() => useStoryStudio(longBurstProps));
            expect(result.current.isDuet).toBe(true);
            // Frame 5 of 8 in Duet should select [5, 6]
            expect(result.current.burstSelectedIndices).toEqual([5, 6]);
            expect(result.current.isDefaultConfig).toBe(true);
        });
    });
});
