import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryBadgesTab } from './StoryBadgesTab';
import type { BadgeOptions } from '../../../../utils/storyCanvas';

type Updater = (prev: BadgeOptions) => BadgeOptions;

describe('StoryBadgesTab', () => {
    afterEach(() => {
        cleanup();
    });

    const baseBadges: BadgeOptions = {
        showScoreboard: true,
        showScores: true,
        scoreboardTitle: 'Championship Bout',
        teams: ['Sac City', 'Bay Area'],
        score1: 142,
        score2: 118,
        matchDate: 'OCT 24',
        showAttribution: true,
        attributionLogoText: 'PHOTOS BY',
        attributionLogoAccent: 'PERKINS',
        attributionDomain: '@photosbyperkins',
        scoreboardPosition: 'bottom-center',
        attributionPosition: 'top-center',
    };

    const eventInfo = {
        title: 'Championship Bout',
        date: 'OCT 24',
        teams: ['Sac City', 'Bay Area'],
    };

    const renderTab = (badges: BadgeOptions = baseBadges, isEventAmbiguous?: boolean) => {
        const setBadges = vi.fn();
        const setCardTheme = vi.fn();
        const setIsDownloaded = vi.fn();
        render(
            <StoryBadgesTab
                badges={badges}
                setBadges={setBadges}
                cardTheme="dark"
                setCardTheme={setCardTheme}
                eventInfo={eventInfo}
                isEventAmbiguous={isEventAmbiguous}
                setIsDownloaded={setIsDownloaded}
            />
        );
        /** Runs the most recent functional state update against `prev`. */
        const applyLast = (prev: BadgeOptions = badges) => {
            const arg = setBadges.mock.calls.at(-1)?.[0] as Updater | BadgeOptions;
            return typeof arg === 'function' ? arg(prev) : arg;
        };
        return { setBadges, setCardTheme, setIsDownloaded, applyLast };
    };

    it('renders a six-slot position picker for both badges', () => {
        renderTab();

        expect(screen.getByRole('group', { name: 'Attribution badge position' })).toBeDefined();
        expect(screen.getByRole('group', { name: 'Event badge position' })).toBeDefined();
        expect(screen.getByLabelText('Position attribution at Top Left')).toBeDefined();
        expect(screen.getByLabelText('Position event at Bottom Right')).toBeDefined();
    });

    it('marks the current slot as pressed and the other badge slot as occupied', () => {
        renderTab();

        const attrCurrent = screen.getByLabelText('Position attribution at Top Center');
        expect(attrCurrent.getAttribute('aria-pressed')).toBe('true');

        // The event badge sits at bottom-center, so the attribution picker shows that slot as occupied
        const attrOccupied = screen.getByLabelText('Position attribution at Bottom Center');
        expect(attrOccupied.className).toContain('story-export-modal__slot-btn--occupied');
        expect(attrOccupied.getAttribute('title')).toContain('swaps with Event');
    });

    it('moves a badge within its edge and marks the download stale', () => {
        const { setIsDownloaded, applyLast } = renderTab();

        fireEvent.click(screen.getByLabelText('Position event at Bottom Right'));

        const next = applyLast();
        expect(next.scoreboardPosition).toBe('bottom-right');
        expect(next.attributionPosition).toBe('top-center');
        expect(setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it("trades places when a badge is moved onto the other badge's edge", () => {
        const { applyLast } = renderTab();

        fireEvent.click(screen.getByLabelText('Position event at Top Left'));

        const next = applyLast();
        expect(next.scoreboardPosition).toBe('top-left');
        expect(next.attributionPosition).toBe('bottom-center');
    });

    it('keeps the position picker visible but disabled when a badge is off', () => {
        renderTab({ ...baseBadges, showAttribution: false });

        const attrBtn = screen.getByLabelText('Position attribution at Top Left') as HTMLButtonElement;
        expect(attrBtn.disabled).toBe(true);

        const scoreBtn = screen.getByLabelText('Position event at Bottom Right') as HTMLButtonElement;
        expect(scoreBtn.disabled).toBe(false);
    });

    it('does not mark a hidden badge slot as occupied', () => {
        renderTab({ ...baseBadges, showAttribution: false });

        const eventTopCenter = screen.getByLabelText('Position event at Top Center');
        expect(eventTopCenter.className).not.toContain('story-export-modal__slot-btn--occupied');
    });

    it('flips a re-enabled badge to the free edge instead of stacking it', () => {
        // Both remember a bottom slot; attribution is off.
        const badges: BadgeOptions = {
            ...baseBadges,
            showAttribution: false,
            attributionPosition: 'bottom-left',
            scoreboardPosition: 'bottom-center',
        };
        const { applyLast, setIsDownloaded } = renderTab(badges);

        fireEvent.click(screen.getByLabelText('Show attribution badge'));

        const next = applyLast();
        expect(next.showAttribution).toBe(true);
        expect(next.attributionPosition).toBe('top-left');
        expect(next.scoreboardPosition).toBe('bottom-center');
        expect(setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('hides a badge via segmented Hide button without touching positions', () => {
        const { applyLast } = renderTab();

        fireEvent.click(screen.getByLabelText('Hide attribution badge'));

        const next = applyLast();
        expect(next.showAttribution).toBe(false);
        expect(next.attributionPosition).toBe('top-center');
    });

    it('switches scoreboard modes between Scores, Event (scores off), and Hide', () => {
        const { applyLast } = renderTab();

        // Switch to Event (hide scores)
        fireEvent.click(screen.getByLabelText('Show event badge without scores'));
        let next = applyLast();
        expect(next.showScoreboard).toBe(true);
        expect(next.showScores).toBe(false);

        // Switch to Hide (hide entire scoreboard)
        fireEvent.click(screen.getByLabelText('Hide event badge'));
        next = applyLast(next);
        expect(next.showScoreboard).toBe(false);

        // Switch to Scores (re-enable with scores)
        fireEvent.click(screen.getByLabelText('Show event badge with scores'));
        next = applyLast(next);
        expect(next.showScoreboard).toBe(true);
        expect(next.showScores).toBe(true);
    });

    it('does not render Reset or Swap buttons in header', () => {
        renderTab({
            ...baseBadges,
            scoreboardPosition: 'bottom-left',
            attributionPosition: 'top-right',
        });

        expect(screen.queryByLabelText('Reset badge positions to default')).toBeNull();
        expect(screen.queryByLabelText('Swap Top and Bottom badges')).toBeNull();
    });

    it('suppresses event badge and renders notice when isEventAmbiguous is true', () => {
        renderTab(baseBadges, true);

        expect(
            screen.getByText('Event badge is suppressed because chosen photos are from different events.')
        ).toBeDefined();
        expect(screen.queryByRole('group', { name: 'Event badge position' })).toBeNull();
        expect(screen.queryByLabelText('Show event badge with scores')).toBeNull();
        expect(screen.queryByLabelText('Hide event badge')).toBeNull();
    });

    it('suppresses event badge when badges.isEventAmbiguous is true', () => {
        renderTab({ ...baseBadges, isEventAmbiguous: true });

        expect(
            screen.getByText('Event badge is suppressed because chosen photos are from different events.')
        ).toBeDefined();
        expect(screen.queryByRole('group', { name: 'Event badge position' })).toBeNull();
    });

    it('relocates scoreboard position to opposite tier when attribution is moved to its tier while suppressed', () => {
        const { applyLast } = renderTab({
            ...baseBadges,
            isEventAmbiguous: true,
            scoreboardPosition: 'bottom-center',
            attributionPosition: 'top-center',
        });

        fireEvent.click(screen.getByLabelText('Position attribution at Bottom Center'));

        const next = applyLast();
        expect(next.attributionPosition).toBe('bottom-center');
        expect(next.scoreboardPosition).toBe('top-center');
    });
});
