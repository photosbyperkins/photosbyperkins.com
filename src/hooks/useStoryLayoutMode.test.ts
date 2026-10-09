import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import {
    resolveStoryLayoutMode,
    useStoryLayoutMode,
    STORY_PORTRAIT_QUERY,
    STORY_COMPACT_QUERY,
} from './useStoryLayoutMode';

const originalMatchMedia = window.matchMedia;

const mockMedia = (matching: string[]) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: matching.includes(query),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
};

describe('resolveStoryLayoutMode', () => {
    it.each([
        // [isPortrait, isCompact, expected]
        [false, false, 'side'],
        [false, true, 'side'],
        [true, false, 'stacked'],
        [true, true, 'sheet'],
    ] as const)('portrait=%s compact=%s -> %s', (isPortrait, isCompact, expected) => {
        expect(resolveStoryLayoutMode(isPortrait, isCompact)).toBe(expected);
    });
});

describe('useStoryLayoutMode', () => {
    afterEach(() => {
        cleanup();
        window.matchMedia = originalMatchMedia;
    });

    it('uses the side layout for landscape windows (laptops, landscape phones)', () => {
        mockMedia([STORY_COMPACT_QUERY]); // short landscape phone: still side
        expect(renderHook(() => useStoryLayoutMode()).result.current).toBe('side');
    });

    it('uses the stacked layout for tall, wide-enough portrait windows (tablets)', () => {
        mockMedia([STORY_PORTRAIT_QUERY]);
        expect(renderHook(() => useStoryLayoutMode()).result.current).toBe('stacked');
    });

    it('uses the sheet layout for phones and short portrait windows', () => {
        mockMedia([STORY_PORTRAIT_QUERY, STORY_COMPACT_QUERY]);
        expect(renderHook(() => useStoryLayoutMode()).result.current).toBe('sheet');
    });

    it('falls back to the side layout when no media query matches', () => {
        mockMedia([]);
        expect(renderHook(() => useStoryLayoutMode()).result.current).toBe('side');
    });
});
