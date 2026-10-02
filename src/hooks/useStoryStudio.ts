import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { BurstDividerStyle } from '../store/slices/storySlice';
import { useStoryExport } from './useStoryExport';
import {
    calculateNormalizedCrop,
    calculateDefaultBurstZoom,
    generateStoryPresets,
    renderStoryToCanvas,
} from '../utils/storyCanvas';
import { STORY_FRAME_DEFINITIONS } from '../components/sections/Portfolio/storyFrames/frameDefinitions';
import { STORY_FRAME_CATEGORIES } from '../components/sections/Portfolio/storyFrames/types';
import type {
    BadgeOptions,
    NormalizedCrop,
    PaddedStyleOptions,
    StoryPhotoFilterId,
    StoryPreset,
    StoryRenderConfig,
} from '../utils/storyCanvas';
import type {
    StoryFrameCategory,
    StoryFrameColorChoice,
    StoryFrameContext,
    StoryFrameId,
} from '../components/sections/Portfolio/storyFrames/types';
import type { EventScore, PhotoRecord } from '../types';

export type StoryStudioTab = 'layout' | 'filters' | 'frames' | 'badges';

export interface UseStoryStudioOptions {
    photoObj: PhotoRecord;
    naturalDimensions: { width: number; height: number };
    eventInfo: { title: string; date: string; teams: string[] };
    originalSrc: string;
    localScore?: EventScore;
    loadedImage: HTMLImageElement | null;
    loadedBurstImages?: HTMLImageElement[];
    burstLoading?: boolean;
    year: string;
    canShare: boolean;
    onClose: () => void;
}

