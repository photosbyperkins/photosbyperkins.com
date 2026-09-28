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

        act(() => {
            result.current.resetToDefaults();
        });

        expect(result.current.activeStudioTab).toBe('layout');
        expect(result.current.activeFilterId).toBe('none');
        expect(result.current.activeFrameId).toBe('none');
        expect(result.current.statusToast).toBe('Reset story format to defaults');
    });
});
