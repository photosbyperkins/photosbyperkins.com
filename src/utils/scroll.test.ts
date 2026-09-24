import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrollToElement, getStickyNavOffset, resolveTargetElement, isFirstPortfolioEvent } from './scroll';

describe('scroll utility', () => {
    describe('SSR safety (Node environment without DOM)', () => {
        it('getStickyNavOffset falls back to default 104 in SSR', () => {
            expect(getStickyNavOffset()).toBe(104);
        });

        it('resolveTargetElement returns null safely when document is undefined', () => {
            expect(resolveTargetElement('any-id')).toBeNull();
        });

        it('scrollToElement does not throw in SSR and returns a no-op cancel function', () => {
            expect(() => {
                const cancel = scrollToElement('any-id');
                expect(typeof cancel).toBe('function');
                cancel();
            }).not.toThrow();
        });
    });

    describe('Browser environment simulation', () => {
        let originalWindow: typeof globalThis.window;
        let originalDocument: typeof globalThis.document;

        beforeEach(() => {
            originalWindow = globalThis.window;
            originalDocument = globalThis.document;
        });

        afterEach(() => {
            globalThis.window = originalWindow;
            globalThis.document = originalDocument;
            vi.restoreAllMocks();
        });

        it('resolves an element by ID when document.getElementById is available', () => {
            const mockEl = { id: 'test-event' } as HTMLElement;
            globalThis.document = {
                getElementById: vi.fn((id: string) => (id === 'test-event' ? mockEl : null)),
            } as unknown as Document;

            expect(resolveTargetElement('test-event')).toBe(mockEl);
            expect(resolveTargetElement('#test-event')).toBe(mockEl);
            expect(resolveTargetElement('nonexistent')).toBeNull();
        });

        it('returns direct element references unchanged', () => {
            const mockEl = { tagName: 'DIV' } as HTMLElement;
            expect(resolveTargetElement(mockEl)).toBe(mockEl);
        });

        it('calculates getStickyNavOffset with getComputedStyle', () => {
            globalThis.window = {} as unknown as Window & typeof globalThis;
            globalThis.document = {
                documentElement: {},
            } as unknown as Document;

            globalThis.getComputedStyle = vi.fn().mockReturnValue({
                getPropertyValue: (prop: string) => (prop === '--nav-height-total' ? '80px' : ''),
            });

            expect(getStickyNavOffset()).toBe(104);
        });

        it('performs instant scroll when behavior is instant', () => {
            const scrollToMock = vi.fn();
            globalThis.window = {
                scrollTo: scrollToMock,
                scrollY: 200,
            } as unknown as Window & typeof globalThis;

            const mockEl = {
                id: 'my-target',
                getBoundingClientRect: vi.fn().mockReturnValue({ top: 500 }),
            } as unknown as HTMLElement;

            globalThis.document = {
                getElementById: vi.fn().mockReturnValue(mockEl),
                documentElement: {},
            } as unknown as Document;

            globalThis.getComputedStyle = vi.fn().mockReturnValue({
                getPropertyValue: () => '80px',
            });

            const onComplete = vi.fn();
            scrollToElement('my-target', {
                behavior: 'instant',
                offset: 100,
                onComplete,
            });

            // targetY = top (500) + scrollY (200) - offset (100) = 600
            expect(scrollToMock).toHaveBeenCalledWith({
                top: 600,
                behavior: 'instant',
            });
            expect(onComplete).toHaveBeenCalled();
        });

        it('always scrolls to top 0 when target is the first portfolio event', () => {
            const scrollToMock = vi.fn();
            globalThis.window = {
                scrollTo: scrollToMock,
                scrollY: 800,
            } as unknown as Window & typeof globalThis;

            const firstEventEl = {
                id: 'event-first',
                getBoundingClientRect: vi.fn().mockReturnValue({ top: 350 }),
                closest: vi.fn().mockReturnValue(null),
            } as unknown as HTMLElement;

            globalThis.document = {
                getElementById: vi.fn((id: string) => (id === 'event-first' ? firstEventEl : null)),
                querySelector: vi.fn((sel: string) => (sel.includes('.portfolio__event') ? firstEventEl : null)),
                documentElement: {},
            } as unknown as Document;

            globalThis.getComputedStyle = vi.fn().mockReturnValue({
                getPropertyValue: () => '80px',
            });

            expect(isFirstPortfolioEvent(firstEventEl)).toBe(true);

            scrollToElement('event-first', {
                behavior: 'instant',
                offset: 104,
            });

            // Even though top (350) + scrollY (800) - offset (104) = 1046,
            // scrolling to the first event must ALWAYS scroll to 0!
            expect(scrollToMock).toHaveBeenCalledWith({
                top: 0,
                behavior: 'instant',
            });
        });
    });
});
