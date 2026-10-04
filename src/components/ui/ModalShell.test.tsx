import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ModalShell from './ModalShell';

describe('ModalShell', () => {
    afterEach(() => {
        cleanup();
    });
    it('does not render content when isOpen is false', () => {
        render(
            <ModalShell isOpen={false} onClose={vi.fn()} title="Test Modal" ariaLabel="Test Dialog">
                <div>Modal Body Content</div>
            </ModalShell>
        );

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.queryByText('Modal Body Content')).toBeNull();
    });

    it('renders dialog elements correctly when isOpen is true', () => {
        render(
            <ModalShell isOpen={true} onClose={vi.fn()} title="Test Modal" ariaLabel="Test Dialog">
                <div>Modal Body Content</div>
            </ModalShell>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeDefined();
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(dialog.getAttribute('aria-label')).toBe('Test Dialog');
        expect(screen.getByText('Test Modal')).toBeDefined();
        expect(screen.getByText('Modal Body Content')).toBeDefined();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(
            <ModalShell isOpen={true} onClose={onClose} title="Test Modal" ariaLabel="Test Dialog">
                <div>Modal Content</div>
            </ModalShell>
        );

        const closeBtn = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
        const onClose = vi.fn();
        render(
            <ModalShell isOpen={true} onClose={onClose} title="Test Modal" ariaLabel="Test Dialog">
                <div>Modal Content</div>
            </ModalShell>
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders external link when externalUrl is provided', () => {
        render(
            <ModalShell
                isOpen={true}
                onClose={vi.fn()}
                title="Test Modal"
                ariaLabel="Test Dialog"
                externalUrl="https://example.com"
                externalTitle="Visit Example"
            >
                <div>Modal Content</div>
            </ModalShell>
        );

        const link = screen.getByRole('link', { name: /visit example/i });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://example.com');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('renders headerActions and footer when provided', () => {
        render(
            <ModalShell
                isOpen={true}
                onClose={vi.fn()}
                title="Custom Actions"
                ariaLabel="Custom Dialog"
                headerActions={<button type="button">Custom Action</button>}
                footer={<div>Custom Footer</div>}
            >
                <div>Modal Content</div>
            </ModalShell>
        );

        expect(screen.getByText('Custom Action')).toBeDefined();
        expect(screen.getByText('Custom Footer')).toBeDefined();
    });

    it('applies custom maxWidth and className', () => {
        render(
            <ModalShell
                isOpen={true}
                onClose={vi.fn()}
                title="Wide Modal"
                ariaLabel="Wide Dialog"
                maxWidth="wide"
                className="custom-test-class"
            >
                <div>Modal Content</div>
            </ModalShell>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog.className).toContain('modal-shell--wide');
        expect(dialog.className).toContain('custom-test-class');
    });
});
