import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PortfolioEventTitle from './PortfolioEventTitle';
import { useAppStore } from '../../../store/useAppStore';
import type { EventData } from '../../../types';

describe('PortfolioEventTitle', () => {
    beforeEach(() => {
        useAppStore.setState({ iframeUrl: null });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockEventData: EventData = {
        album: [],
        highlights: [],
    };

    it('renders team names and date prefix', () => {
        render(
            <PortfolioEventTitle
                eventName="2026-03-14 Tigers vs Bears"
                ev={mockEventData}
                datePrefix="MAR 14"
                finalTeams={['Sacramento Roller Derby', 'Bay Area Derby']}
                shouldShowScores={false}
                mainTitle="Sacramento Roller Derby vs Bay Area Derby"
            />
        );

        expect(screen.getByText('MAR 14')).not.toBeNull();
        expect(screen.getAllByText(/Sacramento Roller Derby|SRD/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Bay Area Derby|BAD/i).length).toBeGreaterThan(0);
    });

    it('renders special title for Favorites event', () => {
        render(
            <PortfolioEventTitle
                eventName="Favorites"
                ev={mockEventData}
                datePrefix={null}
                finalTeams={['Favorites']}
                shouldShowScores={false}
                mainTitle="Favorites"
            />
        );

        expect(screen.getByText(/YOUR/i)).not.toBeNull();
        expect(screen.getByText(/FAVORITES/i)).not.toBeNull();
    });

    it('renders scores and marks the winning score', () => {
        const evWithScores: EventData = {
            ...mockEventData,
            localScore: {
                team1Score: 185,
                team2Score: 142,
            },
        };

        const { container } = render(
            <PortfolioEventTitle
                eventName="2026-03-14 Match"
                ev={evWithScores}
                datePrefix="MAR 14"
                finalTeams={['Team Alpha', 'Team Beta']}
                shouldShowScores={true}
                mainTitle="Team Alpha vs Team Beta"
            />
        );

        expect(screen.getByText('185')).not.toBeNull();
        expect(screen.getByText('142')).not.toBeNull();

        const winningScore = container.querySelector('.portfolio__team-score.is-win');
        expect(winningScore?.textContent).toBe('185');
    });

    it('renders WFTDA badge and opens iframe on click when wftdaMatch exists', () => {
        let openedUrl: string | null = null;
        useAppStore.setState({ openIframe: (url: string) => { openedUrl = url; } });

        const evWithWftda: EventData = {
            ...mockEventData,
            wftdaMatch: {
                team1: 'Team Alpha',
                team2: 'Team Beta',
                score1: '200',
                score2: '150',
                href: 'https://stats.wftda.com/match/9999',
            },
        };

        render(
            <PortfolioEventTitle
                eventName="2026-03-14 Match"
                ev={evWithWftda}
                datePrefix="MAR 14"
                finalTeams={['Team Alpha', 'Team Beta']}
                shouldShowScores={false}
                mainTitle="Team Alpha vs Team Beta"
            />
        );

        const badge = screen.getByText('WFTDA');
        expect(badge).not.toBeNull();

        const link = screen.getByRole('link');
        fireEvent.click(link);

        expect(openedUrl).toBe('https://stats.wftda.com/match/9999');
    });
});
