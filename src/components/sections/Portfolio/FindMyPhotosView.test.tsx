import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FindMyPhotosView from './FindMyPhotosView';
import { clearFindMyPhotosCache, type FindTeamsIndex, type TeamFindPayload } from '../../../utils/findMyPhotos';
import { useAppStore } from '../../../store/useAppStore';

const mockIndex: FindTeamsIndex = {
    v: 1,
    numberCounts: { '42': 2, '88': 1, '12': 1 },
    teams: [
        {
            name: 'Sacramento Roller Derby',
            slug: 'sacramento-roller-derby',
            colorHex: '#6D28D9',
            isMeta: true,
            photoCount: 3,
            numberedPhotoCount: 2,
            eventCount: 2,
            topNumbers: ['42', '88'],
            numberCounts: { '42': 2, '88': 1 },
        },
    ],
};

const mockTeamPayload: TeamFindPayload = {
    v: 1,
    team: 'Sacramento Roller Derby',
    slug: 'sacramento-roller-derby',
    colorHex: '#6D28D9',
    events: [
        { y: '2025', s: '11-08-sacramento-vs-outlaws', t: '11.08 Sacramento vs Outlaws' },
        { y: '2024', s: '05-10-sacramento-vs-bad', t: '05.10 Sacramento vs BAD' },
    ],
    photos: [
        { e: 0, i: 0, n: ['42'], r: 'jammer', g: ['apex-jump'], b: 1, x: 0.5, y: 0.4 },
        { e: 0, i: 4, n: ['88'], r: 'pivot', g: ['pack'] },
        { e: 1, i: 2, n: ['42'], r: 'jammer', g: ['jammer-breakaway'], b: 1 },
    ],
};

describe('FindMyPhotosView', () => {
    beforeEach(() => {
        clearFindMyPhotosCache();
        useAppStore.getState().closeLightbox();
        useAppStore.getState().clearFavorites();
        useAppStore.getState().setIsBatchSelectMode(false);
        useAppStore.getState().clearBatchSelection();

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.includes('/data/find/index.json')) {
                return {
                    ok: true,
                    json: async () => mockIndex,
                } as Response;
            }
            if (url.includes('/data/find/all.json') || url.includes('/data/find/sacramento-roller-derby.json')) {
                return {
                    ok: true,
                    json: async () => mockTeamPayload,
                } as Response;
            }
            return { ok: false } as Response;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders PortfolioEvent cards with year track, individual album download buttons, and highlight/full album toggle', async () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/find?num=42']}>
                <FindMyPhotosView initialNumberQuery="42" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('status').textContent).toMatch(/Showing 2 matching photos for #42/i);
        });

        // Multi-year timeline track is rendered because #42 spans 2025 and 2024
        expect(screen.getByRole('complementary', { name: /#42 multi-year timeline scroll tracker/i })).toBeTruthy();

        // Individual album download (.zip) links are rendered per event
        const zipLinks = screen.getAllByTitle('Download All Original Photos (.zip)');
        expect(zipLinks).toHaveLength(2);
        expect(zipLinks[0].getAttribute('href')).toContain('/photos/2025/11-08-sacramento-vs-outlaws.zip');

        // Highlights / Full Album toggle is present and defaults to Featured Photos
        const fullAlbumBtns = screen.getAllByRole('button', { name: 'Show Full Album' });
        expect(fullAlbumBtns).toHaveLength(2);

        // Open first featured photo in Lightbox
        const openBtn = screen.getByRole('button', {
            name: /View 11\.08 Sacramento vs Outlaws featured photo 1/i,
        });
        fireEvent.click(openBtn);

        const lb = useAppStore.getState().lightbox;
        expect(lb.isOpen).toBe(true);
        expect(lb.images).toHaveLength(1);
        expect(lb.eventName).toBe('11.08 Sacramento vs Outlaws');
        expect(lb.year).toBe('2025');

        // Toggle to Full Album grid view
        fireEvent.click(fullAlbumBtns[0]);
        expect(
            await screen.findByRole('button', { name: /View 11\.08 Sacramento vs Outlaws photo 1/i })
        ).toBeTruthy();
    });

    it('displays possible partial matches when the filtered jersey number has no exact results', async () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/find?num=429']}>
                <FindMyPhotosView initialNumberQuery="429" />
            </MemoryRouter>
        );

        expect(await screen.findByText(/Possible Partial Matches for #429/i)).toBeTruthy();
        const partialLink = screen.getByRole('link', { name: /#42/i });
        expect(partialLink.getAttribute('href')).toBe('/portfolio/find?num=42');
    });

    it('supports batch select mode across PortfolioEvent cards', async () => {
        useAppStore.getState().setIsBatchSelectMode(true);

        render(
            <MemoryRouter initialEntries={['/portfolio/find?num=42']}>
                <FindMyPhotosView initialNumberQuery="42" />
            </MemoryRouter>
        );

        const checkboxBtn = await screen.findByRole('checkbox', {
            name: /11\.08 Sacramento vs Outlaws featured photo 1, not selected/i,
        });
        fireEvent.click(checkboxBtn);

        expect(useAppStore.getState().batchSelectedPhotos).toHaveLength(1);
        expect(useAppStore.getState().visiblePhotosMap['11.08 Sacramento vs Outlaws']).toHaveLength(1);
    });
});
