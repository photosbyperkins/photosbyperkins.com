/**
 * Validation logic for the Sequential 3-Panel Burst Wizard in Story Maker.
 *
 * Enforces chronological frame ordering from top to bottom:
 * - Step 0 (TOP): earliest frame (t1), must leave room for MID and BTM.
 * - Step 1 (MID): peak action frame (t2 > t1), must leave room for BTM.
 * - Step 2 (BTM): follow-through frame (t3 > t2).
 *
 * In Triptych mode (isTriptych = true), photos are not time-ordered:
 * - Any photo can be chosen for any step, provided it is not already used in another step.
 */
export function isFrameValidForWizardStep(
    fIdx: number,
    step: number,
    slots: (number | null)[],
    totalFrames: number,
    isTriptych = false
): boolean {
    if (fIdx < 0 || fIdx >= totalFrames) return false;
    if (step < 0 || step > 2) return false;

    if (isTriptych) {
        const otherSlots = slots.filter((_, idx) => idx !== step);
        return !otherSlots.includes(fIdx);
    }

    const [top, mid] = slots;

    if (step === 0) {
        // Step 1: Picking TOP (earliest frame)
        // Must leave at least 2 frames after it (for MID and BTM)
        // e.g. for total = 6 (indices 0..5): top can be 0, 1, 2, 3 (<= 6 - 3 = 3)
        // Second-to-last (4) and last (5) are greyed out
        return fIdx <= totalFrames - 3;
    }

    if (step === 1) {
        // Step 2: Picking MID (peak action frame)
        // Must be strictly after TOP, and leave at least 1 frame after it (for BTM)
        if (top === null) return false;
        return fIdx > top && fIdx <= totalFrames - 2;
    }

    if (step === 2) {
        // Step 3: Picking BTM (follow-through frame)
        // Must be strictly after MID
        if (mid === null) return false;
        return fIdx > mid && fIdx <= totalFrames - 1;
    }

    return false;
}
