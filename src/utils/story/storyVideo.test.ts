import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

const mb = vi.hoisted(() => {
    const state = {
        added: [] as Array<[number, number]>,
        started: 0,
        finalized: 0,
        cancelled: 0,
        canEncode: true,
        frameRate: 0 as number | undefined,
        failOnAdd: -1,
    };
    class Quality {
        constructor(public opts: unknown) {}
    }
    class BufferTarget {
        buffer: ArrayBuffer | null = null;
    }
    class Mp4OutputFormat {
        constructor(public opts: unknown) {}
    }
    class CanvasSource {
        constructor(
            public canvas: unknown,
            public opts: unknown
        ) {}
        async add(ts: number, dur: number) {
            if (state.failOnAdd === state.added.length) throw new Error('encode failed');
            state.added.push([ts, dur]);
        }
    }
    class Output {
        target: BufferTarget;
        constructor(opts: { target: BufferTarget }) {
            this.target = opts.target;
        }
        addVideoTrack(_s: unknown, meta?: { frameRate?: number }) {
            state.frameRate = meta?.frameRate;
        }
        async start() {
            state.started++;
        }
        async finalize() {
            state.finalized++;
            this.target.buffer = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]).buffer;
        }
        async cancel() {
            state.cancelled++;
        }
    }
    const canEncodeVideo = vi.fn(async () => state.canEncode);
    return { state, Quality, BufferTarget, Mp4OutputFormat, CanvasSource, Output, canEncodeVideo };
});

vi.mock('mediabunny', () => ({
    Quality: mb.Quality,
    BufferTarget: mb.BufferTarget,
    Mp4OutputFormat: mb.Mp4OutputFormat,
    CanvasSource: mb.CanvasSource,
    Output: mb.Output,
    canEncodeVideo: mb.canEncodeVideo,
}));

const drawn = vi.hoisted(() => ({ states: [] as unknown[] }));

vi.mock('./storyRender', () => ({
    drawStoryScene: vi.fn((_ctx: unknown, _assets: unknown, _config: unknown, anim: unknown) => {
        drawn.states.push(anim);
    }),
}));

vi.mock('./storyAssets', () => ({
    prepareStoryAssets: vi.fn(async () => ({
        targetW: 1080,
        targetH: 1920,
        images: [{ width: 2000, height: 3000 }],
        rawImages: [{ width: 2000, height: 3000 }],
        filterBaked: true,
        frostedBackground: null,
        frameImage: null,
    })),
    getImageNaturalSize: () => ({ w: 2000, h: 3000 }),
}));

import type { StoryAnimationSpec } from './storyAnimation';
import type { StoryRenderConfig } from './storyConstants';

type VideoModule = typeof import('./storyVideo');
// Loaded fresh in beforeAll: with `isolate: false`, other test files may already have imported the real
// storyRender / storyVideo, so the vi.mock() factories above would otherwise not apply.
let renderStoryToMp4: VideoModule['renderStoryToMp4'];
let canExportStoryVideo: VideoModule['canExportStoryVideo'];
let _resetStoryVideoSupportForTesting: VideoModule['_resetStoryVideoSupportForTesting'];
let StoryVideoUnsupportedError: VideoModule['StoryVideoUnsupportedError'];
let STORY_VIDEO_MIME: VideoModule['STORY_VIDEO_MIME'];
let prepareStoryAssets: (typeof import('./storyAssets'))['prepareStoryAssets'];
let FINAL_ANIM_STATE: (typeof import('./storyAnimation'))['FINAL_ANIM_STATE'];

beforeAll(async () => {
    vi.resetModules();
    ({
        renderStoryToMp4,
        canExportStoryVideo,
        _resetStoryVideoSupportForTesting,
        StoryVideoUnsupportedError,
        STORY_VIDEO_MIME,
    } = await import('./storyVideo'));
    ({ prepareStoryAssets } = await import('./storyAssets'));
    ({ FINAL_ANIM_STATE } = await import('./storyAnimation'));
});

const config = { layout: 'full-bleed' } as unknown as StoryRenderConfig;
const spec: StoryAnimationSpec = { preset: 'float-in', durationS: 1, fps: 10 };
const img = { width: 2000, height: 3000 } as unknown as HTMLImageElement;

const fakeCtx = {} as unknown as CanvasRenderingContext2D;

