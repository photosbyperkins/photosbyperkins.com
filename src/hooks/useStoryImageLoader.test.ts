import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryImageLoader } from './useStoryImageLoader';
import type { PhotoRecord } from '../types';

describe('useStoryImageLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('normalizes string photo input into PhotoRecord and sources', () => {
        const { result } = renderHook(() =>
            useStoryImageLoader({
                photo: '/photos/2026/game.jpg',
                isOpen: false,
            })
        );

        expect(result.current.photoObj.original).toBe('/photos/2026/game.jpg');
        expect(result.current.photoObj.thumb).toBe('/photos/2026/game.jpg');
        expect(result.current.originalSrc).toBe('/photos/2026/game.jpg');
        expect(result.current.displaySrc).toBe('/avif/2026/game.avif');
        expect(result.current.thumbSrc).toBe('/photos/2026/game.jpg');
    });

    it('uses explicit width and height from PhotoRecord object if provided', () => {
        const photo: PhotoRecord = {
            original: '/photos/2026/action.jpg',
            thumb: '/thumbnails/2026/action.webp',
            width: 1920,
            height: 1080,
        };

        const { result } = renderHook(() =>
            useStoryImageLoader({
                photo,
                isOpen: false,
            })
        );

        expect(result.current.naturalDimensions).toEqual({ width: 1920, height: 1080 });
        expect(result.current.originalSrc).toBe('/photos/2026/action.jpg');
        expect(result.current.displaySrc).toBe('/avif/2026/action.avif');
        expect(result.current.thumbSrc).toBe('/thumbnails/2026/action.webp');
    });

    it('appends build version query via withBuild helper', () => {
        const { result } = renderHook(() =>
            useStoryImageLoader({
                photo: '/photos/2026/game.jpg',
                isOpen: false,
            })
        );

        const urlWithBuild = result.current.withBuild('/photos/2026/game.jpg');
        expect(urlWithBuild).toContain('/photos/2026/game.jpg');
        // If already containing ?v=, does not double-append
        const doubleCall = result.current.withBuild('/photos/2026/game.jpg?v=123');
        expect(doubleCall).toBe('/photos/2026/game.jpg?v=123');
    });

    it('allows updating natural dimensions via setNaturalDimensions', () => {
        const { result } = renderHook(() =>
            useStoryImageLoader({
                photo: '/photos/2026/game.jpg',
                isOpen: false,
            })
        );

        act(() => {
            result.current.setNaturalDimensions({ width: 4000, height: 3000 });
        });

        expect(result.current.naturalDimensions).toEqual({ width: 4000, height: 3000 });
    });
});
