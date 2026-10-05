import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import LightboxAmbient from './LightboxAmbient';
import type { PhotoInput } from '../../../types';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
            <div className={className} style={style} {...props}>
                {children}
            </div>
        ),
    },
}));

describe('LightboxAmbient', () => {
    const images: PhotoInput[] = [
        { original: '/photos/p1.jpg', thumb: '/photos/p1_thumb.jpg' },
        { original: '/photos/p2.jpg', thumb: '/photos/p2_thumb.jpg' },
        { original: '/photos/p3.jpg', thumb: '/photos/p3_thumb.jpg' },
    ];

    it('renders 3 ambient background layers (prev, current, next) and glass overlay', () => {
        const getAmbientBg = vi.fn((photo: PhotoInput) => ({
            backgroundImage: `url(${typeof photo === 'string' ? photo : photo.thumb || photo.original})`,
        }));

        const { container } = render(
            <LightboxAmbient
                images={images}
                index={1}
                getAmbientBg={getAmbientBg}
                prevOpacity={0 as unknown as import('framer-motion').MotionValue<number>}
                currentOpacity={1 as unknown as import('framer-motion').MotionValue<number>}
                nextOpacity={0 as unknown as import('framer-motion').MotionValue<number>}
            />
        );

        const layers = container.querySelectorAll('.portfolio__lightbox-ambient-img');
        expect(layers).toHaveLength(3);

        const glass = container.querySelector('.portfolio__lightbox-ambient-glass');
        expect(glass).not.toBeNull();

        expect(getAmbientBg).toHaveBeenCalledWith(images[0]); // prev
        expect(getAmbientBg).toHaveBeenCalledWith(images[1]); // current
        expect(getAmbientBg).toHaveBeenCalledWith(images[2]); // next
    });
});
