import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFirstEventOffset } from './useFirstEventOffset';

describe('useFirstEventOffset', () => {
    let container: HTMLDivElement;
    let wrapper: HTMLDivElement;

    beforeEach(() => {
        wrapper = document.createElement('div');
        container = document.createElement('div');
        wrapper.appendChild(container);
        document.body.appendChild(wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('sets --first-event-offset to 0px when no event is present', () => {
        const ref = { current: container };
        renderHook(() => useFirstEventOffset(ref));

        expect(wrapper.style.getPropertyValue('--first-event-offset')).toBe('0px');
    });

    it('measures distance to first event element and sets CSS property', () => {
        const header = document.createElement('div');
        header.className = 'portfolio__favorites-header';

        const event = document.createElement('article');
        event.className = 'portfolio__event';

        container.appendChild(header);
        container.appendChild(event);

        // Mock getBoundingClientRect
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
            top: 100,
            bottom: 600,
            left: 0,
            right: 800,
            width: 800,
            height: 500,
            x: 0,
            y: 100,
            toJSON: () => ({}),
        });

        vi.spyOn(event, 'getBoundingClientRect').mockReturnValue({
            top: 220,
            bottom: 400,
            left: 0,
            right: 800,
            width: 800,
            height: 180,
            x: 0,
            y: 220,
            toJSON: () => ({}),
        });

        const ref = { current: container };
        renderHook(() => useFirstEventOffset(ref));

        // 220 - 100 = 120px
        expect(wrapper.style.getPropertyValue('--first-event-offset')).toBe('120px');
    });

    it('cleans up CSS property on unmount', () => {
        const event = document.createElement('article');
        event.className = 'portfolio__event';
        container.appendChild(event);

        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
            top: 50,
            bottom: 500,
            left: 0,
            right: 800,
            width: 800,
            height: 450,
            x: 0,
            y: 50,
            toJSON: () => ({}),
        });

        vi.spyOn(event, 'getBoundingClientRect').mockReturnValue({
            top: 80,
            bottom: 300,
            left: 0,
            right: 800,
            width: 800,
            height: 220,
            x: 0,
            y: 80,
            toJSON: () => ({}),
        });

        const ref = { current: container };
        const { unmount } = renderHook(() => useFirstEventOffset(ref));

        expect(wrapper.style.getPropertyValue('--first-event-offset')).toBe('30px');

        unmount();

        expect(wrapper.style.getPropertyValue('--first-event-offset')).toBe('');
    });
});
