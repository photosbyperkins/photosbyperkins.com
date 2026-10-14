/**
 * Module-level record of image sources that have already finished loading.
 * Lets remounted ProgressiveImage instances skip the shimmer/fade for cached images.
 * Kept separate from the component so React Fast Refresh can hot-reload it cleanly.
 */
export const loadedSrcs = new Set<string>();

type PendingCallback = () => void;
let inFlightPriorityCount = 0;
const pendingNonPriorityCallbacks = new Set<PendingCallback>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function hasInFlightPriorityImages(): boolean {
    return inFlightPriorityCount > 0;
}

export function enqueueNonPriorityLoad(cb: PendingCallback): () => void {
    if (inFlightPriorityCount <= 0) {
        cb();
        return () => {};
    }
    pendingNonPriorityCallbacks.add(cb);
    return () => {
        pendingNonPriorityCallbacks.delete(cb);
    };
}

function flushNonPriorityQueue() {
    if (inFlightPriorityCount > 0 || pendingNonPriorityCallbacks.size === 0 || flushTimer !== null) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        if (inFlightPriorityCount > 0) return;
        const callbacks = Array.from(pendingNonPriorityCallbacks);
        pendingNonPriorityCallbacks.clear();
        for (const cb of callbacks) {
            cb();
        }
    }, 45);
}

export function beginPriorityImageLoad(): () => void {
    inFlightPriorityCount++;
    let ended = false;
    const end = () => {
        if (ended) return;
        ended = true;
        inFlightPriorityCount = Math.max(0, inFlightPriorityCount - 1);
        flushNonPriorityQueue();
    };
    const safetyTimer = setTimeout(end, 450);
    return () => {
        clearTimeout(safetyTimer);
        end();
    };
}

export const clearLoadedSrcs = () => {
    loadedSrcs.clear();
    inFlightPriorityCount = 0;
    pendingNonPriorityCallbacks.clear();
    if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
};
