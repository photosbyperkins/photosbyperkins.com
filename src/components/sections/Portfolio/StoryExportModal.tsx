import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCanShare } from '../../../hooks/useCanShare';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useStoryImageLoader } from '../../../hooks/useStoryImageLoader';
import { useStoryLayoutMode } from '../../../hooks/useStoryLayoutMode';
import { useStoryStudio, type StoryStudioTab } from '../../../hooks/useStoryStudio';
import { parseEventTitle, getPhotoDisplayUrl } from '../../../utils/formatters';
import type { BadgeOptions, StoryPhotoFilterId } from '../../../utils/storyCanvas';
import type { StoryFrameId } from './storyFrames/types';
import type { EventScore, PhotoInput } from '../../../types';
import { LAYOUT_HOLD_S, previewLayoutKey } from '../../../utils/story/storyTransitions';
import ModalShell from '../../ui/ModalShell';
import { StoryCropper } from './StoryCropper';
import { StoryBurstCropper } from './StoryBurstCropper';
import { StoryStudioPanel } from './storyStudio/StoryStudioPanel';
import { StoryExportButton } from './storyStudio/StoryExportButton';
import type { StudioTabDef } from './storyStudio/StoryTabBar';
import {
    RotateCcw,
    StoryLayoutTabIcon,
    StoryFiltersTabIcon,
    StoryFramesTabIcon,
    StoryBadgesTabIcon,
} from '../../ui/icons';
import { StoryLayoutTab } from './storyTabs/StoryLayoutTab';
import { StoryFiltersTab } from './storyTabs/StoryFiltersTab';
import { StoryFramesTab } from './storyTabs/StoryFramesTab';
import { StoryBadgesTab } from './storyTabs/StoryBadgesTab';
import { StorySvgFilters } from './StorySvgFilters';
import '../../../styles/_story-export.scss';

const STUDIO_TABS: StudioTabDef[] = [
    { id: 'layout', label: 'Layout', icon: StoryLayoutTabIcon },
    { id: 'filters', label: 'Filters', icon: StoryFiltersTabIcon },
    { id: 'frames', label: 'Frames', icon: StoryFramesTabIcon },
    { id: 'badges', label: 'Badges', icon: StoryBadgesTabIcon },
];

/** Focus inside these handles â†/â†’ itself, so the modal-wide tab shortcut stays out of the way. */
const ARROW_KEY_OWNERS = '[role="tablist"], .story-thumbs, [data-story-popover]';

interface StoryExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: PhotoInput;
    eventName?: string;
    year?: string;
    index?: number;
    localScore?: EventScore;
}

