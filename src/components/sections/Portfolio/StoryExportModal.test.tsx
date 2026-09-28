import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, within, fireEvent, cleanup } from '@testing-library/react';
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
        const { container } = render(
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
        expect(container.querySelector('.story-export-modal__body')).not.toBeNull();
        expect(container.querySelector('.story-export-modal__preview-pane')).not.toBeNull();
        expect(container.querySelector('.story-export-modal__viewport-card')).not.toBeNull();
        expect(container.querySelector('.story-export-modal__controls-pane')).not.toBeNull();

        // In default crop mode, StoryCropper is rendered inside viewport-card
        const viewportCard = container.querySelector('.story-export-modal__viewport-card');
        const storyCropper = container.querySelector('.story-cropper');
        expect(storyCropper).not.toBeNull();
        expect(viewportCard?.contains(storyCropper!)).toBe(true);
    });

    it('triggers resetToDefaults and displays confirmation toast when clicking the reset button', () => {
        const { container } = render(
            <StoryExportModal
                isOpen={true}
                onClose={mockOnClose}
                photo={samplePhoto}
                eventName="2024.10.22 - Championship Match - Team A vs Team B"
                year="2024"
                index={0}
            />
        );

        const resetBtn = within(container).getByRole('button', { name: /Reset story format to defaults/i });
        expect(resetBtn).toBeDefined();

        fireEvent.click(resetBtn);

        // Toast message appears in controls pane
        const toast = container.querySelector('.story-export-modal__toast');
        expect(toast).not.toBeNull();
        expect(toast?.textContent).toContain('Reset story format to defaults');
        expect(toast?.classList.contains('story-export-modal__toast--error')).toBe(false);
    });

    it('switches to padded mode and renders padded-preview container', () => {
        const { container } = render(
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
        const paddedBtn = within(container).getByRole('button', { name: /^padded$/i });
        fireEvent.click(paddedBtn);

        const viewportCard = container.querySelector('.story-export-modal__viewport-card');
        const paddedPreview = container.querySelector('.story-export-modal__padded-preview');
        expect(paddedPreview).not.toBeNull();
        expect(viewportCard?.contains(paddedPreview!)).toBe(true);
    });
});
