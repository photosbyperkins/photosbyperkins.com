import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import IframeOverlay from './IframeOverlay';
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

describe('IframeOverlay', () => {
    beforeEach(() => {
        useAppStore.setState({ iframeUrl: null, iframeTitle: 'WFTDA STATS', iframeExternalUrl: null });
        window.fetch = vi.fn().mockResolvedValue(new Response('<html><body>Mocked</body></html>', { status: 200 }));
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders nothing when iframeUrl is null', () => {
        render(<IframeOverlay />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders iframe with loading indicator when iframeUrl is provided', () => {
        useAppStore.setState({
            iframeUrl: 'https://stats.wftda.com/match/1234',
            iframeTitle: 'Match Details',
            iframeExternalUrl: 'https://stats.wftda.com/match/1234',
        });

        render(<IframeOverlay />);

        expect(screen.getByRole('dialog')).not.toBeNull();
        expect(screen.getByText('Match Details')).not.toBeNull();
        expect(screen.getByText('Loading...')).not.toBeNull();

        const iframe = document.querySelector('iframe') as HTMLIFrameElement;
        expect(iframe).not.toBeNull();
        expect(iframe.src).toBe('https://stats.wftda.com/match/1234');

        // Simulate iframe onLoad
        fireEvent.load(iframe);
        expect(screen.queryByText('Loading...')).toBeNull();
    });

    it('closes overlay when close button is clicked', () => {
        useAppStore.setState({
            iframeUrl: 'https://stats.wftda.com/match/1234',
            iframeTitle: 'Match Details',
        });

        render(<IframeOverlay />);

        const closeBtn = screen.getByRole('button', { name: /^Close$/i });
        fireEvent.click(closeBtn);

        expect(useAppStore.getState().iframeUrl).toBeNull();
    });
});
