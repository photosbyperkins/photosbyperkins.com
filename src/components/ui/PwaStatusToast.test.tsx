import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import PwaStatusToast from './PwaStatusToast';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
            <div className={className} {...props}>
                {children}
            </div>
        ),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('PwaStatusToast', () => {
    beforeEach(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders nothing when initially online', () => {
        render(<PwaStatusToast />);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('shows offline message when browser goes offline', () => {
        render(<PwaStatusToast />);

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        expect(screen.getByRole('status')).not.toBeNull();
        expect(screen.getByText(/Offline Mode — Viewing cached photos/i)).not.toBeNull();
    });

    it('shows "Back online" message when returning online', () => {
        render(<PwaStatusToast />);

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });
        expect(screen.getByText(/Offline Mode/i)).not.toBeNull();

        act(() => {
            window.dispatchEvent(new Event('online'));
        });
        expect(screen.getByText(/Back online/i)).not.toBeNull();
    });
});
