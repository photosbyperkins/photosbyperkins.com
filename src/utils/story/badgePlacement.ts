import type { StoryBadgePosition } from './storyConstants';

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface BadgeCoordinates {
    x: number;
    y: number;
}

/**
 * Resolves exact pixel coordinates for a badge on a story canvas (1080x1920 or scaled).
 * Matches safe story margins: 5% horizontal (54px @ 1080w), 5.5% vertical (105px @ 1920h).
 */
export function resolveBadgeCoords(
    position: StoryBadgePosition,
    cardW: number,
    cardH: number,
    targetW: number,
    targetH: number,
    resScale = 1
): BadgeCoordinates {
    const marginX = Math.round(54 * resScale);
    const marginY = Math.round(105 * resScale);

    let x = marginX;
    let y = marginY;

    switch (position) {
        case 'top-left':
            x = marginX;
            y = marginY;
            break;
        case 'top-center':
            x = Math.round((targetW - cardW) / 2);
            y = marginY;
            break;
        case 'top-right':
            x = targetW - cardW - marginX;
            y = marginY;
            break;
        case 'bottom-left':
            x = marginX;
            y = targetH - cardH - marginY;
            break;
        case 'bottom-center':
            x = Math.round((targetW - cardW) / 2);
            y = targetH - cardH - marginY;
            break;
        case 'bottom-right':
            x = targetW - cardW - marginX;
            y = targetH - cardH - marginY;
            break;
    }

    return { x, y };
}

/**
 * Checks whether two rectangular areas overlap, including an optional buffer/margin.
 */
export function doRectsOverlap(r1: Rect, r2: Rect, minGap = 16): boolean {
    return !(
        r1.right + minGap <= r2.left ||
        r1.left >= r2.right + minGap ||
        r1.bottom + minGap <= r2.top ||
        r1.top >= r2.bottom + minGap
    );
}

/**
 * Clamps coordinates during active dragging so the badge can NEVER be outside the bounds of the frame.
 */
export function clampBadgeWithinFrame(
    rawX: number,
    rawY: number,
    badgeW: number,
    badgeH: number,
    containerW: number,
    containerH: number,
    marginX = 16,
    marginY = 16
): { x: number; y: number } {
    const validRawX = Number.isNaN(rawX) ? marginX : rawX;
    const validRawY = Number.isNaN(rawY) ? marginY : rawY;
    const minX = marginX;
    const maxX = Math.max(minX, containerW - badgeW - marginX);
    const minY = marginY;
    const maxY = Math.max(minY, containerH - badgeH - marginY);

    return {
        x: Math.max(minX, Math.min(maxX, validRawX)),
        y: Math.max(minY, Math.min(maxY, validRawY)),
    };
}

/**
 * Returns the opposite tier for a given position (e.g. 'top-center' -> 'bottom-center').
 */
export function getOppositeTierSlot(slot: StoryBadgePosition): StoryBadgePosition {
    switch (slot) {
        case 'top-left':
            return 'bottom-left';
        case 'top-center':
            return 'bottom-center';
        case 'top-right':
            return 'bottom-right';
        case 'bottom-left':
            return 'top-left';
        case 'bottom-center':
            return 'top-center';
        case 'bottom-right':
            return 'top-right';
    }
}

/**
 * Resolves drop position with simplified tier separation:
 * Only ONE badge can be on Top ('top-left' | 'top-center' | 'top-right'),
 * and only ONE badge can be on Bottom ('bottom-left' | 'bottom-center' | 'bottom-right').
 *
 * If the user moves Badge A to the tier occupied by Badge B:
 * - Badge B is automatically relocated to the opposite tier (swapping with Badge A's origin slot, or matching opposite slot).
 *
 * This completely guarantees zero overlap and clean visual balance!
 */
