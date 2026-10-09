import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import { StoryExportModal } from './StoryExportModal';
import { useAppStore } from '../../../store/useAppStore';
import type { PhotoRecord } from '../../../types';
import { STORY_COMPACT_QUERY, STORY_PORTRAIT_QUERY } from '../../../hooks/useStoryLayoutMode';

vi.mock('../../../hooks/useCanShare', () => ({
    useCanShare: () => false,
}));

describe('StoryExportModal', () => {
    const mockOnClose = vi.fn();
    const samplePhoto: PhotoRecord = {
        original: '/photos/match.jpg',
        thumb: '/photos/match_thumb.jpg',
        width: 1920,
        height: 1080,
        focusX: 0.5,
        focusY: 0.5,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.getState().resetStorySettings();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the unified studio: preview stage plus a docked panel with tabs and the export footer', () => {
        const { baseElement } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={samplePhoto}
                eventName="2024.10.22 - Championship Match - Team A vs Team B"
                year="2024"
                index={0}
            />
        );

        // Landscape test window -> side mode
        expect(baseElement.querySelector('.story-export-modal--side')).not.toBeNull();
        expect(baseElement.querySelector('.story-studio--side')).not.toBeNull();

        // In default crop mode, StoryCropper is rendered inside the preview
        const preview = baseElement.querySelector('.story-studio__preview');
        const storyCropper = baseElement.querySelector('.story-cropper');
        expect(storyCropper).not.toBeNull();
        expect(preview?.contains(storyCropper!)).toBe(true);

        // Panel: tab bar header, tab content, export button pinned in the panel footer
        const panel = baseElement.querySelector('.story-studio-panel--side') as HTMLElement;
        expect(panel).not.toBeNull();
        expect(within(panel).getAllByRole('tab')).toHaveLength(4);
        expect(panel.querySelector('#story-studio-tabpanel')).not.toBeNull();
        expect(panel.querySelector('.story-studio-panel__footer .story-export-modal__primary-action')).not.toBeNull();

        // Export button no longer lives in the modal shell footer
        expect(baseElement.querySelector('.modal-shell__footer .story-export-modal__primary-action')).toBeNull();
    });

    it('hides reset button when at defaults, shows it when altered, and restores defaults on click without toasts', () => {
        const { baseElement } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={samplePhoto}
                eventName="2024.10.22 - Championship Match - Team A vs Team B"
                year="2024"
                index={0}
            />
        );

        // At default configuration, Reset to Defaults button is hidden
        expect(within(baseElement).queryByRole('button', { name: /Reset story format to defaults/i })).toBeNull();

        // Switch to Padded framing to alter story format
        const paddedBtn = within(baseElement).getByRole('button', { name: /^padded$/i });
        fireEvent.click(paddedBtn);

        // Now the Reset button appears in header actions
        const resetBtn = within(baseElement).getByRole('button', { name: /Reset story format to defaults/i });
        expect(resetBtn).not.toBeNull();

        // Clicking reset button restores default format
        fireEvent.click(resetBtn);

        // Reset button is hidden again once back at defaults
        expect(within(baseElement).queryByRole('button', { name: /Reset story format to defaults/i })).toBeNull();

        // No toast message rendered
        expect(baseElement.querySelector('.story-export-modal__toast')).toBeNull();
    });

    it('switches studio tabs using left and right arrow keys', () => {
        const { baseElement } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={samplePhoto}
                eventName="2024.10.22 - Championship Match - Team A vs Team B"
                year="2024"
                index={0}
            />
        );

        // Initial tab is Layout
        expect(within(baseElement).getByRole('tab', { name: /layout/i, selected: true })).toBeDefined();

        // Press ArrowRight -> moves to Filters tab
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(within(baseElement).getByRole('tab', { name: /filters/i, selected: true })).toBeDefined();

        // Press ArrowRight -> moves to Frames tab
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(within(baseElement).getByRole('tab', { name: /frames/i, selected: true })).toBeDefined();

        // Press ArrowRight -> moves to Badges tab
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(within(baseElement).getByRole('tab', { name: /badges/i, selected: true })).toBeDefined();

        // Press ArrowRight -> wraps back to Layout tab
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(within(baseElement).getByRole('tab', { name: /layout/i, selected: true })).toBeDefined();

        // Press ArrowLeft -> wraps to Badges tab
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(within(baseElement).getByRole('tab', { name: /badges/i, selected: true })).toBeDefined();
    });

    it('switches to padded framing and renders padded cropper elements', () => {
        const { baseElement } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={samplePhoto}
                eventName="2024.10.22 - Championship Match - Team A vs Team B"
                year="2024"
                index={0}
            />
        );

        // Click 'Padded' framing preset button
        const paddedBtn = within(baseElement).getByRole('button', { name: /^padded$/i });
        fireEvent.click(paddedBtn);

        const paddedWrapper = baseElement.querySelector('.story-cropper__image-wrapper--padded');
        const bgLayer = baseElement.querySelector('.story-cropper__background-layer');
        expect(paddedWrapper).not.toBeNull();
        expect(bgLayer).not.toBeNull();
    });

    it('disables download button in burst mode when fewer than 3 frames are selected', () => {
        const burstPhoto: PhotoRecord = {
            ...samplePhoto,
            burst: {
                id: 'burst-test',
                index: 0,
                total: 6,
                deltaSec: 0,
                frameSources: [
                    '/photos/b1.jpg',
                    '/photos/b2.jpg',
                    '/photos/b3.jpg',
                    '/photos/b4.jpg',
                    '/photos/b5.jpg',
                    '/photos/b6.jpg',
                ],
                frameThumbs: [
                    '/photos/tb1.jpg',
                    '/photos/tb2.jpg',
                    '/photos/tb3.jpg',
                    '/photos/tb4.jpg',
                    '/photos/tb5.jpg',
                    '/photos/tb6.jpg',
                ],
                frameDeltas: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
            },
        };

        const { baseElement } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={burstPhoto}
                eventName="2024.10.22 - Championship Match"
                year="2024"
                index={0}
            />
        );

        // Switch to Triptych mode
        const triptychBtn = within(baseElement).getByRole('button', { name: /^triptych$/i });
        fireEvent.click(triptychBtn);

        expect(baseElement.querySelector('.story-burst-cropper')).not.toBeNull();

        // Switch to BTM step and clear it by clicking again
        const slotGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const slotButtons = slotGroup.querySelectorAll('button');
        fireEvent.click(slotButtons[2]); // Switch to BTM
        fireEvent.click(slotButtons[2]); // Clear BTM

        // Download button should be disabled with dynamic prompt
        const exportBtn = baseElement.querySelector<HTMLButtonElement>('.story-export-modal__primary-action');
        expect(exportBtn?.disabled).toBe(true);
        expect(exportBtn?.getAttribute('aria-label')).toBe('Pick 1 more frame to download');
        expect(exportBtn?.getAttribute('title')).toBe('Pick 1 more frame to download');
    });

    it('renders 2-panel Duet cropper when photo has a 2-frame burst', () => {
        const duetPhoto: PhotoRecord = {
            ...samplePhoto,
            burst: {
                id: 'duet-test',
                index: 0,
                total: 2,
                isDuet: true,
                deltaSec: 0.35,
                frameSources: ['/photos/d1.jpg', '/photos/d2.jpg'],
                frameThumbs: ['/photos/td1.jpg', '/photos/td2.jpg'],
                frameDeltas: [0, 0.35],
            },
        };

        const { baseElement } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={duetPhoto}
                eventName="2024.10.22 - Championship Match"
                year="2024"
                index={0}
            />
        );

        // Burst / Duet mode is default for burst photos
        const cropper = baseElement.querySelector('.story-burst-cropper');
        expect(cropper).not.toBeNull();
        expect(cropper?.getAttribute('data-panels')).toBe('2');

        const panels = baseElement.querySelectorAll('.story-burst-cropper__panel');
        expect(panels).toHaveLength(2);
    });

    const originalMatchMedia = window.matchMedia;
    const mockMatchMedia = (matches: (query: string) => boolean) => {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: matches(query),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as unknown as typeof window.matchMedia;
    };

    const renderSingle = () =>
        render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={samplePhoto}
                eventName="2024.10.22 - Championship Match - Team A vs Team B"
                year="2024"
                index={0}
            />
        );

    describe('Sheet layout (phones / short portrait windows)', () => {
        beforeEach(() => {
            mockMatchMedia((query) => query === STORY_PORTRAIT_QUERY || query === STORY_COMPACT_QUERY);
        });

        afterEach(() => {
            window.matchMedia = originalMatchMedia;
        });

        it('starts collapsed: preview, tab bar and export button visible, tab content hidden', () => {
            const { baseElement } = renderSingle();

            expect(baseElement.querySelector('.story-export-modal--sheet')).not.toBeNull();
            const panel = baseElement.querySelector('.story-studio-panel--sheet') as HTMLElement;
            expect(panel).not.toBeNull();
            expect(panel.classList.contains('story-studio-panel--open')).toBe(false);

            // Preview fills the stage
            expect(baseElement.querySelector('.story-studio__preview .story-cropper')).not.toBeNull();

            // Collapsed sheet: tabs + export button only
            expect(within(panel).getAllByRole('tab')).toHaveLength(4);
            expect(panel.querySelector('.story-export-modal__primary-action')).not.toBeNull();
            expect(baseElement.querySelector('#story-studio-tabpanel')).toBeNull();

            const layoutTab = within(panel).getByRole('tab', { name: /^layout$/i });
            expect(layoutTab.getAttribute('aria-selected')).toBe('true');
            expect(layoutTab.getAttribute('aria-expanded')).toBe('false');
            expect(layoutTab.classList.contains('is-active')).toBe(false);
        });

        it('expands on tab tap, switches tabs while open, and collapses when the active tab is tapped again', () => {
            const { baseElement } = renderSingle();
            const layoutTab = within(baseElement).getByRole('tab', { name: /^layout$/i });

            // Tap Layout -> sheet opens on Layout
            fireEvent.click(layoutTab);
            const tabpanel = baseElement.querySelector('#story-studio-tabpanel') as HTMLElement;
            expect(tabpanel).not.toBeNull();
            expect(layoutTab.getAttribute('aria-expanded')).toBe('true');
            expect(layoutTab.classList.contains('is-active')).toBe(true);
            expect(within(tabpanel).getByRole('button', { name: /^padded$/i })).not.toBeNull();

            // Tap Filters -> stays open, switches tab
            const filtersTab = within(baseElement).getByRole('tab', { name: /^filters$/i });
            fireEvent.click(filtersTab);
            expect(baseElement.querySelector('#story-studio-tabpanel')).not.toBeNull();
            expect(filtersTab.getAttribute('aria-selected')).toBe('true');
            expect(filtersTab.getAttribute('aria-expanded')).toBe('true');

            // Tap Filters again -> collapses
            fireEvent.click(filtersTab);
            expect(baseElement.querySelector('#story-studio-tabpanel')).toBeNull();
            expect(filtersTab.getAttribute('aria-selected')).toBe('true');
            expect(filtersTab.getAttribute('aria-expanded')).toBe('false');
        });

        it('collapses when the backdrop is tapped', () => {
            const { baseElement } = renderSingle();
            fireEvent.click(within(baseElement).getByRole('tab', { name: /^frames$/i }));
            expect(baseElement.querySelector('#story-studio-tabpanel')).not.toBeNull();

            const backdrop = baseElement.querySelector('.story-studio-panel__backdrop') as HTMLElement;
            expect(backdrop).not.toBeNull();
            fireEvent.click(backdrop);
            expect(baseElement.querySelector('#story-studio-tabpanel')).toBeNull();
        });

        it('collapses the sheet on Escape without closing the modal', () => {
            const { baseElement } = renderSingle();
            fireEvent.click(within(baseElement).getByRole('tab', { name: /^layout$/i }));
            expect(baseElement.querySelector('#story-studio-tabpanel')).not.toBeNull();

            fireEvent.keyDown(window, { key: 'Escape' });
            expect(baseElement.querySelector('#story-studio-tabpanel')).toBeNull();
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('opens the sheet on the Layout tab with that slot selected when tapping an empty burst panel', () => {
            const duetPhoto: PhotoRecord = {
                ...samplePhoto,
                burst: {
                    id: 'duet-empty-panel-test',
                    index: 0,
                    total: 3,
                    isDuet: true,
                    deltaSec: 0.35,
                    frameSources: ['/photos/d1.jpg', '/photos/d2.jpg', '/photos/d3.jpg'],
                    frameThumbs: ['/photos/td1.jpg', '/photos/td2.jpg', '/photos/td3.jpg'],
                    frameDeltas: [0, 0.35, 0.7],
                },
            };

            const { baseElement } = render(
                <StoryExportModal
                    isOpen={true}
                    onClose={mockOnClose}
                    photo={duetPhoto}
                    eventName="2024.10.22 - Championship Match"
                    year="2024"
                    index={0}
                />
            );

            // Open the sheet on Layout and clear the 2nd slot
            const layoutTab = within(baseElement).getByRole('tab', { name: /^layout$/i });
            fireEvent.click(layoutTab);
            let tabpanel = baseElement.querySelector('#story-studio-tabpanel') as HTMLElement;
            expect(tabpanel).not.toBeNull();

            fireEvent.click(within(tabpanel).getByRole('button', { name: /Step 2 \(BTM\): Frame 2/i }));
            fireEvent.click(within(tabpanel).getByRole('button', { name: /Assigned to BTM panel/i }));

            // Switch to Filters, then collapse the sheet
            const filtersTab = within(baseElement).getByRole('tab', { name: /^filters$/i });
            fireEvent.click(filtersTab);
            fireEvent.click(filtersTab);
            expect(baseElement.querySelector('#story-studio-tabpanel')).toBeNull();

            // Tap the empty panel in the preview
            const emptyPanel = baseElement.querySelector<HTMLElement>('.story-burst-cropper__panel--empty');
            expect(emptyPanel).not.toBeNull();
            fireEvent.click(emptyPanel!);

            // Sheet reopens on Layout with Step 2 (BTM) active
            tabpanel = baseElement.querySelector('#story-studio-tabpanel') as HTMLElement;
            expect(tabpanel).not.toBeNull();
            expect(layoutTab.getAttribute('aria-selected')).toBe('true');
            const btmEmptyBtn = within(tabpanel).getByRole('button', { name: /Step 2 \(BTM\): Empty/i });
            expect(btmEmptyBtn.getAttribute('aria-pressed')).toBe('true');
        });
    });

    describe('Stacked layout (tall portrait windows)', () => {
        beforeEach(() => {
            mockMatchMedia((query) => query === STORY_PORTRAIT_QUERY);
        });

        afterEach(() => {
            window.matchMedia = originalMatchMedia;
        });

        it('keeps the panel permanently open beneath the preview', () => {
            const { baseElement } = renderSingle();

            expect(baseElement.querySelector('.story-export-modal--stacked')).not.toBeNull();
            const panel = baseElement.querySelector('.story-studio-panel--stacked') as HTMLElement;
            expect(panel).not.toBeNull();
            expect(baseElement.querySelector('#story-studio-tabpanel')).not.toBeNull();
            expect(baseElement.querySelector('.story-studio-panel__backdrop')).toBeNull();
            expect(baseElement.querySelector('.story-studio-panel__handle')).toBeNull();

            // Tapping the active tab never collapses the panel
            const layoutTab = within(panel).getByRole('tab', { name: /^layout$/i });
            expect(layoutTab.hasAttribute('aria-expanded')).toBe(false);
            fireEvent.click(layoutTab);
            expect(baseElement.querySelector('#story-studio-tabpanel')).not.toBeNull();
            expect(layoutTab.classList.contains('is-active')).toBe(true);
        });
    });

    describe('Multi-event badge suppression', () => {
        it('suppresses event badge and displays explanatory notice when photos are from different events', () => {
            const multiEventPhoto: PhotoRecord = {
                ...samplePhoto,
                burst: {
                    id: 'multi-test',
                    index: 0,
                    total: 3,
                    frameSources: ['/photos/f1.jpg', '/photos/f2.jpg', '/photos/f3.jpg'],
                    frameEvents: ['event-1', 'event-2', 'event-1'],
                    frameEventNames: [
                        '[2024] 10.12 Sac City vs Berkeley',
                        '[2024] 10.15 Sac City vs Chabot',
                        '[2024] 10.12 Sac City vs Berkeley',
                    ],
                },
            };

            const { baseElement } = render(
                <StoryExportModal
                    isOpen={true}
                    onClose={mockOnClose}
                    photo={multiEventPhoto}
                    eventName="[2024] 10.12 Sac City vs Berkeley"
                    year="2024"
                    index={0}
                />
            );

            // Navigate to Badges tab
            const badgesTab = within(baseElement).getByRole('tab', { name: /badges/i });
            fireEvent.click(badgesTab);

            // Explanatory notice should be displayed
            expect(
                within(baseElement).getByText('Event badge is suppressed because chosen photos are from different events.')
            ).not.toBeNull();

            // Event badge checkbox should not be rendered
            expect(within(baseElement).queryByRole('checkbox', { name: /event/i })).toBeNull();

            // Story preview does not render the scoreboard/event badge
            expect(baseElement.querySelector('.story-badges__scoreboard')).toBeNull();
        });

        it('avoids badge overlap when attribution badge is moved to scoreboard slot during suppression and user switches to solo mode', () => {
            const multiEventPhoto: PhotoRecord = {
                ...samplePhoto,
                burst: {
                    id: 'multi-test',
                    index: 0,
                    total: 3,
                    frameSources: ['/photos/f1.jpg', '/photos/f2.jpg', '/photos/f3.jpg'],
                    frameEvents: ['event-1', 'event-2', 'event-1'],
                    frameEventNames: [
                        '[2024] 10.12 Sac City vs Berkeley',
                        '[2024] 10.15 Sac City vs Chabot',
                        '[2024] 10.12 Sac City vs Berkeley',
                    ],
                },
            };

            const { baseElement } = render(
                <StoryExportModal
                    isOpen={true}
                    onClose={mockOnClose}
                    photo={multiEventPhoto}
                    eventName="[2024] 10.12 Sac City vs Berkeley"
                    year="2024"
                    index={0}
                />
            );

            // 1. Navigate to Badges tab while event badge is suppressed
            const badgesTab = within(baseElement).getByRole('tab', { name: /badges/i });
            fireEvent.click(badgesTab);

            // 2. Move attribution badge to Bottom Center (where scoreboard is positioned by default)
            const btmCenterBtn = within(baseElement).getByLabelText('Position attribution at Bottom Center');
            fireEvent.click(btmCenterBtn);

            // 3. Switch back to Layout tab and switch to Solo mode
            const layoutTab = within(baseElement).getByRole('tab', { name: /layout/i });
            fireEvent.click(layoutTab);

            const soloBtn = within(baseElement).getByRole('button', { name: /^solo$/i });
            fireEvent.click(soloBtn);

            // 4. In solo mode, event badge is unsuppressed. Both badges must be rendered without overlapping.
            const scoreboardBadge = baseElement.querySelector('.story-cropper__badge--scoreboard');
            const attributionBadge = baseElement.querySelector('.story-cropper__badge--attribution');

            expect(scoreboardBadge).not.toBeNull();
            expect(attributionBadge).not.toBeNull();

            // Attribution is at bottom-center, scoreboard is relocated to top-center
            expect(attributionBadge?.className).toContain('story-cropper__badge--pos-bottom-center');
            expect(scoreboardBadge?.className).toContain('story-cropper__badge--pos-top-center');
        });
    });
});

