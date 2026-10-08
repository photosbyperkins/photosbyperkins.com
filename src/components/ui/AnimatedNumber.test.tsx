import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import AnimatedNumber from './AnimatedNumber';

let mockReduced = false;
vi.mock('../../hooks/useReducedMotion', () => ({
    useReducedMotion: () => mockReduced,
}));

describe('AnimatedNumber', () => {
    afterEach(() => {
        cleanup();
        mockReduced = false;
    });

    it('renders the final formatted value immediately on first mount', () => {
        render(<AnimatedNumber value={1234} />);
        expect(screen.getByText('1,234')).toBeDefined();
    });

    it('tweens from the previous value to the new value when it changes', async () => {
        const { rerender } = render(<AnimatedNumber value={100} duration={0.05} />);
        rerender(<AnimatedNumber value={200} duration={0.05} />);
        // First frame after the change still shows the old number (no flash of the new one)
        expect(screen.getByText('100')).toBeDefined();
        await waitFor(() => expect(screen.getByText('200')).toBeDefined());
    });

    it('jumps straight to the new value under reduced motion', () => {
        mockReduced = true;
        const { rerender } = render(<AnimatedNumber value={100} />);
        rerender(<AnimatedNumber value={5000} />);
        expect(screen.getByText('5,000')).toBeDefined();
    });
});
