import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeamFilter from './TeamFilter';

describe('TeamFilter', () => {
    const mockTeams = [
        { name: 'Sacramento Roller Derby Bruin Trouble', slug: 'sacramento-roller-derby-bruin-trouble', count: 16 },
        { name: 'Auburn Gold Diggers', slug: 'auburn-gold-diggers', count: 2 },
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

    it('renders category headers for Individual Teams and Leagues & Groups when both are present', () => {
        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery=""
                    filteredTeams={mockTeams}
                    teamIndexLoading={false}
                />
            </MemoryRouter>
        );

        const individualHeader = screen.getByRole('heading', { name: 'Individual Teams', level: 3 });
        const leaguesHeader = screen.getByRole('heading', { name: 'Leagues & Groups', level: 3 });
        expect(individualHeader).not.toBeNull();
        expect(leaguesHeader).not.toBeNull();
    });

    it('renders sorted team pills grouped by category', () => {
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
        expect(links).toHaveLength(5);
        // Individual Teams section first, sorted alphabetically:
        expect(links[0].textContent).toContain('Auburn Gold Diggers');
        expect(links[1].textContent).toContain('Bruin Trouble');
        // Leagues & Groups section second, sorted alphabetically:
        expect(links[2].textContent).toContain('BAD');
        expect(links[3].textContent).toContain('SRD');
        expect(links[4].textContent).toContain('WFTDA Sanctioned');
    });

    it('renders only Individual Teams category header when only individual teams match', () => {
        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery="Auburn"
                    filteredTeams={[mockTeams[1]]}
                    teamIndexLoading={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Individual Teams' })).not.toBeNull();
        expect(screen.queryByRole('heading', { name: 'Leagues & Groups' })).toBeNull();
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0].textContent).toContain('Auburn Gold Diggers');
    });

    it('renders only Leagues & Groups category header when only meta teams match', () => {
        render(
            <MemoryRouter>
                <TeamFilter
                    teamSearchQuery="WFTDA"
                    filteredTeams={[mockTeams[4]]}
                    teamIndexLoading={false}
                />
            </MemoryRouter>
        );

        expect(screen.queryByRole('heading', { name: 'Individual Teams' })).toBeNull();
        expect(screen.getByRole('heading', { name: 'Leagues & Groups' })).not.toBeNull();
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0].textContent).toContain('WFTDA Sanctioned');
    });

    it('renders empty state when filteredTeams is empty and no category headers', () => {
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
        expect(screen.queryByRole('heading')).toBeNull();
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
