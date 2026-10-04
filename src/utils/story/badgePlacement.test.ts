import { describe, it, expect } from 'vitest';
import {
    resolveBadgeCoords,
    doRectsOverlap,
    clampBadgeWithinFrame,
    resolveBadgeDrop,
    getOppositeTierSlot,
    swapBadgePositions,
    pickSlotFromDrag,
    resolveBadgeEnable,
} from './badgePlacement';

describe('badgePlacement', () => {
    describe('resolveBadgeCoords', () => {
        const cardW = 400;
        const cardH = 120;
        const targetW = 1080;
        const targetH = 1920;

        it('resolves top-left coordinates', () => {
            const coords = resolveBadgeCoords('top-left', cardW, cardH, targetW, targetH, 1);
            expect(coords).toEqual({ x: 54, y: 105 });
        });

        it('resolves top-center coordinates', () => {
            const coords = resolveBadgeCoords('top-center', cardW, cardH, targetW, targetH, 1);
            expect(coords).toEqual({ x: (1080 - 400) / 2, y: 105 });
        });

        it('resolves top-right coordinates', () => {
            const coords = resolveBadgeCoords('top-right', cardW, cardH, targetW, targetH, 1);
            expect(coords).toEqual({ x: 1080 - 400 - 54, y: 105 });
        });

        it('resolves bottom-left coordinates', () => {
            const coords = resolveBadgeCoords('bottom-left', cardW, cardH, targetW, targetH, 1);
            expect(coords).toEqual({ x: 54, y: 1920 - 120 - 105 });
        });

        it('resolves bottom-center coordinates', () => {
            const coords = resolveBadgeCoords('bottom-center', cardW, cardH, targetW, targetH, 1);
            expect(coords).toEqual({ x: (1080 - 400) / 2, y: 1920 - 120 - 105 });
        });

        it('resolves bottom-right coordinates', () => {
            const coords = resolveBadgeCoords('bottom-right', cardW, cardH, targetW, targetH, 1);
            expect(coords).toEqual({ x: 1080 - 400 - 54, y: 1920 - 120 - 105 });
        });

        it('scales coordinates with resScale (e.g. 4K = 2x)', () => {
            const coords = resolveBadgeCoords('top-left', cardW, cardH, targetW * 2, targetH * 2, 2);
            expect(coords).toEqual({ x: 108, y: 210 });
        });
    });

    describe('doRectsOverlap', () => {
        it('detects intersecting rectangles', () => {
            const r1 = { left: 10, top: 10, right: 100, bottom: 100 };
            const r2 = { left: 50, top: 50, right: 150, bottom: 150 };
            expect(doRectsOverlap(r1, r2)).toBe(true);
        });

        it('detects disjoint rectangles', () => {
            const r1 = { left: 10, top: 10, right: 100, bottom: 100 };
            const r2 = { left: 150, top: 150, right: 250, bottom: 250 };
            expect(doRectsOverlap(r1, r2)).toBe(false);
        });

        it('respects minGap buffer', () => {
            const r1 = { left: 10, top: 10, right: 100, bottom: 100 };
            const r2 = { left: 105, top: 10, right: 200, bottom: 100 };
            // Gap is 5px, default minGap is 16px -> counts as overlap
            expect(doRectsOverlap(r1, r2, 16)).toBe(true);
            // If minGap is 2px -> does not overlap
            expect(doRectsOverlap(r1, r2, 2)).toBe(false);
        });
    });

    describe('clampBadgeWithinFrame', () => {
        it('clamps coordinates that bleed past left/top edges', () => {
            const clamped = clampBadgeWithinFrame(-50, -20, 200, 80, 500, 800, 16, 16);
            expect(clamped.x).toBe(16);
            expect(clamped.y).toBe(16);
        });

        it('clamps coordinates that bleed past right/bottom edges', () => {
            const clamped = clampBadgeWithinFrame(400, 750, 200, 80, 500, 800, 16, 16);
            expect(clamped.x).toBe(500 - 200 - 16); // 284
            expect(clamped.y).toBe(800 - 80 - 16); // 704
        });

        it('leaves within-bounds coordinates unchanged', () => {
            const clamped = clampBadgeWithinFrame(100, 200, 200, 80, 500, 800, 16, 16);
            expect(clamped.x).toBe(100);
            expect(clamped.y).toBe(200);
        });
    });

    describe('getOppositeTierSlot', () => {
        it('inverts top and bottom slots', () => {
            expect(getOppositeTierSlot('top-left')).toBe('bottom-left');
            expect(getOppositeTierSlot('top-center')).toBe('bottom-center');
            expect(getOppositeTierSlot('top-right')).toBe('bottom-right');
            expect(getOppositeTierSlot('bottom-left')).toBe('top-left');
            expect(getOppositeTierSlot('bottom-center')).toBe('top-center');
            expect(getOppositeTierSlot('bottom-right')).toBe('top-right');
        });
    });

    describe('resolveBadgeDrop', () => {
        it('places badge freely when other badge is not active', () => {
            const res = resolveBadgeDrop(
                'scoreboard',
                'top-center',
                { scoreboard: 'bottom-center', attribution: 'top-center' },
                false // other not active
            );
            expect(res.scoreboard).toBe('top-center');
            expect(res.attribution).toBe('top-center');
        });

        it('performs symmetric swap when dropped on occupied slot', () => {
            const res = resolveBadgeDrop(
                'scoreboard',
                'top-center',
                { scoreboard: 'bottom-center', attribution: 'top-center' },
                true
            );
            expect(res.scoreboard).toBe('top-center');
            expect(res.attribution).toBe('bottom-center'); // Swapped to scoreboard's old slot!
        });

        it('relocates other badge if dropped on same tier where center is involved', () => {
            // Drag attribution from top-center to bottom-left, while scoreboard is at bottom-center
            const res = resolveBadgeDrop(
                'attribution',
                'bottom-left',
                { scoreboard: 'bottom-center', attribution: 'top-center' },
                true
            );
            expect(res.attribution).toBe('bottom-left');
            // Scoreboard at bottom-center collides with bottom-left on same tier -> relocated to top
            expect(res.scoreboard).toBe('top-center');
        });

        it('allows both badges on different tiers without interference', () => {
            const res = resolveBadgeDrop(
                'scoreboard',
                'bottom-right',
                { scoreboard: 'bottom-center', attribution: 'top-left' },
                true
            );
            expect(res.scoreboard).toBe('bottom-right');
            expect(res.attribution).toBe('top-left');
        });

        it('strictly relocates other badge whenever dropped onto the same tier', () => {
            const res = resolveBadgeDrop(
                'scoreboard',
                'top-right',
                { scoreboard: 'bottom-center', attribution: 'top-left' },
                true
            );
            expect(res.scoreboard).toBe('top-right');
            // Attribution is relocated to bottom-center (scoreboard's old slot) because only 1 badge is allowed on top
            expect(res.attribution).toBe('bottom-center');
        });
    });

    describe('swapBadgePositions', () => {
        it('swaps both positions across tiers when both are active', () => {
            const res = swapBadgePositions(
                { scoreboard: 'bottom-center', attribution: 'top-center' },
                { scoreboard: true, attribution: true }
            );
            expect(res.scoreboard).toBe('top-center');
            expect(res.attribution).toBe('bottom-center');
        });

        it('swaps asymmetrical positions correctly preserving horizontal alignment', () => {
            const res = swapBadgePositions(
                { scoreboard: 'bottom-right', attribution: 'top-left' },
                { scoreboard: true, attribution: true }
            );
            expect(res.scoreboard).toBe('top-right');
            expect(res.attribution).toBe('bottom-left');
        });

        it('flips single active scoreboard to opposite tier', () => {
            const res = swapBadgePositions(
                { scoreboard: 'bottom-center', attribution: 'top-center' },
                { scoreboard: true, attribution: false }
            );
            expect(res.scoreboard).toBe('top-center');
            expect(res.attribution).toBe('top-center');
        });

        it('flips single active attribution to opposite tier', () => {
            const res = swapBadgePositions(
                { scoreboard: 'bottom-center', attribution: 'top-center' },
                { scoreboard: false, attribution: true }
            );
            expect(res.scoreboard).toBe('bottom-center');
            expect(res.attribution).toBe('bottom-center');
        });
    });

    describe('pickSlotFromDrag', () => {
        // 400x800 frame, 6px drag inset
        it('picks the tier from the badge vertical center vs the frame midline', () => {
            expect(pickSlotFromDrag(100, 300, 200, 60, 400, 800, 6)).toBe('top-center');
            expect(pickSlotFromDrag(100, 420, 200, 60, 400, 800, 6)).toBe('bottom-center');
        });

        it('lets a wide badge reach the left and right columns', () => {
            // 260px-wide pill (65% of the frame): its center can never reach the outer thirds,
            // but its travel range can.
            expect(pickSlotFromDrag(6, 50, 260, 40, 400, 800, 6)).toBe('top-left');
            expect(pickSlotFromDrag(134, 50, 260, 40, 400, 800, 6)).toBe('top-right');
            expect(pickSlotFromDrag(70, 50, 260, 40, 400, 800, 6)).toBe('top-center');
        });

        it('falls back to center when the badge fills the frame width', () => {
            expect(pickSlotFromDrag(6, 700, 388, 40, 400, 800, 6)).toBe('bottom-center');
        });
    });

    describe('resolveBadgeEnable', () => {
        it('flips the newly enabled badge to the free edge on conflict', () => {
            const res = resolveBadgeEnable(
                'attribution',
                { scoreboard: 'bottom-center', attribution: 'bottom-right' },
                true
            );
            expect(res).toEqual({ scoreboard: 'bottom-center', attribution: 'top-right' });
        });

        it('keeps positions when there is no conflict', () => {
            const positions = { scoreboard: 'bottom-center', attribution: 'top-left' } as const;
            expect(resolveBadgeEnable('scoreboard', positions, true)).toEqual(positions);
        });

        it('keeps positions when the other badge is hidden', () => {
            const positions = { scoreboard: 'top-center', attribution: 'top-left' } as const;
            expect(resolveBadgeEnable('scoreboard', positions, false)).toEqual(positions);
        });
    });
});
