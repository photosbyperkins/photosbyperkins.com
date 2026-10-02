import React from 'react';
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

        // Switch to Padded mode to alter story format
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

    it('switches to padded mode and renders padded-preview container', () => {
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

        // Click 'Padded' segmented toggle
        const paddedBtn = within(baseElement).getByRole('button', { name: /^padded$/i });
        fireEvent.click(paddedBtn);

        const viewportCard = baseElement.querySelector('.story-export-modal__viewport-card');
        const paddedPreview = baseElement.querySelector('.story-export-modal__padded-preview');
        expect(paddedPreview).not.toBeNull();
        expect(viewportCard?.contains(paddedPreview!)).toBe(true);
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

        // Switch to Burst mode
        const burstBtn = within(baseElement).getByRole('button', { name: /^burst$/i });
        fireEvent.click(burstBtn);

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
});
