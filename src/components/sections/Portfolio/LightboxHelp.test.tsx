import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import LightboxHelp from './LightboxHelp';

describe('LightboxHelp', () => {
    afterEach(() => {
        cleanup();
    });
    it('renders nothing when isOpen is false', () => {
        render(<LightboxHelp isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders keyboard shortcuts when isOpen is true', () => {
        render(<LightboxHelp isOpen={true} onClose={vi.fn()} />);

        const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' });
        expect(dialog).toBeDefined();
        expect(screen.getByText('Keyboard Shortcuts')).toBeDefined();
        expect(screen.getByText('Next photo')).toBeDefined();
        expect(screen.getByText('Toggle favorite')).toBeDefined();
        expect(screen.getByText('Story Maker')).toBeDefined();
        expect(screen.getByText('Toggle this help')).toBeDefined();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<LightboxHelp isOpen={true} onClose={onClose} />);

        const closeBtn = screen.getByRole('button', { name: 'Close shortcuts' });
        fireEvent.click(closeBtn);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the background overlay', () => {
        const onClose = vi.fn();
        render(<LightboxHelp isOpen={true} onClose={onClose} />);

        const overlay = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' });
        fireEvent.click(overlay);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
