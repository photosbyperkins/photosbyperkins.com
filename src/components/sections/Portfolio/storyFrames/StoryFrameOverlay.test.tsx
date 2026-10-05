import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import StoryFrameOverlay from './StoryFrameOverlay';
import { STORY_FRAME_DEFINITIONS } from './frameDefinitions';
import type { StoryFrameId } from './types';

describe('StoryFrameOverlay', () => {
    afterEach(() => {
        cleanup();
    });

    it('returns null when frameId is none or empty', () => {
        const { container: c1 } = render(<StoryFrameOverlay frameId="none" />);
        expect(c1.firstChild).toBeNull();

        const { container: c2 } = render(<StoryFrameOverlay frameId={'' as StoryFrameId} />);
        expect(c2.firstChild).toBeNull();
    });

    it('returns null when frameId does not exist in registry', () => {
        const { container } = render(<StoryFrameOverlay frameId={'non-existent-frame' as StoryFrameId} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders svg with viewBox 0 0 1080 1920 when frameId is valid', () => {
        const targetId = STORY_FRAME_DEFINITIONS[1].id;
        const { container } = render(<StoryFrameOverlay frameId={targetId} />);
        const svg = container.querySelector('svg');

        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('viewBox')).toBe('0 0 1080 1920');
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
        expect(svg?.classList.contains('story-frame-overlay')).toBe(true);
    });

    it('applies colorOverride and custom className', () => {
        const targetId = STORY_FRAME_DEFINITIONS[1].id;
        const { container } = render(
            <StoryFrameOverlay
                frameId={targetId}
                colorOverride="#ff0055"
                className="custom-overlay-class"
            />
        );
        const svg = container.querySelector('svg');

        expect(svg?.classList.contains('custom-overlay-class')).toBe(true);
    });
});
