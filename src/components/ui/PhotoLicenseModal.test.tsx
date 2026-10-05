import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import PhotoLicenseModal from './PhotoLicenseModal';
import { useAppStore } from '../../store/useAppStore';

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

describe('PhotoLicenseModal', () => {
    let originalClipboard: PropertyDescriptor | undefined;

    beforeEach(() => {
        useAppStore.setState({ isPhotoLicenseOpen: false });
        originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        cleanup();
        if (originalClipboard) {
            Object.defineProperty(navigator, 'clipboard', originalClipboard);
        }
        vi.restoreAllMocks();
    });

    it('renders nothing when closed', () => {
        render(<PhotoLicenseModal />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders CC license details and permissions when open', () => {
        useAppStore.setState({ isPhotoLicenseOpen: true });
        render(<PhotoLicenseModal />);

        expect(screen.getByRole('dialog')).not.toBeNull();
        expect(screen.getByText('PHOTO LICENSE')).not.toBeNull();
        expect(screen.getByText(/Creative Commons Attribution-ShareAlike 4.0/i)).not.toBeNull();
    });

    it('copies attribution text to clipboard when copy button is clicked', async () => {
        useAppStore.setState({ isPhotoLicenseOpen: true });
        render(<PhotoLicenseModal />);

        const copyBtn = screen.getByRole('button', { name: /Copy attribution credit line/i });
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('CC BY-SA 4.0'));
        await waitFor(() => {
            expect(screen.getByText(/Copied to Clipboard/i)).not.toBeNull();
        });
    });

    it('closes modal when close button is clicked', () => {
        useAppStore.setState({ isPhotoLicenseOpen: true });
        render(<PhotoLicenseModal />);

        const closeBtn = screen.getByRole('button', { name: /^Close$/i });
        fireEvent.click(closeBtn);

        expect(useAppStore.getState().isPhotoLicenseOpen).toBe(false);
    });
});