export function resolveBadgeDrop(
    draggedBadge: 'scoreboard' | 'attribution',
    targetSlot: StoryBadgePosition,
    currentPositions: {
        scoreboard: StoryBadgePosition;
        attribution: StoryBadgePosition;
    },
    isOtherActive: boolean
): { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition } {
    const otherBadgeKey = draggedBadge === 'scoreboard' ? 'attribution' : 'scoreboard';

    if (!isOtherActive) {
        return {
            ...currentPositions,
            [draggedBadge]: targetSlot,
        };
    }

    const otherSlot = currentPositions[otherBadgeKey];
    const prevDraggedSlot = currentPositions[draggedBadge];

    const isTargetTop = targetSlot.startsWith('top');
    const isOtherTop = otherSlot.startsWith('top');

    // If both would be on the same tier (both Top or both Bottom):
    // Only one badge is allowed per tier!
    if (isTargetTop === isOtherTop) {
        // Relocate the other badge to the opposite tier:
        // If the dragged badge came from the opposite tier, swap with its previous slot!
        // Otherwise, move other badge to the opposite tier's corresponding slot.
        const relocatedSlot = prevDraggedSlot.startsWith(isTargetTop ? 'bottom' : 'top')
            ? prevDraggedSlot
            : getOppositeTierSlot(otherSlot);

        return {
            [draggedBadge]: targetSlot,
            [otherBadgeKey]: relocatedSlot,
        } as { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition };
    }

    // Different tiers (one Top, one Bottom) -> perfectly valid, no collision!
    return {
        ...currentPositions,
        [draggedBadge]: targetSlot,
    };
}

/**
 * Swaps two badge positions across tiers (top <-> bottom).
 * If both badges are active, their top/bottom tier positions are swapped.
 * If only one badge is active, it is flipped to the opposite tier.
 */
export function swapBadgePositions(
    positions: { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition },
    active: { scoreboard: boolean; attribution: boolean }
): { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition } {
    if (active.scoreboard && active.attribution) {
        return {
            scoreboard: getOppositeTierSlot(positions.scoreboard),
            attribution: getOppositeTierSlot(positions.attribution),
        };
    }
    if (active.scoreboard) {
        return {
            ...positions,
            scoreboard: getOppositeTierSlot(positions.scoreboard),
        };
    }
    if (active.attribution) {
        return {
            ...positions,
            attribution: getOppositeTierSlot(positions.attribution),
        };
    }
    return positions;
}

type BadgeTier = 'top' | 'bottom';
type BadgeColumn = 'left' | 'center' | 'right';

/**
 * Picks the snap slot for a badge being dragged, given its top-left position inside the frame.
 *
 * Tier is chosen by which half of the frame the badge's vertical center is in.
 * Column is chosen by how far the badge has travelled across the horizontal range it can
 * actually occupy (normalized 0..1, split into thirds). Using normalized travel rather than the
 * badge center means wide badges (e.g. a 65%-wide attribution pill) can still reach left/right.
 */
export function pickSlotFromDrag(
    x: number,
    y: number,
    badgeW: number,
    badgeH: number,
    containerW: number,
    containerH: number,
    inset = 0
): StoryBadgePosition {
    const safeX = Number.isFinite(x) ? x : inset;
    const safeY = Number.isFinite(y) ? y : inset;
    const tier: BadgeTier = safeY + badgeH / 2 < containerH / 2 ? 'top' : 'bottom';
    const minX = inset;
    const maxX = Math.max(minX, containerW - badgeW - inset);
    const range = maxX - minX;
    const t = range < 1 ? 0.5 : (safeX - minX) / range;
    const column: BadgeColumn = t < 1 / 3 ? 'left' : t > 2 / 3 ? 'right' : 'center';
    return `${tier}-${column}` as StoryBadgePosition;
}

/**
 * When a badge is switched back on, its remembered slot may share a tier with the other
 * (already active) badge. Flip the newly enabled badge to the opposite tier so the
 * one-badge-per-edge invariant always holds.
 */
export function resolveBadgeEnable(
    enabling: 'scoreboard' | 'attribution',
    positions: { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition },
    isOtherActive: boolean
): { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition } {
    if (!isOtherActive) return positions;
    const other = enabling === 'scoreboard' ? 'attribution' : 'scoreboard';
    const sameTier = positions[enabling].startsWith('top') === positions[other].startsWith('top');
    if (!sameTier) return positions;
    return { ...positions, [enabling]: getOppositeTierSlot(positions[enabling]) };
}
