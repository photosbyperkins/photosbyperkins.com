import { Check, Download, RotateCcw, Share2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useStoryExport } from '../../../hooks/useStoryExport';
import { useAppStore } from '../../../store/useAppStore';
import { getPhotoDisplayUrl, parseEventTitle } from '../../../utils/formatters';
import {
    calculateNormalizedCrop,
    generateStoryPresets,
    renderStoryToCanvas,
    STORY_ASPECT_RATIO,
} from '../../../utils/storyCanvas';
import type { EventScore, PhotoInput, PhotoRecord } from '../../../types';
import type {
    BadgeOptions,
    NormalizedCrop,
    PaddedStyleOptions,
    StoryPhotoFilterId,
    StoryPreset,
    StoryRenderConfig,
} from '../../../utils/storyCanvas';
import ModalShell from '../../ui/ModalShell';
import { StoryBadges } from './StoryBadges';
import { StoryCropper } from './StoryCropper';
import { STORY_FRAME_DEFINITIONS } from './storyFrames/frameDefinitions';
import { StoryFrameOverlay } from './storyFrames/StoryFrameOverlay';
import type { StoryFrameCategory, StoryFrameColorChoice, StoryFrameContext, StoryFrameId } from './storyFrames/types';
import { STORY_FRAME_CATEGORIES } from './storyFrames/types';
import { StoryLayoutTabIcon, StoryFiltersTabIcon, StoryFramesTabIcon, StoryBadgesTabIcon } from '../../ui/icons';
import type { IconProps } from '../../ui/icons';
import { StoryLayoutTab } from './storyTabs/StoryLayoutTab';
import { StoryFiltersTab } from './storyTabs/StoryFiltersTab';
import { StoryFramesTab } from './storyTabs/StoryFramesTab';
import { StoryBadgesTab } from './storyTabs/StoryBadgesTab';
import '../../../styles/_story-export.scss';

declare const __BUILD_NUMBER__: string;

type StoryStudioTab = 'layout' | 'filters' | 'frames' | 'badges';

const STUDIO_TABS: Array<{ id: StoryStudioTab; label: string; icon: React.FC<IconProps> }> = [
    { id: 'layout', label: 'Layout', icon: StoryLayoutTabIcon },
    { id: 'filters', label: 'Filters', icon: StoryFiltersTabIcon },
    { id: 'frames', label: 'Frames', icon: StoryFramesTabIcon },
    { id: 'badges', label: 'Badges', icon: StoryBadgesTabIcon },
];

interface StoryExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: PhotoInput;
    eventName?: string;
    year?: string;
    index: number;
    localScore?: EventScore;
}