export function useStoryStudio({
    photoObj,
    naturalDimensions,
    eventInfo,
    originalSrc,
    localScore,
    loadedImage,
    loadedBurstImages = [],
    burstLoading = false,
    year,
    canShare,
    onClose,
}: UseStoryStudioOptions) {
    // Generate dynamic presets based on number of detected people
    const presets = useMemo(() => {
        return generateStoryPresets({
            width: naturalDimensions.width,
            height: naturalDimensions.height,
            focusX: photoObj.focusX,
            focusY: photoObj.focusY,
            faces: photoObj.faces,
        });
    }, [naturalDimensions, photoObj.focusX, photoObj.focusY, photoObj.faces]);

    // Active state from App Store
    const activeSiteTheme = useAppStore((state) => state.activeTheme);
    const storySettings = useAppStore((state) => state.storySettings);
    const setStorySettings = useAppStore((state) => state.setStorySettings);
    const resetStorySettings = useAppStore((state) => state.resetStorySettings);

    const [cardTheme, setCardTheme] = useState<'dark' | 'light'>(
        () => storySettings.badgeTheme || activeSiteTheme || 'dark'
    );

    const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
        if (storySettings.mode === 'padded') return 'padded-glass';
        if (storySettings.presetId && presets.some((p) => p.id === storySettings.presetId)) {
            return storySettings.presetId;
        }
        return presets.find((p) => p.isDefault)?.id || 'center';
    });

    const [activeMode, setActiveMode] = useState<'crop' | 'padded' | 'burst'>(() => {
        if (photoObj.burst) {
            return storySettings.mode === 'padded' ? 'padded' : 'burst';
        }
        return storySettings.mode || 'crop';
    });

    const isTriptych = Boolean(photoObj.burst?.isTriptych || !photoObj.burst?.frameDeltas);

    const [burstDividerStyle, setBurstDividerStyle] = useState<BurstDividerStyle>(
        () => storySettings.burstConfig?.dividerStyle || 'hairline'
    );
    const [burstShowTimeStamps, setBurstShowTimeStamps] = useState<boolean>(() => {
        if (isTriptych) return false;
        return storySettings.burstConfig?.showTimeStamps ?? true;
    });
    const [burstSelectedIndices, setBurstSelectedIndices] = useState<(number | null)[]>(() => {
        if (photoObj.burst && photoObj.burst.total >= 3) {
            const total = photoObj.burst.total;
            if (total === 3) return [0, 1, 2];
            const currentIdx = photoObj.burst.index;
            if (currentIdx === 0) return [0, 1, 2];
            if (currentIdx >= total - 1) return [total - 3, total - 2, total - 1];
            return [currentIdx - 1, currentIdx, currentIdx + 1];
        }
        return storySettings.burstConfig?.selectedIndices || [0, 1, 2];
    });

    const [burstPanOffsets, setBurstPanOffsets] = useState<{ x: number; y: number; zoom?: number }[]>(() => {
        const defY = photoObj.focusY ?? 0.45;
        const saved = storySettings.burstConfig?.panOffsets;
        const defZoom = calculateDefaultBurstZoom(naturalDimensions.width, naturalDimensions.height);
        return [
            saved?.[0] || { x: 0.5, y: defY, zoom: defZoom },
            saved?.[1] || { x: 0.5, y: defY, zoom: defZoom },
            saved?.[2] || { x: 0.5, y: defY, zoom: defZoom },
        ];
    });

    const activePanelImages = useMemo(() => {
        if (!loadedBurstImages || loadedBurstImages.length === 0) {
            return loadedImage ? [loadedImage, loadedImage, loadedImage] : [];
        }
        const img0 =
            burstSelectedIndices[0] !== undefined && burstSelectedIndices[0] !== null
                ? loadedBurstImages[burstSelectedIndices[0]] || null
                : null;
        const img1 =
            burstSelectedIndices[1] !== undefined && burstSelectedIndices[1] !== null
                ? loadedBurstImages[burstSelectedIndices[1]] || null
                : null;
        const img2 =
            burstSelectedIndices[2] !== undefined && burstSelectedIndices[2] !== null
                ? loadedBurstImages[burstSelectedIndices[2]] || null
                : null;
        return [img0, img1, img2];
    }, [loadedBurstImages, burstSelectedIndices, loadedImage]);

    const activeBurstTimeStamps = useMemo(() => {
        if (isTriptych || !photoObj.burst?.frameDeltas) {
            return [0.0, 0.0, 0.0];
        }
        const deltas = photoObj.burst.frameDeltas;
        const base =
            burstSelectedIndices[0] !== undefined && burstSelectedIndices[0] !== null
                ? (deltas[burstSelectedIndices[0]] ?? 0)
                : 0;
        const d1 =
            burstSelectedIndices[1] !== undefined && burstSelectedIndices[1] !== null
                ? (deltas[burstSelectedIndices[1]] ?? 0.0)
                : 0.0;
        const d2 =
            burstSelectedIndices[2] !== undefined && burstSelectedIndices[2] !== null
                ? (deltas[burstSelectedIndices[2]] ?? 0.0)
                : 0.0;
        return [0.0, Number(Math.max(0, d1 - base).toFixed(2)), Number(Math.max(0, d2 - base).toFixed(2))];
    }, [photoObj.burst, burstSelectedIndices, isTriptych]);

    const [activeCrop, setActiveCrop] = useState<NormalizedCrop>(() => {
        if (storySettings.mode === 'padded') {
            return calculateNormalizedCrop(naturalDimensions.width, naturalDimensions.height, 0.5, 0.5, 1.0);
        }
        const matchedPreset = storySettings.presetId ? presets.find((p) => p.id === storySettings.presetId) : undefined;
        if (matchedPreset) {
            return matchedPreset.crop;
        }
        const def = presets.find((p) => p.isDefault);
        if (def) {
            return def.crop;
        }
        const zoom = storySettings.cropZoom || 1.0;
        return calculateNormalizedCrop(
            naturalDimensions.width,
            naturalDimensions.height,
            photoObj.focusX ?? 0.5,
            photoObj.focusY ?? 0.5,
            zoom
        );
    });

    // Padded mode configuration
    const [paddedConfig, setPaddedConfig] = useState<PaddedStyleOptions>(() => ({
        style: storySettings.paddedConfig?.style || 'frosted',
        position: storySettings.paddedConfig?.position || 'center',
        cardScale: storySettings.paddedConfig?.cardScale ?? 0.92,
        cardCornerRadius: storySettings.paddedConfig?.cardCornerRadius ?? 24,
        customColor: storySettings.paddedConfig?.customColor || '#0a0a14',
    }));

    // Story Badges
    const [badges, setBadges] = useState<BadgeOptions>(() => ({
        showScoreboard: storySettings.showScoreboard ?? Boolean(eventInfo.teams.length >= 2 || eventInfo.title),
        showScores: storySettings.showScores ?? true,
        scoreboardTitle: eventInfo.title,
        teams: eventInfo.teams,
        score1: localScore?.team1Score ?? null,
        score2: localScore?.team2Score ?? null,
        matchDate: eventInfo.date,
        showAttribution: storySettings.showAttribution ?? true,
        attributionLogoText: import.meta.env.VITE_NAV_LOGO_TEXT || 'PHOTOS BY',
        attributionLogoAccent: import.meta.env.VITE_NAV_LOGO_ACCENT || 'PERKINS',
        attributionDomain: '@photosbyperkins',
    }));

    const photoKey = originalSrc;
    const [prevPhotoKey, setPrevPhotoKey] = useState(photoKey);

    // Sync default badges when photo changes during render without cascading effects
    if (photoKey !== prevPhotoKey) {
        setPrevPhotoKey(photoKey);
        setBadges((prev) => ({
            ...prev,
            scoreboardTitle: eventInfo.title,
            teams: eventInfo.teams,
            score1: localScore?.team1Score ?? null,
            score2: localScore?.team2Score ?? null,
            matchDate: eventInfo.date,
            showScoreboard: prev.showScoreboard,
            showScores: prev.showScores,
            showAttribution: prev.showAttribution,
            attributionLogoText: import.meta.env.VITE_NAV_LOGO_TEXT || 'PHOTOS BY',
            attributionLogoAccent: import.meta.env.VITE_NAV_LOGO_ACCENT || 'PERKINS',
            attributionDomain: '@photosbyperkins',
        }));
    }

    // Studio Tab State
    const [activeStudioTab, setActiveStudioTab] = useState<StoryStudioTab>('layout');

    // Photo Filter State
    const [activeFilterId, setActiveFilterId] = useState<StoryPhotoFilterId>(() => storySettings.filterId || 'none');
    const [filterStrength, setFilterStrength] = useState<number>(() =>
        Math.max(0.1, Math.min(1.0, storySettings.filterStrength ?? 1.0))
    );

    // Decorative Frame States
    const [activeFrameId, setActiveFrameId] = useState<StoryFrameId>(() => storySettings.frameId || 'none');
    const [selectedFrameCategory, setSelectedFrameCategory] = useState<StoryFrameCategory | 'all'>(
        () => storySettings.frameCategory || 'all'
    );
    const [frameColorChoice, setFrameColorChoice] = useState<StoryFrameColorChoice>(
        () => storySettings.frameColorChoice || 'signature'
    );
    const [frameCustomColor, setFrameCustomColor] = useState<string>(() => storySettings.frameCustomColor || '#ffffff');

    const effectiveFrameColor = useMemo(() => {
        if (frameColorChoice === 'signature') return undefined;
        if (frameColorChoice === 'white') return '#ffffff';
        if (frameColorChoice === 'gold') return '#f59e0b';
        if (frameColorChoice === 'red') return '#e60000';
        return frameCustomColor;
    }, [frameColorChoice, frameCustomColor]);

    const hasExif = Boolean(
        photoObj.exif &&
        (photoObj.exif.shutterSpeed ||
            photoObj.exif.aperture ||
            photoObj.exif.iso ||
            photoObj.exif.cameraModel ||
            photoObj.exif.focalLength)
    );

    const availableFrames = useMemo(() => {
        return STORY_FRAME_DEFINITIONS.filter((f) => f.id !== 'through-the-lens' || hasExif);
    }, [hasExif]);

    const displayedFrames = useMemo(() => {
        if (selectedFrameCategory === 'all') return availableFrames;
        // Always include 'none' so the user can easily clear the frame from any category tab
        return availableFrames.filter((f) => f.id === 'none' || f.category === selectedFrameCategory);
    }, [availableFrames, selectedFrameCategory]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: availableFrames.length };
        for (const cat of STORY_FRAME_CATEGORIES) {
            if (cat.id === 'all') continue;
            counts[cat.id] = availableFrames.filter((f) => f.id === 'none' || f.category === cat.id).length;
        }
        return counts;
    }, [availableFrames]);

    // Fallback active frame if photo does not have EXIF
    if (activeFrameId === 'through-the-lens' && !hasExif) {
        setActiveFrameId('none');
    }

    const frameContext: StoryFrameContext = useMemo(
        () => ({
            hasScoreboard: Boolean(badges.showScoreboard && (badges.scoreboardTitle || badges.teams?.length)),
            hasAttribution: Boolean(badges.showAttribution),
            layoutMode: activeMode,
            exif: photoObj.exif,
        }),
        [badges.showScoreboard, badges.scoreboardTitle, badges.teams, badges.showAttribution, activeMode, photoObj.exif]
    );

    // Export configuration
    const currentConfig: StoryRenderConfig = useMemo(
        () => ({
            mode: activeMode,
            crop: activeCrop,
            padded: paddedConfig,
            burst: {
                dividerStyle: burstDividerStyle,
                showTimeStamps: burstShowTimeStamps,
                timeStamps: activeBurstTimeStamps,
                panOffsets: burstPanOffsets,
                focusYList: burstPanOffsets.map((p) => p.y),
            },
            badges,
            resolution: '1080x1920',
            cardTheme,
            badgeTheme: cardTheme,
            frameId: activeFrameId,
            frameColorOverride: effectiveFrameColor,
            exif: photoObj.exif,
            filterId: activeFilterId,
            filterStrength,
        }),
        [
            activeMode,
            activeCrop,
            paddedConfig,
            burstDividerStyle,
            burstShowTimeStamps,
            activeBurstTimeStamps,
            burstPanOffsets,
            badges,
            cardTheme,
            activeFrameId,
            effectiveFrameColor,
            photoObj.exif,
            activeFilterId,
            filterStrength,
        ]
    );

    const exportImage = activeMode === 'burst' && activePanelImages.length >= 3 ? activePanelImages : loadedImage;

    const { isExporting, isDownloaded, setIsDownloaded, statusToast, handleExportAction, resetExportState } =
        useStoryExport({
            loadedImage: exportImage,
            currentConfig,
            eventTitle: eventInfo.title,
            year,
            canShare,
            photoKey,
        });

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setStorySettings({
            mode: activeMode,
            presetId: selectedPresetId,
            cropZoom: activeCrop.zoom,
            paddedConfig,
            burstConfig: {
                dividerStyle: burstDividerStyle,
                showTimeStamps: burstShowTimeStamps,
                selectedIndices: burstSelectedIndices,
                panOffsets: burstPanOffsets,
            },
            filterId: activeFilterId,
            filterStrength,
            frameId: activeFrameId,
            frameCategory: selectedFrameCategory,
            frameColorChoice,
            frameCustomColor,
            badgeTheme: cardTheme,
            showAttribution: badges.showAttribution,
            showScoreboard: badges.showScoreboard,
            showScores: badges.showScores ?? true,
        });
    }, [
        activeMode,
        selectedPresetId,
        activeCrop.zoom,
        paddedConfig,
        activeFilterId,
        filterStrength,
        activeFrameId,
        selectedFrameCategory,
        frameColorChoice,
        frameCustomColor,
        cardTheme,
        badges.showAttribution,
        badges.showScoreboard,
        badges.showScores,
        burstDividerStyle,
        burstShowTimeStamps,
        burstSelectedIndices,
        burstPanOffsets,
        setStorySettings,
    ]);

    const resetToDefaults = useCallback(() => {
        resetStorySettings();
        resetExportState();
        setActiveStudioTab('layout');
        setCardTheme('dark');
        setActiveFilterId('none');
        setFilterStrength(1.0);
        setActiveFrameId('none');
        setSelectedFrameCategory('all');
        setFrameColorChoice('signature');
        setFrameCustomColor('#ffffff');
        if (photoObj.burst) {
            setActiveMode('burst');
            setBurstDividerStyle('hairline');
            setBurstShowTimeStamps(true);
            setBurstSelectedIndices([0, 1, 2]);
            const defY = photoObj.focusY ?? 0.45;
            const defZoom = calculateDefaultBurstZoom(naturalDimensions.width, naturalDimensions.height);
            setBurstPanOffsets([
                { x: 0.5, y: defY, zoom: defZoom },
                { x: 0.5, y: defY, zoom: defZoom },
                { x: 0.5, y: defY, zoom: defZoom },
            ]);
        } else {
            const def = presets.find((p) => p.isDefault) || presets[0];
            if (def) {
                setSelectedPresetId(def.id);
                setActiveMode(def.mode);
                setActiveCrop(def.crop);
            } else {
                setSelectedPresetId('center');
                setActiveMode('crop');
                setActiveCrop(
                    calculateNormalizedCrop(
                        naturalDimensions.width,
                        naturalDimensions.height,
                        photoObj.focusX ?? 0.5,
                        photoObj.focusY ?? 0.5,
                        1.0
                    )
                );
            }
        }
        setPaddedConfig({
            style: 'frosted',
            customColor: '#0a0a14',
            position: 'center',
            cardScale: 0.92,
            cardCornerRadius: 24,
        });
        setBadges({
            showScoreboard: Boolean(eventInfo.teams.length >= 2 || eventInfo.title),
            showScores: true,
            scoreboardTitle: eventInfo.title,
            teams: eventInfo.teams,
            score1: localScore?.team1Score ?? null,
            score2: localScore?.team2Score ?? null,
            matchDate: eventInfo.date,
            showAttribution: true,
            attributionLogoText: import.meta.env.VITE_NAV_LOGO_TEXT || 'PHOTOS BY',
            attributionLogoAccent: import.meta.env.VITE_NAV_LOGO_ACCENT || 'PERKINS',
            attributionDomain: '@photosbyperkins',
        });
    }, [
        resetStorySettings,
        resetExportState,
        photoObj.burst,
        presets,
        naturalDimensions.width,
        naturalDimensions.height,
        photoObj.focusX,
        photoObj.focusY,
        eventInfo,
        localScore,
    ]);

    const isDefaultConfig = useMemo(() => {
        if (cardTheme !== 'dark') return false;
        if (activeFilterId !== 'none') return false;
        if (Math.abs(filterStrength - 1.0) > 0.001) return false;
        if (activeFrameId !== 'none') return false;
        if (frameColorChoice !== 'signature') return false;

        if (activeMode === 'burst') {
            if (
                burstDividerStyle !== 'hairline' ||
                burstShowTimeStamps !== true ||
                burstSelectedIndices[0] !== 0 ||
                burstSelectedIndices[1] !== 1 ||
                burstSelectedIndices[2] !== 2
            ) {
                return false;
            }
            const defY = photoObj.focusY ?? 0.45;
            const defZoom = calculateDefaultBurstZoom(naturalDimensions.width, naturalDimensions.height);
            const areBurstPanOffsetsDefault = burstPanOffsets.every(
                (p) =>
                    Math.abs(p.x - 0.5) < 0.001 &&
                    Math.abs(p.y - defY) < 0.001 &&
                    Math.abs((p.zoom ?? defZoom) - defZoom) < 0.001
            );
            if (!areBurstPanOffsetsDefault) return false;
        } else {
            const def = presets.find((p) => p.isDefault) || presets[0];
            const defaultPresetId = def ? def.id : 'center';
            const defaultMode = def ? def.mode : 'crop';

            if (selectedPresetId !== defaultPresetId) return false;
            if (activeMode !== defaultMode) return false;

            if (activeMode === 'crop') {
                const defaultCrop = def
                    ? def.crop
                    : calculateNormalizedCrop(
                          naturalDimensions.width,
                          naturalDimensions.height,
                          photoObj.focusX ?? 0.5,
                          photoObj.focusY ?? 0.5,
                          1.0
                      );
                if (
                    Math.abs(activeCrop.zoom - defaultCrop.zoom) > 0.001 ||
                    Math.abs(activeCrop.x - defaultCrop.x) > 0.001 ||
                    Math.abs(activeCrop.y - defaultCrop.y) > 0.001
                ) {
                    return false;
                }
            }
        }

        if (activeMode === 'padded') {
            if (
                paddedConfig.style !== 'frosted' ||
                paddedConfig.customColor !== '#0a0a14' ||
                paddedConfig.position !== 'center' ||
                Math.abs(paddedConfig.cardScale - 0.92) > 0.001 ||
                paddedConfig.cardCornerRadius !== 24
            ) {
                return false;
            }
        }

        const defaultShowScoreboard = Boolean(eventInfo.teams.length >= 2 || eventInfo.title);
        if (Boolean(badges.showScoreboard) !== defaultShowScoreboard) return false;
        if (Boolean(badges.showScores ?? true) !== true) return false;
        if (Boolean(badges.showAttribution) !== true) return false;

        return true;
    }, [
        cardTheme,
        activeFilterId,
        filterStrength,
        activeFrameId,
        frameColorChoice,
        presets,
        selectedPresetId,
        activeMode,
        activeCrop,
        naturalDimensions.width,
        naturalDimensions.height,
        photoObj.focusX,
        photoObj.focusY,
        paddedConfig,
        eventInfo,
        badges.showScoreboard,
        badges.showScores,
        badges.showAttribution,
        burstDividerStyle,
        burstShowTimeStamps,
        burstSelectedIndices,
        burstPanOffsets,
    ]);

    const handleClose = useCallback(() => {
        resetStorySettings();
        resetExportState();
        onClose();
    }, [resetStorySettings, resetExportState, onClose]);

    const handleSelectPreset = useCallback(
        (preset: StoryPreset) => {
            setSelectedPresetId(preset.id);
            setActiveMode(preset.mode);
            setActiveCrop(preset.crop);
            setIsDownloaded(false);
        },
        [setIsDownloaded]
    );

    const handleCropChange = useCallback(
        (newCrop: NormalizedCrop) => {
            setActiveCrop(newCrop);
            setSelectedPresetId('custom');
            setIsDownloaded(false);
        },
        [setIsDownloaded]
    );

    const handleBurstPanChange = useCallback(
        (panelIndex: number, offset: { x: number; y: number; zoom?: number }) => {
            setBurstPanOffsets((prev) => {
                const next = [...prev];
                next[panelIndex] = offset;
                return next;
            });
            setIsDownloaded(false);
        },
        [setIsDownloaded]
    );

    // Live preview canvas ref
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Update live preview canvas when options change
    useEffect(() => {
        const previewImg = activeMode === 'burst' ? activePanelImages : loadedImage;

        if (!previewImg || !previewCanvasRef.current) return;

        const config: StoryRenderConfig = {
            mode: activeMode,
            crop: activeCrop,
            padded: paddedConfig,
            burst: {
                dividerStyle: burstDividerStyle,
                showTimeStamps: burstShowTimeStamps,
                timeStamps: activeBurstTimeStamps,
                panOffsets: burstPanOffsets,
                focusYList: burstPanOffsets.map((p) => p.y),
            },
            badges: {
                ...badges,
                showScoreboard: false,
                showAttribution: false,
            },
            resolution: '1080x1920', // fast live preview
            cardTheme,
            badgeTheme: cardTheme,
            filterId: activeFilterId,
            filterStrength,
        };

        renderStoryToCanvas(previewImg, config, previewCanvasRef.current).catch((err: unknown) => {
            console.error('Preview render error:', err);
        });
    }, [
        loadedImage,
        activePanelImages,
        activeMode,
        activeCrop,
        paddedConfig,
        burstDividerStyle,
        burstShowTimeStamps,
        activeBurstTimeStamps,
        burstPanOffsets,
        badges,
        cardTheme,
        activeFilterId,
        filterStrength,
    ]);

    return {
        presets,
        selectedPresetId,
        setSelectedPresetId,
        handleSelectPreset,
        activeMode,
        setActiveMode,
        activeCrop,
        handleCropChange,
        paddedConfig,
        setPaddedConfig,
        burst: photoObj.burst,
        burstDividerStyle,
        setBurstDividerStyle,
        burstShowTimeStamps,
        setBurstShowTimeStamps,
        burstSelectedIndices,
        setBurstSelectedIndices,
        burstPanOffsets,
        setBurstPanOffsets,
        handleBurstPanChange,
        activeBurstTimeStamps,
        activePanelImages,
        burstLoading,
        badges,
        setBadges,
        cardTheme,
        setCardTheme,
        activeStudioTab,
        setActiveStudioTab,
        activeFilterId,
        setActiveFilterId,
        filterStrength,
        setFilterStrength,
        activeFrameId,
        setActiveFrameId,
        selectedFrameCategory,
        setSelectedFrameCategory,
        frameColorChoice,
        setFrameColorChoice,
        frameCustomColor,
        setFrameCustomColor,
        effectiveFrameColor,
        displayedFrames,
        categoryCounts,
        frameContext,
        currentConfig,
        isExporting,
        isDownloaded,
        setIsDownloaded,
        statusToast,
        isDefaultConfig,
        resetToDefaults,
        handleClose,
        handleExportAction,
        previewCanvasRef,
    };
}
