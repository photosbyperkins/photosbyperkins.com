import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import ProgressiveImage from './ProgressiveImage';

describe('ProgressiveImage', () => {
    let mockObserverCallback: (entries: IntersectionObserverEntry[]) => void;
    let observeMock: ReturnType<typeof vi.fn>;
    let disconnectMock: ReturnType<typeof vi.fn>;
    let originalIntersectionObserver: typeof IntersectionObserver;

    beforeEach(() => {
        observeMock = vi.fn();
        disconnectMock = vi.fn();

        originalIntersectionObserver = window.IntersectionObserver;
        window.IntersectionObserver = class MockIntersectionObserver {
            constructor(callback: IntersectionObserverCallback) {
                mockObserverCallback = callback as unknown as (entries: IntersectionObserverEntry[]) => void;
            }
            observe = observeMock;
            unobserve = vi.fn();
            disconnect = disconnectMock;
        } as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
        window.IntersectionObserver = originalIntersectionObserver;
        vi.restoreAllMocks();
    });

    it('renders placeholder image when not yet loaded', () => {
        const { container } = render(
            <ProgressiveImage
                src="/photos/photo1.jpg"
                alt="Test photo"
                placeholder="/photos/photo1_thumb.jpg"
            />
        );

        const placeholder = container.querySelector('.progressive-image__placeholder') as HTMLImageElement;
        expect(placeholder).not.toBeNull();
        expect(placeholder.src).toContain('/photos/photo1_thumb.jpg');
    });

    it('defers loading full image until intersecting when priority=false', () => {
        const { container } = render(
            <ProgressiveImage
                src="/photos/photo1.jpg"
                alt="Test photo"
                priority={false}
            />
        );

        const img = container.querySelector('.progressive-image__img') as HTMLImageElement;
        expect(img.getAttribute('src')).toBeNull();
        expect(observeMock).toHaveBeenCalled();

        // Simulate intersection
        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: true,
                } as unknown as IntersectionObserverEntry,
            ]);
        });

        expect(img.getAttribute('src')).toContain('/photos/photo1.jpg');
        expect(disconnectMock).toHaveBeenCalled();
    });

    it('immediately loads image when priority=true without waiting for intersection', () => {
        const { container } = render(
            <ProgressiveImage
                src="/photos/photo1.jpg"
                alt="Priority photo"
                priority={true}
            />
        );

        const img = container.querySelector('.progressive-image__img') as HTMLImageElement;
        expect(img.getAttribute('src')).toContain('/photos/photo1.jpg');
        expect(img.getAttribute('loading')).toBe('eager');
        expect(img.getAttribute('decoding')).toBe('sync');
        expect(img.getAttribute('fetchPriority')).toBe('high');
        expect(observeMock).not.toHaveBeenCalled();
    });

    it('removes placeholder and adds is-loaded class upon onLoad event', () => {
        const onLoad = vi.fn();
        const { container } = render(
            <ProgressiveImage
                src="/photos/photo1.jpg"
                alt="Test photo"
                placeholder="/photos/thumb.jpg"
                priority={true}
                onLoad={onLoad}
            />
        );

        const img = container.querySelector('.progressive-image__img') as HTMLImageElement;
        expect(container.querySelector('.progressive-image__placeholder')).not.toBeNull();

        fireEvent.load(img);

        expect(img.classList.contains('is-loaded')).toBe(true);
        expect(container.querySelector('.progressive-image__placeholder')).toBeNull();
        expect(onLoad).toHaveBeenCalled();
    });

    it('resets loaded state when src prop changes', () => {
        const { container, rerender } = render(
            <ProgressiveImage
                src="/photos/photo1.jpg"
                alt="Test photo"
                placeholder="/photos/thumb1.jpg"
                priority={true}
            />
        );

        const img = container.querySelector('.progressive-image__img') as HTMLImageElement;
        fireEvent.load(img);
        expect(img.classList.contains('is-loaded')).toBe(true);

        // Change src (e.g. recycled row)
        rerender(
            <ProgressiveImage
                src="/photos/photo2.jpg"
                alt="Test photo 2"
                placeholder="/photos/thumb2.jpg"
                priority={true}
            />
        );

        const updatedImg = container.querySelector('.progressive-image__img') as HTMLImageElement;
        expect(updatedImg.classList.contains('is-loaded')).toBe(false);
        expect(container.querySelector('.progressive-image__placeholder')).not.toBeNull();
    });

    it('applies custom objectPosition and aspectRatio', () => {
        const { container } = render(
            <ProgressiveImage
                src="/photos/photo1.jpg"
                alt="Test photo"
                aspectRatio="16 / 9"
                objectPosition="top right"
                priority={true}
            />
        );

        const wrapper = container.querySelector('.progressive-image') as HTMLDivElement;
        expect(wrapper.style.aspectRatio).toBe('16 / 9');

        const img = container.querySelector('.progressive-image__img') as HTMLImageElement;
        expect(img.style.objectPosition).toBe('top right');
    });
});
