import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AiPolicyModal from './AiPolicyModal';
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

describe('AiPolicyModal', () => {
    beforeEach(() => {
        useAppStore.setState({ isAiPolicyOpen: false });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders nothing when closed', () => {
        render(<AiPolicyModal />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders policy sections when open', () => {
        useAppStore.setState({ isAiPolicyOpen: true });
        render(<AiPolicyModal />);

        expect(screen.getByRole('dialog')).not.toBeNull();
        expect(screen.getByText('AI POLICY')).not.toBeNull();
        expect(screen.getByText('Real Moments, Not Prompts')).not.toBeNull();
    });

    it('closes when close button is clicked', () => {
        useAppStore.setState({ isAiPolicyOpen: true });
        render(<AiPolicyModal />);

        const closeBtn = screen.getByRole('button', { name: /^Close$/i });
        fireEvent.click(closeBtn);

        expect(useAppStore.getState().isAiPolicyOpen).toBe(false);
    });
});
