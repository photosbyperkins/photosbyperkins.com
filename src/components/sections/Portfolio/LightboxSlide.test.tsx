import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import LightboxSlide, { type LightboxSlideHandle } from './LightboxSlide';
import type { PhotoInput } from '../../../types';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        motion: {
            ...actual.motion,
            img: ({ src, alt, className, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
                <img src={src} alt={alt} className={className} onLoad={onLoad} {...props} />
            ),
        },
    };
});

describe('LightboxSlide', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockPhoto: PhotoInput = {
        original: '/photos/photo_001.jpg',
        thumb: '/photos/photo_001_thumb.jpg',
        focusX: 0.4,
        focusY: 0.6,
    };

    it('returns null if image is undefined or empty', () => {
        const { container } = render(
            <LightboxSlide image={'' as unknown as PhotoInput} alt="Empty" />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders image with display url and focus coordinates', () => {
        const { container } = render(
            <LightboxSlide image={mockPhoto} alt="Photo 1" />
        );

        const img = container.querySelector('img') as HTMLImageElement;
        expect(img).not.toBeNull();
        expect(img.src).toContain('photo_001');
        expect(img.alt).toBe('Photo 1');
        expect(img.style.objectPosition).toBe('40% 60%');
    });

    it('invokes onLoad callback when image fires load event', () => {
        const onLoad = vi.fn();
        const { container } = render(
            <LightboxSlide image={mockPhoto} alt="Photo 1" onLoad={onLoad} />
        );

        const img = container.querySelector('img') as HTMLImageElement;
        fireEvent.load(img);

        expect(onLoad).toHaveBeenCalled();
    });

    it('exposes toggleZoom via imperative ref handle', () => {
        const ref = React.createRef<LightboxSlideHandle>();
        render(<LightboxSlide ref={ref} image={mockPhoto} alt="Photo 1" />);

        expect(ref.current).toBeDefined();
        expect(typeof ref.current?.toggleZoom).toBe('function');
    });
});
