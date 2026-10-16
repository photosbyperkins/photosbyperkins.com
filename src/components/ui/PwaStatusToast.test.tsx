import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import PwaStatusToast from './PwaStatusToast';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
                <div className={className} {...props}>
                    {children}
                </div>
            ),
        },
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
        useIsPresent: () => true,
    };
});

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

    it('surfaces "New photos available — Refresh" pill on pwa:update-available event', () => {
        render(<PwaStatusToast />);

        act(() => {
            window.dispatchEvent(new CustomEvent('pwa:update-available'));
        });

        expect(screen.getByText(/New photos available/i)).not.toBeNull();
        expect(screen.getByRole('button', { name: /Refresh/i })).not.toBeNull();
    });

    it('detects buildNumber changes in /data/index.json on visibilitychange', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            json: async () => ({ buildNumber: 'build-999' }),
        } as Response);

        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
        });

        render(<PwaStatusToast currentBuildNumber="build-100" />);

        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(screen.getByText(/New photos available/i)).not.toBeNull();
        expect(screen.getByRole('button', { name: /Refresh/i })).not.toBeNull();
    });
});
