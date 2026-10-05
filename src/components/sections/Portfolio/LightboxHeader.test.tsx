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

    it('displays camera model and EXIF data when photo is a wrapped FavoriteItem', () => {
        const wrappedFavorite = {
            photo: {
                original: '/photos/2024/game/photo_001.jpg',
                thumb: '/thumbnails/2024/game/photo_001.avif',
                exif: {
                    cameraModel: 'NIKON Z 8',
                    lens: '135mm f/1.8 Plena',
                    focalLength: '135mm',
                    aperture: 'f/1.8',
                    shutterSpeed: '1/2500s',
                    iso: 'ISO 3200',
                },
            },
            eventName: 'Championship Match',
            year: '2024',
        };

        render(
            <LightboxHeader
                images={[wrappedFavorite as unknown as PhotoRecord]}
                index={0}
                canShare={false}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('NIKON Z 8 • 135mm f/1.8 Plena')).toBeDefined();
        expect(screen.getByText('135mm • f/1.8 • 1/2500s • ISO 3200')).toBeDefined();
        expect(screen.queryByText('No camera data')).toBeNull();
    });

    it('resolves EXIF from cached album when current photo lacks EXIF', async () => {
        const { setCachedAlbum, _clearAlbumCache } = await import('../../../utils/albumData');
        _clearAlbumCache();
        setCachedAlbum('2024', 'game', [
            {
                original: '/photos/2024/game/photo_001.jpg',
                thumb: '/thumbnails/2024/game/photo_001.avif',
                exif: {
                    cameraModel: 'NIKON D850',
                    lens: '300mm f/4 PF',
                    focalLength: '300mm',
                    aperture: 'f/4.5',
                    shutterSpeed: '1/1250s',
                    iso: 'ISO 6400',
                },
            },
        ]);

        const photoWithoutExif: PhotoRecord = {
            original: '/photos/2024/game/photo_001.jpg',
            thumb: '/thumbnails/2024/game/photo_001.avif',
        };

        render(
            <LightboxHeader
                images={[photoWithoutExif]}
                index={0}
                canShare={false}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('NIKON D850 • 300mm f/4 PF')).toBeDefined();
        expect(screen.getByText('300mm • f/4.5 • 1/1250s • ISO 6400')).toBeDefined();
        expect(screen.queryByText('No camera data')).toBeNull();
        _clearAlbumCache();
    });

    it('displays "No camera data" when album has EXIF but current photo lacks EXIF', () => {
        const photoWithoutExif: PhotoRecord = {
            original: '/photos/action2.jpg',
            thumb: '/photos/action2_thumb.jpg',
        };

        render(
            <LightboxHeader
                images={[photoWithoutExif, standardPhoto]}
                index={0}
                canShare={false}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('No camera data')).toBeDefined();
    });

    it('renders no EXIF container when no photo in album has EXIF', () => {
        const photoWithoutExif1: PhotoRecord = { original: '/photos/1.jpg', thumb: '/photos/1_t.jpg' };
        const photoWithoutExif2: PhotoRecord = { original: '/photos/2.jpg', thumb: '/photos/2_t.jpg' };

        render(
            <LightboxHeader
                images={[photoWithoutExif1, photoWithoutExif2]}
                index={0}
                canShare={false}
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByText('No camera data')).toBeNull();
    });
});
