import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import PortfolioYearTrack from './PortfolioYearTrack';
import { scrollToElement } from '../../../utils/scroll';
import type { EventData } from '../../../types';

vi.mock('../../../utils/scroll', () => ({
    scrollToElement: vi.fn(),
}));

describe('PortfolioYearTrack', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    const mockEvents: [string, EventData][] = [
        [
            '03.15 vs Team A',
            {
                originalYear: '2026',
                photoCount: 50,
                album: [],
                highlights: [],
            },
        ],
        [
            '04.20 vs Team B',
            {
                originalYear: '2024',
                photoCount: 100,
                album: [],
                highlights: [],
            },
        ],
        [
            '09.10 vs Team C',
            {
                originalYear: '2020',
                photoCount: 75,
                album: [],
                highlights: [],
            },
        ],
    ];

    it('renders null when there are fewer than 2 distinct years', () => {
        const singleYearEvents: [string, EventData][] = [
            ['03.15 vs Team A', { originalYear: '2024', photoCount: 50, album: [], highlights: [] }],
            ['04.20 vs Team B', { originalYear: '2024', photoCount: 100, album: [], highlights: [] }],
        ];

        const { container } = render(<PortfolioYearTrack events={singleYearEvents} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders buttons for each year with volume meters and tooltips', () => {
        render(<PortfolioYearTrack events={mockEvents} title="Gotham" />);

        const aside = screen.getByRole('complementary', { name: /Gotham multi-year timeline scroll tracker/i });
        expect(aside).toBeDefined();

        const year2026Btn = screen.getByRole('button', { name: /Jump to 2026/i });
        const year2024Btn = screen.getByRole('button', { name: /Jump to 2024/i });
        const year2020Btn = screen.getByRole('button', { name: /Jump to 2020/i });

        expect(year2026Btn).toBeDefined();
        expect(year2024Btn).toBeDefined();
        expect(year2020Btn).toBeDefined();

        // 2026 should be current initially (top of page)
        expect(year2026Btn.getAttribute('aria-current')).toBe('true');
        expect(year2024Btn.getAttribute('aria-current')).toBeNull();

        // Check elevator pill presence
        const pill = document.querySelector('.portfolio__year-elevator-pill');
        expect(pill).not.toBeNull();
    });

    it('scrolls to year divider when clicking a year button', () => {
        // Mock document.getElementById for year divider
        const mockDivider = document.createElement('div');
        mockDivider.id = 'year-divider-2024';
        document.body.appendChild(mockDivider);

        render(<PortfolioYearTrack events={mockEvents} />);

        const year2024Btn = screen.getByRole('button', { name: /Jump to 2024/i });
        fireEvent.click(year2024Btn);

        expect(scrollToElement).toHaveBeenCalledWith('year-divider-2024');

        document.body.removeChild(mockDivider);
    });
});
