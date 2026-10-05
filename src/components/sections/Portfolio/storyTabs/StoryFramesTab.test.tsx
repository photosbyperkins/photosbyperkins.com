import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryFramesTab } from './StoryFramesTab';
import { STORY_FRAME_DEFINITIONS } from '../storyFrames/frameDefinitions';
import type { StoryFrameId, StoryFrameFilterCategory } from '../storyFrames/types';

describe('StoryFramesTab', () => {
    const mockProps = {
        activeFrameId: 'instant-film' as StoryFrameId,
        setActiveFrameId: vi.fn(),
        selectedFrameCategory: 'all' as StoryFrameFilterCategory,
        setSelectedFrameCategory: vi.fn(),
        categoryCounts: { all: 27, clean: 5, tech: 4 },
        displayedFrames: STORY_FRAME_DEFINITIONS,
        frameColorChoice: 'signature' as const,
        setFrameColorChoice: vi.fn(),
        frameCustomColor: '#ffffff',
        setFrameCustomColor: vi.fn(),
        effectiveFrameColor: '#ffffff',
        setIsDownloaded: vi.fn(),
    };

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders current frame label in the header badge', () => {
        const { container } = render(<StoryFramesTab {...mockProps} />);
        expect(screen.getByText(/FRAME/i)).not.toBeNull();
        const badge = container.querySelector('.story-export-modal__frame-current-badge');
        expect(badge?.textContent).toBe('Polaroid');
    });

    it('renders quick swatches and triggers color change on click', () => {
        render(<StoryFramesTab {...mockProps} />);

        const goldSwatch = screen.getByRole('button', { name: /Frame tint: Gold/i });
        fireEvent.click(goldSwatch);

        expect(mockProps.setFrameColorChoice).toHaveBeenCalledWith('gold');
        expect(mockProps.setFrameCustomColor).toHaveBeenCalledWith('#f59e0b');
        expect(mockProps.setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('changes frame category when category pill is clicked', () => {
        render(<StoryFramesTab {...mockProps} />);

        const techTab = screen.getByRole('tab', { name: /Tech/i });
        fireEvent.click(techTab);

        expect(mockProps.setSelectedFrameCategory).toHaveBeenCalledWith('tech');
    });

    it('selects a new frame when a frame card is clicked', () => {
        render(<StoryFramesTab {...mockProps} />);

        const targetFrame = STORY_FRAME_DEFINITIONS[1];
        const frameCard = screen.getByRole('button', { name: new RegExp(`^${targetFrame.label}$`, 'i') });
        fireEvent.click(frameCard);

        expect(mockProps.setActiveFrameId).toHaveBeenCalledWith(targetFrame.id);
        expect(mockProps.setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('hides color picker header swatches when activeFrameId is none', () => {
        render(<StoryFramesTab {...mockProps} activeFrameId="none" />);

        expect(screen.queryByRole('button', { name: /Frame tint: Gold/i })).toBeNull();
    });

    it('updates custom color when color input value changes', () => {
        render(<StoryFramesTab {...mockProps} />);

        const colorInput = screen.getByLabelText(/Custom frame tint color/i);
        fireEvent.change(colorInput, { target: { value: '#10b981' } });

        expect(mockProps.setFrameColorChoice).toHaveBeenCalledWith('custom');
        expect(mockProps.setFrameCustomColor).toHaveBeenCalledWith('#10b981');
        expect(mockProps.setIsDownloaded).toHaveBeenCalledWith(false);
    });
});
