import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeamFilter from './TeamFilter';

describe('TeamFilter', () => {
    const mockTeams = [
        { name: 'Sacramento Roller Derby', slug: 'sacramento-roller-derby', count: 12 },
        { name: 'Bay Area Derby', slug: 'bay-area-derby', count: 8 },
        { name: 'WFTDA Sanctioned', slug: 'wftda-sanctioned', count: 20 },
    ];

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders loading state when teamIndexLoading is true', () => {
        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery=""
                    filteredTeams={[]}
                    teamIndexLoading={true}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading teams.../i)).not.toBeNull();
    });

    it('renders sorted team pills when teams are loaded', () => {
        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery=""
                    filteredTeams={mockTeams}
                    teamIndexLoading={false}
                />
            </MemoryRouter>
        );

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(3);
        // Sorted alphabetically: Bay Area Derby (BAD), Sacramento Roller Derby (SRD), WFTDA Sanctioned
        expect(links[0].textContent).toContain('BAD');
        expect(links[1].textContent).toContain('SRD');
        expect(links[2].textContent).toContain('WFTDA Sanctioned');
    });

    it('renders empty state when filteredTeams is empty', () => {
        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery="NonExistent"
                    filteredTeams={[]}
                    teamIndexLoading={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('No teams found matching "NonExistent"')).not.toBeNull();
    });

    it('triggers onBack and resets scroll when a team pill is clicked', () => {
        const onBack = vi.fn();
        window.scrollTo = vi.fn();

        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery=""
                    filteredTeams={mockTeams}
                    teamIndexLoading={false}
                    onBack={onBack}
                />
            </MemoryRouter>
        );

        const firstLink = screen.getAllByRole('link')[0];
        fireEvent.click(firstLink);

        expect(onBack).toHaveBeenCalled();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    });
});
