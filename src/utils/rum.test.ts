import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    rateVital,
    getPerfVitalsStore,
    recordRumMetric,
    recordRumError,
    initRum,
} from './rum';

describe('rum (Tier 1 in-memory Core Web Vitals & error collector)', () => {
    let cleanupRum: (() => void) | null = null;

    beforeEach(() => {
        delete window.__PERF_VITALS__;
        getPerfVitalsStore().reset();
    });

    afterEach(() => {
        if (cleanupRum) {
            cleanupRum();
            cleanupRum = null;
        }
        vi.restoreAllMocks();
    });

    describe('rateVital', () => {
        it('classifies LCP thresholds accurately', () => {
            expect(rateVital('LCP', 1800)).toBe('good');
            expect(rateVital('LCP', 2500)).toBe('good');
            expect(rateVital('LCP', 3200)).toBe('needs-improvement');
            expect(rateVital('LCP', 4500)).toBe('poor');
        });

        it('classifies INP thresholds accurately', () => {
            expect(rateVital('INP', 120)).toBe('good');
            expect(rateVital('INP', 200)).toBe('good');
            expect(rateVital('INP', 350)).toBe('needs-improvement');
            expect(rateVital('INP', 600)).toBe('poor');
        });

        it('classifies CLS thresholds accurately', () => {
            expect(rateVital('CLS', 0.02)).toBe('good');
            expect(rateVital('CLS', 0.1)).toBe('good');
            expect(rateVital('CLS', 0.18)).toBe('needs-improvement');
            expect(rateVital('CLS', 0.3)).toBe('poor');
        });

        it('classifies TTFB thresholds accurately', () => {
            expect(rateVital('TTFB', 300)).toBe('good');
            expect(rateVital('TTFB', 800)).toBe('good');
            expect(rateVital('TTFB', 1200)).toBe('needs-improvement');
            expect(rateVital('TTFB', 2200)).toBe('poor');
        });
    });

    describe('PerfVitalsStore', () => {
        it('initializes window.__PERF_VITALS__ and records metrics', () => {
            const sample = recordRumMetric('LCP', 1420.56, '/portfolio/2025');
            const store = window.__PERF_VITALS__!;

            expect(store).toBeDefined();
            expect(sample.name).toBe('LCP');
            expect(sample.value).toBe(1420.6);
            expect(sample.rating).toBe('good');
            expect(sample.route).toBe('/portfolio/2025');
            expect(store.metrics.LCP).toEqual(sample);
            expect(store.history).toHaveLength(1);
        });

        it('caps metric history ring buffer at 50 entries', () => {
            const store = getPerfVitalsStore();
            for (let i = 1; i <= 60; i++) {
                recordRumMetric('INP', i * 10);
            }

            expect(store.history).toHaveLength(50);
            expect(store.history[0].value).toBe(110);
            expect(store.history[49].value).toBe(600);
        });

        it('records errors and caps error ring buffer at 20 entries', () => {
            const store = getPerfVitalsStore();
            for (let i = 1; i <= 25; i++) {
                recordRumError('Lightbox', new Error(`Boom #${i}`), 'at Lightbox');
            }

            expect(store.errors).toHaveLength(20);
            expect(store.errors[0].message).toBe('Boom #6');
            expect(store.errors[19].message).toBe('Boom #25');
            expect(store.errors[19].boundary).toBe('Lightbox');
            expect(store.errors[19].componentStack).toBe('at Lightbox');
        });
    });

    describe('initRum', () => {
        it('records TTFB from navigation timing and observes LCP, CLS, and INP', () => {
            const observerCallbacks: Record<string, (list: { getEntries: () => unknown[] }) => void> = {};

            class MockPerformanceObserver {
                private callback: (list: { getEntries: () => unknown[] }) => void;
                constructor(cb: (list: { getEntries: () => unknown[] }) => void) {
                    this.callback = cb;
                }
                observe(opts: { type: string }) {
                    observerCallbacks[opts.type] = this.callback;
                }
                disconnect() {}
            }

            vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
            vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
                { responseStart: 245.4 } as unknown as PerformanceEntry,
            ]);

            cleanupRum = initRum();
            const store = getPerfVitalsStore();

            // TTFB recorded immediately
            expect(store.metrics.TTFB?.value).toBe(245.4);
            expect(store.metrics.TTFB?.rating).toBe('good');

            // Simulate LCP entry
            observerCallbacks['largest-contentful-paint']?.({
                getEntries: () => [{ startTime: 1100 }, { startTime: 1650.2 }],
            });
            expect(store.metrics.LCP?.value).toBe(1650.2);

            // Simulate CLS entries (ignoring hadRecentInput: true)
            observerCallbacks['layout-shift']?.({
                getEntries: () => [
                    { startTime: 100, value: 0.015, hadRecentInput: false },
                    { startTime: 250, value: 0.025, hadRecentInput: false },
                    { startTime: 300, value: 0.5, hadRecentInput: true },
                ],
            });
            expect(store.metrics.CLS?.value).toBe(0.04);

            // Simulate INP entries
            observerCallbacks['event']?.({
                getEntries: () => [
                    { entryType: 'event', duration: 64, interactionId: 1 },
                    { entryType: 'event', duration: 128, interactionId: 2 },
                ],
            });
            expect(store.metrics.INP?.value).toBe(128);
        });

        it('captures uncaught window errors and ignores benign ResizeObserver warnings', () => {
            cleanupRum = initRum();
            const store = getPerfVitalsStore();

            window.dispatchEvent(
                new ErrorEvent('error', {
                    message: 'ResizeObserver loop completed with undelivered notifications.',
                })
            );
            expect(store.errors).toHaveLength(0);

            window.dispatchEvent(
                new ErrorEvent('error', {
                    message: 'Unexpected runtime failure',
                    error: new Error('Unexpected runtime failure'),
                })
            );
            expect(store.errors).toHaveLength(1);
            expect(store.errors[0].boundary).toBe('window.onerror');
            expect(store.errors[0].message).toBe('Unexpected runtime failure');
        });
    });
});
