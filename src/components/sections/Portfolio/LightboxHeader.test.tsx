import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LightboxHeader from './LightboxHeader';
import type { PhotoRecord } from '../../../types';

describe('LightboxHeader', () => {
    afterEach(() => {
        cleanup();
    });

    const standardPhoto: PhotoRecord = {
        original: '/photos/action1.jpg',
        thumb: '/photos/action1_thumb.jpg',
        exif: {
            cameraModel: 'NIKON Z 8',
            lens: 'NIKKOR Z 70-200mm f/2.8 VR S',
            focalLength: '120mm',
            aperture: 'f/2.8',
            shutterSpeed: '1/1600s',
            iso: 'ISO 2500',
        },
    };

    const burstPhoto: PhotoRecord = {
        original: '/photos/action2.jpg',
        thumb: '/photos/action2_thumb.jpg',
        burst: {
            id: 'burst_event_1',
            index: 0,
            total: 3,
            deltaSec: 0.85,
            frameSources: ['/photos/action1.jpg', '/photos/action2.jpg', '/photos/action3.jpg'],
            frameThumbs: ['/photos/action1_thumb.jpg', '/photos/action2_thumb.jpg', '/photos/action3_thumb.jpg'],
            frameDeltas: [0.0, 0.42, 0.85],
        },
    };

    it('renders standard story maker button and triggers onOpenStoryExport when photo is not a burst', () => {
        const onOpenStoryExport = vi.fn();
        render(
            <LightboxHeader
                images={[standardPhoto]}
                index={0}
                canShare={false}
                onClose={vi.fn()}
                onOpenStoryExport={onOpenStoryExport}
            />
        );

        const storyBtn = screen.getByRole('button', { name: 'Story Maker (9:16)' });
        expect(storyBtn).toBeDefined();
        expect(storyBtn.getAttribute('title')).toBe('Story Maker (C)');

        fireEvent.click(storyBtn);
        expect(onOpenStoryExport).toHaveBeenCalledTimes(1);
    });

    it('renders standard story maker button consistently when photo has burst metadata', () => {
        const onOpenStoryExport = vi.fn();
        render(
            <LightboxHeader
                images={[burstPhoto]}
                index={0}
                canShare={false}
                onClose={vi.fn()}
                onOpenStoryExport={onOpenStoryExport}
            />
        );

        const storyBtn = screen.getByRole('button', { name: 'Story Maker (9:16)' });
        expect(storyBtn).toBeDefined();
        expect(storyBtn.getAttribute('title')).toBe('Story Maker (C)');

        fireEvent.click(storyBtn);
        expect(onOpenStoryExport).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<LightboxHeader images={[standardPhoto]} index={0} canShare={false} onClose={onClose} />);

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