export const StoryExportModal: React.FC<StoryExportModalProps> = ({
    isOpen,
    onClose,
    photo,
    eventName = '',
    year = '',
    index: _index,
    localScore,
}) => {
    const canShare = useCanShare();

    // Extract photo attributes
    const photoObj: PhotoRecord = typeof photo === 'string' ? { original: photo, thumb: photo } : photo;
    const originalSrc = photoObj.original || photoObj.src || '';
    const displaySrc = getPhotoDisplayUrl(originalSrc);
    const thumbSrc = photoObj.thumb || '';

    const buildQuery = typeof __BUILD_NUMBER__ !== 'undefined' ? `?v=${__BUILD_NUMBER__}` : '';
    const withBuild = useCallback(
        (url: string) => {
            if (!url) return '';
            return url.includes('?v=') ? url : `${url}${buildQuery}`;
        },
        [buildQuery]
    );

    // Image element ref for canvas rendering
    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
    const [imageError, setImageError] = useState(false);
    const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
        width: photoObj.width || 3840,
        height: photoObj.height || 2560,
    });

    // Load full/display image into HTMLImageElement with multi-tier fallback and CORS resilience
    useEffect(() => {
        if (!isOpen || !displaySrc) return;

        let isCancelled = false;
        const candidateSources = [
            withBuild(displaySrc),
            displaySrc,
            withBuild(originalSrc),
            originalSrc,
            withBuild(thumbSrc),
            thumbSrc,
        ].filter(Boolean);

        const tryLoad = (srcIdx: number, useCors: boolean) => {
            if (isCancelled || srcIdx >= candidateSources.length) {
                if (!isCancelled) setImageError(true);
                return;
            }

            const targetSrc = candidateSources[srcIdx];
            const img = new Image();
            if (useCors) {
                img.crossOrigin = 'anonymous';
            }

            img.onload = () => {
                if (isCancelled) return;
                setLoadedImage(img);
                setNaturalDimensions({
                    width: img.naturalWidth || photoObj.width || 3840,
                    height: img.naturalHeight || photoObj.height || 2560,
                });
                setImageError(false);
            };

            img.onerror = () => {
                if (isCancelled) return;
                if (useCors) {
                    // Try the same URL without crossOrigin (in case server lacks CORS headers)
                    tryLoad(srcIdx, false);
                } else {
                    // Try the next candidate source with crossOrigin
                    tryLoad(srcIdx + 1, true);
                }
            };

            img.src = targetSrc;
        };

        tryLoad(0, true);

        return () => {
            isCancelled = true;
        };
    }, [isOpen, displaySrc, originalSrc, thumbSrc, photoObj.width, photoObj.height, withBuild]);

    // Parse match title and teams for scoreboard badge
    const eventInfo = useMemo(() => {
        const { mainTitle, datePrefix } = parseEventTitle(eventName, undefined, year);
        const teams = mainTitle
            .split(/\s+(?:vs|versus)\s+/i)
            .map((t) => t.trim())
            .filter(Boolean);

        return {
            title: mainTitle,
            date: datePrefix || '',
            teams,
        };
    }, [eventName, year]);

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
    const [activeMode, setActiveMode] = useState<'crop' | 'padded'>(() => storySettings.mode || 'crop');
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
            badges,
            cardTheme,
            activeFrameId,
            effectiveFrameColor,
            photoObj.exif,
            activeFilterId,
            filterStrength,
        ]
    );

    const {
        isExporting,
        isDownloaded,
        setIsDownloaded,
        statusToast,
        setStatusToast,
        handleExportAction,
        resetExportState,
    } = useStoryExport({
        loadedImage,
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
        setStorySettings,
    ]);

    const resetToDefaults = useCallback(() => {
        resetStorySettings();
        resetExportState();
        setActiveStudioTab('layout');
        setCardTheme(activeSiteTheme || 'dark');
        setActiveFilterId('none');
        setFilterStrength(1.0);
        setActiveFrameId('none');
        setSelectedFrameCategory('all');
        setFrameColorChoice('signature');
        setFrameCustomColor('#ffffff');
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
        setStatusToast('Reset story format to defaults');
    }, [
        resetStorySettings,
        resetExportState,
        setStatusToast,
        activeSiteTheme,
        presets,
        naturalDimensions.width,
        naturalDimensions.height,
        photoObj.focusX,
        photoObj.focusY,
        eventInfo,
        localScore,
    ]);

    const handleClose = useCallback(() => {
        resetExportState();
        onClose();
    }, [resetExportState, onClose]);

    // Handler when selecting a preset
    const handleSelectPreset = (preset: StoryPreset) => {
        setSelectedPresetId(preset.id);
        setActiveMode(preset.mode);
        setActiveCrop(preset.crop);
        setIsDownloaded(false);
    };

    // Handler for custom cropper changes
    const handleCropChange = (newCrop: NormalizedCrop) => {
        setActiveCrop(newCrop);
        setSelectedPresetId('custom');
        setIsDownloaded(false);
    };

    // Live preview canvas ref
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    // Update live preview canvas when options change
    useEffect(() => {
        if (!loadedImage || !previewCanvasRef.current) return;

        const config: StoryRenderConfig = {
            mode: activeMode,
            crop: activeCrop,
            padded: paddedConfig,
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

        renderStoryToCanvas(loadedImage, config, previewCanvasRef.current).catch((err: unknown) => {
            console.error('Preview render error:', err);
        });
    }, [loadedImage, activeMode, activeCrop, paddedConfig, badges, cardTheme, activeFilterId, filterStrength]);

    const footer = (
        <button
            className={`story-export-modal__primary-action ${
                isDownloaded ? 'is-done story-export-modal__primary-action--done' : ''
            }`}
            onClick={handleExportAction}
            disabled={isExporting || !loadedImage || isDownloaded}
            title={
                isDownloaded
                    ? canShare
                        ? 'Story Card Shared'
                        : 'Story Card Downloaded'
                    : canShare
                      ? 'Share Story Card'
                      : 'Download Story Card'
            }
            aria-label={
                isDownloaded
                    ? canShare
                        ? 'Story Card Shared'
                        : 'Story Card Downloaded'
                    : canShare
                      ? 'Share Story Card'
                      : 'Download Story Card'
            }
        >
            {isDownloaded ? (
                <>
                    <Check size={18} />
                    <span>{canShare ? 'Shared' : 'Downloaded'}</span>
                </>
            ) : (
                <>
                    {canShare ? <Share2 size={18} /> : <Download size={18} />}
                    <span>{canShare ? 'Share Story Card' : 'Download Story Card'}</span>
                </>
            )}
        </button>
    );

    const headerActions = (
        <button
            type="button"
            className="modal-shell__action-btn"
            onClick={resetToDefaults}
            title="Reset story format to defaults"
            aria-label="Reset story format to defaults"
        >
            <RotateCcw size={18} />
        </button>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={handleClose}
            title="STORY MAKER"
            ariaLabel="Story Maker"
            maxWidth="wide"
            className="story-export-modal"
            headerActions={headerActions}
            footer={footer}
        >
            <div
                className="story-export-modal__body"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* LEFT / CENTER: Live Preview & Canvas */}
                <div className="story-export-modal__preview-pane">
                    <div className="story-export-modal__viewport-card">
                        {activeMode === 'crop' ? (
                            <StoryCropper
                                imageSrc={withBuild(displaySrc)}
                                fallbackSrc={withBuild(originalSrc) || withBuild(thumbSrc)}
                                naturalWidth={naturalDimensions.width}
                                naturalHeight={naturalDimensions.height}
                                crop={activeCrop}
                                badges={badges}
                                theme={cardTheme}
                                frameId={activeFrameId}
                                frameColorOverride={effectiveFrameColor}
                                exif={photoObj.exif}
                                filterId={activeFilterId}
                                filterStrength={filterStrength}
                                onChange={handleCropChange}
                                onImageLoaded={(w, h) =>
                                    setNaturalDimensions((prev) =>
                                        prev.width === w && prev.height === h ? prev : { width: w, height: h }
                                    )
                                }
                            />
                        ) : (
                            <div className="story-export-modal__padded-preview">
                                <canvas
                                    ref={previewCanvasRef}
                                    className="story-export-modal__canvas"
                                    style={{ aspectRatio: `${STORY_ASPECT_RATIO}` }}
                                />
                                <StoryFrameOverlay
                                    frameId={activeFrameId}
                                    colorOverride={effectiveFrameColor}
                                    context={frameContext}
                                />
                                <StoryBadges badges={badges} theme={cardTheme} />
                            </div>
                        )}

                        {imageError && (
                            <div className="story-export-modal__error-overlay">
                                <span>Failed to load high-resolution image preview.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Controls & Preset Configuration */}
                <div className="story-export-modal__controls-pane">
                    {/* Universal Studio Navigation Tab Bar */}
                    <div
                        className="story-export-modal__studio-tabs"
                        role="tablist"
                        aria-label="Story Maker studio tabs"
                    >
                        {STUDIO_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeStudioTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`story-export-modal__studio-tab-btn ${
                                        isActive ? 'active story-export-modal__studio-tab-btn--active' : ''
                                    }`}
                                    onClick={() => setActiveStudioTab(tab.id)}
                                >
                                    <Icon size={16} className="story-export-modal__studio-tab-icon" />
                                    <span className="story-export-modal__studio-tab-label">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="story-export-modal__tab-panel" role="tabpanel">
                        {activeStudioTab === 'layout' && (
                            <StoryLayoutTab
                                activeMode={activeMode}
                                setActiveMode={setActiveMode}
                                selectedPresetId={selectedPresetId}
                                setSelectedPresetId={setSelectedPresetId}
                                presets={presets}
                                onSelectPreset={handleSelectPreset}
                                activeCrop={activeCrop}
                                onCropChange={handleCropChange}
                                naturalDimensions={naturalDimensions}
                                paddedConfig={paddedConfig}
                                setPaddedConfig={setPaddedConfig}
                                setIsDownloaded={setIsDownloaded}
                            />
                        )}

                        {activeStudioTab === 'filters' && (
                            <StoryFiltersTab
                                activeFilterId={activeFilterId}
                                setActiveFilterId={setActiveFilterId}
                                filterStrength={filterStrength}
                                setFilterStrength={setFilterStrength}
                                previewImageUrl={withBuild(thumbSrc || displaySrc)}
                                setIsDownloaded={setIsDownloaded}
                            />
                        )}

                        {activeStudioTab === 'frames' && (
                            <StoryFramesTab
                                activeFrameId={activeFrameId}
                                setActiveFrameId={setActiveFrameId}
                                selectedFrameCategory={selectedFrameCategory}
                                setSelectedFrameCategory={setSelectedFrameCategory}
                                categoryCounts={categoryCounts}
                                displayedFrames={displayedFrames}
                                frameColorChoice={frameColorChoice}
                                setFrameColorChoice={setFrameColorChoice}
                                frameCustomColor={frameCustomColor}
                                setFrameCustomColor={setFrameCustomColor}
                                effectiveFrameColor={effectiveFrameColor}
                                frameContext={frameContext}
                                setIsDownloaded={setIsDownloaded}
                            />
                        )}

                        {activeStudioTab === 'badges' && (
                            <StoryBadgesTab
                                badges={badges}
                                setBadges={setBadges}
                                cardTheme={cardTheme}
                                setCardTheme={setCardTheme}
                                eventInfo={eventInfo}
                                setIsDownloaded={setIsDownloaded}
                            />
                        )}
                    </div>

                    {statusToast && (
                        <div className="story-export-modal__toast">
                            <span>{statusToast}</span>
                        </div>
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default StoryExportModal;
