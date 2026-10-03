import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { BurstDividerStyle } from '../store/slices/storySlice';
import { useStoryExport } from './useStoryExport';
import {
    calculateNormalizedCrop,
    calculateFitZoom,
    calculateDefaultBurstZoom,
    generateStoryPresets,
    renderStoryToCanvas,
    BURST_PANEL_ASPECT_RATIO,
    DUET_PANEL_ASPECT_RATIO,
} from '../utils/storyCanvas';
import { STORY_FRAME_DEFINITIONS } from '../components/sections/Portfolio/storyFrames/frameDefinitions';
import { STORY_FRAME_CATEGORIES } from '../components/sections/Portfolio/storyFrames/types';
import {
    STORY_FILTER_CATEGORIES,
    STORY_PHOTO_FILTERS,
    type BadgeOptions,
    type NormalizedCrop,
    type PaddedStyleOptions,
    type StoryPhotoFilter,
    type StoryPhotoFilterCategory,
    type StoryPhotoFilterId,
    type StoryPhotoFilterTabCategory,
    type StoryPreset,
    type StoryRenderConfig,
} from '../utils/storyCanvas';
import type {
    StoryFrameCategory,
    StoryFrameColorChoice,
    StoryFrameContext,
    StoryFrameDefinition,
    StoryFrameFilterCategory,
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
    const recentFrameIds = useAppStore((state) => state.recentFrameIds);
    const addRecentFrame = useAppStore((state) => state.addRecentFrame);
    const recentFilterIds = useAppStore((state) => state.recentFilterIds);
    const addRecentFilter = useAppStore((state) => state.addRecentFilter);

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

    const [burstPanelCount, setBurstPanelCount] = useState<2 | 3>(() => {
        if (photoObj.burst?.panelCount) return photoObj.burst.panelCount;
        if (photoObj.burst && (photoObj.burst.total === 2 || photoObj.burst.isDuet)) return 2;
        return storySettings.burstConfig?.panelCount || 3;
    });

    const targetPanelCount: 2 | 3 = burstPanelCount;
    const isDuet = targetPanelCount === 2;

    const handleSetBurstPanelCount = useCallback(
        (newCount: 2 | 3) => {
            setBurstPanelCount(newCount);
            setIsDownloaded(false);
            if (newCount === 2) {
                setBurstActiveStep((prev) => (prev > 1 ? 1 : prev));
                // Switching to Duet (2 panels)
                setBurstSelectedIndices((prev) => {
                    const s0 = prev[0] ?? 0;
                    let s1 = prev[2] ?? prev[1];
                    const total = photoObj.burst?.total || 2;
                    if (s1 === undefined || s1 === null || s1 === s0) {
                        s1 = s0 === 0 ? (total > 1 ? 1 : 0) : 0;
                    }
                    return [s0, s1];
                });
                setBurstPanOffsets((prev) => {
                    const defY = photoObj.focusY ?? 0.45;
                    const defZoom = calculateDefaultBurstZoom(
                        naturalDimensions.width,
                        naturalDimensions.height,
                        DUET_PANEL_ASPECT_RATIO
                    );
                    return [
                        prev[0] ? { ...prev[0], zoom: prev[0].zoom ?? defZoom } : { x: 0.5, y: defY, zoom: defZoom },
                        prev[1] ? { ...prev[1], zoom: prev[1].zoom ?? defZoom } : { x: 0.5, y: defY, zoom: defZoom },
                    ];
                });
            } else {
                // Switching to 3 panels (Triptych / Burst)
                setBurstSelectedIndices((prev) => {
                    const total = photoObj.burst?.total || 3;
                    const s0 = prev[0] ?? 0;
                    const sLast = prev[1] ?? (total > 2 ? 2 : 1);
                    let mid: number | null = null;
                    if (sLast > s0 + 1) {
                        mid = Math.floor((s0 + sLast) / 2);
                    } else if (total >= 3) {
                        for (let i = 0; i < total; i++) {
                            if (i !== s0 && i !== sLast) {
                                mid = i;
                                break;
                            }
                        }
                    }
                    return [s0, mid ?? 1, sLast];
                });
                setBurstPanOffsets((prev) => {
                    const defY = photoObj.focusY ?? 0.45;
                    const defZoom = calculateDefaultBurstZoom(
                        naturalDimensions.width,
                        naturalDimensions.height,
                        BURST_PANEL_ASPECT_RATIO
                    );
                    return [
                        prev[0] ? { ...prev[0], zoom: prev[0].zoom ?? defZoom } : { x: 0.5, y: defY, zoom: defZoom },
                        prev[1] ? { ...prev[1], zoom: prev[1].zoom ?? defZoom } : { x: 0.5, y: defY, zoom: defZoom },
                        prev[2] || { x: 0.5, y: defY, zoom: defZoom },
                    ];
                });
            }
        },
        [photoObj.burst?.total, photoObj.focusY, naturalDimensions.width, naturalDimensions.height]
    );

    const [activeMode, setActiveMode] = useState<'solo' | 'crop' | 'padded' | 'burst'>(() => {
        if (photoObj.burst) {
            if (photoObj.burst.total < 2) return 'solo';
            return 'burst';
        }
        if (storySettings.mode === 'crop' || storySettings.mode === 'padded') return 'solo';
        return storySettings.mode || 'solo';
    });

    const [activePhotoIndex, setActivePhotoIndex] = useState<number>(() => {
        if (photoObj.burst && photoObj.burst.index !== undefined) {
            return photoObj.burst.index;
        }
        return 0;
    });

    const isMultiPhoto = Boolean(photoObj.burst?.isTriptych || !photoObj.burst?.frameDeltas);
    const isTriptych = isMultiPhoto;

    const [burstDividerStyle, setBurstDividerStyle] = useState<BurstDividerStyle>(
        () => storySettings.burstConfig?.dividerStyle || 'hairline'
    );
    const [burstShowTimeStamps, setBurstShowTimeStamps] = useState<boolean>(() => {
        if (isMultiPhoto) return false;
        return storySettings.burstConfig?.showTimeStamps ?? true;
    });

    const handleSetBurstShowTimeStamps = useCallback(
        (val: boolean) => {
            if (isMultiPhoto) {
                setBurstShowTimeStamps(false);
                return;
            }
            setBurstShowTimeStamps(val);
        },
        [isMultiPhoto]
    );

    useEffect(() => {
        if (isMultiPhoto && burstShowTimeStamps) {
            setBurstShowTimeStamps(false);
        }
    }, [isMultiPhoto, burstShowTimeStamps]);
    const [burstSelectedIndices, setBurstSelectedIndices] = useState<(number | null)[]>(() => {
        if (photoObj.burst && photoObj.burst.total >= 2) {
            const total = photoObj.burst.total;
            const currentIdx = photoObj.burst.index ?? 0;

            if (total === 2) return [0, 1];
            if (isDuet) {
                if (currentIdx >= total - 1) return [total - 2, total - 1];
                return [currentIdx, currentIdx + 1];
            }
            if (total === 3) return [0, 1, 2];
            if (currentIdx === 0) return [0, 1, 2];
            if (currentIdx >= total - 1) return [total - 3, total - 2, total - 1];
            return [currentIdx - 1, currentIdx, currentIdx + 1];
        }
        return storySettings.burstConfig?.selectedIndices || (isDuet ? [0, 1] : [0, 1, 2]);
    });

    const [burstActiveStep, setBurstActiveStep] = useState<number>(() => {
        if (burstSelectedIndices[0] === null || burstSelectedIndices[0] === undefined) return 0;
        if (burstSelectedIndices[1] === null || burstSelectedIndices[1] === undefined) return 1;
        if (targetPanelCount === 3 && (burstSelectedIndices[2] === null || burstSelectedIndices[2] === undefined)) return 2;
        return 0;
    });

    const [burstPanOffsets, setBurstPanOffsets] = useState<{ x: number; y: number; zoom?: number }[]>(() => {
        const defY = photoObj.focusY ?? 0.45;
        const saved = storySettings.burstConfig?.panOffsets;
        const panelAspect = targetPanelCount === 2 ? DUET_PANEL_ASPECT_RATIO : BURST_PANEL_ASPECT_RATIO;
        const defZoom = calculateDefaultBurstZoom(naturalDimensions.width, naturalDimensions.height, panelAspect);
        return Array.from({ length: targetPanelCount }, (_, i) => saved?.[i] || { x: 0.5, y: defY, zoom: defZoom });
    });

    const activePanelImages = useMemo(() => {
        if (!loadedBurstImages || loadedBurstImages.length === 0) {
            return loadedImage ? Array(targetPanelCount).fill(loadedImage) : [];
        }
        return burstSelectedIndices.slice(0, targetPanelCount).map((idx) => {
            return idx !== undefined && idx !== null ? loadedBurstImages[idx] || null : null;
        });
    }, [loadedBurstImages, burstSelectedIndices, loadedImage, targetPanelCount]);

    const activeBurstTimeStamps = useMemo(() => {
        if (isTriptych || !photoObj.burst?.frameDeltas) {
            return Array(targetPanelCount).fill(0.0);
        }
        const deltas = photoObj.burst.frameDeltas;
        const base =
            burstSelectedIndices[0] !== undefined && burstSelectedIndices[0] !== null
                ? (deltas[burstSelectedIndices[0]] ?? 0)
                : 0;
        return burstSelectedIndices.slice(0, targetPanelCount).map((idx, i) => {
            if (i === 0) return 0.0;
            if (idx !== undefined && idx !== null) {
                return Number(Math.abs((deltas[idx] ?? 0.0) - base).toFixed(2));
            }
            return 0.0;
        });
    }, [photoObj.burst, burstSelectedIndices, isTriptych, targetPanelCount]);

    const [activeCrop, setActiveCrop] = useState<NormalizedCrop>(() => {
        if (storySettings.mode === 'padded') {
            const fit = calculateFitZoom(
                naturalDimensions.width,
                naturalDimensions.height,
                storySettings.paddedConfig?.cardScale || 0.92
            );
            return calculateNormalizedCrop(naturalDimensions.width, naturalDimensions.height, 0.5, 0.5, fit, fit);
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
    const [selectedFilterCategory, setSelectedFilterCategory] = useState<StoryPhotoFilterTabCategory>(
        () => storySettings.filterCategory || 'all'
    );

    const displayedFilters = useMemo(() => {
        if (selectedFilterCategory === 'all') return STORY_PHOTO_FILTERS;
        if (selectedFilterCategory === 'recent') {
            const noneFilter = STORY_PHOTO_FILTERS.find((f) => f.id === 'none');
            const recentDefs = (recentFilterIds || [])
                .map((id) => STORY_PHOTO_FILTERS.find((f) => f.id === id))
                .filter((f): f is StoryPhotoFilter => Boolean(f));
            return noneFilter ? [noneFilter, ...recentDefs] : recentDefs;
        }
        return STORY_PHOTO_FILTERS.filter((f) => f.id === 'none' || f.category === selectedFilterCategory);
    }, [selectedFilterCategory, recentFilterIds]);

    const filterCategoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: STORY_PHOTO_FILTERS.length };
        const availableRecentCount = (recentFilterIds || []).filter((id) =>
            STORY_PHOTO_FILTERS.some((f) => f.id === id && f.id !== 'none')
        ).length;
        counts['recent'] = availableRecentCount;
        for (const cat of STORY_FILTER_CATEGORIES) {
            if (cat.id === 'all' || cat.id === 'recent') continue;
            counts[cat.id] = STORY_PHOTO_FILTERS.filter((f) => f.id === 'none' || f.category === cat.id).length;
        }
        return counts;
    }, [recentFilterIds]);

    // Decorative Frame States
    const [activeFrameId, setActiveFrameId] = useState<StoryFrameId>(() => storySettings.frameId || 'none');
    const [selectedFrameCategory, setSelectedFrameCategory] = useState<StoryFrameFilterCategory>(
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
        if (selectedFrameCategory === 'recent') {
            const noneFrame = availableFrames.find((f) => f.id === 'none');
            const recentDefs = (recentFrameIds || [])
                .map((id) => availableFrames.find((f) => f.id === id))
                .filter((f): f is StoryFrameDefinition => Boolean(f));
            return noneFrame ? [noneFrame, ...recentDefs] : recentDefs;
        }
        // Always include 'none' so the user can easily clear the frame from any category tab
        return availableFrames.filter((f) => f.id === 'none' || f.category === selectedFrameCategory);
    }, [availableFrames, selectedFrameCategory, recentFrameIds]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: availableFrames.length };
        const availableRecentCount = (recentFrameIds || []).filter((id) =>
            availableFrames.some((f) => f.id === id && f.id !== 'none')
        ).length;
        counts['recent'] = availableRecentCount;
        for (const cat of STORY_FRAME_CATEGORIES) {
            if (cat.id === 'all' || cat.id === 'recent') continue;
            counts[cat.id] = availableFrames.filter((f) => f.id === 'none' || f.category === cat.id).length;
        }
        return counts;
    }, [availableFrames, recentFrameIds]);

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
                showTimeStamps: isMultiPhoto ? false : burstShowTimeStamps,
                panelCount: targetPanelCount,
                timeStamps: isMultiPhoto ? [] : activeBurstTimeStamps,
                panOffsets: burstPanOffsets,
                focusYList: burstPanOffsets.map((p) => p.y),
                isTriptych: isMultiPhoto,
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
            targetPanelCount,
            activeBurstTimeStamps,
            burstPanOffsets,
            isMultiPhoto,
            badges,
            cardTheme,
            activeFrameId,
            effectiveFrameColor,
            photoObj.exif,
            activeFilterId,
            filterStrength,
        ]
    );

    const activeSingleImage = (loadedBurstImages && loadedBurstImages[activePhotoIndex]) || loadedImage;
    const exportImage =
        activeMode === 'burst' && activePanelImages.length >= targetPanelCount ? activePanelImages : activeSingleImage;

    const { isExporting, isDownloaded, setIsDownloaded, statusToast, handleExportAction, resetExportState } =
        useStoryExport({
            loadedImage: exportImage,
            currentConfig,
            eventTitle: eventInfo.title,
            year,
            canShare,
            photoKey,
            onExportSuccess: (cfg) => {
                if (cfg.frameId && cfg.frameId !== 'none') {
                    addRecentFrame(cfg.frameId);
                }
                if (cfg.filterId && cfg.filterId !== 'none') {
                    addRecentFilter(cfg.filterId);
                }
            },
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
                showTimeStamps: isMultiPhoto ? false : burstShowTimeStamps,
                selectedIndices: burstSelectedIndices,
                panOffsets: burstPanOffsets,
                panelCount: targetPanelCount,
            },
            filterId: activeFilterId,
            filterStrength,
            filterCategory: selectedFilterCategory,
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
        selectedFilterCategory,
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
        targetPanelCount,
        isMultiPhoto,
        setStorySettings,
    ]);

    const resetToDefaults = useCallback(() => {
        resetStorySettings();
        resetExportState();
        setActiveStudioTab('layout');
        setCardTheme('dark');
        setActiveFilterId('none');
        setFilterStrength(1.0);
        setSelectedFilterCategory('all');
        setActiveFrameId('none');
        setSelectedFrameCategory('all');
        setFrameColorChoice('signature');
        setFrameCustomColor('#ffffff');
        if (photoObj.burst) {
            const defaultPanelCount: 2 | 3 = photoObj.burst.total === 2 || photoObj.burst.isDuet ? 2 : 3;
            const total = photoObj.burst.total;
            const currentIdx = photoObj.burst.index ?? 0;
            let defaultIndices: (number | null)[];
            if (defaultPanelCount === 2) {
                if (total === 2 || currentIdx === 0) defaultIndices = [0, 1];
                else if (currentIdx >= total - 1) defaultIndices = [total - 2, total - 1];
                else defaultIndices = [currentIdx, currentIdx + 1];
            } else {
                if (total === 3 || currentIdx === 0) defaultIndices = [0, 1, 2];
                else if (currentIdx >= total - 1) defaultIndices = [total - 3, total - 2, total - 1];
                else defaultIndices = [currentIdx - 1, currentIdx, currentIdx + 1];
            }
            setBurstPanelCount(defaultPanelCount);
            setActiveMode('burst');
            setBurstDividerStyle('hairline');
            setBurstShowTimeStamps(isMultiPhoto ? false : true);
            setBurstSelectedIndices(defaultIndices);
            setBurstActiveStep(0);
            const defY = photoObj.focusY ?? 0.45;
            const panelAspect = defaultPanelCount === 2 ? DUET_PANEL_ASPECT_RATIO : BURST_PANEL_ASPECT_RATIO;
            const defZoom = calculateDefaultBurstZoom(naturalDimensions.width, naturalDimensions.height, panelAspect);
            setBurstPanOffsets(Array.from({ length: defaultPanelCount }, () => ({ x: 0.5, y: defY, zoom: defZoom })));
        } else {
            const def = presets.find((p) => p.isDefault) || presets[0];
            if (def) {
                setSelectedPresetId(def.id);
                setActiveMode(def.mode);
                setActiveCrop(def.crop);
            } else {
                setSelectedPresetId('center');
                setActiveMode('solo');
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
        isMultiPhoto,
        targetPanelCount,
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
            const defaultPanelCount: 2 | 3 = photoObj.burst?.total === 2 || photoObj.burst?.isDuet ? 2 : 3;
            if (burstPanelCount !== defaultPanelCount) return false;
            const total = photoObj.burst?.total ?? 2;
            const currentIdx = photoObj.burst?.index ?? 0;
            const defaultIndices: (number | null)[] = (() => {
                if (defaultPanelCount === 2) {
                    if (total === 2 || currentIdx === 0) return [0, 1];
                    if (currentIdx >= total - 1) return [total - 2, total - 1];
                    return [currentIdx, currentIdx + 1];
                } else {
                    if (total === 3 || currentIdx === 0) return [0, 1, 2];
                    if (currentIdx >= total - 1) return [total - 3, total - 2, total - 1];
                    return [currentIdx - 1, currentIdx, currentIdx + 1];
                }
            })();

            const areIndicesDefault =
                burstSelectedIndices.length === defaultIndices.length &&
                burstSelectedIndices.every((val, i) => val === defaultIndices[i]);

            const defaultBurstShowTimeStamps = isMultiPhoto ? false : true;
            if (
                burstDividerStyle !== 'hairline' ||
                burstShowTimeStamps !== defaultBurstShowTimeStamps ||
                !areIndicesDefault
            ) {
                return false;
            }
            const defY = photoObj.focusY ?? 0.45;
            const panelAspect = targetPanelCount === 2 ? DUET_PANEL_ASPECT_RATIO : BURST_PANEL_ASPECT_RATIO;
            const defZoom = calculateDefaultBurstZoom(naturalDimensions.width, naturalDimensions.height, panelAspect);
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
            const defaultMode = def ? def.mode : 'solo';

            if (selectedPresetId !== defaultPresetId) return false;
            if (activeMode !== defaultMode && activeMode !== 'solo') return false;

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

        if (activeMode === 'padded' || activeMode === 'solo') {
            if (
                paddedConfig.style !== 'frosted' ||
                paddedConfig.customColor !== '#0a0a14' ||
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
        isMultiPhoto,
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

    const handleSelectPhotoIndex = useCallback(
        (idx: number) => {
            setActivePhotoIndex(idx);
            setIsDownloaded(false);
            const targetImg = loadedBurstImages?.[idx];
            const w = targetImg?.naturalWidth || naturalDimensions.width;
            const h = targetImg?.naturalHeight || naturalDimensions.height;
            const preset = presets.find((p) => p.id === selectedPresetId) || presets.find((p) => p.isDefault);
            if (preset) {
                setActiveCrop(preset.crop);
            } else {
                setActiveCrop(calculateNormalizedCrop(w, h, 0.5, 0.5, 1.0));
            }
        },
        [loadedBurstImages, naturalDimensions, presets, selectedPresetId, setIsDownloaded]
    );

    // Live preview canvas ref
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const renderSeqRef = useRef(0);

    // Update live preview canvas when options change
    useEffect(() => {
        const activeSingleImage = (loadedBurstImages && loadedBurstImages[activePhotoIndex]) || loadedImage;
        const previewImg = activeMode === 'burst' ? activePanelImages : activeSingleImage;

        if (!previewImg || !previewCanvasRef.current) return;

        const currentSeq = ++renderSeqRef.current;
        const targetCanvas = previewCanvasRef.current;

        const config: StoryRenderConfig = {
            mode: activeMode,
            crop: activeCrop,
            padded: paddedConfig,
            burst: {
                dividerStyle: burstDividerStyle,
                showTimeStamps: isMultiPhoto ? false : burstShowTimeStamps,
                panelCount: targetPanelCount,
                timeStamps: isMultiPhoto ? [] : activeBurstTimeStamps,
                panOffsets: burstPanOffsets,
                focusYList: burstPanOffsets.map((p) => p.y),
                isTriptych: isMultiPhoto,
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

        const offscreen = document.createElement('canvas');
        renderStoryToCanvas(previewImg, config, offscreen)
            .then((renderedCanvas) => {
                if (currentSeq !== renderSeqRef.current) return;
                const ctx = targetCanvas.getContext('2d');
                if (ctx) {
                    targetCanvas.width = renderedCanvas.width;
                    targetCanvas.height = renderedCanvas.height;
                    ctx.drawImage(renderedCanvas, 0, 0);
                }
            })
            .catch((err: unknown) => {
                if (currentSeq === renderSeqRef.current) {
                    console.error('Preview render error:', err);
                }
            });
    }, [
        loadedImage,
        loadedBurstImages,
        activePhotoIndex,
        activePanelImages,
        activeMode,
        activeCrop,
        paddedConfig,
        burstDividerStyle,
        burstShowTimeStamps,
        targetPanelCount,
        activeBurstTimeStamps,
        burstPanOffsets,
        isMultiPhoto,
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
        activePhotoIndex,
        setActivePhotoIndex,
        handleSelectPhotoIndex,
        paddedConfig,
        setPaddedConfig,
        burst: photoObj.burst,
        burstPanelCount: targetPanelCount,
        setBurstPanelCount: handleSetBurstPanelCount,
        isDuet,
        burstDividerStyle,
        setBurstDividerStyle,
        burstShowTimeStamps: isMultiPhoto ? false : burstShowTimeStamps,
        setBurstShowTimeStamps: handleSetBurstShowTimeStamps,
        burstSelectedIndices,
        setBurstSelectedIndices,
        burstActiveStep,
        setBurstActiveStep,
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
        selectedFilterCategory,
        setSelectedFilterCategory,
        filterCategoryCounts,
        displayedFilters,
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
