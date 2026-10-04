import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import { StoryExportModal } from './StoryExportModal';
import { useAppStore } from '../../../store/useAppStore';
import type { PhotoRecord } from '../../../types';

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

    it('renders the modal structure with viewport-card and controls-pane', () => {
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

        // Verify body and preview pane
        expect(baseElement.querySelector('.story-export-modal__body')).not.toBeNull();
        expect(baseElement.querySelector('.story-export-modal__preview-pane')).not.toBeNull();
        expect(baseElement.querySelector('.story-export-modal__viewport-card')).not.toBeNull();
        expect(baseElement.querySelector('.story-export-modal__controls-pane')).not.toBeNull();

        // In default crop mode, StoryCropper is rendered inside viewport-card
        const viewportCard = baseElement.querySelector('.story-export-modal__viewport-card');
        const storyCropper = baseElement.querySelector('.story-cropper');
        expect(storyCropper).not.toBeNull();
        expect(viewportCard?.contains(storyCropper!)).toBe(true);
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

    describe('Mobile alternative layout (<= 860px)', () => {
        beforeEach(() => {
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                matches: query === '(max-width: 860px)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));
        });

        it('renders mobile stage, hero preview, and floating quick-tools dock, omitting desktop controls pane', () => {
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

            expect(baseElement.querySelector('.story-export-modal--mobile')).not.toBeNull();
            expect(baseElement.querySelector('.story-export-modal__mobile-stage')).not.toBeNull();
            expect(baseElement.querySelector('.story-export-modal__mobile-hero')).not.toBeNull();
            expect(baseElement.querySelector('.story-mobile-dock')).not.toBeNull();
            expect(baseElement.querySelector('.story-export-modal__controls-pane')).toBeNull();

            // Preview is rendered inside mobile hero
            const hero = baseElement.querySelector('.story-export-modal__mobile-hero');
            expect(hero?.querySelector('.story-cropper')).not.toBeNull();

            // Header and Footer remain present
            expect(baseElement.querySelector('.modal-shell__title')?.textContent).toBe('STORY MAKER');
            expect(baseElement.querySelector('.story-export-modal__primary-action')).not.toBeNull();

            // Popover drawer is initially closed
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();
        });

        it('opens popover when a dock button is tapped, toggles it on re-click, and switches tabs', () => {
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

            const dock = baseElement.querySelector('.story-mobile-dock')!;
            const layoutDockBtn = within(dock as HTMLElement).getByRole('button', { name: /^layout$/i });

            // Click Layout -> Opens popover
            fireEvent.click(layoutDockBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).not.toBeNull();
            expect(layoutDockBtn.classList.contains('is-active')).toBe(true);

            // Popover shows Layout tab controls (e.g., Framing preset buttons)
            expect(
                within(baseElement.querySelector('.story-mobile-popover') as HTMLElement).getByRole('button', {
                    name: /^padded$/i,
                })
            ).not.toBeNull();

            // Click Layout again -> Toggles/closes popover
            fireEvent.click(layoutDockBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();
            expect(layoutDockBtn.classList.contains('is-active')).toBe(false);

            // Click Filters -> Opens popover on Filters tab
            const filtersDockBtn = within(dock as HTMLElement).getByRole('button', { name: /^filters$/i });
            fireEvent.click(filtersDockBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).not.toBeNull();
            expect(filtersDockBtn.classList.contains('is-active')).toBe(true);
        });

        it('allows switching tabs inside the popover and closing via the popover close button or backdrop', () => {
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

            // Open popover via Layout dock button
            const layoutDockBtn = within(baseElement.querySelector('.story-mobile-dock') as HTMLElement).getByRole(
                'button',
                { name: /^layout$/i }
            );
            fireEvent.click(layoutDockBtn);

            const popover = baseElement.querySelector('.story-mobile-popover') as HTMLElement;
            expect(popover).not.toBeNull();

            // Switch to Frames tab directly inside the popover tab switcher
            const framesPopoverTab = within(popover).getByRole('tab', { name: /frames/i });
            fireEvent.click(framesPopoverTab);
            expect(framesPopoverTab.getAttribute('aria-selected')).toBe('true');

            // Frames button on dock is also updated in sync
            const framesDockBtn = within(baseElement.querySelector('.story-mobile-dock') as HTMLElement).getByRole(
                'button',
                { name: /^frames$/i }
            );
            expect(framesDockBtn.classList.contains('is-active')).toBe(true);

            // Close via close button in popover header
            const closeBtn = within(popover).getByRole('button', { name: /close controls/i });
            fireEvent.click(closeBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();

            // Re-open and close via backdrop click
            fireEvent.click(layoutDockBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).not.toBeNull();

            const backdrop = baseElement.querySelector('.story-mobile-popover__backdrop') as HTMLElement;
            expect(backdrop).not.toBeNull();
            fireEvent.click(backdrop);
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();
        });

        it('closes the popover when pressing Escape without closing the modal', () => {
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

            // Open popover
            const layoutDockBtn = within(baseElement.querySelector('.story-mobile-dock') as HTMLElement).getByRole(
                'button',
                { name: /^layout$/i }
            );
            fireEvent.click(layoutDockBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).not.toBeNull();

            // Press Escape
            fireEvent.keyDown(window, { key: 'Escape' });
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('automatically opens the layout popover and switches to that frame selector when tapping an empty frame', () => {
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

            // Popover starts closed
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();

            // Open layout popover to deselect the 2nd slot
            const layoutDockBtn = within(baseElement.querySelector('.story-mobile-dock') as HTMLElement).getByRole(
                'button',
                { name: /^layout$/i }
            );
            fireEvent.click(layoutDockBtn);

            const popover = baseElement.querySelector('.story-mobile-popover') as HTMLElement;
            expect(popover).not.toBeNull();

            // Step 2 button is initially assigned to Frame 2. Click it to activate step 2
            const btmStepBtn = within(popover).getByRole('button', {
                name: /Step 2 \(BTM\): Frame 2/i,
            });
            fireEvent.click(btmStepBtn);

            // In the burst strip, click Frame 2 to deselect it
            const frame2Thumb = within(popover).getByRole('button', {
                name: /Assigned to BTM panel/i,
            });
            fireEvent.click(frame2Thumb);

            // Close the popover via close button
            const closeBtn = within(popover).getByRole('button', { name: /close controls/i });
            fireEvent.click(closeBtn);
            expect(baseElement.querySelector('.story-mobile-popover')).toBeNull();

            // Find the empty panel (slot 2)
            const emptyPanel = baseElement.querySelector<HTMLElement>('.story-burst-cropper__panel--empty');
            expect(emptyPanel).not.toBeNull();

            // Tap the empty panel in the preview hero
            fireEvent.click(emptyPanel!);

            // 1. Popover should automatically open
            const reopenedPopover = baseElement.querySelector('.story-mobile-popover');
            expect(reopenedPopover).not.toBeNull();

            // 2. Active dock tab should be layout
            expect(layoutDockBtn.classList.contains('is-active')).toBe(true);

            // 3. Step 2 (BTM) selector should be active in the layout tab
            const btmEmptyBtn = within(reopenedPopover as HTMLElement).getByRole('button', {
                name: /Step 2 \(BTM\): Empty/i,
            });
            expect(btmEmptyBtn.getAttribute('aria-pressed')).toBe('true');
        });
    });

    describe('Landscape Mobile layout', () => {
        beforeEach(() => {
            window.matchMedia = vi.fn().mockImplementation((query: string) => ({
                matches: query === '(orientation: landscape)' || query === '(max-height: 550px)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));
        });

        it('renders 2-column landscape stage with left preview and right controls pane', () => {
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

            expect(baseElement.querySelector('.story-export-modal--landscape')).not.toBeNull();
            expect(baseElement.querySelector('.story-export-modal__landscape-stage')).not.toBeNull();
            expect(baseElement.querySelector('.story-export-modal__landscape-preview')).not.toBeNull();
            expect(baseElement.querySelector('.story-export-modal__landscape-controls')).not.toBeNull();

            // Preview is rendered inside landscape preview container
            const preview = baseElement.querySelector('.story-export-modal__landscape-preview');
            expect(preview?.querySelector('.story-cropper')).not.toBeNull();

            // Dock and mobile-stage are omitted in landscape mode
            expect(baseElement.querySelector('.story-mobile-dock')).toBeNull();
            expect(baseElement.querySelector('.story-export-modal__mobile-stage')).toBeNull();

            // Tab bar is present in landscape controls
            const controls = baseElement.querySelector('.story-export-modal__landscape-controls')!;
            const layoutTab = within(controls as HTMLElement).getByRole('tab', { name: /^layout$/i });
            expect(layoutTab).not.toBeNull();
            expect(layoutTab.getAttribute('aria-selected')).toBe('true');

            // Switch tabs in landscape mode
            const filtersTab = within(controls as HTMLElement).getByRole('tab', { name: /^filters$/i });
            fireEvent.click(filtersTab);
            expect(filtersTab.getAttribute('aria-selected')).toBe('true');
        });
    });
});
