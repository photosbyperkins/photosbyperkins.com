import { getBuildNumber } from './build';

export type VitalMetricName = 'LCP' | 'INP' | 'CLS' | 'TTFB';
export type VitalRating = 'good' | 'needs-improvement' | 'poor';

export interface VitalSample {
    name: VitalMetricName;
    value: number;
    rating: VitalRating;
    route: string;
    build: string;
    timestamp: number;
}

export interface CapturedErrorRecord {
    boundary: string;
    message: string;
    stack?: string;
    componentStack?: string;
    route: string;
    build: string;
    timestamp: number;
}

export interface PerfVitalsStore {
    metrics: Record<VitalMetricName, VitalSample | null>;
    history: VitalSample[];
    errors: CapturedErrorRecord[];
    recordMetric: (name: VitalMetricName, value: number, route?: string) => VitalSample;
    recordError: (boundary: string, error: unknown, componentStack?: string) => CapturedErrorRecord;
    reset: () => void;
}

declare global {
    interface Window {
        __PERF_VITALS__?: PerfVitalsStore;
    }
}

const MAX_HISTORY_SAMPLES = 50;
const MAX_ERROR_RECORDS = 20;

const THRESHOLDS: Record<VitalMetricName, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
};

export function rateVital(name: VitalMetricName, value: number): VitalRating {
    const [goodMax, needsImprovementMax] = THRESHOLDS[name];
    if (value <= goodMax) return 'good';
    if (value <= needsImprovementMax) return 'needs-improvement';
    return 'poor';
}

function getCurrentRoute(): string {
    if (typeof window === 'undefined' || !window.location) return '/';
    return `${window.location.pathname}${window.location.search}`;
}

function formatErrorMessage(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
        return { message: error.message || error.name, stack: error.stack };
    }
    if (typeof error === 'string') {
        return { message: error };
    }
    try {
        return { message: JSON.stringify(error) };
    } catch {
        return { message: String(error) };
    }
}

function createPerfVitalsStore(): PerfVitalsStore {
    const store: PerfVitalsStore = {
        metrics: {
            LCP: null,
            INP: null,
            CLS: null,
            TTFB: null,
        },
        history: [],
        errors: [],
        recordMetric(name: VitalMetricName, value: number, route = getCurrentRoute()): VitalSample {
            const numericValue = Number.isFinite(value) && value >= 0 ? Number(value.toFixed(name === 'CLS' ? 4 : 1)) : 0;
            const sample: VitalSample = {
                name,
                value: numericValue,
                rating: rateVital(name, numericValue),
                route,
                build: getBuildNumber(),
                timestamp: Date.now(),
            };
            store.metrics[name] = sample;
            store.history.push(sample);
            if (store.history.length > MAX_HISTORY_SAMPLES) {
                store.history.shift();
            }
            return sample;
        },
        recordError(boundary: string, error: unknown, componentStack?: string): CapturedErrorRecord {
            const { message, stack } = formatErrorMessage(error);
            const record: CapturedErrorRecord = {
                boundary,
                message,
                ...(stack ? { stack } : {}),
                ...(componentStack ? { componentStack } : {}),
                route: getCurrentRoute(),
                build: getBuildNumber(),
                timestamp: Date.now(),
            };
            store.errors.push(record);
            if (store.errors.length > MAX_ERROR_RECORDS) {
                store.errors.shift();
            }
            return record;
        },
        reset() {
            store.metrics.LCP = null;
            store.metrics.INP = null;
            store.metrics.CLS = null;
            store.metrics.TTFB = null;
            store.history.length = 0;
            store.errors.length = 0;
        },
    };
    return store;
}

let fallbackStore: PerfVitalsStore | null = null;

export function getPerfVitalsStore(): PerfVitalsStore {
    if (typeof window !== 'undefined') {
        if (!window.__PERF_VITALS__) {
            window.__PERF_VITALS__ = createPerfVitalsStore();
        }
        return window.__PERF_VITALS__;
    }
    if (!fallbackStore) {
        fallbackStore = createPerfVitalsStore();
    }
    return fallbackStore;
}

