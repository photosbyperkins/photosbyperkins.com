import { useState, useCallback, useRef, useEffect } from 'react';
import type { StoryRenderConfig } from '../utils/storyCanvas';
import { renderStoryToBlob } from '../utils/storyCanvas';

export interface UseStoryExportOptions {
    loadedImage:
        HTMLImageElement | HTMLCanvasElement | (HTMLImageElement | HTMLCanvasElement | null | undefined)[] | null;
    currentConfig: StoryRenderConfig;
    eventTitle?: string;
    year?: string;
    canShare: boolean;
    photoKey?: string;
    isTainted?: boolean;
    onExportSuccess?: (config: StoryRenderConfig) => void;
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
}

/**
 * Custom hook managing story card rendering, downloading, web-sharing, and error toast states.
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
}: UseStoryExportOptions): UseStoryExportReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [statusToast, setStatusToast] = useState<string | null>(null);
    const activeUrlsRef = useRef<Set<string>>(new Set());
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up any remaining blob URLs and timers on unmount to prevent memory leaks
    useEffect(() => {
        const urls = activeUrlsRef.current;
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
                toastTimerRef.current = null;
            }
        };
    }, []);

    const [prevPhotoKey, setPrevPhotoKey] = useState(photoKey);
    if (photoKey !== prevPhotoKey) {
        setPrevPhotoKey(photoKey);
        setIsDownloaded(false);
    }

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
        setIsDownloaded(false);
        setIsExporting(false);
        setStatusToast(null);
    }, []);

    // 1. Direct Download Action
    const handleDownload = useCallback(async () => {
        if (!loadedImage) return;
        if (isTainted) {
            showToast('Export unavailable: Image lacks cross-origin permissions.');
            return;
        }
        setIsExporting(true);
        try {
            const blob = await renderStoryToBlob(loadedImage, currentConfig);
            const url = URL.createObjectURL(blob);
            activeUrlsRef.current.add(url);
            const link = document.createElement('a');
            const cleanTitle = (eventTitle || 'story')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-');
            link.href = url;
            link.download = `story-${year || 'export'}-${cleanTitle}-9x16.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => {
                URL.revokeObjectURL(url);
                activeUrlsRef.current.delete(url);
            }, 1000);
            setIsDownloaded(true);
            onExportSuccess?.(currentConfig);
        } catch (err) {
            console.error('Download error:', err);
            const isSecurityError =
                (err as Error)?.name === 'SecurityError' || String(err).toLowerCase().includes('insecure');
            showToast(
                isSecurityError
                    ? 'Export unavailable: Image lacks cross-origin permissions.'
                    : 'Failed to download image.'
            );
        } finally {
            setIsExporting(false);
        }
    }, [loadedImage, isTainted, currentConfig, eventTitle, year, showToast, onExportSuccess]);

    // 2. Native Share Action
    const handleNativeShare = useCallback(async () => {
        if (!loadedImage) return;
        if (isTainted) {
            showToast('Export unavailable: Image lacks cross-origin permissions.');
            return;
        }
        setIsExporting(true);
        try {
            const blob = await renderStoryToBlob(loadedImage, currentConfig);
            const file = new File([blob], 'story.jpg', { type: 'image/jpeg' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Story from ${eventTitle || 'Photos by Perkins'}`,
                });
                setIsDownloaded(true);
                onExportSuccess?.(currentConfig);
            } else {
                // Fallback to download if canShare files is not supported
                await handleDownload();
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share error:', err);
                const isSecurityError =
                    (err as Error)?.name === 'SecurityError' || String(err).toLowerCase().includes('insecure');
                showToast(
                    isSecurityError
                        ? 'Export unavailable: Image lacks cross-origin permissions.'
                        : 'Share failed. Use Download instead.'
                );
            }
        } finally {
            setIsExporting(false);
        }
    }, [loadedImage, isTainted, currentConfig, eventTitle, handleDownload, showToast, onExportSuccess]);

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
    };
}
