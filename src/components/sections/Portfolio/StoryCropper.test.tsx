import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { StoryCropper } from './StoryCropper';
import type { NormalizedCrop } from '../../../utils/storyCanvas';

describe('StoryCropper', () => {
    const mockOnChange = vi.fn();

    const sampleCrop: NormalizedCrop = {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        zoom: 1.0,
        centerX: 0.5,
        centerY: 0.5,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.HTMLElement.prototype.setPointerCapture = vi.fn();
        window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders image, viewport, and interaction hint with double-click', () => {
        const { container } = render(
            <StoryCropper
                imageSrc="https://example.com/photo.jpg"
                crop={sampleCrop}
                naturalWidth={1920}
                naturalHeight={1080}
                onChange={mockOnChange}
            />
        );

        const viewport = container.querySelector('.story-cropper__viewport');
        expect(viewport).not.toBeNull();
        expect(viewport?.getAttribute('tabIndex')).toBe('0');
        expect(viewport?.getAttribute('role')).toBe('region');

        const hint = container.querySelector('.story-cropper__hint');
        expect(hint?.textContent).toContain('double-click to zoom');
    });

    it('supports double-click to toggle between Fit (minZoom) and Fill (1.0)', () => {
        // For 1920x1080 image, calculateFitZoom gives ~0.291
        const fitZoom = 0.291;
        const { container, rerender } = render(
            <StoryCropper
                imageSrc="https://example.com/photo.jpg"
                crop={{ ...sampleCrop, zoom: fitZoom }}
                naturalWidth={1920}
                naturalHeight={1080}
                onChange={mockOnChange}
            />
        );

        const viewport = container.querySelector<HTMLElement>('.story-cropper__viewport')!;

        // When at fitZoom (~0.291) -> double click zooms in to 1.0 (Fill)
        fireEvent.doubleClick(viewport);
        expect(mockOnChange).toHaveBeenCalled();
        const call1 = mockOnChange.mock.calls[0][0];
        expect(call1.zoom).toBe(1.0);

        // When at 1.0 (Fill) -> double click zooms out to minZoom (0.291)
        mockOnChange.mockClear();
        rerender(
            <StoryCropper
                imageSrc="https://example.com/photo.jpg"
                crop={{ ...sampleCrop, zoom: 1.0 }}
                naturalWidth={1920}
                naturalHeight={1080}
                onChange={mockOnChange}
            />
        );

        fireEvent.doubleClick(viewport);
        expect(mockOnChange).toHaveBeenCalled();
        const call2 = mockOnChange.mock.calls[0][0];
        expect(call2.zoom).toBeCloseTo(fitZoom, 2);
    });

    it('renders frosted background layer and maintains blur filter when padded', () => {
        const fitZoom = 0.291;
        const { container } = render(
            <StoryCropper
                imageSrc="https://example.com/photo.jpg"
                crop={{ ...sampleCrop, zoom: fitZoom }}
                paddedConfig={{ style: 'frosted', customColor: '#0a0a14', cardScale: 0.92, cardCornerRadius: 24 }}
                filterId="vivid"
                filterStrength={1.0}
                naturalWidth={1920}
                naturalHeight={1080}
                onChange={mockOnChange}
            />
        );

        const bgLayer = container.querySelector('.story-cropper__background-layer');
        expect(bgLayer).not.toBeNull();
        const bgImg = container.querySelector<HTMLImageElement>('.story-cropper__background-image');
        expect(bgImg).not.toBeNull();
        expect(bgImg?.style.filter).toContain('blur(28px)');
        expect(bgImg?.style.filter).toContain('saturate(');
    });

    it('supports keyboard navigation: Arrow keys for pan nudging, +/- for zoom, 0 to reset', () => {
        // Use zoom 1.5 so crop is smaller than 1920x1080 in both axes, allowing both X and Y panning
        const { container } = render(
            <StoryCropper
                imageSrc="https://example.com/photo.jpg"
                crop={{ ...sampleCrop, zoom: 1.5, centerX: 0.5, centerY: 0.5 }}
                naturalWidth={1920}
                naturalHeight={1080}
                onChange={mockOnChange}
            />
        );

        const viewport = container.querySelector<HTMLElement>('.story-cropper__viewport')!;

        // ArrowDown increases centerY
        fireEvent.keyDown(viewport, { key: 'ArrowDown' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].centerY).toBeGreaterThan(0.5);

        // ArrowUp decreases centerY
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: 'ArrowUp' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].centerY).toBeLessThan(0.5);

        // ArrowRight increases centerX
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: 'ArrowRight' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].centerX).toBeGreaterThan(0.5);

        // ArrowLeft decreases centerX
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].centerX).toBeLessThan(0.5);

        // Shift modifier uses larger step
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: 'ArrowDown', shiftKey: true });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].centerY).toBeCloseTo(0.58, 2);

        // '+' key zooms in
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: '+' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].zoom).toBeCloseTo(1.6, 2);

        // '-' key zooms out
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: '-' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].zoom).toBeCloseTo(1.4, 2);

        // '0' key resets zoom to minZoom (0.291)
        mockOnChange.mockClear();
        fireEvent.keyDown(viewport, { key: '0' });
        expect(mockOnChange).toHaveBeenCalled();
        expect(mockOnChange.mock.calls[0][0].zoom).toBeCloseTo(0.291, 2);
    });
});
