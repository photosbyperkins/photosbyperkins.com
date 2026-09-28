import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBodyScrollLock } from './useBodyScrollLock';

describe('useBodyScrollLock', () => {
    afterEach(() => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.paddingRight = '';
    });

    it('locks body scroll when active', () => {
        const { unmount } = renderHook(() => useBodyScrollLock(true));

        expect(document.body.style.overflow).toBe('hidden');
        expect(document.body.style.touchAction).toBe('none');

        unmount();
        expect(document.body.style.overflow).toBe('');
        expect(document.body.style.touchAction).toBe('');
    });

    it('does not lock body scroll when lock is false', () => {
        const { unmount } = renderHook(() => useBodyScrollLock(false));

        expect(document.body.style.overflow).toBe('');
        unmount();
        expect(document.body.style.overflow).toBe('');
    });

    it('handles nested lock calls with reference counting', () => {
        const hook1 = renderHook(() => useBodyScrollLock(true));
        const hook2 = renderHook(() => useBodyScrollLock(true));

        expect(document.body.style.overflow).toBe('hidden');

        hook1.unmount();
        // Still locked because hook2 is mounted
        expect(document.body.style.overflow).toBe('hidden');

        hook2.unmount();
        // Now unlocked
        expect(document.body.style.overflow).toBe('');
    });
});