export const StoryExportModal: React.FC<StoryExportModalProps> = ({
    isOpen,
    onClose,
    photo,
    eventName = '',
    year = '',
    localScore,
}) => {
    const canShare = useCanShare();
    const prefersReducedMotion = useReducedMotion();
    const layoutMode = useStoryLayoutMode();
    const isSheetMode = layoutMode === 'sheet';
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const photoRecord = useMemo(() => (typeof photo === 'string' ? { original: photo, thumb: photo } : photo), [photo]);

    const {
        photoObj,
        originalSrc,
        displaySrc: _displaySrc,
        thumbSrc: _thumbSrc,
        withBuild,
        loadedImage,
        loadedBurstImages,
        burstLoading,
        imageError,
        isTainted,
        naturalDimensions,
        setNaturalDimensions,
    } = useStoryImageLoader({ photo, isOpen, burstSources: photoRecord.burst?.frameSources });

    // Parse match title and teams for scoreboard badge
    const eventInfo = useMemo(() => {
        const { mainTitle, datePrefix, teams } = parseEventTitle(eventName, undefined, year);
        return {
            title: mainTitle,
            date: datePrefix || '',
            teams,
        };
    }, [eventName, year]);

    const {
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
        burst,
        burstPanelCount,
        setBurstPanelCount,
        burstShowTimeStamps,
        setBurstShowTimeStamps,
        burstSelectedIndices,
        setBurstSelectedIndices,
        burstActiveStep,
        setBurstActiveStep,
        burstPanOffsets,
        handleBurstPanChange,
        activeBurstTimeStamps,
        activePanelImages,
        effectiveBadges,
        effectiveEventInfo,
        isEventBadgeSuppressed,
        setBadges,
        cardTheme,
        setCardTheme,
        activeStudioTab,
        setActiveStudioTab,
        activeFilterId,
        setActiveFilterId,
        filterStrength,
        setFilterStrength,
        recentFilterIds,
        activeFrameId,
        setActiveFrameId,
        frameColorChoice,
        setFrameColorChoice,
        frameCustomColor,
        setFrameCustomColor,
        effectiveFrameColor,
        availableFrames,
        recentFrameIds,
        frameContext,
        isExporting,
        isDownloaded,
        setIsDownloaded,
        statusToast,
        isDefaultConfig,
        resetToDefaults,
        handleClose,
        handleExportAction,
        activePhotoIndex,
        handleSelectPhotoIndex,
        isFrameAnimated,
        setIsFrameAnimated,
        videoSupport,
        exportProgress,
        cancelExport,
        hasPendingVideo,
    } = useStoryStudio({
        photoObj,
        naturalDimensions,
        setNaturalDimensions,
        eventInfo,
        eventName,
        originalSrc,
        localScore,
        loadedImage,
        loadedBurstImages,
        burstLoading,
        year,
        canShare,
        isTainted,
        onClose,
    });

    const videoSupported = videoSupport === null ? null : Boolean(videoSupport);
    const studioTabs = STUDIO_TABS;

    // Desktop hover / keyboard-focus previews from the Frames / Filters browsers. They only change what
    // the preview shows (never the export, recents or the downloaded state), and only while their tab is open.
    const [hoverFrameId, setHoverFrameId] = useState<StoryFrameId | null>(null);
    const [hoverFilterId, setHoverFilterId] = useState<StoryPhotoFilterId | null>(null);
    const previewFrameId = activeStudioTab === 'frames' ? hoverFrameId : null;
    const previewFilterId = activeStudioTab === 'filters' ? hoverFilterId : null;
    const shownFrameId = previewFrameId ?? activeFrameId;
    const shownFilterId = previewFilterId ?? activeFilterId;
    // A previewed frame is shown still; the selected one keeps animating (its assets stay loaded).
    const shownFrameAnimated = isFrameAnimated && shownFrameId === activeFrameId;

    const handleSelectEmptyBurstPanel = useCallback(
        (panelIdx: number) => {
            setActiveStudioTab('layout');
            setBurstActiveStep(panelIdx);
            if (isSheetMode) {
                setIsSheetOpen(true);
            }
        },
        [setActiveStudioTab, setBurstActiveStep, isSheetMode]
    );

    const activePhotoSrc = photoObj.burst?.frameSources?.[activePhotoIndex] || originalSrc;
    const activePhotoThumb = photoObj.burst?.frameThumbs?.[activePhotoIndex] || activePhotoSrc;
    const activePhotoDisplay = getPhotoDisplayUrl(activePhotoSrc);
    const activeLoadedImage = (loadedBurstImages && loadedBurstImages[activePhotoIndex]) || loadedImage;
    // Frames / Filters thumbs crop around the photo's subject, like the preview does
    const thumbFocusX = photoObj.burst?.frameFocusX?.[activePhotoIndex] ?? photoObj.focusX ?? 0.5;
    const thumbFocusY = photoObj.burst?.frameFocusY?.[activePhotoIndex] ?? photoObj.focusY ?? 0.5;
    const thumbFocusPosition = `${(thumbFocusX * 100).toFixed(1)}% ${(thumbFocusY * 100).toFixed(1)}%`;

    const [prevActivePhotoIndex, setPrevActivePhotoIndex] = useState(activePhotoIndex);
    if (activePhotoIndex !== prevActivePhotoIndex) {
        setPrevActivePhotoIndex(activePhotoIndex);
        const activeImg = loadedBurstImages[activePhotoIndex];
        if (activeImg && activeImg.naturalWidth && activeImg.naturalHeight) {
            setNaturalDimensions({
                width: activeImg.naturalWidth,
                height: activeImg.naturalHeight,
            });
        }
    }

    useEffect(() => {
        const activeImg = loadedBurstImages[activePhotoIndex];
        if (activeImg && activeImg.naturalWidth && activeImg.naturalHeight) {
            setNaturalDimensions((prev) =>
                prev.width === activeImg.naturalWidth && prev.height === activeImg.naturalHeight
                    ? prev
                    : { width: activeImg.naturalWidth, height: activeImg.naturalHeight }
            );
        }
    }, [activePhotoIndex, loadedBurstImages, setNaturalDimensions]);

    // Keyboard shortcut navigation (Left Arrow / Right Arrow) to switch tabs
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Already handled (tab bar / chip row roving focus)
            if (e.defaultPrevented) return;
            const active = document.activeElement;
            // Ignore keystrokes if focused inside an input, textarea, or select
            if (
                active instanceof HTMLInputElement ||
                active instanceof HTMLTextAreaElement ||
                active instanceof HTMLSelectElement
            ) {
                return;
            }
            // ...or inside controls that use arrow keys themselves (chips, filmstrip, popovers)
            if (active instanceof Element && active.closest(ARROW_KEY_OWNERS)) return;

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const tabIds: StoryStudioTab[] = studioTabs.map((t) => t.id);
                const currentIndex = tabIds.indexOf(activeStudioTab);
                if (currentIndex === -1) return;
                const offset = e.key === 'ArrowLeft' ? -1 : 1;
                const nextIndex = (currentIndex + offset + tabIds.length) % tabIds.length;
                setActiveStudioTab(tabIds[nextIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeStudioTab, setActiveStudioTab, studioTabs]);

    const targetBurstCount = burstPanelCount ?? (photoObj.burst?.total === 2 ? 2 : 3);
    // Which preview layout is showing; a change triggers the SOLO / DUET / TRIPTYCH slide transition.
    const layoutKey = previewLayoutKey(activeMode === 'burst' && burst ? 'burst' : 'solo', targetBurstCount);
    const animateLayouts = !prefersReducedMotion;
    const validBurstCount = burstSelectedIndices
        .slice(0, targetBurstCount)
        .filter((idx) => idx !== null && idx !== undefined && idx >= 0).length;

    const burstFrameUrls = useMemo(() => {
        if (!photoObj.burst?.frameSources) {
            return activePanelImages.map((img) => img?.src ?? null);
        }
        const sources = photoObj.burst.frameSources;
        return burstSelectedIndices.slice(0, targetBurstCount).map((idx, i) => {
            return idx !== undefined && idx !== null
                ? withBuild(sources[idx]) || activePanelImages[i]?.src || null
                : null;
        });
    }, [photoObj.burst, burstSelectedIndices, withBuild, activePanelImages, targetBurstCount]);

    const burstFallbackUrls = useMemo(() => {
        if (!photoObj.burst?.frameSources) {
            return Array(targetBurstCount).fill(undefined);
        }
        const sources = photoObj.burst.frameSources;
        return burstSelectedIndices.slice(0, targetBurstCount).map((idx) => {
            return idx !== undefined && idx !== null ? sources[idx] : undefined;
        });
    }, [photoObj.burst, burstSelectedIndices, targetBurstCount]);

    const isExportBlocked =
        isTainted ||
        (activeMode === 'burst'
            ? burstLoading || (loadedBurstImages?.length ?? 0) < targetBurstCount || validBurstCount < targetBurstCount
            : !activeLoadedImage);
    const isRenderingVideo = exportProgress !== null;
    const exportActionLabel = canShare ? 'Share Story Card' : 'Download Story Card';
    const exportDoneLabel = canShare ? 'Story Card Shared' : 'Story Card Downloaded';
    const primaryActionLabel = isDownloaded
        ? exportDoneLabel
        : isTainted
          ? 'Export unavailable: Image lacks cross-origin permissions.'
          : activeMode === 'burst' && validBurstCount < targetBurstCount
            ? `Pick ${targetBurstCount - validBurstCount} more ${
                  burst?.isTriptych ? 'photo' : 'frame'
              }${targetBurstCount - validBurstCount === 1 ? '' : 's'} to download`
            : isRenderingVideo
              ? `Rendering video, ${exportProgress}%`
              : hasPendingVideo && canShare
                ? 'Story Card ready: share'
                : exportActionLabel;

    const exportButton = (
        <StoryExportButton
            canShare={canShare}
            isDownloaded={isDownloaded}
            isExporting={isExporting}
            isBlocked={isExportBlocked}
            progress={exportProgress}
            accessibleLabel={primaryActionLabel}
            statusToast={statusToast}
            onExport={handleExportAction}
            onCancel={cancelExport}
        />
    );

    const headerActions = !isDefaultConfig ? (
        <button
            type="button"
            className="modal-shell__action-btn"
            onClick={resetToDefaults}
            title="Reset story format to defaults"
            aria-label="Reset story format to defaults"
        >
            <RotateCcw size={18} />
        </button>
    ) : undefined;

    const handleBadgesChange = useCallback(
        (updatedBadges: BadgeOptions) => {
            setBadges(updatedBadges);
            setIsDownloaded(false);
        },
        [setBadges, setIsDownloaded]
    );

    const previewContent = (
        <>
            {/* Layout layers: on a SOLO / DUET / TRIPTYCH switch the outgoing layout is held in place
                while the incoming one slides over it (or, going back to SOLO, the burst panels slide
                off to reveal the single photo underneath). */}
            <AnimatePresence initial={false} mode="popLayout" custom={layoutKey}>
                <motion.div
                    key={layoutKey}
                    className="story-preview-layer"
                    style={{ zIndex: layoutKey === 'solo' ? 1 : 3 }}
                    exit={
                        animateLayouts
                            ? {
                                  zIndex: 2,
                                  opacity: 0.999,
                                  transition: { zIndex: { duration: 0 }, opacity: { duration: LAYOUT_HOLD_S } },
                              }
                            : undefined
                    }
                >
                    {/* Interactive Cropper when in custom crop mode */}
                    {activeMode === 'burst' && burst ? (
                        <StoryBurstCropper
                            images={burstFrameUrls}
                            fallbackSrcs={burstFallbackUrls}
                            timeStamps={activeBurstTimeStamps}
                            showTimeStamps={burst?.isTriptych || !burst?.frameDeltas ? false : burstShowTimeStamps}
                            panOffsets={burstPanOffsets}
                            onPanChange={handleBurstPanChange}
                            badges={effectiveBadges}
                            theme={cardTheme}
                            frameId={shownFrameId}
                            frameColorOverride={effectiveFrameColor}
                            frameContext={frameContext}
                            isFrameAnimated={shownFrameAnimated}
                            exif={photoObj.exif}
                            filterId={shownFilterId}
                            filterStrength={filterStrength}
                            panelCount={targetBurstCount}
                            activeStep={burstActiveStep}
                            onSelectPanel={setBurstActiveStep}
                            onSelectEmptyPanel={handleSelectEmptyBurstPanel}
                            onBadgesChange={handleBadgesChange}
                            animatePanels={animateLayouts}
                        />
                    ) : (
                        <StoryCropper
                            imageSrc={withBuild(activePhotoDisplay)}
                            fallbackSrc={withBuild(activePhotoSrc) || withBuild(activePhotoThumb)}
                            naturalWidth={naturalDimensions.width}
                            naturalHeight={naturalDimensions.height}
                            crop={activeCrop}
                            paddedConfig={paddedConfig}
                            badges={effectiveBadges}
                            theme={cardTheme}
                            frameId={shownFrameId}
                            frameColorOverride={effectiveFrameColor}
                            isFrameAnimated={shownFrameAnimated}
                            exif={
                                photoObj.burst?.frameSources?.[activePhotoIndex] === photoObj.original
                                    ? photoObj.exif
                                    : undefined
                            }
                            filterId={shownFilterId}
                            filterStrength={filterStrength}
                            onChange={handleCropChange}
                            onImageLoaded={(w, h) =>
                                setNaturalDimensions((prev) =>
                                    prev.width === w && prev.height === h ? prev : { width: w, height: h }
                                )
                            }
                            onBadgesChange={handleBadgesChange}
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Image load error fallback */}
            {imageError && (
                <div className="story-export-modal__error-overlay">
                    <span>Failed to load high-resolution image preview.</span>
                </div>
            )}
        </>
    );

    const activeTabPanelContent = (
        <>
            {/* Layout & Composition Tab Content */}
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
                    burst={burst}
                    burstShowTimeStamps={burstShowTimeStamps}
                    setBurstShowTimeStamps={setBurstShowTimeStamps}
                    burstSelectedIndices={burstSelectedIndices}
                    setBurstSelectedIndices={setBurstSelectedIndices}
                    activePhotoIndex={activePhotoIndex}
                    onSelectPhotoIndex={handleSelectPhotoIndex}
                    defaultFocusX={photoObj.focusX}
                    defaultFocusY={photoObj.focusY}
                    burstPanelCount={burstPanelCount}
                    setBurstPanelCount={setBurstPanelCount}
                    panelCount={targetBurstCount}
                    burstActiveStep={burstActiveStep}
                    setBurstActiveStep={setBurstActiveStep}
                    burstPanOffsets={burstPanOffsets}
                    onBurstPanChange={handleBurstPanChange}
                />
            )}

            {/* Filters & Atmosphere Tab Content */}
            {activeStudioTab === 'filters' && (
                <StoryFiltersTab
                    activeFilterId={activeFilterId}
                    setActiveFilterId={setActiveFilterId}
                    filterStrength={filterStrength}
                    setFilterStrength={setFilterStrength}
                    previewImageUrl={withBuild(activePhotoThumb || activePhotoDisplay)}
                    setIsDownloaded={setIsDownloaded}
                    recentFilterIds={recentFilterIds}
                    onPreviewFilter={setHoverFilterId}
                />
            )}

            {/* Decorative Frames Tab Content */}
            {activeStudioTab === 'frames' && (
                <StoryFramesTab
                    activeFrameId={activeFrameId}
                    setActiveFrameId={setActiveFrameId}
                    frames={availableFrames}
                    recentFrameIds={recentFrameIds}
                    frameColorChoice={frameColorChoice}
                    setFrameColorChoice={setFrameColorChoice}
                    frameCustomColor={frameCustomColor}
                    setFrameCustomColor={setFrameCustomColor}
                    effectiveFrameColor={effectiveFrameColor}
                    frameContext={frameContext}
                    setIsDownloaded={setIsDownloaded}
                    isFrameAnimated={isFrameAnimated}
                    setIsFrameAnimated={setIsFrameAnimated}
                    videoSupported={videoSupported}
                    previewImageUrl={withBuild(activePhotoThumb || activePhotoDisplay)}
                    onPreviewFrame={setHoverFrameId}
                />
            )}

            {/* Story Badges & Watermark Tab Content */}
            {activeStudioTab === 'badges' && (
                <StoryBadgesTab
                    badges={effectiveBadges}
                    setBadges={setBadges}
                    cardTheme={cardTheme}
                    setCardTheme={setCardTheme}
                    eventInfo={effectiveEventInfo}
                    isEventAmbiguous={isEventBadgeSuppressed}
                    setIsDownloaded={setIsDownloaded}
                />
            )}
        </>
    );

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={handleClose}
            title="STORY MAKER"
            ariaLabel="Story Maker"
            maxWidth="wide"
            className={`story-export-modal story-export-modal--${layoutMode}`}
            headerActions={headerActions}
        >
            <StorySvgFilters filterStrength={filterStrength} />
            <div
                className={`story-studio story-studio--${layoutMode} ${
                    layoutMode === 'sheet' && isSheetOpen ? 'story-studio--sheet-open' : ''
                }`}
                style={{ '--story-thumb-focus': thumbFocusPosition } as React.CSSProperties}
            >
                <div className="story-studio__layout">
                    {/* Visual 9:16 canvas preview, sized to the space the mode leaves for it */}
                    <div className="story-studio__stage">
                        <div className="story-studio__preview">{previewContent}</div>
                    </div>

                    {/* Tab bar â†’ tab content â†’ Download / Share (inline, or a bottom sheet in sheet mode) */}
                    <StoryStudioPanel
                        mode={layoutMode}
                        tabs={studioTabs}
                        activeTab={activeStudioTab}
                        onSelectTab={setActiveStudioTab}
                        isSheetOpen={isSheetOpen}
                        onSheetOpenChange={setIsSheetOpen}
                        footer={exportButton}
                    >
                        {activeTabPanelContent}
                    </StoryStudioPanel>
                </div>
            </div>
        </ModalShell>
    );
};

export default StoryExportModal;
