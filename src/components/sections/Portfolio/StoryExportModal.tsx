import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Download,
    Share2,
    Moon,
    Sun,
    ChevronDown,
    ChevronUp,
    Check,
} from 'lucide-react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useAppStore } from '../../../store/useAppStore';
import ModalShell from '../../ui/ModalShell';
import { StoryCropper } from './StoryCropper';
import { StoryBadges } from './StoryBadges';
import type { StoryFrameId, StoryFrameColorChoice, StoryFrameContext } from './storyFrames/types';
import { STORY_FRAME_DEFINITIONS, STORY_FRAMES_MAP } from './storyFrames/frameDefinitions';
import { StoryFrameOverlay } from './storyFrames/StoryFrameOverlay';
import type { PhotoInput, PhotoRecord, EventScore } from '../../../types';
import '../../../styles/_story-export.scss';
import type {
    NormalizedCrop,
    StoryPreset,
    StoryRenderConfig,
    PaddedStyleOptions,
    BadgeOptions,
    StoryPhotoFilterId,
} from '../../../utils/storyCanvas';
import {
    STORY_ASPECT_RATIO,
    generateStoryPresets,
    calculateNormalizedCrop,
    renderStoryToCanvas,
    renderStoryToBlob,
    STORY_PHOTO_FILTERS,
    STORY_PHOTO_FILTERS_MAP,
} from '../../../utils/storyCanvas';
import { getPhotoDisplayUrl, parseEventTitle } from '../../../utils/formatters';

declare const __BUILD_NUMBER__: string;

function getContrastTextColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#111116' : '#ffffff';
}

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

    // Active state
    const activeSiteTheme = useAppStore((state) => state.activeTheme);
    const [cardTheme, setCardTheme] = useState<'dark' | 'light'>(() => activeSiteTheme || 'dark');

    const [selectedPresetId, setSelectedPresetId] = useState<string>(
        () => presets.find((p) => p.isDefault)?.id || 'center'
    );
    const [activeMode, setActiveMode] = useState<'crop' | 'padded'>('crop');
    const [activeCrop, setActiveCrop] = useState<NormalizedCrop>(() =>
        calculateNormalizedCrop(
            naturalDimensions.width,
            naturalDimensions.height,
            photoObj.focusX ?? 0.5,
            photoObj.focusY ?? 0.5,
            1.0
        )
    );

    // Padded mode configuration
    const [paddedConfig, setPaddedConfig] = useState<PaddedStyleOptions>({
        style: 'glass',
        position: 'center',
        cardScale: 0.92,
        cardCornerRadius: 24,
    });

    // Story Badges
    const [badges, setBadges] = useState<BadgeOptions>(() => ({
        showScoreboard: Boolean(eventInfo.teams.length >= 2 || eventInfo.title),
        scoreboardTitle: eventInfo.title,
        teams: eventInfo.teams,
        score1: localScore?.team1Score ?? null,
        score2: localScore?.team2Score ?? null,
        matchDate: eventInfo.date,
        showAttribution: true,
        attributionLogoText: import.meta.env.VITE_NAV_LOGO_TEXT || 'PHOTOS BY',
        attributionLogoAccent: import.meta.env.VITE_NAV_LOGO_ACCENT || 'PERKINS',
        attributionDomain: '@photosbyperkins',
    }));

    const [isDownloaded, setIsDownloaded] = useState(false);

    const photoKey = originalSrc;
    const [prevPhotoKey, setPrevPhotoKey] = useState(photoKey);

    // Sync default badges when photo changes during render without cascading effects
    if (photoKey !== prevPhotoKey) {
        setPrevPhotoKey(photoKey);
        setBadges({
            showScoreboard: Boolean(eventInfo.teams.length >= 2 || eventInfo.title),
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
        setIsDownloaded(false);
    }

    const [isExporting, setIsExporting] = useState(false);
    const [statusToast, setStatusToast] = useState<string | null>(null);

    // Photo Filter State
    const [activeFilterId, setActiveFilterId] = useState<StoryPhotoFilterId>('none');

    // Decorative Frame States
    const [activeFrameId, setActiveFrameId] = useState<StoryFrameId>('none');
    const [isFrameDrawerOpen, setIsFrameDrawerOpen] = useState(false);
    const [frameColorChoice, setFrameColorChoice] = useState<StoryFrameColorChoice>('signature');
    const [frameCustomColor, setFrameCustomColor] = useState<string>('#ffffff');
    const customFrameColorInputRef = useRef<HTMLInputElement>(null);

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

    const resetToDefaults = useCallback(() => {
        setIsDownloaded(false);
        setCardTheme(activeSiteTheme || 'dark');
        setActiveFilterId('none');
        setActiveFrameId('none');
        setIsFrameDrawerOpen(false);
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
            style: 'glass',
            customColor: '#0a0a14',
            position: 'center',
            cardScale: 0.92,
            cardCornerRadius: 24,
        });
        setBadges({
            showScoreboard: Boolean(eventInfo.teams.length >= 2 || eventInfo.title),
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
        setIsExporting(false);
        setStatusToast(null);
    }, [
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
        resetToDefaults();
        onClose();
    }, [resetToDefaults, onClose]);

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
            filterId: activeFilterId,
        };

        renderStoryToCanvas(loadedImage, config, previewCanvasRef.current).catch((err: unknown) => {
            console.error('Preview render error:', err);
        });
    }, [loadedImage, activeMode, activeCrop, paddedConfig, badges, cardTheme, activeFilterId]);

    // Export configuration
    const currentConfig: StoryRenderConfig = useMemo(
        () => ({
            mode: activeMode,
            crop: activeCrop,
            padded: paddedConfig,
            badges,
            resolution: '1080x1920',
            cardTheme,
            frameId: activeFrameId,
            frameColorOverride: effectiveFrameColor,
            exif: photoObj.exif,
            filterId: activeFilterId,
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
        ]
    );

    // Toast helper
    const showToast = useCallback((msg: string) => {
        setStatusToast(msg);
        setTimeout(() => setStatusToast(null), 3000);
    }, []);

    // 1. Direct Download Action
    const handleDownload = async () => {
        if (!loadedImage) return;
        setIsExporting(true);
        try {
            const blob = await renderStoryToBlob(loadedImage, currentConfig);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const cleanTitle = (eventInfo.title || 'story')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-');
            link.href = url;
            link.download = `story-${year}-${cleanTitle}-9x16.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setIsDownloaded(true);
        } catch (err) {
            console.error('Download error:', err);
            showToast('Failed to download image.');
        } finally {
            setIsExporting(false);
        }
    };

    // 2. Native Share Action
    const handleNativeShare = async () => {
        if (!loadedImage) return;
        setIsExporting(true);
        try {
            const blob = await renderStoryToBlob(loadedImage, currentConfig);
            const file = new File([blob], 'story.jpg', { type: 'image/jpeg' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Story from ${eventInfo.title || 'Photos by Perkins'}`,
                });
                setIsDownloaded(true);
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
    };

    const footer = (
        <button
            className={`story-export-modal__primary-action ${
                isDownloaded ? 'is-done story-export-modal__primary-action--done' : ''
            }`}
            onClick={canShare ? handleNativeShare : handleDownload}
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

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={handleClose}
            title="STORY MAKER"
            ariaLabel="Story Maker"
            maxWidth="wide"
            className="story-export-modal"
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
                    {/* Mode Toggle: Smart Crop vs Padded Glass & Story Card Theme Switcher */}
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__top-row">
                            <div className="portfolio__segmented-toggle story-export-modal__segmented-control">
                                <button
                                    className={`story-export-modal__seg-btn ${
                                        activeMode === 'crop' ? 'active story-export-modal__seg-btn--active' : ''
                                    }`}
                                    onClick={() => {
                                        setActiveMode('crop');
                                        setIsDownloaded(false);
                                    }}
                                >
                                    <span>9:16 Crop</span>
                                </button>
                                <button
                                    className={`story-export-modal__seg-btn ${
                                        activeMode === 'padded' ? 'active story-export-modal__seg-btn--active' : ''
                                    }`}
                                    onClick={() => {
                                        setActiveMode('padded');
                                        setSelectedPresetId('padded-glass');
                                        setIsDownloaded(false);
                                    }}
                                >
                                    <span>Padded</span>
                                </button>
                            </div>

                            <div
                                className="portfolio__segmented-toggle story-export-modal__theme-toggle"
                                role="group"
                                aria-label="Story card theme"
                            >
                                <button
                                    type="button"
                                    className={`story-export-modal__theme-btn ${
                                        cardTheme === 'dark' ? 'active story-export-modal__theme-btn--active' : ''
                                    }`}
                                    onClick={() => {
                                        setCardTheme('dark');
                                        setIsDownloaded(false);
                                    }}
                                    aria-label="Dark card theme"
                                    title="Dark card theme"
                                >
                                    <Moon size={16} />
                                </button>
                                <button
                                    type="button"
                                    className={`story-export-modal__theme-btn ${
                                        cardTheme === 'light' ? 'active story-export-modal__theme-btn--active' : ''
                                    }`}
                                    onClick={() => {
                                        setCardTheme('light');
                                        setIsDownloaded(false);
                                    }}
                                    aria-label="Light card theme"
                                    title="Light card theme"
                                >
                                    <Sun size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Prepared Crop Presets (N-Way Segmented Toggle) */}
                    {activeMode === 'crop' && (
                        <div className="story-export-modal__section">
                            <div className="portfolio__segmented-toggle story-export-modal__presets-grid">
                                {presets
                                    .filter((p) => p.mode === 'crop')
                                    .map((preset) => {
                                        const isSelected = selectedPresetId === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                className={`story-export-modal__preset-pill ${
                                                    isSelected ? 'active story-export-modal__preset-pill--active' : ''
                                                }`}
                                                onClick={() => handleSelectPreset(preset)}
                                                title={preset.description}
                                            >
                                                <span>{preset.label}</span>
                                            </button>
                                        );
                                    })}
                            </div>

                            {/* Zoom Slider for Custom Tuning */}
                            <div className="story-export-modal__zoom-control">
                                <div className="story-export-modal__zoom-header">
                                    <span className="story-export-modal__sublabel">Zoom</span>
                                    <span className="story-export-modal__zoom-value">
                                        {activeCrop.zoom.toFixed(1)}x
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1.0"
                                    max="3.0"
                                    step="0.05"
                                    value={activeCrop.zoom}
                                    onChange={(e) => {
                                        const newZoom = parseFloat(e.target.value);
                                        const updated = calculateNormalizedCrop(
                                            naturalDimensions.width,
                                            naturalDimensions.height,
                                            activeCrop.centerX,
                                            activeCrop.centerY,
                                            newZoom
                                        );
                                        handleCropChange(updated);
                                    }}
                                    className="story-export-modal__slider"
                                    aria-label="Crop Zoom Level"
                                />
                            </div>
                        </div>
                    )}

                    {/* Padded Mode Settings */}
                    {activeMode === 'padded' && (
                        <div className="story-export-modal__section">
                            <div className="story-export-modal__padded-settings">
                                <div className="story-export-modal__toggle-row">
                                    <span>Background</span>
                                    <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                                        <button
                                            type="button"
                                            className={`story-export-modal__pill ${
                                                paddedConfig.style === 'glass'
                                                    ? 'active story-export-modal__pill--active'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                setPaddedConfig((prev) => ({ ...prev, style: 'glass' }));
                                                setIsDownloaded(false);
                                            }}
                                        >
                                            Frosted
                                        </button>
                                        <button
                                            type="button"
                                            className={`story-export-modal__pill ${
                                                paddedConfig.style === 'custom'
                                                    ? 'active story-export-modal__pill--active'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                setPaddedConfig((prev) => ({ ...prev, style: 'custom' }));
                                                setIsDownloaded(false);
                                            }}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                {paddedConfig.style === 'custom' && (
                                    <div className="story-export-modal__custom-color-row">
                                        <div className="story-export-modal__quick-swatches">
                                            {['#000000', '#0a0a14', '#1e293b', '#2c1810', '#ffffff'].map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`story-export-modal__quick-swatch ${
                                                        (paddedConfig.customColor || '#0a0a14').toLowerCase() === color
                                                            ? 'is-active'
                                                            : ''
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => {
                                                        setPaddedConfig((prev) => ({
                                                            ...prev,
                                                            style: 'custom',
                                                            customColor: color,
                                                        }));
                                                        setIsDownloaded(false);
                                                    }}
                                                    title={color}
                                                    aria-label={`Select background color ${color}`}
                                                />
                                            ))}
                                        </div>
                                        <label
                                            className="story-export-modal__color-picker"
                                            title="Choose custom background color"
                                        >
                                            <span
                                                className="story-export-modal__color-swatch"
                                                style={{
                                                    backgroundColor: paddedConfig.customColor || '#0a0a14',
                                                }}
                                            />
                                            <input
                                                type="color"
                                                value={paddedConfig.customColor || '#0a0a14'}
                                                onChange={(e) => {
                                                    setPaddedConfig((prev) => ({
                                                        ...prev,
                                                        style: 'custom',
                                                        customColor: e.target.value,
                                                    }));
                                                    setIsDownloaded(false);
                                                }}
                                                className="story-export-modal__color-input"
                                                aria-label="Custom background color"
                                            />
                                        </label>
                                        <span className="story-export-modal__hex-code">
                                            {(paddedConfig.customColor || '#0a0a14').toUpperCase()}
                                        </span>
                                    </div>
                                )}

                                <div className="story-export-modal__toggle-row">
                                    <span>Position</span>
                                    <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                                        <button
                                            type="button"
                                            className={`story-export-modal__pill ${
                                                paddedConfig.position === 'center'
                                                    ? 'active story-export-modal__pill--active'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                setPaddedConfig((prev) => ({ ...prev, position: 'center' }));
                                                setIsDownloaded(false);
                                            }}
                                        >
                                            Centered
                                        </button>
                                        <button
                                            type="button"
                                            className={`story-export-modal__pill ${
                                                paddedConfig.position === 'elevated'
                                                    ? 'active story-export-modal__pill--active'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                setPaddedConfig((prev) => ({ ...prev, position: 'elevated' }));
                                                setIsDownloaded(false);
                                            }}
                                        >
                                            Elevated
                                        </button>
                                    </div>
                                </div>

                                <div className="story-export-modal__zoom-header">
                                    <span className="story-export-modal__sublabel">Photo Scale</span>
                                    <span className="story-export-modal__zoom-value">
                                        {Math.round(paddedConfig.cardScale * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.80"
                                    max="1"
                                    step="0.02"
                                    value={paddedConfig.cardScale}
                                    onChange={(e) => {
                                        const scale = parseFloat(e.target.value);
                                        setPaddedConfig((prev) => ({ ...prev, cardScale: scale }));
                                        setIsDownloaded(false);
                                    }}
                                    className="story-export-modal__slider"
                                    aria-label="Photo Card Scale"
                                />
                            </div>
                        </div>
                    )}

                    {/* Photo Filters Selector */}
                    <div className="story-export-modal__section story-export-modal__section--filters">
                        <div className="story-export-modal__filters-header">
                            <span className="story-export-modal__section-heading">FILTER</span>
                            <span className="story-export-modal__filter-current-badge">
                                {STORY_PHOTO_FILTERS_MAP[activeFilterId]?.label || 'None'}
                            </span>
                        </div>
                        <div className="story-export-modal__filters-grid">
                            {STORY_PHOTO_FILTERS.map((filter) => {
                                const isSelected = activeFilterId === filter.id;
                                return (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        className={`story-export-modal__filter-pill ${
                                            isSelected ? 'active story-export-modal__filter-pill--active' : ''
                                        }`}
                                        onClick={() => {
                                            setActiveFilterId(filter.id);
                                            setIsDownloaded(false);
                                        }}
                                        title={filter.description}
                                        aria-label={`Photo filter: ${filter.label}`}
                                    >
                                        <span>{filter.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Decorative Frames Drawer (Canva / CapCut style expanding accordion) */}
                    <div className="story-export-modal__section story-export-modal__section--frames">
                        <div
                            className={`story-export-modal__accordion-header ${
                                isFrameDrawerOpen ? 'story-export-modal__accordion-header--open' : ''
                            }`}
                            onClick={() => setIsFrameDrawerOpen((prev) => !prev)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isFrameDrawerOpen}
                            aria-label="Toggle frame selector drawer"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setIsFrameDrawerOpen((prev) => !prev);
                                }
                            }}
                        >
                            <div className="story-export-modal__accordion-title">
                                <span className="story-export-modal__section-heading">FRAME</span>
                                <span className="story-export-modal__frame-current-badge">
                                    {STORY_FRAMES_MAP[activeFrameId]?.label || 'None'}
                                </span>
                            </div>
                            <div className="story-export-modal__accordion-toggle-btn">
                                {isFrameDrawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                        </div>

                        {isFrameDrawerOpen && (
                            <div className="story-export-modal__frames-grid">
                                {availableFrames.map((frame) => {
                                    const isSelected = activeFrameId === frame.id;
                                    return (
                                        <button
                                            key={frame.id}
                                            type="button"
                                            className={`story-export-modal__frame-card ${
                                                isSelected ? 'story-export-modal__frame-card--active' : ''
                                            }`}
                                            onClick={() => {
                                                setActiveFrameId(frame.id);
                                                setIsDownloaded(false);
                                            }}
                                            title={frame.vibe}
                                        >
                                            <div className="story-export-modal__frame-thumb">
                                                {frame.id === 'none' ? (
                                                    <div className="story-export-modal__frame-none-icon">⊘</div>
                                                ) : (
                                                    <svg
                                                        viewBox="0 0 1080 1920"
                                                        className="story-export-modal__frame-thumb-svg"
                                                        preserveAspectRatio="none"
                                                    >
                                                        {frame.renderSvg(effectiveFrameColor, frameContext)}
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="story-export-modal__frame-name">{frame.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Minimal Color / Tint Override Bar (Shown when a frame is active) */}
                        {activeFrameId !== 'none' && (
                            <div className="story-export-modal__frame-tint-row">
                                <div className="story-export-modal__tint-header">
                                    <span className="story-export-modal__sublabel">Frame Tint</span>
                                </div>
                                <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                                    {(
                                        [
                                            { id: 'signature', label: 'Default' },
                                            { id: 'white', label: 'White' },
                                            { id: 'gold', label: 'Gold' },
                                            { id: 'red', label: 'Red' },
                                            { id: 'custom', label: 'Custom' },
                                        ] as const
                                    ).map((choice) => {
                                        const isCustom = choice.id === 'custom';
                                        const isSelected = frameColorChoice === choice.id;
                                        return (
                                            <button
                                                key={choice.id}
                                                type="button"
                                                className={`story-export-modal__pill ${
                                                    isCustom ? 'story-export-modal__pill--custom' : ''
                                                } ${
                                                    isSelected ? 'active story-export-modal__pill--active' : ''
                                                }`}
                                                style={
                                                    isCustom
                                                        ? {
                                                              backgroundColor: frameCustomColor,
                                                              color: getContrastTextColor(frameCustomColor),
                                                          }
                                                        : undefined
                                                }
                                                onClick={() => {
                                                    setFrameColorChoice(choice.id);
                                                    setIsDownloaded(false);
                                                    if (isCustom) {
                                                        const inputEl = customFrameColorInputRef.current;
                                                        if (inputEl) {
                                                            try {
                                                                if (typeof inputEl.showPicker === 'function') {
                                                                    inputEl.showPicker();
                                                                } else {
                                                                    inputEl.click();
                                                                }
                                                            } catch {
                                                                inputEl.click();
                                                            }
                                                        }
                                                    }
                                                }}
                                            >
                                                {choice.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <input
                                    ref={customFrameColorInputRef}
                                    type="color"
                                    value={frameCustomColor}
                                    onChange={(e) => {
                                        setFrameCustomColor(e.target.value);
                                        setIsDownloaded(false);
                                    }}
                                    tabIndex={-1}
                                    aria-label="Custom frame tint color"
                                    style={{
                                        position: 'absolute',
                                        opacity: 0,
                                        pointerEvents: 'none',
                                        width: 0,
                                        height: 0,
                                        padding: 0,
                                        margin: 0,
                                        border: 0,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Story Badges & Overlays */}
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__badges-list">
                            <label className="story-export-modal__checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={badges.showAttribution}
                                    onChange={(e) => {
                                        setBadges((prev) => ({
                                            ...prev,
                                            showAttribution: e.target.checked,
                                        }));
                                        setIsDownloaded(false);
                                    }}
                                />
                                <div className="story-export-modal__checkbox-text">
                                    <span className="story-export-modal__checkbox-title">Photographer Attribution</span>
                                </div>
                            </label>

                            {eventInfo.title && (
                                <label className="story-export-modal__checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={badges.showScoreboard}
                                        onChange={(e) => {
                                            setBadges((prev) => ({
                                                ...prev,
                                                showScoreboard: e.target.checked,
                                            }));
                                            setIsDownloaded(false);
                                        }}
                                    />
                                    <div className="story-export-modal__checkbox-text">
                                        <span className="story-export-modal__checkbox-title">
                                            Match & Scoreboard Badge
                                        </span>
                                    </div>
                                </label>
                            )}
                        </div>
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
