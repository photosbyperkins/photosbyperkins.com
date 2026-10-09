import { useState, useCallback, useRef, useEffect } from 'react';
import type { StoryRenderConfig } from '../utils/storyCanvas';
import { renderStoryToBlob } from '../utils/storyCanvas';
import { triggerHaptic } from '../utils/haptics';
import {
    DEFAULT_STORY_ANIMATION,
    resolveFrameIntensity,
    type StoryAnimationSpec,
    type StoryTimelineContext,
} from '../utils/story/storyAnimation';
import { renderStoryToMp4, StoryVideoUnsupportedError, STORY_VIDEO_MIME } from '../utils/story/storyVideo';

export type StoryOutputFormat = 'photo' | 'video';

type StoryExportImage =
    HTMLImageElement | HTMLCanvasElement | (HTMLImageElement | HTMLCanvasElement | null | undefined)[] | null;

export interface UseStoryExportOptions {
    loadedImage: StoryExportImage;
    currentConfig: StoryRenderConfig;
    eventTitle?: string;
    year?: string;
    canShare: boolean;
    photoKey?: string;
    isTainted?: boolean;
    onExportSuccess?: (config: StoryRenderConfig) => void;
    /** When true and a frame is selected, exports an animated MP4 instead of a JPEG. */
    isFrameAnimated?: boolean;
    /** 'video' exports an animated MP4 instead of a JPEG (default 'photo'). */
    outputFormat?: StoryOutputFormat;
    animation?: StoryAnimationSpec;
    /** Primary subject (normalised image coords) for the Ken Burns camera. */
    animationSubject?: StoryTimelineContext['subject'];
}

export interface UseStoryExportReturn {
    isExporting: boolean;
    isDownloaded: boolean;
    setIsDownloaded: (val: boolean) => void;
    statusToast: string | null;
    setStatusToast: (val: string | null) => void;
    showToast: (msg: string) => void;
    handleDownload: () => Promise<void>;
    handleNativeShare: () => Promise<void>;
    handleExportAction: () => Promise<void>;
    resetExportState: () => void;
    /** Video render progress in whole percent (0–100), or null when no video is rendering. */
    exportProgress: number | null;
    /** Aborts an in-flight video render. */
    cancelExport: () => void;
    /** True when a rendered video for the current design is waiting to be shared (iOS activation fallback). */
    hasPendingVideo: boolean;
}

interface RenderedStory {
    blob: Blob;
    ext: 'jpg' | 'mp4';
    type: string;
}

interface VideoCache {
    blob: Blob;
    image: StoryExportImage;
    config: StoryRenderConfig;
    animation: StoryAnimationSpec;
    subject: StoryTimelineContext['subject'];
}

const CANCELLED = Symbol('story-export-cancelled');

const sameSpec = (a: StoryAnimationSpec, b: StoryAnimationSpec) =>
    a.preset === b.preset &&
    a.durationS === b.durationS &&
    a.fps === b.fps &&
    resolveFrameIntensity(a) === resolveFrameIntensity(b);

const sameSubject = (a: StoryTimelineContext['subject'], b: StoryTimelineContext['subject']) =>
    a === b || (Boolean(a) && Boolean(b) && a!.cx === b!.cx && a!.cy === b!.cy);

const isSecurityError = (err: unknown) =>
    (err as Error)?.name === 'SecurityError' || String(err).toLowerCase().includes('insecure');

type WakeLockSentinelLike = { release: () => Promise<void> };

async function requestWakeLock(): Promise<WakeLockSentinelLike | null> {
    try {
        const wakeLock = (
            navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }
        ).wakeLock;
        return wakeLock ? await wakeLock.request('screen') : null;
    } catch {
        return null;
    }
}

/**
 * Custom hook managing story card rendering (JPEG or animated MP4), downloading, web-sharing, and
 * error toast states.
 */
