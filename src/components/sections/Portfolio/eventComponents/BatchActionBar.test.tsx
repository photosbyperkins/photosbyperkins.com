import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
        expect(screen.queryByRole('button', { name: /Share selected photos link/i })).toBeNull();
        expect(screen.getByRole('button', { name: /Done selecting photos/i })).toBeDefined();
    });

    it('renders a heart icon for favorites and reflects favorited state', () => {
        const { rerender } = render(<BatchActionBar {...getProps()} isAllFavorited={false} />);
        const favBtn = screen.getByRole('button', { name: /Add selected to favorites/i });
        const heartSvg = favBtn.querySelector('svg');
        expect(heartSvg).toBeDefined();
        expect(heartSvg?.classList.contains('portfolio__batch-btn-icon')).toBe(true);
        expect(heartSvg?.getAttribute('fill')).toBe('none');

        rerender(<BatchActionBar {...getProps()} isAllFavorited={true} />);
        const favoritedBtn = screen.getByRole('button', { name: /Remove selected from favorites/i });
        const favoritedHeartSvg = favoritedBtn.querySelector('svg');
        expect(favoritedHeartSvg).toBeDefined();
        expect(favoritedHeartSvg?.classList.contains('portfolio__batch-btn-icon')).toBe(true);
        expect(favoritedHeartSvg?.getAttribute('fill')).toBe('currentColor');
    });

    it('shows download button and hides share button when canShare is false', () => {
        render(<BatchActionBar {...getProps()} canShare={false} />);
        expect(screen.getByRole('button', { name: /Download selected photos as ZIP/i })).toBeDefined();
        expect(screen.queryByRole('button', { name: /Share selected photos link/i })).toBeNull();
    });

    it('shows share button and hides download button when canShare is true', () => {
        render(<BatchActionBar {...getProps()} canShare={true} />);
        expect(screen.getByRole('button', { name: /Share selected photos link/i })).toBeDefined();
        expect(screen.queryByRole('button', { name: /Download selected photos as ZIP/i })).toBeNull();
    });

    it('uses useCanShare hook directly when canShare prop is not provided', () => {
        const originalNavigator = window.navigator;
        try {
            Object.defineProperty(window, 'navigator', {
                value: {
                    share: () => Promise.resolve(),
                    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                    maxTouchPoints: 5,
                },
                writable: true,
                configurable: true,
            });

            render(<BatchActionBar {...getProps()} />);
            expect(screen.getByRole('button', { name: /Share selected photos link/i })).toBeDefined();
            expect(screen.queryByRole('button', { name: /Download selected photos as ZIP/i })).toBeNull();
        } finally {
            Object.defineProperty(window, 'navigator', {
                value: originalNavigator,
                writable: true,
                configurable: true,
            });
        }
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
        const { rerender } = render(<BatchActionBar {...getProps()} selectedCount={0} canShare={false} />);

        const favBtn = screen.getByRole('button', { name: /Add selected to favorites/i }) as HTMLButtonElement;
        const zipBtn = screen.getByRole('button', { name: /Download selected photos as ZIP/i }) as HTMLButtonElement;

        expect(favBtn.disabled).toBe(true);
        expect(zipBtn.disabled).toBe(true);

        rerender(<BatchActionBar {...getProps()} selectedCount={0} canShare={true} />);
        const shareBtn = screen.getByRole('button', { name: /Share selected photos link/i }) as HTMLButtonElement;
        expect(shareBtn.disabled).toBe(true);
    });

    it('calls action callbacks when buttons are clicked', () => {
        const { rerender } = render(<BatchActionBar {...getProps()} canShare={false} />);

        fireEvent.click(screen.getByRole('button', { name: /Add selected to favorites/i }));
        expect(mockOnFavoriteAll).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /Download selected photos as ZIP/i }));
        expect(mockOnDownloadZip).toHaveBeenCalledTimes(1);

        rerender(<BatchActionBar {...getProps()} canShare={true} />);
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

    it('handles Story button state and clicks for 1, 3, and >3 photos', () => {
        // When 3 photos selected: "Story"
        const { rerender } = render(<BatchActionBar {...getProps()} selectedCount={3} />);
        const burstStoryBtn = screen.getByRole('button', {
            name: /Create 3-panel triptych story with selected photos$/i,
        });
        expect(burstStoryBtn).toBeDefined();
        expect((burstStoryBtn as HTMLButtonElement).disabled).toBe(false);
        expect(burstStoryBtn.querySelector('.portfolio__batch-btn-text')?.textContent).toBe('Story');

        fireEvent.click(burstStoryBtn);
        expect(mockOnStory).toHaveBeenCalledTimes(1);

        // When 4 photos selected: "Story" (triptych with > 3 photos)
        rerender(<BatchActionBar {...getProps()} selectedCount={4} />);
        const multiStoryBtn = screen.getByRole('button', {
            name: /Create 3-panel triptych story with selected photos \(4 selected\)/i,
        });
        expect(multiStoryBtn).toBeDefined();
        expect((multiStoryBtn as HTMLButtonElement).disabled).toBe(false);
        expect(multiStoryBtn.querySelector('.portfolio__batch-btn-text')?.textContent).toBe('Story');

        fireEvent.click(multiStoryBtn);
        expect(mockOnStory).toHaveBeenCalledTimes(2);

        // When 1 photo selected: "Story"
        rerender(<BatchActionBar {...getProps()} selectedCount={1} />);
        const singleStoryBtn = screen.getByRole('button', { name: /Create story with selected photo/i });
        expect(singleStoryBtn).toBeDefined();
        expect((singleStoryBtn as HTMLButtonElement).disabled).toBe(false);
        expect(singleStoryBtn.querySelector('.portfolio__batch-btn-text')?.textContent).toBe('Story');

        fireEvent.click(singleStoryBtn);
        expect(mockOnStory).toHaveBeenCalledTimes(3);

        // When 2 photos selected: enabled (creates single story with photo selector)
        rerender(<BatchActionBar {...getProps()} selectedCount={2} />);
        const twoStoryBtn = screen.getByRole('button', {
            name: /Create 2-panel duet story with selected photos/i,
        });
        expect(twoStoryBtn).toBeDefined();
        expect((twoStoryBtn as HTMLButtonElement).disabled).toBe(false);

        fireEvent.click(twoStoryBtn);
        expect(mockOnStory).toHaveBeenCalledTimes(4);

        // When 0 photos selected: disabled
        rerender(<BatchActionBar {...getProps()} selectedCount={0} />);
        const disabledStoryBtn = screen.getByRole('button', {
            name: /Select photos to create a story/i,
        }) as HTMLButtonElement;
        expect(disabledStoryBtn.disabled).toBe(true);
    });
});
