import { describe, it, expect } from 'vitest';
import { isFrameValidForWizardStep } from './burstWizard';

describe('isFrameValidForWizardStep', () => {
    describe('3-panel mode (default / panelCount = 3)', () => {
        const total = 6; // frames 0..5

        it('validates Step 0 (TOP): leaves at least 2 frames for MID and BTM', () => {
            const slots = [null, null, null];
            expect(isFrameValidForWizardStep(0, 0, slots, total)).toBe(true);
            expect(isFrameValidForWizardStep(3, 0, slots, total)).toBe(true);
            // 4 and 5 cannot be TOP because at least 2 frames must follow
            expect(isFrameValidForWizardStep(4, 0, slots, total)).toBe(false);
            expect(isFrameValidForWizardStep(5, 0, slots, total)).toBe(false);
        });

        it('validates Step 1 (MID): strictly after TOP and leaves 1 frame for BTM', () => {
            const slots = [1, null, null];
            expect(isFrameValidForWizardStep(0, 1, slots, total)).toBe(false); // <= top
            expect(isFrameValidForWizardStep(1, 1, slots, total)).toBe(false); // == top
            expect(isFrameValidForWizardStep(2, 1, slots, total)).toBe(true);
            expect(isFrameValidForWizardStep(4, 1, slots, total)).toBe(true);
            expect(isFrameValidForWizardStep(5, 1, slots, total)).toBe(false); // last frame cannot be MID
        });

        it('validates Step 2 (BTM): strictly after MID', () => {
            const slots = [1, 3, null];
            expect(isFrameValidForWizardStep(2, 2, slots, total)).toBe(false); // <= mid
            expect(isFrameValidForWizardStep(3, 2, slots, total)).toBe(false); // == mid
            expect(isFrameValidForWizardStep(4, 2, slots, total)).toBe(true);
            expect(isFrameValidForWizardStep(5, 2, slots, total)).toBe(true);
        });
    });

    describe('2-panel Duet mode (panelCount = 2)', () => {
        const total = 5; // frames 0..4

        describe('when enforceOrdering is true (+Δt enabled)', () => {
            it('validates Step 0 (TOP): leaves at least 1 frame for BTM', () => {
                const slots = [null, null];
                expect(isFrameValidForWizardStep(0, 0, slots, total, false, 2, true)).toBe(true);
                expect(isFrameValidForWizardStep(3, 0, slots, total, false, 2, true)).toBe(true);
                // Last frame (4) cannot be TOP because at least 1 frame must follow
                expect(isFrameValidForWizardStep(4, 0, slots, total, false, 2, true)).toBe(false);
            });

            it('validates Step 1 (BTM): strictly after TOP', () => {
                const slots = [2, null];
                expect(isFrameValidForWizardStep(0, 1, slots, total, false, 2, true)).toBe(false); // <= top
                expect(isFrameValidForWizardStep(1, 1, slots, total, false, 2, true)).toBe(false); // <= top
                expect(isFrameValidForWizardStep(2, 1, slots, total, false, 2, true)).toBe(false); // == top
                expect(isFrameValidForWizardStep(3, 1, slots, total, false, 2, true)).toBe(true); // > top
                expect(isFrameValidForWizardStep(4, 1, slots, total, false, 2, true)).toBe(true); // > top
            });
        });

        describe('when enforceOrdering is false (+Δt disabled or custom)', () => {
            it('allows selecting any frame for TOP as long as not in BTM', () => {
                const slots = [null, 2];
                expect(isFrameValidForWizardStep(0, 0, slots, total, false, 2, false)).toBe(true);
                expect(isFrameValidForWizardStep(2, 0, slots, total, false, 2, false)).toBe(false); // already in BTM
                expect(isFrameValidForWizardStep(4, 0, slots, total, false, 2, false)).toBe(true); // last frame can be TOP
            });

            it('allows selecting any frame for BTM as long as not in TOP', () => {
                const slots = [2, null];
                expect(isFrameValidForWizardStep(0, 1, slots, total, false, 2, false)).toBe(true); // earlier frame can be BTM
                expect(isFrameValidForWizardStep(2, 1, slots, total, false, 2, false)).toBe(false); // already in TOP
                expect(isFrameValidForWizardStep(4, 1, slots, total, false, 2, false)).toBe(true);
            });
        });

        it('rejects step out of range for panelCount = 2', () => {
            const slots = [0, 1];
            expect(isFrameValidForWizardStep(2, 2, slots, total, false, 2)).toBe(false);
        });
    });

    describe('Triptych / Duet Custom Selection mode (isTriptych = true)', () => {
        it('allows any photo not already chosen in 2-panel Duet', () => {
            const slots = [1, null];
            expect(isFrameValidForWizardStep(0, 1, slots, 4, true, 2)).toBe(true);
            expect(isFrameValidForWizardStep(1, 1, slots, 4, true, 2)).toBe(false); // already in slot 0
            expect(isFrameValidForWizardStep(2, 1, slots, 4, true, 2)).toBe(true);
        });

        it('allows any photo not already chosen in 3-panel Triptych', () => {
            const slots = [1, 3, null];
            expect(isFrameValidForWizardStep(0, 2, slots, 4, true, 3)).toBe(true);
            expect(isFrameValidForWizardStep(1, 2, slots, 4, true, 3)).toBe(false);
            expect(isFrameValidForWizardStep(2, 2, slots, 4, true, 3)).toBe(true);
            expect(isFrameValidForWizardStep(3, 2, slots, 4, true, 3)).toBe(false);
        });
    });
});
