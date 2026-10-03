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
    onExportSuccess,
}: UseStoryExportOptions): UseStoryExportReturn {
    const [isExporting, setIsExporting] = useState(false);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [statusToast, setStatusToast] = useState<string | null>(null);
    const activeUrlsRef = useRef<Set<string>>(new Set());

    // Clean up any remaining blob URLs on unmount to prevent memory leaks
    useEffect(() => {
        const urls = activeUrlsRef.current;
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    const [prevPhotoKey, setPrevPhotoKey] = useState(photoKey);
    if (photoKey !== prevPhotoKey) {
        setPrevPhotoKey(photoKey);
        setIsDownloaded(false);
    }

    const showToast = useCallback((msg: string) => {
        setStatusToast(msg);
        setTimeout(() => setStatusToast(null), 3000);
    }, []);

    const resetExportState = useCallback(() => {
        setIsDownloaded(false);
        setIsExporting(false);
        setStatusToast(null);
    }, []);

    // 1. Direct Download Action
    const handleDownload = useCallback(async () => {
        if (!loadedImage) return;
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
            showToast('Failed to download image.');
        } finally {
            setIsExporting(false);
        }
    }, [loadedImage, currentConfig, eventTitle, year, showToast, onExportSuccess]);

    // 2. Native Share Action
    const handleNativeShare = useCallback(async () => {
        if (!loadedImage) return;
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
                showToast('Share failed. Use Download instead.');
            }
        } finally {
            setIsExporting(false);
        }
    }, [loadedImage, currentConfig, eventTitle, handleDownload, showToast, onExportSuccess]);

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
