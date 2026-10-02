import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { BatchActionBar } from './BatchActionBar';

describe('BatchActionBar', () => {
    afterEach(() => {
        cleanup();
    });
    const mockOnSelectAll = vi.fn();
    const mockOnDeselectAll = vi.fn();
    const mockOnFavoriteAll = vi.fn();
    const mockOnDownloadZip = vi.fn();
    const mockOnShare = vi.fn();
    const mockOnDone = vi.fn();
    const mockOnStory = vi.fn();

    const getProps = () => ({
        isVisible: true,
        selectedCount: 3,
        totalCount: 10,
        isAllSelected: false,
        onSelectAll: mockOnSelectAll,
        onDeselectAll: mockOnDeselectAll,
        onFavoriteAll: mockOnFavoriteAll,
        isAllFavorited: false,
        onDownloadZip: mockOnDownloadZip,
        isZipping: false,
        zipProgress: 0,
        onShare: mockOnShare,
        onDone: mockOnDone,
        onStory: mockOnStory,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders selection count and action buttons when visible', () => {
        render(<BatchActionBar {...getProps()} />);

        expect(screen.getByRole('toolbar').querySelector('.portfolio__batch-count strong')?.textContent).toBe('3');
        expect(screen.getByText('Selected')).toBeDefined();
        expect(screen.getByRole('button', { name: /Select All/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /story/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Add selected to favorites/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Download selected photos as ZIP/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Share selected photos link/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Done selecting photos/i })).toBeDefined();
    });

    it('does not render toolbar when isVisible is false', () => {
        const { container } = render(<BatchActionBar {...getProps()} isVisible={false} />);
        expect(container.querySelector('.portfolio__batch-bar')).toBeNull();
    });

    it('toggles Select All vs Deselect All based on isAllSelected', () => {
        const { rerender } = render(<BatchActionBar {...getProps()} isAllSelected={false} />);
        const selectAllBtn = screen.getByRole('button', { name: /Select All/i });
        fireEvent.click(selectAllBtn);
        expect(mockOnSelectAll).toHaveBeenCalledTimes(1);

        rerender(<BatchActionBar {...getProps()} isAllSelected={true} />);
        const deselectAllBtn = screen.getByRole('button', { name: /Deselect All/i });
        fireEvent.click(deselectAllBtn);
        expect(mockOnDeselectAll).toHaveBeenCalledTimes(1);
    });

    it('disables action buttons when selectedCount is 0', () => {
        render(<BatchActionBar {...getProps()} selectedCount={0} />);

        const favBtn = screen.getByRole('button', { name: /Add selected to favorites/i }) as HTMLButtonElement;
        const zipBtn = screen.getByRole('button', { name: /Download selected photos as ZIP/i }) as HTMLButtonElement;
        const shareBtn = screen.getByRole('button', { name: /Share selected photos link/i }) as HTMLButtonElement;

        expect(favBtn.disabled).toBe(true);
        expect(zipBtn.disabled).toBe(true);
        expect(shareBtn.disabled).toBe(true);
    });

    it('calls action callbacks when buttons are clicked', () => {
        render(<BatchActionBar {...getProps()} />);

        fireEvent.click(screen.getByRole('button', { name: /Add selected to favorites/i }));
        expect(mockOnFavoriteAll).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /Download selected photos as ZIP/i }));
        expect(mockOnDownloadZip).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /Share selected photos link/i }));
        expect(mockOnShare).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /Done selecting photos/i }));
        expect(mockOnDone).toHaveBeenCalledTimes(1);
    });

    it('displays zipping progress percentage when isZipping is true', () => {
        render(<BatchActionBar {...getProps()} isZipping={true} zipProgress={68} />);

        expect(screen.getByText('68%')).toBeDefined();
        const zipBtn = screen.getByRole('button', { name: /Compressing ZIP: 68%/i }) as HTMLButtonElement;
        expect(zipBtn.disabled).toBe(true);
    });

    it('handles Story button state and clicks for 1 and 3 photos', () => {
        // When 3 photos selected: "Story"
        const { rerender } = render(<BatchActionBar {...getProps()} selectedCount={3} />);
        const burstStoryBtn = screen.getByRole('button', { name: /Create 3-panel triptych story/i });
        expect(burstStoryBtn).toBeDefined();
        expect((burstStoryBtn as HTMLButtonElement).disabled).toBe(false);
        expect(burstStoryBtn.querySelector('.portfolio__batch-btn-text')?.textContent).toBe('Story');

        fireEvent.click(burstStoryBtn);
        expect(mockOnStory).toHaveBeenCalledTimes(1);

        // When 1 photo selected: "Story"
        rerender(<BatchActionBar {...getProps()} selectedCount={1} />);
        const singleStoryBtn = screen.getByRole('button', { name: /Create story with selected photo/i });
        expect(singleStoryBtn).toBeDefined();
        expect((singleStoryBtn as HTMLButtonElement).disabled).toBe(false);
        expect(singleStoryBtn.querySelector('.portfolio__batch-btn-text')?.textContent).toBe('Story');

        fireEvent.click(singleStoryBtn);
        expect(mockOnStory).toHaveBeenCalledTimes(2);

        // When 2 photos selected: disabled
        rerender(<BatchActionBar {...getProps()} selectedCount={2} />);
        const disabledStoryBtn = screen.getByRole('button', {
            name: /Select 1 photo or 3 photos to create a story/i,
        }) as HTMLButtonElement;
        expect(disabledStoryBtn.disabled).toBe(true);
    });
});