export function recordRumMetric(name: VitalMetricName, value: number, route?: string): VitalSample {
    return getPerfVitalsStore().recordMetric(name, value, route);
}

export function recordRumError(boundary: string, error: unknown, componentStack?: string): CapturedErrorRecord {
    return getPerfVitalsStore().recordError(boundary, error, componentStack);
}

interface LayoutShiftAttributionEntry extends PerformanceEntry {
    value: number;
    hadRecentInput: boolean;
}

interface EventPerformanceEntry extends PerformanceEntry {
    interactionId?: number;
}

let activeCleanup: (() => void) | null = null;

export function initRum(): () => void {
    if (activeCleanup) {
        return activeCleanup;
    }

    const store = getPerfVitalsStore();
    const observers: PerformanceObserver[] = [];

    if (typeof window === 'undefined') {
        return () => {};
    }

    // 1. TTFB from Navigation Timing
    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
        try {
            const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
            const nav = navEntries[0];
            if (nav && typeof nav.responseStart === 'number' && nav.responseStart >= 0) {
                store.recordMetric('TTFB', nav.responseStart);
            }
        } catch {
            // Ignore unsupported navigation timing
        }
    }

    if (typeof PerformanceObserver !== 'undefined') {
        // 2. LCP (Largest Contentful Paint)
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                    store.recordMetric('LCP', lastEntry.startTime);
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            observers.push(lcpObserver);
        } catch {
            // Browser does not support largest-contentful-paint
        }

        // 3. CLS (Cumulative Layout Shift - max session window)
        try {
            let clsValue = 0;
            let sessionValue = 0;
            let sessionEntries: LayoutShiftAttributionEntry[] = [];

            const clsObserver = new PerformanceObserver((list) => {
                for (const rawEntry of list.getEntries()) {
                    const entry = rawEntry as LayoutShiftAttributionEntry;
                    if (entry.hadRecentInput) continue;

                    const firstSessionEntry = sessionEntries[0];
                    const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

                    if (
                        sessionValue &&
                        firstSessionEntry &&
                        lastSessionEntry &&
                        entry.startTime - lastSessionEntry.startTime < 1000 &&
                        entry.startTime - firstSessionEntry.startTime < 5000
                    ) {
                        sessionValue += entry.value;
                        sessionEntries.push(entry);
                    } else {
                        sessionValue = entry.value;
                        sessionEntries = [entry];
                    }

                    if (sessionValue >= clsValue) {
                        clsValue = sessionValue;
                        store.recordMetric('CLS', clsValue);
                    }
                }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
            observers.push(clsObserver);
        } catch {
            // Browser does not support layout-shift
        }

        // 4. INP (Interaction to Next Paint - worst interaction latency)
        try {
            let maxInp = 0;
            const inpObserver = new PerformanceObserver((list) => {
                for (const rawEntry of list.getEntries()) {
                    const entry = rawEntry as EventPerformanceEntry;
                    if (!entry.interactionId && entry.entryType === 'event') {
                        // Ignore non-interactive events when interactionId is supported
                        if ('interactionId' in entry) continue;
                    }
                    if (entry.duration > maxInp) {
                        maxInp = entry.duration;
                        store.recordMetric('INP', maxInp);
                    }
                }
            });
            inpObserver.observe({
                type: 'event',
                buffered: true,
                durationThreshold: 40,
            } as PerformanceObserverInit);
            observers.push(inpObserver);
        } catch {
            // Browser does not support event timing observer
        }
    }

    // 5. Global uncaught error & unhandled rejection listeners
    const handleWindowError = (event: ErrorEvent) => {
        const msg = event.message || '';
        if (msg.includes('ResizeObserver loop')) return;
        store.recordError('window.onerror', event.error || msg || 'Uncaught window error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        store.recordError('window.unhandledrejection', event.reason ?? 'Unhandled promise rejection');
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    activeCleanup = () => {
        for (const obs of observers) {
            try {
                obs.disconnect();
            } catch {
                // Ignore disconnect errors
            }
        }
        window.removeEventListener('error', handleWindowError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        activeCleanup = null;
    };

    return activeCleanup;
}
