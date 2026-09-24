/**
 * Drift-compensating smooth scroll utility for photosbyperkins.com.
 *
 * Automatically adapts destination coordinates during animation as lazy-loaded
 * images and intervening event skeleton cards mount and expand, preventing the
 * multi-thousand-pixel drift inherent to native scrollIntoView on dynamic feeds.
 */

export interface ScrollToElementOptions {
    /**
     * Target offset from the top of the viewport in pixels.
     * If omitted, dynamically calculates (--nav-height-total + 24px) ~ 104px.
     */
    offset?: number;
    /**
     * Duration of the smooth scroll in milliseconds. Defaults to 700ms.
     */
    duration?: number;
    /**
     * Scroll behavior. 'smooth' (default) uses the drift-compensating RAF loop.
     * 'instant' or 'auto' performs an immediate jump.
     */
    behavior?: 'smooth' | 'instant' | 'auto';
    /**
     * Callback when scrolling has arrived and settled.
     */
    onComplete?: () => void;
    /**
     * Maximum time in ms to wait for the target element to mount if not yet in DOM
     * (e.g., when year chunks part 2/3 are still trickling in). Defaults to 3000ms.
     * Set to 0 to disable.
     */
    waitForTimeoutMs?: number;
}

export type CancelScrollFn = () => void;

/**
 * Calculates the dynamic sticky header offset based on CSS variables.
 * Reads --nav-height-total (44px nav + 36px year bar = 80px) and adds 24px margin.
 */
export function getStickyNavOffset(): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 104;
    try {
        const val = getComputedStyle(document.documentElement).getPropertyValue('--nav-height-total');
        const parsed = parseFloat(val);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed + 24; // 80 + 24 = 104px
        }
    } catch {
        // Fallback
    }
    return 104;
}

/**
 * Resolves a target element from an HTMLElement reference or DOM ID string.
 */
export function resolveTargetElement(target: HTMLElement | string): HTMLElement | null {
    if (typeof target !== 'string') return target;
    if (typeof document === 'undefined') return null;
    const id = target.startsWith('#') ? target.slice(1) : target;
    return document.getElementById(id);
}

/**
 * Checks whether an element is the first portfolio event on the page.
 */
export function isFirstPortfolioEvent(el: HTMLElement): boolean {
    if (typeof document === 'undefined') return false;
    const firstEvent = document.querySelector?.('.portfolio__events .portfolio__event, .portfolio__event');
    if (!firstEvent) return false;
    return el === firstEvent || Boolean(el.closest?.('.portfolio__event') === firstEvent);
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Scrolls to a target element with dynamic drift compensation.
 *
 * @returns A cancel function to abort the in-flight scroll animation.
 */
export function scrollToElement(target: HTMLElement | string, options?: ScrollToElementOptions): CancelScrollFn {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => {};
    }

    const el = resolveTargetElement(target);

    // If element is not yet in DOM and waiting is allowed, observe DOM mutations
    if (!el && typeof target === 'string' && (options?.waitForTimeoutMs ?? 3000) > 0) {
        const timeoutMs = options?.waitForTimeoutMs ?? 3000;
        const id = target.startsWith('#') ? target.slice(1) : target;
        let innerCancel: CancelScrollFn | null = null;

        const observer = new MutationObserver(() => {
            const found = document.getElementById(id);
            if (found) {
                observer.disconnect();
                clearTimeout(timer);
                innerCancel = scrollToElement(found, { ...options, waitForTimeoutMs: 0 });
            }
        });

        const timer = setTimeout(() => {
            observer.disconnect();
        }, timeoutMs);

        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            clearTimeout(timer);
            innerCancel?.();
        };
    }

    if (!el) {
        return () => {};
    }

    const desiredOffset = options?.offset ?? getStickyNavOffset();
    const isFirstEvent = isFirstPortfolioEvent(el);

    // Instant / Auto Jump path
    if (options?.behavior === 'instant' || options?.behavior === 'auto') {
        const targetY = isFirstEvent ? 0 : Math.max(0, el.getBoundingClientRect().top + window.scrollY - desiredOffset);
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
        options?.onComplete?.();
        return () => {};
    }

    // Drift-compensating smooth RAF loop
    let isCancelled = false;
    let rafId: number | null = null;

    const onUserInteraction = (e: Event) => {
        // Only cancel on actual scroll inputs
        if (e.type === 'keydown') {
            const key = (e as KeyboardEvent).key;
            if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(key)) {
                return;
            }
        }
        cancel();
    };

    const cleanup = () => {
        window.removeEventListener('wheel', onUserInteraction);
        window.removeEventListener('touchmove', onUserInteraction);
        window.removeEventListener('keydown', onUserInteraction);
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };

    const cancel = () => {
        if (isCancelled) return;
        isCancelled = true;
        cleanup();
    };

    window.addEventListener('wheel', onUserInteraction, { passive: true });
    window.addEventListener('touchmove', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });

    const duration = options?.duration ?? 700;
    const startTime = performance.now();
    const startY = window.scrollY;

    const step = (currentTime: number) => {
        if (isCancelled) return;

        const elapsed = Math.max(0, currentTime - startTime);
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        // Crucial: If scrolling to the first event, always scroll to 0 (top of page).
        // Otherwise, recalculate the target element's live absolute Y position in the document
        // on every frame. As intervening skeleton items expand, this value increases automatically.
        const currentTargetY = isFirstEvent
            ? 0
            : Math.max(0, el!.getBoundingClientRect().top + window.scrollY - desiredOffset);
        const newY = startY + (currentTargetY - startY) * ease;

        // Use behavior: 'instant' to prevent global CSS `html { scroll-behavior: smooth }`
        // from choking or competing with frame-by-frame RAF positioning.
        window.scrollTo({ top: Math.max(0, newY), behavior: 'instant' as ScrollBehavior });

        if (progress < 1) {
            rafId = requestAnimationFrame(step);
        } else {
            if (isFirstEvent) {
                window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            } else {
                // Final convergence check: did any elements expand right at the end of the animation?
                const finalDiff = el!.getBoundingClientRect().top - desiredOffset;
                if (Math.abs(finalDiff) > 2) {
                    window.scrollTo({
                        top: Math.max(0, window.scrollY + finalDiff),
                        behavior: 'instant' as ScrollBehavior,
                    });
                }
            }
            cleanup();
            options?.onComplete?.();
        }
    };

    rafId = requestAnimationFrame(step);
    return cancel;
}