describe('storyVideo', () => {
    let getContextSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mb.state.added = [];
        mb.state.started = 0;
        mb.state.finalized = 0;
        mb.state.cancelled = 0;
        mb.state.canEncode = true;
        mb.state.failOnAdd = -1;
        drawn.states = [];
        _resetStoryVideoSupportForTesting();
        getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue(fakeCtx as unknown as ReturnType<HTMLCanvasElement['getContext']>);
        vi.stubGlobal(
            'OffscreenCanvas',
            class {
                constructor(
                    public width: number,
                    public height: number
                ) {}
                getContext() {
                    return fakeCtx;
                }
            }
        );
    });

    afterEach(() => {
        getContextSpy.mockRestore();
        vi.unstubAllGlobals();
    });

    describe('renderStoryToMp4 (WebCodecs)', () => {
        it('encodes duration × fps frames with monotonic timestamps', async () => {
            const blob = await renderStoryToMp4(img, config, spec, { support: 'webcodecs' });

            expect(blob.type).toBe(STORY_VIDEO_MIME);
            expect(blob.size).toBeGreaterThan(0);
            expect(mb.state.started).toBe(1);
            expect(mb.state.finalized).toBe(1);
            expect(mb.state.frameRate).toBe(10);
            expect(mb.state.added).toHaveLength(10);
            mb.state.added.forEach(([ts, dur], i) => {
                expect(ts).toBeCloseTo(i / 10);
                expect(dur).toBeCloseTo(0.1);
            });
        });

        it('renders at 1080×1920 with the filter baked', async () => {
            await renderStoryToMp4(img, config, spec, { support: 'webcodecs' });
            expect(prepareStoryAssets).toHaveBeenCalledWith(
                img,
                expect.objectContaining({ resolution: '1080x1920' }),
                expect.objectContaining({ targetW: 1080, targetH: 1920, bakeFilter: true })
            );
        });

        it('pins the last frame to the final (still) state', async () => {
            await renderStoryToMp4(img, config, spec, { support: 'webcodecs' });
            expect(drawn.states).toHaveLength(10);
            expect(drawn.states[drawn.states.length - 1]).toBe(FINAL_ANIM_STATE);
            expect(drawn.states[0]).not.toBe(FINAL_ANIM_STATE);
        });

        it('reports progress up to 1', async () => {
            const onProgress = vi.fn();
            await renderStoryToMp4(img, config, spec, { support: 'webcodecs', onProgress });
            const values = onProgress.mock.calls.map((c) => c[0] as number);
            expect(values).toHaveLength(10);
            expect(values[values.length - 1]).toBe(1);
            for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
        });

        it('cancels the output and rejects with AbortError when aborted mid-encode', async () => {
            const controller = new AbortController();
            const onProgress = vi.fn((p: number) => {
                if (p >= 0.3) controller.abort();
            });
            await expect(
                renderStoryToMp4(img, config, spec, { support: 'webcodecs', signal: controller.signal, onProgress })
            ).rejects.toMatchObject({ name: 'AbortError' });
            expect(mb.state.cancelled).toBe(1);
            expect(mb.state.finalized).toBe(0);
            expect(mb.state.added.length).toBeLessThan(10);
        });

        it('rejects immediately when the signal is already aborted', async () => {
            const controller = new AbortController();
            controller.abort();
            await expect(
                renderStoryToMp4(img, config, spec, { support: 'webcodecs', signal: controller.signal })
            ).rejects.toMatchObject({ name: 'AbortError' });
            expect(mb.state.started).toBe(0);
        });

        it('cancels the output when encoding fails', async () => {
            mb.state.failOnAdd = 3;
            await expect(renderStoryToMp4(img, config, spec, { support: 'webcodecs' })).rejects.toThrow(
                'encode failed'
            );
            expect(mb.state.cancelled).toBe(1);
        });
    });

    describe('canExportStoryVideo', () => {
        const stubVideoEncoder = (supportedCodecs: string[]) => {
            const isConfigSupported = vi.fn(async (cfg: { codec: string }) => ({
                supported: supportedCodecs.includes(cfg.codec),
            }));
            vi.stubGlobal('VideoEncoder', { isConfigSupported });
            return isConfigSupported;
        };

        it('returns webcodecs when AVC encoding is supported, without loading mediabunny', async () => {
            const probe = stubVideoEncoder(['avc1.4d0028']);
            await expect(canExportStoryVideo()).resolves.toBe('webcodecs');
            expect(probe).toHaveBeenCalledWith(expect.objectContaining({ width: 1080, height: 1920 }));
            expect(mb.canEncodeVideo).not.toHaveBeenCalled();
        });

        it('falls back to mediarecorder when it can produce MP4', async () => {
            stubVideoEncoder([]);
            vi.stubGlobal('MediaRecorder', { isTypeSupported: (t: string) => t === 'video/mp4' });
            const proto = HTMLCanvasElement.prototype as unknown as { captureStream?: unknown };
            const original = proto.captureStream;
            proto.captureStream = () => ({});
            try {
                await expect(canExportStoryVideo()).resolves.toBe('mediarecorder');
            } finally {
                proto.captureStream = original;
            }
        });

        it('returns false when only WebM recording is available', async () => {
            vi.stubGlobal('VideoEncoder', undefined);
            vi.stubGlobal('MediaRecorder', { isTypeSupported: (t: string) => t.startsWith('video/webm') });
            await expect(canExportStoryVideo()).resolves.toBe(false);
        });

        it('memoises the result', async () => {
            const probe = stubVideoEncoder(['avc1.640028']);
            await canExportStoryVideo();
            await canExportStoryVideo();
            expect(probe).toHaveBeenCalledTimes(1);
        });

        it('makes renderStoryToMp4 throw StoryVideoUnsupportedError when unsupported', async () => {
            vi.stubGlobal('VideoEncoder', undefined);
            vi.stubGlobal('MediaRecorder', undefined);
            await expect(renderStoryToMp4(img, config, spec)).rejects.toBeInstanceOf(StoryVideoUnsupportedError);
        });
    });
});
