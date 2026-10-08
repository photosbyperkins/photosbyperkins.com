import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

describe('useFocusTrap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('does nothing when isActive is false', () => {
        const container = document.createElement('div');
        const button = document.createElement('button');
        container.appendChild(button);
        document.body.appendChild(container);

        renderHook(() => useFocusTrap({ current: container }, false));

        act(() => {
            vi.advanceTimersByTime(50);
        });

        expect(document.activeElement).not.toBe(button);
    });

    it('focuses initialFocusRef element when provided', () => {
        const container = document.createElement('div');
        const btn1 = document.createElement('button');
        const btn2 = document.createElement('button');
        container.appendChild(btn1);
        container.appendChild(btn2);
        document.body.appendChild(container);

        renderHook(() => useFocusTrap({ current: container }, true, { current: btn2 }));

        act(() => {
            vi.advanceTimersByTime(20);
        });

        expect(document.activeElement).toBe(btn2);
    });

    it('focuses the first focusable button when initialFocusRef is not provided', () => {
        const container = document.createElement('div');
        const btn1 = document.createElement('button');
        const btn2 = document.createElement('button');
        container.appendChild(btn1);
        container.appendChild(btn2);
        document.body.appendChild(container);

        renderHook(() => useFocusTrap({ current: container }, true));

        act(() => {
            vi.advanceTimersByTime(20);
        });

        expect(document.activeElement).toBe(btn1);
    });

    it('traps Tab key navigation by cycling focus between first and last elements', () => {
        const container = document.createElement('div');
        const btn1 = document.createElement('button');
        const btn2 = document.createElement('button');
        container.appendChild(btn1);
        container.appendChild(btn2);
        document.body.appendChild(container);

        renderHook(() => useFocusTrap({ current: container }, true));

        act(() => {
            vi.advanceTimersByTime(20);
        });

        btn2.focus();
        expect(document.activeElement).toBe(btn2);

        // Tab from last element wraps to first
        const tabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
        });
        window.dispatchEvent(tabEvent);

        expect(document.activeElement).toBe(btn1);

        // Shift+Tab from first element wraps to last
        const shiftTabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });
        window.dispatchEvent(shiftTabEvent);

        expect(document.activeElement).toBe(btn2);
    });

    it('restores previous focus on unmount', () => {
        const outsideBtn = document.createElement('button');
        document.body.appendChild(outsideBtn);
        outsideBtn.focus();
        expect(document.activeElement).toBe(outsideBtn);

        const container = document.createElement('div');
        const modalBtn = document.createElement('button');
        container.appendChild(modalBtn);
        document.body.appendChild(container);

        const { unmount } = renderHook(() => useFocusTrap({ current: container }, true));

        act(() => {
            vi.advanceTimersByTime(20);
        });

        expect(document.activeElement).toBe(modalBtn);

        unmount();

        expect(document.activeElement).toBe(outsideBtn);
    });

    it('skips disabled and aria-hidden elements during Tab navigation', () => {
        const container = document.createElement('div');
        const btn1 = document.createElement('button');
        const disabledBtn = document.createElement('button');
        disabledBtn.setAttribute('disabled', 'true');
        const hiddenBtn = document.createElement('button');
        hiddenBtn.setAttribute('aria-hidden', 'true');
        const btn2 = document.createElement('button');

        container.appendChild(btn1);
        container.appendChild(disabledBtn);
        container.appendChild(hiddenBtn);
        container.appendChild(btn2);
        document.body.appendChild(container);

        renderHook(() => useFocusTrap({ current: container }, true));

        act(() => {
            vi.advanceTimersByTime(20);
        });

        btn2.focus();
        expect(document.activeElement).toBe(btn2);

        // Tab from btn2 wraps directly to btn1, skipping disabled and aria-hidden
        const tabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
        });
        window.dispatchEvent(tabEvent);

        expect(document.activeElement).toBe(btn1);
    });

    describe('restoreFocus: false (nested dialog takes over)', () => {
        const setup = () => {
            const outsideBtn = document.createElement('button');
            document.body.appendChild(outsideBtn);
            outsideBtn.focus();

            const container = document.createElement('div');
            const innerBtn = document.createElement('button');
            container.appendChild(innerBtn);
            document.body.appendChild(container);

            const hook = renderHook(
                ({ nestedOpen }) =>
                    useFocusTrap({ current: container }, !nestedOpen, undefined, { restoreFocus: !nestedOpen }),
                { initialProps: { nestedOpen: false } }
            );
            act(() => {
                vi.advanceTimersByTime(20);
            });
            expect(document.activeElement).toBe(innerBtn);
            return { outsideBtn, innerBtn, hook };
        };

        it('does not pull focus back behind the dialog when a nested dialog opens', () => {
            const { innerBtn, hook } = setup();

            hook.rerender({ nestedOpen: true });

            expect(document.activeElement).toBe(innerBtn);
        });

        it('keeps the original return target across pause/resume', () => {
            const { outsideBtn, innerBtn, hook } = setup();

            hook.rerender({ nestedOpen: true });
            hook.rerender({ nestedOpen: false });
            act(() => {
                vi.advanceTimersByTime(20);
            });
            expect(document.activeElement).toBe(innerBtn);

            hook.unmount();
            expect(document.activeElement).toBe(outsideBtn);
        });

        it('restores focus when unmounted while paused', () => {
            const { outsideBtn, hook } = setup();

            hook.rerender({ nestedOpen: true });
            hook.unmount();

            expect(document.activeElement).toBe(outsideBtn);
        });
    });
});
