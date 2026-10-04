import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { StoryBurstCropper } from './StoryBurstCropper';

describe('StoryBurstCropper', () => {
    const mockOnPanChange = vi.fn();
    const mockOnSelectPanel = vi.fn();

    const sampleImages = ['https://example.com/b1.jpg', 'https://example.com/b2.jpg', 'https://example.com/b3.jpg'];

    const defaultPanOffsets = [
        { x: 0.5, y: 0.45, zoom: 1.0 },
        { x: 0.5, y: 0.45, zoom: 1.0 },
        { x: 0.5, y: 0.45, zoom: 1.0 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup setPointerCapture and releasePointerCapture on HTMLElement prototype
        window.HTMLElement.prototype.setPointerCapture = vi.fn();
        window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders 3 panels with slot names and timestamps', () => {
        const { container } = render(
            <StoryBurstCropper
                images={sampleImages}
                timeStamps={[0.0, 0.42, 0.84]}
                showTimeStamps={true}
                panOffsets={defaultPanOffsets}
                onPanChange={mockOnPanChange}
            />
        );

        const panels = container.querySelectorAll('.story-burst-cropper__panel');
        expect(panels.length).toBe(3);

        expect(panels[0].textContent).toContain('TOP');
        expect(panels[0].textContent).toContain('+0.00s');

        expect(panels[1].textContent).toContain('MID');
        expect(panels[1].textContent).toContain('+0.42s');

        expect(panels[2].textContent).toContain('BTM');
        expect(panels[2].textContent).toContain('+0.84s');

        const images = container.querySelectorAll('.story-burst-cropper__image');
        expect(images.length).toBe(3);
    });

    it('renders empty slot placeholder when an image is missing', () => {
        const { container } = render(
            <StoryBurstCropper
                images={[sampleImages[0], null, sampleImages[2]]}
                panOffsets={defaultPanOffsets}
                onPanChange={mockOnPanChange}
            />
        );

        const panels = container.querySelectorAll('.story-burst-cropper__panel');
        expect(panels[0].classList.contains('story-burst-cropper__panel--has-image')).toBe(true);
        expect(panels[1].classList.contains('story-burst-cropper__panel--empty')).toBe(true);
        expect(panels[1].textContent).toContain('2. MID');
        expect(panels[1].textContent).toContain('Tap to select photo');
    });

    it('triggers onSelectEmptyPanel and onSelectPanel when clicking or pressing Enter on an empty slot', () => {
        const mockOnSelectEmptyPanel = vi.fn();
        const { container } = render(
            <StoryBurstCropper
                images={[sampleImages[0], null, sampleImages[2]]}
                panOffsets={defaultPanOffsets}
                onPanChange={mockOnPanChange}
                onSelectPanel={mockOnSelectPanel}
                onSelectEmptyPanel={mockOnSelectEmptyPanel}
            />
        );

        const emptyPanel = container.querySelectorAll<HTMLElement>('.story-burst-cropper__panel')[1];
        fireEvent.click(emptyPanel);

        expect(mockOnSelectEmptyPanel).toHaveBeenCalledWith(1);
        expect(mockOnSelectPanel).toHaveBeenCalledWith(1);

        mockOnSelectEmptyPanel.mockClear();
        fireEvent.keyDown(emptyPanel, { key: 'Enter' });
        expect(mockOnSelectEmptyPanel).toHaveBeenCalledWith(1);
    });

    it('handles direct pointer drag to pan an individual frame', () => {
        const { container } = render(
            <StoryBurstCropper
                images={sampleImages}
                panOffsets={[
                    { x: 0.5, y: 0.45, zoom: 1.5 },
                    { x: 0.5, y: 0.45, zoom: 1.5 },
                    { x: 0.5, y: 0.45, zoom: 1.5 },
                ]}
                onPanChange={mockOnPanChange}
                onSelectPanel={mockOnSelectPanel}
            />
        );

        const panel1 = container.querySelectorAll<HTMLElement>('.story-burst-cropper__panel')[1];
        // Mock getBoundingClientRect
        vi.spyOn(panel1, 'getBoundingClientRect').mockReturnValue({
            width: 360,
            height: 200,
            top: 100,
            bottom: 300,
            left: 50,
            right: 410,
            x: 50,
            y: 100,
            toJSON: () => {},
        });

        // Trigger pointer down to start drag
        fireEvent.pointerDown(panel1, {
            pointerId: 1,
            clientX: 100,
            clientY: 150,
        });

        expect(panel1.setPointerCapture).toHaveBeenCalledWith(1);
        expect(mockOnSelectPanel).toHaveBeenCalledWith(1);
        expect(panel1.classList.contains('story-burst-cropper__panel--dragging')).toBe(true);

        // Move pointer
        fireEvent.pointerMove(panel1, {
            pointerId: 1,
            clientX: 80, // Moved left 20px -> deltaX = -20
            clientY: 130, // Moved up 20px -> deltaY = -20
        });

        expect(mockOnPanChange).toHaveBeenCalled();
        const calledArgs = mockOnPanChange.mock.calls[0];
        expect(calledArgs[0]).toBe(1); // panel index 1
        expect(typeof calledArgs[1].x).toBe('number');
        expect(typeof calledArgs[1].y).toBe('number');
        expect(calledArgs[1].zoom).toBe(1.5);

        // End pointer drag
        fireEvent.pointerUp(panel1, {
            pointerId: 1,
        });

        expect(panel1.releasePointerCapture).toHaveBeenCalledWith(1);
        expect(panel1.classList.contains('story-burst-cropper__panel--dragging')).toBe(false);
    });

    it('supports scroll-to-zoom with wheel events, constrained to minimum 1.0 (fill frame) and maximum 3.5', () => {
        const { container } = render(
            <StoryBurstCropper images={sampleImages} panOffsets={defaultPanOffsets} onPanChange={mockOnPanChange} />
        );

        const panel0 = container.querySelectorAll<HTMLElement>('.story-burst-cropper__panel')[0];

        // Scroll up (negative deltaY) -> zoom in
        fireEvent.wheel(panel0, { deltaY: -100 });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: 0.45,
            zoom: 1.1,
        });

        // Scroll down (positive deltaY) when already at 1.0 -> stays clamped at minimum 1.0 to always fill frame
        mockOnPanChange.mockClear();
        fireEvent.wheel(panel0, { deltaY: 100 });
        expect(mockOnPanChange).not.toHaveBeenCalled(); // No change since already at minimum 1.0
    });

    it('supports pinch-to-zoom with 2-finger touch events', () => {
        const { container } = render(
            <StoryBurstCropper images={sampleImages} panOffsets={defaultPanOffsets} onPanChange={mockOnPanChange} />
        );

        const panel1 = container.querySelectorAll<HTMLElement>('.story-burst-cropper__panel')[1];

        // Touch start with 2 fingers at distance 100
        fireEvent.touchStart(panel1, {
            touches: [
                { clientX: 50, clientY: 50 },
                { clientX: 150, clientY: 50 },
            ],
        });

        // Touch move pinching outward to distance 150
        fireEvent.touchMove(panel1, {
            touches: [
                { clientX: 25, clientY: 50 },
                { clientX: 175, clientY: 50 },
            ],
        });

        expect(mockOnPanChange).toHaveBeenCalled();
        const callArgs = mockOnPanChange.mock.calls[0];
        expect(callArgs[0]).toBe(1);
        expect(callArgs[1].zoom).toBeGreaterThan(1.0);
    });

    it('supports double-click to toggle zoom between 1.0x and 1.8x', () => {
        const { container, rerender } = render(
            <StoryBurstCropper images={sampleImages} panOffsets={defaultPanOffsets} onPanChange={mockOnPanChange} />
        );

        const panel2 = container.querySelectorAll<HTMLElement>('.story-burst-cropper__panel')[2];

        // Double click when at 1.0 -> zooms in to 1.8
        fireEvent.doubleClick(panel2);
        expect(mockOnPanChange).toHaveBeenCalledWith(2, {
            x: 0.5,
            y: 0.45,
            zoom: 1.8,
        });

        // When at 1.8 -> double click zooms out to 1.0
        mockOnPanChange.mockClear();
        rerender(
            <StoryBurstCropper
                images={sampleImages}
                panOffsets={[defaultPanOffsets[0], defaultPanOffsets[1], { x: 0.5, y: 0.45, zoom: 1.8 }]}
                onPanChange={mockOnPanChange}
            />
        );

        fireEvent.doubleClick(panel2);
        expect(mockOnPanChange).toHaveBeenCalledWith(2, {
            x: 0.5,
            y: 0.45,
            zoom: 1.0,
        });
    });

    it('displays zoom pill badge when zoom exceeds 1.05', () => {
        const { container } = render(
            <StoryBurstCropper
                images={sampleImages}
                panOffsets={[
                    { x: 0.5, y: 0.45, zoom: 1.0 },
                    { x: 0.5, y: 0.45, zoom: 1.5 },
                    { x: 0.5, y: 0.45, zoom: 2.0 },
                ]}
                onPanChange={mockOnPanChange}
            />
        );

        const zoomPills = container.querySelectorAll('.story-burst-cropper__zoom-pill');
        expect(zoomPills.length).toBe(2);
        expect(zoomPills[0].textContent).toBe('1.5x');
        expect(zoomPills[1].textContent).toBe('2.0x');
    });

    it('supports keyboard nudging with Arrow keys and keyboard zoom with +/-/0 keys', () => {
        const { container } = render(
            <StoryBurstCropper images={sampleImages} panOffsets={defaultPanOffsets} onPanChange={mockOnPanChange} />
        );

        const panel0 = container.querySelectorAll<HTMLElement>('.story-burst-cropper__panel')[0];

        // ArrowDown increases Y
        fireEvent.keyDown(panel0, { key: 'ArrowDown' });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: Math.min(1, 0.45 + 0.03),
            zoom: 1.0,
        });

        // ArrowUp decreases Y
        fireEvent.keyDown(panel0, { key: 'ArrowUp' });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: Math.max(0, 0.45 - 0.03),
            zoom: 1.0,
        });

        // ArrowRight increases X
        fireEvent.keyDown(panel0, { key: 'ArrowRight' });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: Math.min(1, 0.5 + 0.03),
            y: 0.45,
            zoom: 1.0,
        });

        // ArrowLeft decreases X
        fireEvent.keyDown(panel0, { key: 'ArrowLeft' });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: Math.max(0, 0.5 - 0.03),
            y: 0.45,
            zoom: 1.0,
        });

        // Shift modifier uses larger step (0.1)
        fireEvent.keyDown(panel0, { key: 'ArrowDown', shiftKey: true });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: 0.55,
            zoom: 1.0,
        });

        // '+' key zooms in
        mockOnPanChange.mockClear();
        fireEvent.keyDown(panel0, { key: '+' });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: 0.45,
            zoom: 1.1,
        });

        // '-' key when at 1.0 stays clamped at minimum 1.0 (fill frame)
        mockOnPanChange.mockClear();
        fireEvent.keyDown(panel0, { key: '-' });
        expect(mockOnPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: 0.45,
            zoom: 1.0,
        });
    });

    it('renders badges and frame overlay', () => {
        const { container } = render(
            <StoryBurstCropper
                images={sampleImages}
                panOffsets={defaultPanOffsets}
                onPanChange={mockOnPanChange}
                badges={{
                    showScoreboard: true,
                    scoreboardTitle: 'Grand Prix 2024',
                    teams: ['Team Red', 'Team Blue'],
                    showAttribution: true,
                }}
                frameId="derby-quads"
                frameColorOverride="#ff0088"
            />
        );

        expect(container.querySelector('.story-cropper__badge--scoreboard')).not.toBeNull();
        expect(container.querySelector('.story-cropper__badge--scoreboard')?.textContent).toContain('Team Red');
        expect(container.querySelector('.story-frame-overlay')).not.toBeNull();
    });

    it('renders 2 panels with TOP and BTM slot names in Duet mode', () => {
        const duetImages = ['/photos/duet_1.jpg', '/photos/duet_2.jpg'];
        const duetPanOffsets = [
            { x: 0.5, y: 0.45, zoom: 1.0 },
            { x: 0.5, y: 0.45, zoom: 1.0 },
        ];

        const { container } = render(
            <StoryBurstCropper
                images={duetImages}
                panOffsets={duetPanOffsets}
                onPanChange={mockOnPanChange}
                panelCount={2}
            />
        );

        const panels = container.querySelectorAll('.story-burst-cropper__panel');
        expect(panels.length).toBe(2);

        const slotNames = container.querySelectorAll('.story-burst-cropper__slot-name');
        expect(slotNames.length).toBe(2);
        expect(slotNames[0].textContent).toBe('TOP');
        expect(slotNames[1].textContent).toBe('BTM');

        const cropperRegion = container.querySelector('.story-burst-cropper');
        expect(cropperRegion?.getAttribute('aria-label')).toBe('2-Panel Duet Interactive Cropper');
    });

    it('infers 2 panels automatically when images array has length 2 without explicit panelCount', () => {
        const duetImages = ['/photos/duet_1.jpg', '/photos/duet_2.jpg'];
        const duetPanOffsets = [
            { x: 0.5, y: 0.45, zoom: 1.0 },
            { x: 0.5, y: 0.45, zoom: 1.0 },
        ];

        const { container } = render(
            <StoryBurstCropper images={duetImages} panOffsets={duetPanOffsets} onPanChange={mockOnPanChange} />
        );

        const panels = container.querySelectorAll('.story-burst-cropper__panel');
        expect(panels.length).toBe(2);
        expect(container.querySelector('.story-burst-cropper')?.getAttribute('aria-label')).toBe(
            '2-Panel Duet Interactive Cropper'
        );
    });

    it('suppresses timestamp pills when timestamps have zero delta even if showTimeStamps is true', () => {
        const duetImages = ['/photos/duet_1.jpg', '/photos/duet_2.jpg'];
        const duetPanOffsets = [
            { x: 0.5, y: 0.45, zoom: 1.0 },
            { x: 0.5, y: 0.45, zoom: 1.0 },
        ];

        const { container } = render(
            <StoryBurstCropper
                images={duetImages}
                panOffsets={duetPanOffsets}
                onPanChange={mockOnPanChange}
                panelCount={2}
                timeStamps={[0.0, 0.0]}
                showTimeStamps={true}
            />
        );

        const pills = container.querySelectorAll('.story-burst-cropper__timestamp-pill');
        expect(pills.length).toBe(0);
    });

    it('renders consistent interaction hint for both Duet and Triptych', () => {
        const duetImages = ['/photos/duet_1.jpg', '/photos/duet_2.jpg'];
        const duetPanOffsets = [
            { x: 0.5, y: 0.45, zoom: 1.0 },
            { x: 0.5, y: 0.45, zoom: 1.0 },
        ];

        const { container } = render(
            <StoryBurstCropper
                images={duetImages}
                panOffsets={duetPanOffsets}
                panelCount={2}
                onPanChange={mockOnPanChange}
            />
        );

        const hint = container.querySelector('.story-cropper__hint');
        expect(hint).not.toBeNull();
        expect(hint?.textContent).toContain('Tap panel to select');
        expect(hint?.textContent).toContain('Drag to reposition');
        expect(hint?.textContent).toContain('double-click to zoom');
    });

    it('adapts image wrapper scale synchronously when cached image dimensions are available', () => {
        Object.defineProperty(HTMLImageElement.prototype, 'complete', {
            configurable: true,
            get() {
                return true;
            },
        });
        Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
            configurable: true,
            get() {
                return 1200;
            },
        });
        Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
            configurable: true,
            get() {
                return 1800;
            },
        });

        try {
            const { container } = render(
                <StoryBurstCropper
                    images={['/photos/cached_1.jpg', '/photos/cached_2.jpg']}
                    panOffsets={[
                        { x: 0.5, y: 0.5, zoom: 1.0 },
                        { x: 0.5, y: 0.5, zoom: 1.0 },
                    ]}
                    panelCount={2}
                    onPanChange={mockOnPanChange}
                />
            );

            const wrappers = container.querySelectorAll('.story-burst-cropper__image-wrapper');
            expect(wrappers.length).toBe(2);
        } finally {
            delete (HTMLImageElement.prototype as unknown as Record<string, unknown>).complete;
            delete (HTMLImageElement.prototype as unknown as Record<string, unknown>).naturalWidth;
            delete (HTMLImageElement.prototype as unknown as Record<string, unknown>).naturalHeight;
        }
    });
});
