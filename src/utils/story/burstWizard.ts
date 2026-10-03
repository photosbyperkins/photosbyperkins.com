/**
 * Validation logic for Sequential Burst & Duet Wizards in Story Maker.
 *
 * Enforces chronological frame ordering from top to bottom ONLY when enforceOrdering is true:
 * - In 3-panel mode (panelCount = 3):
 *   - Step 0 (TOP): earliest frame (t1), must leave room for MID and BTM (f <= total - 3).
 *   - Step 1 (MID): peak action frame (t2 > t1), must leave room for BTM (f > top && f <= total - 2).
 *   - Step 2 (BTM): follow-through frame (t3 > t2) (f > mid && f <= total - 1).
 *
 * - In 2-panel Duet mode (panelCount = 2):
 *   - Step 0 (TOP): earliest frame (t1), must leave room for BTM (f <= total - 2).
 *   - Step 1 (BTM): follow-through frame (t2 > t1) (f > top && f <= total - 1).
 *
 * When enforceOrdering is false (or isTriptych is true):
 * - Any frame/photo can be chosen for any step, provided it is not already used in another step.
 */
export function isFrameValidForWizardStep(
    fIdx: number,
    step: number,
    slots: (number | null)[],
    totalFrames: number,
    isTriptych = false,
    panelCount: 2 | 3 = 3,
    enforceOrdering = !isTriptych
): boolean {
    if (fIdx < 0 || fIdx >= totalFrames) return false;
    if (step < 0 || step >= panelCount) return false;

    const otherSlots = slots.slice(0, panelCount).filter((_, idx) => idx !== step);
    if (otherSlots.includes(fIdx)) return false;

    // When ordering is NOT enforced (custom photos OR camera burst with +Δt disabled):
    if (!enforceOrdering || isTriptych) {
        return true;
    }

    const top = slots[0];
    const mid = slots[1];

    if (panelCount === 2) {
        if (step === 0) {
            // Step 1: Picking TOP (earliest frame)
            // Must leave at least 1 frame after it for BTM
            return fIdx <= totalFrames - 2;
        }
        if (step === 1) {
            // Step 2: Picking BTM (follow-through frame)
            // Must be strictly after TOP
            if (top === null || top === undefined) return false;
            return fIdx > top && fIdx <= totalFrames - 1;
        }
        return false;
    }

    // 3-panel mode (Triptych / Burst):
    if (step === 0) {
        // Step 1: Picking TOP (earliest frame)
        // Must leave at least 2 frames after it (for MID and BTM)
        return fIdx <= totalFrames - 3;
    }

    if (step === 1) {
        // Step 2: Picking MID (peak action frame)
        // Must be strictly after TOP, and leave at least 1 frame after it (for BTM)
        if (top === null || top === undefined) return false;
        return fIdx > top && fIdx <= totalFrames - 2;
    }

    if (step === 2) {
        // Step 3: Picking BTM (follow-through frame)
        // Must be strictly after MID
        if (mid === null || mid === undefined) return false;
        return fIdx > mid && fIdx <= totalFrames - 1;
    }

    return false;
}
