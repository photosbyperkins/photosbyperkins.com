/**
 * Silent app/data updates.
 *
 * A new service worker (code) or a changed `dataVersion` in `/data/index.json` (newly published photos)
 * marks an update as pending. Nothing reloads immediately: the update is applied with a full page load
 * at the next moment the user won't notice — an in-app route change or the tab going to the background —
 * and only when nothing that would lose state is in progress (open lightbox, modal, Story studio, ZIP).
 * Routes are URL-derived, so the reload lands on the same (or newly navigated-to) page.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export type UpdateReason = 'code' | 'data';

export const UPDATED_STORAGE_KEY = 'app-updated';
const DATA_CHECK_INTERVAL_MS = 15 * 60 * 1000;

let pendingReason: UpdateReason | null = null;
const busyKeys = new Set<string>();

export function markUpdatePending(reason: UpdateReason): void {
    // A code update reloads the data too, so it takes precedence for the post-update note
    if (pendingReason === 'code') return;
    pendingReason = reason;
}

export function isUpdatePending(): boolean {
    return pendingReason !== null;
}

/** Marks an activity that a reload would interrupt (e.g. an open Story studio or a running ZIP). */
export function registerBusy(key: string): void {
    busyKeys.add(key);
}

export function unregisterBusy(key: string): void {
    busyKeys.delete(key);
}

export function canApplyNow(): boolean {
    if (busyKeys.size > 0) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    const s = useAppStore.getState();
    return !(
        s.lightbox.isOpen ||
        s.isBatchSelectMode ||
        s.isAboutOpen ||
        s.isAiPolicyOpen ||
        s.isCodeLicenseOpen ||
        s.isPhotoLicenseOpen ||
        s.activeGear ||
        s.iframeUrl
    );
}

export function applyUpdate(): void {
    if (!pendingReason) return;
    try {
        sessionStorage.setItem(UPDATED_STORAGE_KEY, pendingReason);
    } catch {
        // ignore (storage blocked)
    }
    window.location.reload();
}

/** Reads and clears the reason of an update applied by the previous page load. */
export function consumeUpdatedReason(): UpdateReason | null {
    try {
        const value = sessionStorage.getItem(UPDATED_STORAGE_KEY);
        sessionStorage.removeItem(UPDATED_STORAGE_KEY);
        return value === 'code' || value === 'data' ? value : null;
    } catch {
        return null;
    }
}

function tryApply(): void {
    if (isUpdatePending() && canApplyNow()) applyUpdate();
}

/** Applies a pending update on in-app navigation or when the tab is hidden. Mount once, in App. */
export function useApplyPendingUpdate(): void {
    const { pathname } = useLocation();
    const prevPathnameRef = useRef(pathname);

    useEffect(() => {
        if (prevPathnameRef.current === pathname) return;
        prevPathnameRef.current = pathname;
        tryApply();
    }, [pathname]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') tryApply();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);
}

// --- Data version watch ------------------------------------------------------------------

let baselineDataVersion: string | null = null;

async function fetchDataVersion(): Promise<string | null> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    try {
        const res = await fetch(`/data/index.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = (await res.json()) as { dataVersion?: unknown };
        return typeof data?.dataVersion === 'string' && data.dataVersion ? data.dataVersion : null;
    } catch {
        return null;
    }
}

/**
 * Compares the live `dataVersion` against the first one fetched by this page. The baseline is
 * fetched rather than read from the copy inlined into index.html, which `npm run publish` doesn't
 * rebuild — using it would mark every page load as stale.
 */
export async function checkDataVersion(): Promise<void> {
    const remote = await fetchDataVersion();
    if (!remote) return;
    if (baselineDataVersion === null) {
        baselineDataVersion = remote;
        return;
    }
    if (remote !== baselineDataVersion) markUpdatePending('data');
}

export function startDataVersionWatch(): () => void {
    void checkDataVersion();
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') void checkDataVersion();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(() => void checkDataVersion(), DATA_CHECK_INTERVAL_MS);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(interval);
    };
}

/** Internal helper for tests */
export function _resetAppUpdateState(): void {
    pendingReason = null;
    busyKeys.clear();
    baselineDataVersion = null;
}
