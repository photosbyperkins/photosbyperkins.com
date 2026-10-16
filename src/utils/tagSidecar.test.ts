import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventTagSidecar } from '../types';
import {
    clearEventTagSidecarCache,
    computeAvailableEventPills,
    fetchEventTagSidecar,
    getCachedEventTagSidecar,
    getPhotoSceneTags,
    getPhotoTagEntry,
    matchesEventTagFilter,
} from './tagSidecar';

const mockSidecar: EventTagSidecar = {
    v: 1,
    year: '2025',
    slug: 'sacramento-vs-faultline',
    eventName: '03.23 Sacramento vs Faultline',
    isJuniorBout: false,
    teams: [
        { name: 'Sacramento Roller Derby', jerseyColorHex: '#1D4ED8' },
        { name: 'Faultline Derby', jerseyColorHex: '#DC2626' },
    ],
    vocab: [
        'apex-jump',
        'big-hit',
        'fall',
        'pack',
        'jammer-breakaway',
        'star-pass',
        'celebration',
        'huddle',
        'bench',
        'referee',
        'crowd',
        'portrait',
        'team-photo',
    ],
    photos: {
        '0': {
            r: 'jammer',
            n: ['42'],
            tm: 0,
            t: [0, 4], // apex-jump, jammer-breakaway
            a: 'Jammer #42 for Sacramento Roller Derby in an apex jump during 03.23 Sacramento vs Faultline (2025).',
            s: [['2025', 'sacramento-vs-faultline', 2]],
            q: 0.92,
            b: 1,
        },
        '1': {
            r: 'pivot',
            n: ['711'],
            tm: 1,
            t: [3], // pack
            a: 'Pivot #711 for Faultline Derby in pack action during 03.23 Sacramento vs Faultline (2025).',
            q: 0.78,
        },
        '2': {
            r: 'ref',
            t: [9], // referee
            a: 'Skating referee officiating on the track during 03.23 Sacramento vs Faultline (2025).',
        },
    },
};

describe('tagSidecar utilities', () => {
    beforeEach(() => {
        clearEventTagSidecarCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        clearEventTagSidecarCache();
    });

    it('retrieves photo tag entries and resolves vocabulary scene tags', () => {
        expect(getPhotoTagEntry(mockSidecar, 0)?.r).toBe('jammer');
        expect(getPhotoTagEntry(mockSidecar, 99)).toBeNull();
        expect(getPhotoSceneTags(mockSidecar, 0)).toEqual(['apex-jump', 'jammer-breakaway']);
        expect(getPhotoSceneTags(mockSidecar, 1)).toEqual(['pack']);
    });

    it('filters photos by role, action, jersey number, team, best-burst, and scene tag', () => {
        expect(matchesEventTagFilter(mockSidecar, 0, 'all')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 0, 'role:jammer')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 1, 'role:jammer')).toBe(false);
        expect(matchesEventTagFilter(mockSidecar, 1, 'role:pivot')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 2, 'role:ref')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 0, 'action')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 2, 'action')).toBe(false);
        expect(matchesEventTagFilter(mockSidecar, 0, 'has-number')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 2, 'has-number')).toBe(false);
        expect(matchesEventTagFilter(mockSidecar, 0, 'number:42')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 0, 'number:99')).toBe(false);
        expect(matchesEventTagFilter(mockSidecar, 0, 'team:0')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 1, 'team:1')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 0, 'best-burst')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 1, 'best-burst')).toBe(false);
        expect(matchesEventTagFilter(mockSidecar, 0, 'tag:apex-jump')).toBe(true);
        expect(matchesEventTagFilter(mockSidecar, 1, 'tag:apex-jump')).toBe(false);
    });

    it('computes available filter pills including # Jersey Numbers on all bouts', () => {
        const adultPills = computeAvailableEventPills(mockSidecar, 3);
        expect(adultPills.map((p) => p.filter)).toContain('role:jammer');
        expect(adultPills.map((p) => p.filter)).toContain('role:pivot');
        expect(adultPills.map((p) => p.filter)).toContain('has-number');
        expect(adultPills.map((p) => p.filter)).toContain('team:0');
        expect(adultPills.map((p) => p.filter)).toContain('team:1');

        const juniorSidecar: EventTagSidecar = {
            ...mockSidecar,
            isJuniorBout: true,
        };
        const juniorPills = computeAvailableEventPills(juniorSidecar, 3);
        expect(juniorPills.map((p) => p.filter)).toContain('has-number');
    });

    it('fetches and caches event tag sidecars cleanly', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => mockSidecar,
        } as Response);

        const res1 = await fetchEventTagSidecar('2025', 'sacramento-vs-faultline');
        expect(res1?.slug).toBe('sacramento-vs-faultline');
        expect(getCachedEventTagSidecar('2025', 'sacramento-vs-faultline')).toEqual(mockSidecar);

        const res2 = await fetchEventTagSidecar('2025', 'sacramento-vs-faultline');
        expect(res2).toEqual(mockSidecar);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});
