/**
 * MP4 story-video capability detection, kept dependency-free so the portfolio can warm it up on idle
 * without pulling the story renderer / encoder into the main bundle. By the time Story Maker opens,
 * `getStoryVideoSupportSync()` usually already knows the answer, so the Motion tab's animated-video
 * switch is ready on first paint instead of showing "checking".
 */

export type StoryVideoSupport = 'webcodecs' | 'mediarecorder' | false;

/** Videos are always 1080×1920: IG/TikTok recompress anyway and 4K H.264 fails on many phones. */
export const STORY_VIDEO_WIDTH = 1080;
export const STORY_VIDEO_HEIGHT = 1920;
export const STORY_VIDEO_BITRATE = 10_000_000;
/** Probe framerate; must match STORY_VIDEO_FPS in storyAnimation.ts (not imported to stay lightweight). */
const PROBE_FPS = 30;

const MEDIA_RECORDER_MP4_TYPES = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4'];

/** First MediaRecorder MIME type that produces MP4, or null. */
export function getMediaRecorderMp4MimeType(): string | null {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
    return MEDIA_RECORDER_MP4_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

let supportPromise: Promise<StoryVideoSupport> | null = null;
/** Resolved result (undefined until detection settles). */
let resolvedSupport: StoryVideoSupport | undefined;

/** H.264 High / Main / Baseline at level 4.0 (covers 1080×1920 @ 30 fps). */
const AVC_PROBE_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028'];

/**
 * Native WebCodecs probe (no Mediabunny import, so opening Story Maker stays cheap; the 180 kB muxer
 * is only downloaded when a video is actually exported).
 */
async function canEncodeAvcNatively(): Promise<boolean> {
    if (typeof VideoEncoder === 'undefined' || typeof VideoEncoder.isConfigSupported !== 'function') return false;
    for (const codec of AVC_PROBE_CODECS) {
        try {
            const { supported } = await VideoEncoder.isConfigSupported({
                codec,
                width: STORY_VIDEO_WIDTH,
                height: STORY_VIDEO_HEIGHT,
                bitrate: STORY_VIDEO_BITRATE,
                framerate: PROBE_FPS,
            });
            if (supported) return true;
        } catch {
            // Try the next profile
        }
    }
    return false;
}

async function detectSupport(): Promise<StoryVideoSupport> {
    if (typeof window === 'undefined') return false;
    if (await canEncodeAvcNatively()) return 'webcodecs';
    const canCapture =
        typeof document !== 'undefined' &&
        typeof HTMLCanvasElement !== 'undefined' &&
        typeof HTMLCanvasElement.prototype.captureStream === 'function';
    if (canCapture && getMediaRecorderMp4MimeType()) return 'mediarecorder';
    return false;
}

/** Detects how (or whether) this browser can export MP4 story videos. Memoised. */
export function canExportStoryVideo(): Promise<StoryVideoSupport> {
    if (!supportPromise) {
        const pending = detectSupport()
            .catch((): StoryVideoSupport => false)
            .then((support) => {
                if (supportPromise === pending) resolvedSupport = support;
                return support;
            });
        supportPromise = pending;
    }
    return supportPromise;
}

/** The detection result if it has already settled, otherwise undefined (no detection is started). */
export function getStoryVideoSupportSync(): StoryVideoSupport | undefined {
    return resolvedSupport;
}

/**
 * Starts detection when the browser is idle (portfolio mount), so Story Maker already knows whether
 * Video is available. Safe to call repeatedly.
 */
export function prefetchStoryVideoSupport(): void {
    if (supportPromise || typeof window === 'undefined') return;
    const run = () => {
        void canExportStoryVideo();
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback;
    if (typeof idle === 'function') idle.call(window, run, { timeout: 3000 });
    else setTimeout(run, 1500);
}

/** Test hook: clears the memoised capability result. */
export function _resetStoryVideoSupportForTesting(): void {
    supportPromise = null;
    resolvedSupport = undefined;
}
