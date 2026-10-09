/**
 * Animated Story → MP4 export.
 *
 * Every frame is drawn deterministically by `drawStoryScene` from assets prepared once (filters baked,
 * frame rasterized), sampled from the pure timeline in storyAnimation.ts, then encoded:
 *
 * - Primary path: WebCodecs H.264 via Mediabunny → MP4 (faster than real time, frame-exact).
 * - Fallback: `canvas.captureStream()` + `MediaRecorder`, only when it can produce MP4 (Instagram
 *   rejects WebM). Real-time, so it takes as long as the video.
 *
 * Mediabunny is imported lazily so it never lands in the main bundle. Do not re-export this module from
 * the story barrel (src/utils/story/index.ts).
 */
import type { StoryRenderConfig } from './storyConstants';
import { drawStoryScene } from './storyRender';
import { prepareStoryAssets, getImageNaturalSize, type StoryImageInput, type StoryImageSource } from './storyAssets';
import {
    getStoryFrameCount,
    sampleStoryTimeline,
    STORY_VIDEO_FPS,
    type StoryAnimationSpec,
    type StoryTimelineContext,
} from './storyAnimation';

import {
    STORY_VIDEO_WIDTH,
    STORY_VIDEO_HEIGHT,
    STORY_VIDEO_BITRATE,
    canExportStoryVideo,
    getMediaRecorderMp4MimeType,
    type StoryVideoSupport,
} from './storyVideoSupport';

// Capability detection lives in the lightweight storyVideoSupport module (prefetched from the portfolio)
export {
    STORY_VIDEO_WIDTH,
    STORY_VIDEO_HEIGHT,
    STORY_VIDEO_BITRATE,
    canExportStoryVideo,
    getMediaRecorderMp4MimeType,
    getStoryVideoSupportSync,
    prefetchStoryVideoSupport,
    _resetStoryVideoSupportForTesting,
} from './storyVideoSupport';
export type { StoryVideoSupport } from './storyVideoSupport';
export const STORY_VIDEO_MIME = 'video/mp4';

export class StoryVideoUnsupportedError extends Error {
    constructor(message = "This browser can't create MP4 video.") {
        super(message);
        this.name = 'StoryVideoUnsupportedError';
    }
}

export interface StoryVideoOptions {
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
    /** Primary subject (normalised image coords) for the Ken Burns camera. */
    subject?: StoryTimelineContext['subject'];
    /** Skip capability detection (tests / callers that already know). */
    support?: Exclude<StoryVideoSupport, false>;
}

const abortError = () => new DOMException('Story video export cancelled', 'AbortError');

function createFrameCanvas(): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(STORY_VIDEO_WIDTH, STORY_VIDEO_HEIGHT);
    const canvas = document.createElement('canvas');
    canvas.width = STORY_VIDEO_WIDTH;
    canvas.height = STORY_VIDEO_HEIGHT;
    return canvas;
}

interface FramePlan {
    config: StoryRenderConfig;
    spec: StoryAnimationSpec;
    timeline: StoryTimelineContext;
    frameCount: number;
    fps: number;
}

/** Draws video frame `i` of `plan` (the last frame is pinned to t = duration, i.e. the still design). */
function drawFrame(
    ctx: CanvasRenderingContext2D,
    assets: NonNullable<Awaited<ReturnType<typeof prepareStoryAssets>>>,
    plan: FramePlan,
    i: number
) {
    const t = i === plan.frameCount - 1 ? plan.spec.durationS : i / plan.fps;
    drawStoryScene(ctx, assets, plan.config, sampleStoryTimeline(plan.spec, plan.config, t, plan.timeline));
}

/**
 * Renders the story as an animated MP4. Resolves with a `video/mp4` Blob.
 * Rejects with an `AbortError` DOMException when `signal` aborts, or `StoryVideoUnsupportedError`.
 */