export function useStoryExport({
    loadedImage,
    currentConfig,
    eventTitle,
    year,
    canShare,
    photoKey,
    isTainted,
    onExportSuccess,
    isFrameAnimated = false,
    outputFormat = 'photo',
    animation = DEFAULT_STORY_ANIMATION,
    animationSubject,
}: UseStoryExportOptions): UseStoryExportReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [statusToast, setStatusToast] = useState<string | null>(null);
    const [exportProgress, setExportProgress] = useState<number | null>(null);
    const [videoCache, setVideoCache] = useState<VideoCache | null>(null);
    const activeUrlsRef = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Clean up any remaining blob URLs, timers and in-flight renders on unmount to prevent memory leaks
    useEffect(() => {
        const urls = activeUrlsRef.current;
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
            }
            abortRef.current?.abort();
            abortRef.current = null;
        };
    }, []);

    const [prevPhotoKey, setPrevPhotoKey] = useState(photoKey);
    if (photoKey !== prevPhotoKey) {
        setPrevPhotoKey(photoKey);
        setIsDownloaded(false);
        setVideoCache(null);
    }

    const hasFrame = Boolean(currentConfig.frameId && currentConfig.frameId !== 'none');
    const isVideo = Boolean((isFrameAnimated && hasFrame) || outputFormat === 'video');

    const pendingVideo =
        videoCache &&
        videoCache.image === loadedImage &&
        videoCache.config === currentConfig &&
        sameSpec(videoCache.animation, animation) &&
        sameSubject(videoCache.subject, animationSubject)
            ? videoCache
            : null;
    const hasPendingVideo = isVideo && pendingVideo !== null;

    const showToast = useCallback((msg: string) => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setStatusToast(msg);
        toastTimerRef.current = setTimeout(() => {
            setStatusToast(null);
            toastTimerRef.current = null;
        }, 3000);
    }, []);

    const resetExportState = useCallback(() => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = null;
        }
        abortRef.current?.abort();
        abortRef.current = null;
        setIsDownloaded(false);
        setIsExporting(false);
        setExportProgress(null);
        setStatusToast(null);
    }, []);

    const cancelExport = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    /** Renders the current design (or reuses the cached video). Throws CANCELLED when the user cancels. */
    const renderCurrent = useCallback(async (): Promise<RenderedStory> => {
        if (!loadedImage) throw new Error('No image to render');
        if (!isVideo) {
            const blob = await renderStoryToBlob(loadedImage, currentConfig);
            return { blob, ext: 'jpg', type: 'image/jpeg' };
        }

        if (pendingVideo) return { blob: pendingVideo.blob, ext: 'mp4', type: STORY_VIDEO_MIME };

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setExportProgress(0);
        const wakeLock = await requestWakeLock();
        let lastPercent = 0;
        try {
            const blob = await renderStoryToMp4(loadedImage, currentConfig, animation, {
                signal: controller.signal,
                subject: animationSubject,
                onProgress: (fraction) => {
                    const percent = Math.min(100, Math.floor(fraction * 100));
                    if (percent !== lastPercent) {
                        lastPercent = percent;
                        setExportProgress(percent);
                    }
                },
            });
            setVideoCache({
                blob,
                image: loadedImage,
                config: currentConfig,
                animation,
                subject: animationSubject,
            });
            return { blob, ext: 'mp4', type: STORY_VIDEO_MIME };
        } catch (err) {
            if (controller.signal.aborted) throw CANCELLED;
            throw err;
        } finally {
            if (abortRef.current === controller) abortRef.current = null;
            setExportProgress(null);
            wakeLock?.release().catch(() => {});
        }
    }, [loadedImage, isVideo, currentConfig, animation, animationSubject, pendingVideo]);

    const downloadBlob = useCallback(
        (rendered: RenderedStory) => {
            const url = URL.createObjectURL(rendered.blob);
            activeUrlsRef.current.add(url);
            const link = document.createElement('a');
            const cleanTitle = (eventTitle || 'story')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-');
            link.href = url;
            link.download = `story-${year || 'export'}-${cleanTitle}-9x16.${rendered.ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => {
                URL.revokeObjectURL(url);
                activeUrlsRef.current.delete(url);
            }, 1000);
            setIsDownloaded(true);
            triggerHaptic('success');
            onExportSuccess?.(currentConfig);
        },
        [eventTitle, year, onExportSuccess, currentConfig]
    );

    /** Shared toast + haptic handling for render failures (user cancels get a neutral toast). */
    const handleRenderError = useCallback(
        (err: unknown, fallbackMessage: string) => {
            if (err === CANCELLED) {
                showToast('Video export cancelled.');
                return;
            }
            triggerHaptic('warning');
            if (err instanceof StoryVideoUnsupportedError) {
                showToast("Video export isn't supported in this browser.");
                return;
            }
            console.error('Story export error:', err);
            showToast(
                isSecurityError(err) ? 'Export unavailable: Image lacks cross-origin permissions.' : fallbackMessage
            );
        },
        [showToast]
    );

    // 1. Direct Download Action
    const handleDownload = useCallback(async () => {
        if (!loadedImage) return;
        if (isTainted) {
            showToast('Export unavailable: Image lacks cross-origin permissions.');
            return;
        }
        setIsExporting(true);
        try {
            downloadBlob(await renderCurrent());
        } catch (err) {
            handleRenderError(err, isVideo ? 'Failed to create video.' : 'Failed to download image.');
        } finally {
            setIsExporting(false);
        }
    }, [loadedImage, isTainted, showToast, downloadBlob, renderCurrent, handleRenderError, isVideo]);

    // 2. Native Share Action
    const handleNativeShare = useCallback(async () => {
        if (!loadedImage) return;
        if (isTainted) {
            showToast('Export unavailable: Image lacks cross-origin permissions.');
            return;
        }
        setIsExporting(true);
        let rendered: RenderedStory;
        try {
            rendered = await renderCurrent();
        } catch (err) {
            handleRenderError(err, isVideo ? 'Failed to create video.' : 'Share failed. Use Download instead.');
            setIsExporting(false);
            return;
        }

        try {
            const file = new File([rendered.blob], `story.${rendered.ext}`, { type: rendered.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Story from ${eventTitle || 'Photos by Perkins'}`,
                });
                setIsDownloaded(true);
                triggerHaptic('success');
                onExportSuccess?.(currentConfig);
            } else {
                // Fallback to download (reusing the rendered blob) if sharing files is not supported
                downloadBlob(rendered);
            }
        } catch (err) {
            const name = (err as Error)?.name;
            if (name === 'AbortError') {
                // User dismissed the share sheet
            } else if (name === 'NotAllowedError' && rendered.ext === 'mp4') {
                // A long encode consumes the tap's user activation (iOS); the video is cached, so the
                // next tap shares it instantly.
                triggerHaptic('success');
                showToast('Video ready — tap Share Video.');
            } else {
                console.error('Share error:', err);
                triggerHaptic('warning');
                showToast(
                    isSecurityError(err)
                        ? 'Export unavailable: Image lacks cross-origin permissions.'
                        : 'Share failed. Use Download instead.'
                );
            }
        } finally {
            setIsExporting(false);
        }
    }, [
        loadedImage,
        isTainted,
        showToast,
        renderCurrent,
        handleRenderError,
        isVideo,
        eventTitle,
        onExportSuccess,
        currentConfig,
        downloadBlob,
    ]);

    const handleExportAction = useCallback(async () => {
        if (canShare) {
            await handleNativeShare();
        } else {
            await handleDownload();
        }
    }, [canShare, handleNativeShare, handleDownload]);

    return {
        isExporting,
        isDownloaded,
        setIsDownloaded,
        statusToast,
        setStatusToast,
        showToast,
        handleDownload,
        handleNativeShare,
        handleExportAction,
        resetExportState,
        exportProgress,
        cancelExport,
        hasPendingVideo,
    };
}
