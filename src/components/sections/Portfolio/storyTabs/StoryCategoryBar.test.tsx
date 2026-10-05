import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryCategoryBar } from './StoryCategoryBar';
import type { StoryCategoryItem } from './StoryCategoryBar';

describe('StoryCategoryBar', () => {
    const mockCategories: StoryCategoryItem<string>[] = [
        { id: 'all', label: 'All', vibe: 'All items', group: 'scope' },
        { id: 'recent', label: 'Recent', vibe: 'Recent items', group: 'scope' },
        { id: 'derby', label: 'Derby', vibe: 'Derby items', group: 'themes' },
        { id: 'retro', label: 'Retro', vibe: 'Retro items', group: 'themes' },
        { id: 'cosmic', label: 'Cosmic', vibe: 'Cosmic items', group: 'themes' },
    ];

    const defaultProps = {
        categories: mockCategories,
        selectedCategory: 'all',
        onSelectCategory: vi.fn(),
        categoryCounts: { all: 20, recent: 3, derby: 8, retro: 5, cosmic: 4 },
        ariaLabel: 'Test categories',
        controlsId: 'test-grid-id',
    };

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders tablist with correct ARIA attributes and role="presentation" rows', () => {
        const { container } = render(<StoryCategoryBar {...defaultProps} />);

        const tablist = screen.getByRole('tablist', { name: 'Test categories' });
        expect(tablist).not.toBeNull();

        const rows = container.querySelectorAll('.story-export-modal__category-row');
        expect(rows).toHaveLength(2);
        expect(rows[0].getAttribute('role')).toBe('presentation');
        expect(rows[1].getAttribute('role')).toBe('presentation');
        expect(rows[0].classList.contains('story-export-modal__category-row--scope')).toBe(true);
        expect(rows[1].classList.contains('story-export-modal__category-row--themes')).toBe(true);
    });

    it('renders all category tabs with correct active states and roving tabindex', () => {
        render(<StoryCategoryBar {...defaultProps} selectedCategory="derby" />);

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(5);

        // 'derby' should be active
        const derbyTab = screen.getByRole('tab', { name: /Derby/i });
        expect(derbyTab.getAttribute('aria-selected')).toBe('true');
        expect(derbyTab.getAttribute('tabindex')).toBe('0');
        expect(derbyTab.getAttribute('aria-controls')).toBe('test-grid-id');
        expect(derbyTab.classList.contains('story-export-modal__category-pill--active')).toBe(true);

        // 'all' should be inactive
        const allTab = screen.getByRole('tab', { name: /All/i });
        expect(allTab.getAttribute('aria-selected')).toBe('false');
        expect(allTab.getAttribute('tabindex')).toBe('-1');
        expect(allTab.classList.contains('story-export-modal__category-pill--active')).toBe(false);
    });

    it('invokes onSelectCategory and updates selection when clicked', () => {
        const onSelect = vi.fn();
        render(<StoryCategoryBar {...defaultProps} onSelectCategory={onSelect} />);

        const retroTab = screen.getByRole('tab', { name: /Retro/i });
        fireEvent.click(retroTab);

        expect(onSelect).toHaveBeenCalledWith('retro');
    });

    it('navigates through tabs using arrow keys, Home, and End (W3C roving tabindex)', () => {
        const onSelect = vi.fn();
        render(<StoryCategoryBar {...defaultProps} selectedCategory="all" onSelectCategory={onSelect} />);

        const allTab = screen.getByRole('tab', { name: /All/i });

        // ArrowRight from 'all' moves to 'recent'
        fireEvent.keyDown(allTab, { key: 'ArrowRight' });
        expect(onSelect).toHaveBeenCalledWith('recent');

        // ArrowDown acts like ArrowRight
        fireEvent.keyDown(allTab, { key: 'ArrowDown' });
        expect(onSelect).toHaveBeenCalledWith('recent');

        // ArrowLeft from 'all' wraps to last tab ('cosmic')
        fireEvent.keyDown(allTab, { key: 'ArrowLeft' });
        expect(onSelect).toHaveBeenCalledWith('cosmic');

        // ArrowUp acts like ArrowLeft
        fireEvent.keyDown(allTab, { key: 'ArrowUp' });
        expect(onSelect).toHaveBeenCalledWith('cosmic');

        // End key moves to last tab ('cosmic')
        fireEvent.keyDown(allTab, { key: 'End' });
        expect(onSelect).toHaveBeenCalledWith('cosmic');

        // Home key moves to first tab ('all')
        fireEvent.keyDown(allTab, { key: 'Home' });
        expect(onSelect).toHaveBeenCalledWith('all');
    });

    it('displays category counts and vibe tooltips correctly', () => {
        render(<StoryCategoryBar {...defaultProps} />);

        const derbyTab = screen.getByRole('tab', { name: /Derby/i });
        expect(derbyTab.textContent).toContain('8');
        expect(derbyTab.getAttribute('title')).toBe('Derby items');

        const cosmicTab = screen.getByRole('tab', { name: /Cosmic/i });
        expect(cosmicTab.textContent).toContain('4');
        expect(cosmicTab.getAttribute('title')).toBe('Cosmic items');
    });
});