export async function renderStoryToMp4(
    img: StoryImageInput,
    config: StoryRenderConfig,
    spec: StoryAnimationSpec,
    options: StoryVideoOptions = {}
): Promise<Blob> {
    const { signal, onProgress } = options;
    if (signal?.aborted) throw abortError();

    const support = options.support ?? (await canExportStoryVideo());
    if (!support) throw new StoryVideoUnsupportedError();

    const videoConfig: StoryRenderConfig = { ...config, resolution: '1080x1920' };
    const assets = await prepareStoryAssets(img, videoConfig, {
        targetW: STORY_VIDEO_WIDTH,
        targetH: STORY_VIDEO_HEIGHT,
        bakeFilter: true,
        frameLayers: true,
    });
    if (!assets) throw new Error('Nothing to render for this story.');
    if (signal?.aborted) throw abortError();

    const primary = assets.rawImages.find((i): i is StoryImageSource => Boolean(i));
    const natural = primary ? getImageNaturalSize(primary) : { w: 0, h: 0 };
    const fps = spec.fps || STORY_VIDEO_FPS;
    const plan: FramePlan = {
        config: videoConfig,
        spec: { ...spec, fps },
        timeline: { imgW: natural.w, imgH: natural.h, subject: options.subject },
        frameCount: getStoryFrameCount({ ...spec, fps }),
        fps,
    };

    return support === 'webcodecs'
        ? encodeWithWebCodecs(assets, plan, signal, onProgress)
        : encodeWithMediaRecorder(assets, plan, signal, onProgress);
}

async function encodeWithWebCodecs(
    assets: NonNullable<Awaited<ReturnType<typeof prepareStoryAssets>>>,
    plan: FramePlan,
    signal?: AbortSignal,
    onProgress?: (fraction: number) => void
): Promise<Blob> {
    const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, Quality } = await import('mediabunny');

    const canvas = createFrameCanvas();
    const ctx = canvas.getContext('2d', { alpha: false }) as unknown as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Could not get 2D canvas context');

    const output = new Output({
        format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
        target: new BufferTarget(),
    });
    const source = new CanvasSource(canvas, {
        codec: 'avc',
        quality: new Quality({ bitrate: STORY_VIDEO_BITRATE }),
        keyFrameInterval: 1,
    });
    output.addVideoTrack(source, { frameRate: plan.fps });

    try {
        await output.start();
        const dt = 1 / plan.fps;
        for (let i = 0; i < plan.frameCount; i++) {
            if (signal?.aborted) throw abortError();
            drawFrame(ctx, assets, plan, i);
            // Awaiting respects encoder / writer backpressure
            await source.add(i * dt, dt);
            onProgress?.((i + 1) / plan.frameCount);
        }
        await output.finalize();
    } catch (err) {
        try {
            await output.cancel();
        } catch {
            // Ignore cancellation errors
        }
        throw err;
    }

    const buffer = output.target.buffer;
    if (!buffer) throw new Error('Video encoder produced no data.');
    return new Blob([buffer], { type: STORY_VIDEO_MIME });
}

async function encodeWithMediaRecorder(
    assets: NonNullable<Awaited<ReturnType<typeof prepareStoryAssets>>>,
    plan: FramePlan,
    signal?: AbortSignal,
    onProgress?: (fraction: number) => void
): Promise<Blob> {
    const mimeType = getMediaRecorderMp4MimeType();
    if (!mimeType || typeof document === 'undefined') throw new StoryVideoUnsupportedError();

    // captureStream needs a DOM canvas; keep it attached but invisible for maximum browser compatibility
    const canvas = document.createElement('canvas');
    canvas.width = STORY_VIDEO_WIDTH;
    canvas.height = STORY_VIDEO_HEIGHT;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
        canvas.remove();
        throw new Error('Could not get 2D canvas context');
    }

    // Draw the first frame before capture starts so the stream never begins blank
    drawFrame(ctx, assets, plan, 0);
    const stream = canvas.captureStream(plan.fps);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: STORY_VIDEO_BITRATE });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
    });

    const cleanup = () => {
        stream.getTracks().forEach((t) => t.stop());
        canvas.remove();
    };

    try {
        recorder.start(250);
        const frameMs = 1000 / plan.fps;
        const start = performance.now();
        let next = 1;
        await new Promise<void>((resolve, reject) => {
            const tick = () => {
                if (signal?.aborted) {
                    reject(abortError());
                    return;
                }
                const due = Math.min(plan.frameCount - 1, Math.floor((performance.now() - start) / frameMs));
                if (due >= next) {
                    // Only the latest frame is ever captured, so skip intermediate draws when behind
                    drawFrame(ctx, assets, plan, due);
                    next = due + 1;
                }
                onProgress?.(Math.min(1, next / plan.frameCount));
                if (next >= plan.frameCount) {
                    // Hold the final frame for one frame duration so it is captured
                    setTimeout(resolve, frameMs);
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
        recorder.stop();
        await stopped;
    } catch (err) {
        if (recorder.state !== 'inactive') recorder.stop();
        cleanup();
        throw err;
    }
    cleanup();

    if (!chunks.length) throw new Error('Video recorder produced no data.');
    return new Blob(chunks, { type: STORY_VIDEO_MIME });
}
