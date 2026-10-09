import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryExportButton } from './StoryExportButton';

describe('StoryExportButton', () => {
    const baseProps = {
        canShare: false,
        isDownloaded: false,
        isExporting: false,
        isBlocked: false,
        progress: null as number | null,
        accessibleLabel: 'Download Story Card',
        statusToast: null as string | null,
        onExport: vi.fn(),
        onCancel: vi.fn(),
    };

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    const visibleLabels = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('.story-export-button__label')).map((el) =>
            el.getAttribute('data-visible')
        );

    it('idle: shows the download label, exports on click, and keeps the ✕ slot inert', () => {
        const { container } = render(<StoryExportButton {...baseProps} />);

        expect(container.querySelector('.story-export-button--idle')).not.toBeNull();
        expect(visibleLabels(container)).toEqual(['true', 'false', 'false']);

        const main = screen.getByRole('button', { name: 'Download Story Card' });
        fireEvent.click(main);
        expect(baseProps.onExport).toHaveBeenCalledTimes(1);

        // ✕ is reserved but hidden from AT, unfocusable and disabled
        const cancel = container.querySelector('.story-export-button__cancel') as HTMLButtonElement;
        expect(cancel).not.toBeNull();
        expect(cancel.disabled).toBe(true);
        expect(cancel.getAttribute('aria-hidden')).toBe('true');
        expect(cancel.tabIndex).toBe(-1);
        expect(screen.queryByRole('button', { name: 'Cancel video export' })).toBeNull();
    });

    it('rendering: shows progress, fills the bar, and only the ✕ cancels', () => {
        const { container } = render(
            <StoryExportButton {...baseProps} isExporting progress={45} accessibleLabel="Rendering video 45%" />
        );

        const outer = container.querySelector('.story-export-button--rendering') as HTMLElement;
        expect(outer).not.toBeNull();
        expect(outer.style.getPropertyValue('--story-export-progress')).toBe('0.45');
        expect(visibleLabels(container)).toEqual(['false', 'true', 'false']);
        expect(container.querySelector('.story-export-button__progress-text')?.textContent).toBe('Rendering 45%');

        // Main button is disabled while rendering; it never cancels
        const main = container.querySelector('.story-export-button__main') as HTMLButtonElement;
        expect(main.disabled).toBe(true);

        const cancel = screen.getByRole('button', { name: 'Cancel video export' }) as HTMLButtonElement;
        expect(cancel.disabled).toBe(false);
        expect(cancel.getAttribute('aria-hidden')).toBe('false');
        fireEvent.click(cancel);
        expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
        expect(baseProps.onExport).not.toHaveBeenCalled();
    });

    it('done: shows the downloaded label and disables the button', () => {
        const { container } = render(<StoryExportButton {...baseProps} isDownloaded />);

        expect(container.querySelector('.story-export-button--done')).not.toBeNull();
        expect(visibleLabels(container)).toEqual(['false', 'false', 'true']);
        expect(container.textContent).toContain('Story Card Downloaded');
        expect((container.querySelector('.story-export-button__main') as HTMLButtonElement).disabled).toBe(true);
    });

    it('uses share wording when sharing is available', () => {
        const { container } = render(<StoryExportButton {...baseProps} canShare accessibleLabel="Share Story Card" />);
        expect(container.textContent).toContain('Share Story Card');
        expect(container.textContent).toContain('Story Card Shared');
    });

    it('blocked: disables the main button with the explanatory label', () => {
        const { container } = render(
            <StoryExportButton {...baseProps} isBlocked accessibleLabel="Pick 1 more frame to download" />
        );
        const main = screen.getByRole('button', { name: 'Pick 1 more frame to download' }) as HTMLButtonElement;
        expect(main.disabled).toBe(true);
        expect(main.getAttribute('title')).toBe('Pick 1 more frame to download');
        expect(container.querySelector('.story-export-button--disabled')).not.toBeNull();
    });

    it('renders the status toast, flagging errors', () => {
        const { container, rerender } = render(<StoryExportButton {...baseProps} statusToast="Saved to downloads" />);
        const toast = container.querySelector('.story-export-modal__toast') as HTMLElement;
        expect(toast.textContent).toBe('Saved to downloads');
        expect(toast.classList.contains('story-export-modal__toast--error')).toBe(false);

        rerender(<StoryExportButton {...baseProps} statusToast="Video export failed" />);
        expect(container.querySelector('.story-export-modal__toast--error')).not.toBeNull();
    });
});
