import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import CodeLicenseModal from './CodeLicenseModal';
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

describe('CodeLicenseModal', () => {
    let originalClipboard: PropertyDescriptor | undefined;

    beforeEach(() => {
        useAppStore.setState({ isCodeLicenseOpen: false });
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
        render(<CodeLicenseModal />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders MIT license and permissions when open', () => {
        useAppStore.setState({ isCodeLicenseOpen: true });
        render(<CodeLicenseModal />);

        expect(screen.getByRole('dialog')).not.toBeNull();
        expect(screen.getByText('CODE LICENSE')).not.toBeNull();
        expect(screen.getByText(/All source code powering photosbyperkins.com/i)).not.toBeNull();
        expect(screen.getByText(/Permission is hereby granted, free of charge/i)).not.toBeNull();
    });

    it('copies license text to clipboard when copy button is clicked', async () => {
        useAppStore.setState({ isCodeLicenseOpen: true });
        render(<CodeLicenseModal />);

        const copyBtn = screen.getByRole('button', { name: /Copy full MIT license text/i });
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('MIT License'));
        await waitFor(() => {
            expect(screen.getByText(/Copied to Clipboard/i)).not.toBeNull();
        });
    });

    it('closes modal when close button is clicked', () => {
        useAppStore.setState({ isCodeLicenseOpen: true });
        render(<CodeLicenseModal />);

        const closeBtn = screen.getByRole('button', { name: /^Close$/i });
        fireEvent.click(closeBtn);

        expect(useAppStore.getState().isCodeLicenseOpen).toBe(false);
    });
});
