import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStoryExport } from './useStoryExport';
import type { StoryRenderConfig } from '../utils/storyCanvas';
import { renderStoryToBlob } from '../utils/storyCanvas';
import { renderStoryToMp4, StoryVideoUnsupportedError } from '../utils/story/storyVideo';
import type { StoryAnimationSpec } from '../utils/story/storyAnimation';

vi.mock('../utils/storyCanvas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/storyCanvas')>();
    return {
        ...actual,
        renderStoryToBlob: vi.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' })),
    };
});

vi.mock('../utils/story/storyVideo', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/story/storyVideo')>();
    return {
        ...actual,
        renderStoryToMp4: vi.fn(),
    };
});

describe('useStoryExport', () => {
    const mockConfig: StoryRenderConfig = {
        mode: 'crop',
        crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1.0, centerX: 0.5, centerY: 0.5 },
        padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24, customColor: '#0a0a14' },
        resolution: '1080x1920',
        cardTheme: 'dark',
        badgeTheme: 'dark',
        badges: {
            showScoreboard: false,
            showAttribution: false,
            teams: [],
            score1: null,
            score2: null,
        },
    };

    it('initializes with default non-exporting and non-downloaded states', () => {
        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: null,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
            })
        );

        expect(result.current.isExporting).toBe(false);
        expect(result.current.isDownloaded).toBe(false);
        expect(result.current.statusToast).toBeNull();
    });

    it('allows manually toggling isDownloaded and resetting state', () => {
        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: null,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
            })
        );

        act(() => {
            result.current.setIsDownloaded(true);
            result.current.setStatusToast('Exporting ready');
        });

        expect(result.current.isDownloaded).toBe(true);
        expect(result.current.statusToast).toBe('Exporting ready');

        act(() => {
            result.current.resetExportState();
        });

        expect(result.current.isDownloaded).toBe(false);
        expect(result.current.statusToast).toBeNull();
    });

    it('automatically resets isDownloaded when photoKey changes', () => {
        let photoKey = 'photo-1';
        const { result, rerender } = renderHook(() =>
            useStoryExport({
                loadedImage: null,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey,
            })
        );

        act(() => {
            result.current.setIsDownloaded(true);
        });
        expect(result.current.isDownloaded).toBe(true);

        // Switch photo
        photoKey = 'photo-2';
        rerender();

        expect(result.current.isDownloaded).toBe(false);
    });

    it('triggers onExportSuccess on successful download', async () => {
        globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
        globalThis.URL.revokeObjectURL = vi.fn();
        const onExportSuccess = vi.fn();
        const mockImg = document.createElement('img');

        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: mockImg,
                currentConfig: { ...mockConfig, frameId: 'instant-film' },
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
                onExportSuccess,
            })
        );

        await act(async () => {
            await result.current.handleDownload();
        });

        expect(onExportSuccess).toHaveBeenCalledTimes(1);
        expect(onExportSuccess).toHaveBeenCalledWith(expect.objectContaining({ frameId: 'instant-film' }));
    });

    it('blocks download and shows toast if isTainted is true', async () => {
        const mockImg = document.createElement('img');
        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: mockImg,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
                isTainted: true,
            })
        );

        await act(async () => {
            await result.current.handleDownload();
        });

        expect(result.current.statusToast).toBe('Export unavailable: Image lacks cross-origin permissions.');
        expect(result.current.isDownloaded).toBe(false);
    });

    describe('video output', () => {
        const mp4 = new Blob(['fake-mp4'], { type: 'video/mp4' });
        const spec: StoryAnimationSpec = { preset: 'float-in', durationS: 5, fps: 30 };
        const mockImg = document.createElement('img');
        let clickedDownloads: string[];
        let clickSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            vi.mocked(renderStoryToMp4).mockReset();
            vi.mocked(renderStoryToBlob).mockClear();
            globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
            globalThis.URL.revokeObjectURL = vi.fn();
            clickedDownloads = [];
            clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
                this: HTMLAnchorElement
            ) {
                clickedDownloads.push(this.download);
            });
        });

        afterEach(() => {
            clickSpy.mockRestore();
            Reflect.deleteProperty(navigator, 'canShare');
            Reflect.deleteProperty(navigator, 'share');
        });

        const renderVideoHook = (overrides: Partial<Parameters<typeof useStoryExport>[0]> = {}) =>
            renderHook(() =>
                useStoryExport({
                    loadedImage: mockImg,
                    currentConfig: mockConfig,
                    eventTitle: 'Championship Game',
                    year: '2026',
                    canShare: false,
                    photoKey: 'photo-1',
                    outputFormat: 'video',
                    animation: spec,
                    ...overrides,
                })
            );

        it('downloads an mp4 and reports progress while rendering', async () => {
            let reportProgress: ((f: number) => void) | undefined;
            let finish: (b: Blob) => void = () => {};
            vi.mocked(renderStoryToMp4).mockImplementation((_img, _cfg, _spec, opts) => {
                reportProgress = opts?.onProgress;
                return new Promise<Blob>((resolve) => {
                    finish = resolve;
                });
            });
            const { result } = renderVideoHook();

            let pending: Promise<void> = Promise.resolve();
            act(() => {
                pending = result.current.handleDownload();
            });
            await waitFor(() => expect(reportProgress).toBeDefined());
            act(() => reportProgress!(0.426));
            expect(result.current.exportProgress).toBe(42);
            expect(result.current.isExporting).toBe(true);

            await act(async () => {
                finish(mp4);
                await pending;
            });

            expect(renderStoryToBlob).not.toHaveBeenCalled();
            expect(renderStoryToMp4).toHaveBeenCalledWith(mockImg, mockConfig, spec, expect.any(Object));
            expect(clickedDownloads).toEqual(['story-2026-championship-game-9x16.mp4']);
            expect(result.current.exportProgress).toBeNull();
            expect(result.current.isDownloaded).toBe(true);
        });

        it('cancels a render and shows a neutral toast', async () => {
            vi.mocked(renderStoryToMp4).mockImplementation(
                (_img, _cfg, _spec, opts) =>
                    new Promise<Blob>((_resolve, reject) => {
                        opts?.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError')));
                    })
            );
            const { result } = renderVideoHook();

            let pending: Promise<void> = Promise.resolve();
            act(() => {
                pending = result.current.handleDownload();
            });
            await waitFor(() => expect(renderStoryToMp4).toHaveBeenCalled());
            await act(async () => {
                result.current.cancelExport();
                await pending;
            });

            expect(result.current.statusToast).toBe('Video export cancelled.');
            expect(result.current.isExporting).toBe(false);
            expect(clickedDownloads).toHaveLength(0);
        });

        it('shows an unsupported toast when the browser cannot encode MP4', async () => {
            vi.mocked(renderStoryToMp4).mockRejectedValue(new StoryVideoUnsupportedError());
            const { result } = renderVideoHook();
            await act(async () => {
                await result.current.handleDownload();
            });
            expect(result.current.statusToast).toBe("Video export isn't supported in this browser.");
        });

        it('keeps the video for a second tap when sharing loses user activation', async () => {
            vi.mocked(renderStoryToMp4).mockResolvedValue(mp4);
            const share = vi
                .fn()
                .mockRejectedValueOnce(new DOMException('no activation', 'NotAllowedError'))
                .mockResolvedValueOnce(undefined);
            Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
            Object.defineProperty(navigator, 'share', { value: share, configurable: true });
            const { result } = renderVideoHook({ canShare: true });

            await act(async () => {
                await result.current.handleExportAction();
            });
            expect(result.current.statusToast).toBe('Video ready — tap Share Video.');
            expect(result.current.hasPendingVideo).toBe(true);

            await act(async () => {
                await result.current.handleExportAction();
            });
            expect(renderStoryToMp4).toHaveBeenCalledTimes(1);
            expect(share).toHaveBeenCalledTimes(2);
            const file = (share.mock.calls[1][0] as { files: File[] }).files[0];
            expect(file.name).toBe('story.mp4');
            expect(file.type).toBe('video/mp4');
            expect(result.current.isDownloaded).toBe(true);
        });

        it('falls back to downloading the already-rendered video when file sharing is unsupported', async () => {
            vi.mocked(renderStoryToMp4).mockResolvedValue(mp4);
            Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
            const { result } = renderVideoHook({ canShare: true });
            await act(async () => {
                await result.current.handleExportAction();
            });
            expect(renderStoryToMp4).toHaveBeenCalledTimes(1);
            expect(clickedDownloads).toEqual(['story-2026-championship-game-9x16.mp4']);
        });

        it('re-renders when the design changes', async () => {
            vi.mocked(renderStoryToMp4).mockResolvedValue(mp4);
            let config = mockConfig;
            const { result, rerender } = renderHook(() =>
                useStoryExport({
                    loadedImage: mockImg,
                    currentConfig: config,
                    canShare: false,
                    outputFormat: 'video',
                    animation: spec,
                })
            );
            await act(async () => {
                await result.current.handleDownload();
            });
            expect(result.current.hasPendingVideo).toBe(true);

            config = { ...mockConfig, frameId: 'instant-film' };
            rerender();
            expect(result.current.hasPendingVideo).toBe(false);
            await act(async () => {
                await result.current.handleDownload();
            });
            expect(renderStoryToMp4).toHaveBeenCalledTimes(2);
        });

        it('exports an mp4 when isFrameAnimated is true and a frame is active', async () => {
            vi.mocked(renderStoryToMp4).mockResolvedValueOnce(mp4);
            const { result } = renderHook(() =>
                useStoryExport({
                    loadedImage: mockImg,
                    currentConfig: { ...mockConfig, frameId: 'instant-film' },
                    eventTitle: 'Championship Game',
                    year: '2026',
                    canShare: false,
                    isFrameAnimated: true,
                })
            );

            await act(async () => {
                await result.current.handleDownload();
            });

            expect(renderStoryToMp4).toHaveBeenCalled();
            expect(clickedDownloads).toEqual(['story-2026-championship-game-9x16.mp4']);
        });

        it('exports a still jpeg when isFrameAnimated is true but frameId is none', async () => {
            const { result } = renderHook(() =>
                useStoryExport({
                    loadedImage: mockImg,
                    currentConfig: { ...mockConfig, frameId: 'none' },
                    eventTitle: 'Championship Game',
                    year: '2026',
                    canShare: false,
                    isFrameAnimated: true,
                })
            );

            await act(async () => {
                await result.current.handleDownload();
            });

            expect(renderStoryToBlob).toHaveBeenCalled();
            expect(renderStoryToMp4).not.toHaveBeenCalled();
            expect(clickedDownloads).toEqual(['story-2026-championship-game-9x16.jpg']);
        });
    });
});
