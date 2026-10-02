import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PortfolioMonthTrack from './PortfolioMonthTrack';
import * as scrollUtils from '../../../utils/scroll';
import type { EventData } from '../../../types';

vi.mock('../../../utils/scroll', () => ({
    scrollToElement: vi.fn(),
}));

describe('PortfolioMonthTrack', () => {
    const mockEvents: [string, EventData][] = [
        [
            '11.15 - Championship Final',
            {
                album: ['/photos/1.jpg', '/photos/2.jpg'],
                highlights: [],
                photoCount: 2,
            },
        ],
        [
            '04.10 - Spring Bout',
            {
                album: ['/photos/3.jpg'],
                highlights: [],
                photoCount: 1,
            },
        ],
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders null when events array is empty', () => {
        const { container } = render(<PortfolioMonthTrack events={[]} selectedYear="2026" />);
        expect(container.firstChild).toBeNull();
    });

    it('renders 12 months in DEC to JAN order and positions the elevator pill', () => {
        const { container } = render(<PortfolioMonthTrack events={mockEvents} selectedYear="2026" />);

        const aside = screen.getByRole('complementary', { name: /2026 season calendar scroll tracker/i });
        expect(aside).toBeDefined();

        const monthItems = container.querySelectorAll('.portfolio__month-item');
        expect(monthItems).toHaveLength(12);

        // Top is DEC, bottom is JAN
        expect(monthItems[0].querySelector('.portfolio__month-label')?.textContent).toBe('DEC');
        expect(monthItems[11].querySelector('.portfolio__month-label')?.textContent).toBe('JAN');

        // First event is in NOV (month 11), which is index 1 in DEC->JAN list
        const elevatorPill = container.querySelector('.portfolio__month-elevator-pill') as HTMLElement;
        expect(elevatorPill).not.toBeNull();
        expect(elevatorPill.style.getPropertyValue('--active-month-index')).toBe('1');
    });

    it('clicking a populated month updates the elevator pill position and calls scrollToElement', () => {
        const { container } = render(<PortfolioMonthTrack events={mockEvents} selectedYear="2026" />);

        // Month 4 (APR) is at index 8 (DEC=0, NOV=1, OCT=2, SEP=3, AUG=4, JUL=5, JUN=6, MAY=7, APR=8)
        const aprButton = screen.getByRole('button', { name: /April/i });
        expect(aprButton).toBeDefined();

        fireEvent.click(aprButton);

        expect(scrollUtils.scrollToElement).toHaveBeenCalledTimes(1);
        expect(scrollUtils.scrollToElement).toHaveBeenCalledWith(expect.stringContaining('Spring-Bout'));

        // Elevator pill should move to index 8 immediately
        const elevatorPill = container.querySelector('.portfolio__month-elevator-pill') as HTMLElement;
        expect(elevatorPill.style.getPropertyValue('--active-month-index')).toBe('8');
    });

    it('empty months are non-interactive without button role', () => {
        const { container } = render(<PortfolioMonthTrack events={mockEvents} selectedYear="2026" />);

        // Month 12 (DEC) has no events -> should be .is-empty div, not a button
        const decItem = container.querySelectorAll('.portfolio__month-item')[0];
        expect(decItem.tagName.toLowerCase()).toBe('div');
        expect(decItem.classList.contains('is-empty')).toBe(true);
        expect(decItem.getAttribute('aria-hidden')).toBe('true');
    });
});
