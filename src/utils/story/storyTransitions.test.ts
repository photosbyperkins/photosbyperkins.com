import { describe, it, expect } from 'vitest';
import {
    LAYOUT_HOLD_S,
    PANEL_SLIDE_S,
    PANEL_STAGGER_S,
    panelExit,
    panelOffset,
    previewLayoutKey,
} from './storyTransitions';

describe('storyTransitions', () => {
    it('maps every single-photo mode to SOLO and bursts to their panel count', () => {
        expect(previewLayoutKey('solo', 3)).toBe('solo');
        expect(previewLayoutKey('crop', 2)).toBe('solo');
        expect(previewLayoutKey('padded', 3)).toBe('solo');
        expect(previewLayoutKey('burst', 2)).toBe('burst-2');
        expect(previewLayoutKey('burst', 3)).toBe('burst-3');
    });

    it('drops duet halves from the top and bottom, and slides triptych thirds from alternating sides', () => {
        expect(panelOffset(2, 0)).toEqual({ x: '0%', y: '-104%' });
        expect(panelOffset(2, 1)).toEqual({ x: '0%', y: '104%' });
        expect(panelOffset(3, 0)).toEqual({ x: '-102%', y: '0%' });
        expect(panelOffset(3, 1)).toEqual({ x: '102%', y: '0%' });
        expect(panelOffset(3, 2)).toEqual({ x: '-102%', y: '0%' });
    });

    it('reverse-slides panels out (last panel first) only when leaving for SOLO', () => {
        const toSolo = panelExit(3, 0)('solo');
        expect(toSolo).toMatchObject({ x: '-102%', y: '0%' });
        expect(toSolo.transition?.delay).toBeCloseTo(2 * PANEL_STAGGER_S);
        expect(panelExit(3, 2)('solo').transition?.delay).toBe(0);

        // Duet <-> triptych: the old panels stay put while the new layout slides over them
        expect(panelExit(2, 1)('burst-3')).toMatchObject({ x: '0%', y: '0%' });
    });

    it('holds the outgoing layout until the full staggered slide has finished', () => {
        expect(LAYOUT_HOLD_S).toBeGreaterThanOrEqual(PANEL_SLIDE_S + 2 * PANEL_STAGGER_S);
    });
});
