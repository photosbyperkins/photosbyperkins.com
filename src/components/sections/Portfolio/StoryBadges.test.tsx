import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryBadges } from './StoryBadges';
import type { BadgeOptions } from '../../../utils/storyCanvas';

describe('StoryBadges', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
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

    /**
     * jsdom does no layout, so give the frame layer and the event badge real geometry:
     * a 400x800 frame with a 200x60 event badge resting at (100, 700).
     */
    const mockGeometry = (container: HTMLElement) => {
        const layer = container.querySelector('.story-cropper__badges-container') as HTMLElement;
        const badge = container.querySelector('.story-cropper__badge--scoreboard') as HTMLElement;
        vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            right: 400,
            bottom: 800,
            width: 400,
            height: 800,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });
        const define = (prop: string, value: number) =>
            Object.defineProperty(badge, prop, { configurable: true, get: () => value });
        define('offsetWidth', 200);
        define('offsetHeight', 60);
        define('offsetLeft', 100);
        define('offsetTop', 700);
        return badge;
    };

    const drag = (el: HTMLElement, from: [number, number], to: [number, number]) => {
        fireEvent.pointerDown(el, { clientX: from[0], clientY: from[1], pointerId: 1, button: 0 });
        fireEvent.pointerMove(el, { clientX: to[0], clientY: to[1], pointerId: 1 });
        fireEvent.pointerUp(el, { clientX: to[0], clientY: to[1], pointerId: 1 });
    };

    it('renders move and remove handles for both active badges', () => {
        render(<StoryBadges badges={baseBadges} onBadgesChange={vi.fn()} />);

        expect(screen.getByLabelText('Move event badge')).toBeDefined();
        expect(screen.getByLabelText('Move attribution badge')).toBeDefined();
        expect(screen.getByLabelText('Remove event badge')).toBeDefined();
        expect(screen.getByLabelText('Remove attribution badge')).toBeDefined();
    });

    it('renders no handles when the preview is read-only', () => {
        render(<StoryBadges badges={baseBadges} />);
        expect(screen.queryByLabelText('Move event badge')).toBeNull();
        expect(screen.queryByLabelText('Remove event badge')).toBeNull();
    });

    it('hides the event badge when its close button is clicked', () => {
        const onBadgesChange = vi.fn();
        render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);

        fireEvent.click(screen.getByLabelText('Remove event badge'));

        expect(onBadgesChange).toHaveBeenCalledWith(expect.objectContaining({ showScoreboard: false }));
    });

    it('hides the attribution badge when its close button is clicked', () => {
        const onBadgesChange = vi.fn();
        render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);

        fireEvent.click(screen.getByLabelText('Remove attribution badge'));

        expect(onBadgesChange).toHaveBeenCalledWith(expect.objectContaining({ showAttribution: false }));
    });

    it('steps along an edge with the arrow keys on the move handle', () => {
        const onBadgesChange = vi.fn();
        render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);

        fireEvent.keyDown(screen.getByLabelText('Move event badge'), { key: 'ArrowLeft' });

        expect(onBadgesChange).toHaveBeenCalledWith(expect.objectContaining({ scoreboardPosition: 'bottom-left' }));
    });

    it("trades places when the arrow keys move a badge onto the other badge's edge", () => {
        const onBadgesChange = vi.fn();
        render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);

        fireEvent.keyDown(screen.getByLabelText('Move event badge'), { key: 'ArrowUp' });

        expect(onBadgesChange).toHaveBeenCalledWith(
            expect.objectContaining({ scoreboardPosition: 'top-center', attributionPosition: 'bottom-center' })
        );
    });

    it('keeps arrow keys from reaching the photo cropper underneath', () => {
        const onParentKeyDown = vi.fn();
        render(
            <div onKeyDown={onParentKeyDown}>
                <StoryBadges badges={baseBadges} onBadgesChange={vi.fn()} />
            </div>
        );

        // Even at the edge (no move possible) the key must be swallowed.
        fireEvent.keyDown(screen.getByLabelText('Move event badge'), { key: 'ArrowDown' });

        expect(onParentKeyDown).not.toHaveBeenCalled();
    });

    it('removes the badge with Delete on the move handle', () => {
        const onBadgesChange = vi.fn();
        render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);

        fireEvent.keyDown(screen.getByLabelText('Move attribution badge'), { key: 'Delete' });

        expect(onBadgesChange).toHaveBeenCalledWith(expect.objectContaining({ showAttribution: false }));
    });

    it('does not move a badge on a tap without dragging', () => {
        const onBadgesChange = vi.fn();
        const { container } = render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);
        const badge = mockGeometry(container);

        drag(badge, [150, 720], [150, 720]);
        fireEvent.pointerDown(screen.getByLabelText('Move event badge'), {
            clientX: 105,
            clientY: 705,
            pointerId: 2,
            button: 0,
        });
        fireEvent.pointerUp(screen.getByLabelText('Move event badge'), { clientX: 105, clientY: 705, pointerId: 2 });

        expect(onBadgesChange).not.toHaveBeenCalled();
    });

    it('drags a badge to the top edge and trades places with the badge that was there', () => {
        const onBadgesChange = vi.fn();
        const { container } = render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);
        const badge = mockGeometry(container);

        drag(badge, [150, 720], [150, 100]);

        expect(onBadgesChange).toHaveBeenCalledWith(
            expect.objectContaining({ scoreboardPosition: 'top-center', attributionPosition: 'bottom-center' })
        );
    });

    it('drags a badge into a side slot along its own edge', () => {
        const onBadgesChange = vi.fn();
        const { container } = render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);
        const badge = mockGeometry(container);

        drag(badge, [150, 720], [400, 720]);

        expect(onBadgesChange).toHaveBeenCalledWith(
            expect.objectContaining({ scoreboardPosition: 'bottom-right', attributionPosition: 'top-center' })
        );
    });

    it('shows a drop ghost at the target slot while dragging', () => {
        const { container } = render(<StoryBadges badges={baseBadges} onBadgesChange={vi.fn()} />);
        const badge = mockGeometry(container);

        fireEvent.pointerDown(badge, { clientX: 150, clientY: 720, pointerId: 1, button: 0 });
        fireEvent.pointerMove(badge, { clientX: 0, clientY: 100, pointerId: 1 });

        const ghost = container.querySelector('.story-cropper__drop-ghost');
        expect(ghost?.className).toContain('story-cropper__badge--pos-top-left');
        // The other badge makes room live while dragging
        const attribution = container.querySelector('.story-cropper__badge--attribution');
        expect(attribution?.className).toContain('story-cropper__badge--pos-bottom-center');
    });

    it('cancels the move when the pointer is cancelled', () => {
        const onBadgesChange = vi.fn();
        const { container } = render(<StoryBadges badges={baseBadges} onBadgesChange={onBadgesChange} />);
        const badge = mockGeometry(container);

        fireEvent.pointerDown(badge, { clientX: 150, clientY: 720, pointerId: 1, button: 0 });
        fireEvent.pointerMove(badge, { clientX: 150, clientY: 100, pointerId: 1 });
        fireEvent.pointerCancel(badge, { pointerId: 1 });

        expect(onBadgesChange).not.toHaveBeenCalled();
        expect(container.querySelector('.story-cropper__drop-ghost')).toBeNull();
    });

    it('applies light theme class when theme is light', () => {
        const { container } = render(<StoryBadges badges={baseBadges} theme="light" />);
        expect(container.querySelectorAll('.story-cropper__badge--light').length).toBe(2);
    });

    it('relocates suppressed scoreboard badge to opposite tier when attribution is moved to its position', () => {
        const onBadgesChange = vi.fn();
        const suppressedBadges: BadgeOptions = {
            ...baseBadges,
            isEventAmbiguous: true,
            showScoreboard: true,
            scoreboardPosition: 'bottom-center',
            attributionPosition: 'top-center',
        };

        render(<StoryBadges badges={suppressedBadges} onBadgesChange={onBadgesChange} />);

        // Only attribution badge is active/rendered
        expect(screen.queryByLabelText('Move event badge')).toBeNull();
        expect(screen.getByLabelText('Move attribution badge')).toBeDefined();

        // Step attribution badge down to bottom-center (where scoreboard was located)
        fireEvent.keyDown(screen.getByLabelText('Move attribution badge'), { key: 'ArrowDown' });

        expect(onBadgesChange).toHaveBeenCalledWith(
            expect.objectContaining({
                attributionPosition: 'bottom-center',
                scoreboardPosition: 'top-center',
            })
        );
    });
});
