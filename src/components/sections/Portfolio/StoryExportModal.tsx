import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useCanShare } from '../../../hooks/useCanShare';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useStoryImageLoader } from '../../../hooks/useStoryImageLoader';
import { useStoryStudio, type StoryStudioTab } from '../../../hooks/useStoryStudio';
import { parseEventTitle, getPhotoDisplayUrl } from '../../../utils/formatters';
import type { BadgeOptions } from '../../../utils/storyCanvas';
import type { EventScore, PhotoInput } from '../../../types';
import ModalShell from '../../ui/ModalShell';
import { StoryCropper } from './StoryCropper';
import { StoryBurstCropper } from './StoryBurstCropper';
import { StoryMobileDock } from './storyMobile/StoryMobileDock';
import { StoryMobilePopover } from './storyMobile/StoryMobilePopover';
import {
    Check,
    Download,
    RotateCcw,
    Share2,
    StoryLayoutTabIcon,
    StoryFiltersTabIcon,
    StoryFramesTabIcon,
    StoryBadgesTabIcon,
    type IconProps,
} from '../../ui/icons';
import { StoryLayoutTab } from './storyTabs/StoryLayoutTab';
import { StoryFiltersTab } from './storyTabs/StoryFiltersTab';
import { StoryFramesTab } from './storyTabs/StoryFramesTab';
import { StoryBadgesTab } from './storyTabs/StoryBadgesTab';
import { StorySvgFilters } from './StorySvgFilters';
import '../../../styles/_story-export.scss';

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
    const isMobileWidth = useMediaQuery('(max-width: 860px)');
    const isShortHeight = useMediaQuery('(max-height: 550px)');
    const isLandscape = useMediaQuery('(orientation: landscape)');

    const isLandscapeMobile = isLandscape && (isShortHeight || isMobileWidth);
    const isPortraitMobile = isMobileWidth && !isLandscapeMobile;
    const isMobile = isPortraitMobile || isLandscapeMobile;
    const [isMobilePopoverOpen, setIsMobilePopoverOpen] = useState(false);

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

    const handleSelectEmptyBurstPanel = useCallback(
        (panelIdx: number) => {
            setActiveStudioTab('layout');
            setBurstActiveStep(panelIdx);
            if (isPortraitMobile) {
                setIsMobilePopoverOpen(true);
            }
        },
        [setActiveStudioTab, setBurstActiveStep, isPortraitMobile]
    );

    const activePhotoSrc = photoObj.burst?.frameSources?.[activePhotoIndex] || originalSrc;
    const activePhotoThumb = photoObj.burst?.frameThumbs?.[activePhotoIndex] || activePhotoSrc;
    const activePhotoDisplay = getPhotoDisplayUrl(activePhotoSrc);
    const activeLoadedImage = (loadedBurstImages && loadedBurstImages[activePhotoIndex]) || loadedImage;

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
            // Ignore keystrokes if focused inside an input, textarea, or select
            if (
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement ||
                document.activeElement instanceof HTMLSelectElement
            ) {
                return;
            }

            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const tabIds: StoryStudioTab[] = ['layout', 'filters', 'frames', 'badges'];
                const currentIndex = tabIds.indexOf(activeStudioTab);
                if (currentIndex === -1) return;
                const offset = e.key === 'ArrowLeft' ? -1 : 1;
                const nextIndex = (currentIndex + offset + tabIds.length) % tabIds.length;
                setActiveStudioTab(tabIds[nextIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeStudioTab, setActiveStudioTab]);

    // Close mobile popover when pressing Escape
    useEffect(() => {
        if (!isOpen || !isMobile || !isMobilePopoverOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.stopImmediatePropagation();
                setIsMobilePopoverOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, isMobile, isMobilePopoverOpen]);

    const handleDockTabClick = (tabId: StoryStudioTab) => {
        if (isMobilePopoverOpen && activeStudioTab === tabId) {
            setIsMobilePopoverOpen(false);
        } else {
            setActiveStudioTab(tabId);
            setIsMobilePopoverOpen(true);
        }
    };

    const targetBurstCount = burstPanelCount ?? (photoObj.burst?.total === 2 ? 2 : 3);
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

    const footer = (
        <div className="story-export-modal__footer-container">
            {statusToast && (
                <div
                    className={`story-export-modal__toast ${
                        statusToast.toLowerCase().includes('fail') ||
                        statusToast.toLowerCase().includes('unavailable') ||
                        statusToast.toLowerCase().includes('lacks') ||
                        statusToast.toLowerCase().includes('error')
                            ? 'story-export-modal__toast--error'
                            : ''
                    }`}
                    role="status"
                    aria-live="polite"
                >
                    {statusToast}
                </div>
            )}
            <button
                className={`story-export-modal__primary-action ${
                    isDownloaded ? 'is-done story-export-modal__primary-action--done' : ''
                }`}
                onClick={handleExportAction}
                disabled={
                    isExporting ||
                    isTainted ||
                    (activeMode === 'burst'
                        ? burstLoading ||
                          (loadedBurstImages?.length ?? 0) < targetBurstCount ||
                          validBurstCount < targetBurstCount
                        : !activeLoadedImage) ||
                    isDownloaded
                }
                title={
                    isDownloaded
                        ? canShare
                            ? 'Story Card Shared'
                            : 'Story Card Downloaded'
                        : isTainted
                          ? 'Export unavailable: Image lacks cross-origin permissions.'
                          : activeMode === 'burst' && validBurstCount < targetBurstCount
                            ? `Pick ${targetBurstCount - validBurstCount} more ${
                                  burst?.isTriptych ? 'photo' : 'frame'
                              }${targetBurstCount - validBurstCount === 1 ? '' : 's'} to download`
                            : canShare
                              ? 'Share Story Card'
                              : 'Download Story Card'
                }
                aria-label={
                    isDownloaded
                        ? canShare
                            ? 'Story Card Shared'
                            : 'Story Card Downloaded'
                        : isTainted
                          ? 'Export unavailable: Image lacks cross-origin permissions.'
                          : activeMode === 'burst' && validBurstCount < targetBurstCount
                            ? `Pick ${targetBurstCount - validBurstCount} more ${
                                  burst?.isTriptych ? 'photo' : 'frame'
                              }${targetBurstCount - validBurstCount === 1 ? '' : 's'} to download`
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
        </div>
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
                    frameId={activeFrameId}
                    frameColorOverride={effectiveFrameColor}
                    frameContext={frameContext}
                    exif={photoObj.exif}
                    filterId={activeFilterId}
                    filterStrength={filterStrength}
                    panelCount={targetBurstCount}
                    activeStep={burstActiveStep}
                    onSelectPanel={setBurstActiveStep}
                    onSelectEmptyPanel={handleSelectEmptyBurstPanel}
                    onBadgesChange={handleBadgesChange}
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
                    frameId={activeFrameId}
                    frameColorOverride={effectiveFrameColor}
                    exif={
                        photoObj.burst?.frameSources?.[activePhotoIndex] === photoObj.original
                            ? photoObj.exif
                            : undefined
                    }
                    filterId={activeFilterId}
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
                    selectedFilterCategory={selectedFilterCategory}
                    setSelectedFilterCategory={setSelectedFilterCategory}
                    categoryCounts={filterCategoryCounts}
                    displayedFilters={displayedFilters}
                />
            )}

            {/* Decorative Frames Tab Content */}
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
            className={`story-export-modal ${isPortraitMobile ? 'story-export-modal--mobile' : ''} ${
                isLandscapeMobile ? 'story-export-modal--landscape' : ''
            }`}
            headerActions={headerActions}
            footer={footer}
        >
            <StorySvgFilters filterStrength={filterStrength} />
            {isPortraitMobile ? (
                <div
                    className="story-export-modal__mobile-stage"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isMobilePopoverOpen) setIsMobilePopoverOpen(false);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {/* Visual 9:16 Canvas Hero Preview */}
                    <div className="story-export-modal__mobile-hero">{previewContent}</div>

                    {/* Floating Quick-Tools Capsule Dock */}
                    <StoryMobileDock
                        tabs={STUDIO_TABS}
                        activeTab={activeStudioTab}
                        isOpen={isMobilePopoverOpen}
                        onTabClick={handleDockTabClick}
                    />

                    {/* Pop-over Editor Drawer */}
                    <StoryMobilePopover
                        isOpen={isMobilePopoverOpen}
                        onClose={() => setIsMobilePopoverOpen(false)}
                        activeTab={activeStudioTab}
                        tabs={STUDIO_TABS}
                        onSelectTab={setActiveStudioTab}
                    >
                        {activeTabPanelContent}
                    </StoryMobilePopover>
                </div>
            ) : isLandscapeMobile ? (
                <div
                    className="story-export-modal__landscape-stage"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {/* Visual 9:16 Canvas Preview filling height on the left */}
                    <div className="story-export-modal__landscape-preview">{previewContent}</div>

                    {/* Studio Control Tabs and Panel on the right */}
                    <div className="story-export-modal__landscape-controls">
                        <LayoutGroup id="storyLandscapeTabs">
                            <div
                                className="story-export-modal__tab-nav story-export-modal__studio-tabs story-export-modal__landscape-tabs"
                                role="tablist"
                                aria-label="Story Studio Navigation"
                            >
                                {STUDIO_TABS.map((tab) => {
                                    const IconComponent = tab.icon;
                                    const isActive = activeStudioTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`tabpanel-${tab.id}`}
                                            id={`landscape-tab-${tab.id}`}
                                            className={`story-export-modal__tab-btn story-export-modal__studio-tab-btn ${
                                                isActive
                                                    ? 'active story-export-modal__tab-btn--active story-export-modal__studio-tab-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => setActiveStudioTab(tab.id)}
                                        >
                                            {isActive && (
                                                <motion.span
                                                    className="portfolio__segment-pill story-export-modal__studio-tab-pill"
                                                    layoutId="landscapeActiveTabPill"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                                />
                                            )}
                                            <IconComponent size={16} className="story-export-modal__studio-tab-icon" />
                                            <span className="story-export-modal__tab-label story-export-modal__studio-tab-label">
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </LayoutGroup>

                        <div
                            className="story-export-modal__tab-panel story-export-modal__landscape-tab-panel"
                            role="tabpanel"
                            key={`landscape-panel-${activeStudioTab}`}
                        >
                            {activeTabPanelContent}
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className="story-export-modal__body"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {/* Visual Canvas Stage / Preview Workspace */}
                    <div className="story-export-modal__preview-pane">
                        <div className="story-export-modal__viewport-card">{previewContent}</div>
                    </div>

                    {/* Studio Control Tabs Panel */}
                    <div className="story-export-modal__controls-pane">
                        <LayoutGroup id="storyStudioTabs">
                            <div
                                className="story-export-modal__tab-nav story-export-modal__studio-tabs"
                                role="tablist"
                                aria-label="Story Studio Navigation"
                            >
                                {STUDIO_TABS.map((tab) => {
                                    const IconComponent = tab.icon;
                                    const isActive = activeStudioTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`tabpanel-${tab.id}`}
                                            id={`tab-${tab.id}`}
                                            className={`story-export-modal__tab-btn story-export-modal__studio-tab-btn ${
                                                isActive
                                                    ? 'active story-export-modal__tab-btn--active story-export-modal__studio-tab-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => setActiveStudioTab(tab.id)}
                                        >
                                            {isActive && (
                                                <motion.span
                                                    className="portfolio__segment-pill story-export-modal__studio-tab-pill"
                                                    layoutId="studioActiveTabPill"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                                />
                                            )}
                                            <IconComponent size={18} className="story-export-modal__studio-tab-icon" />
                                            <span className="story-export-modal__tab-label story-export-modal__studio-tab-label">
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </LayoutGroup>

                        <div className="story-export-modal__tab-panel" role="tabpanel" key={`panel-${activeStudioTab}`}>
                            {activeTabPanelContent}
                        </div>
                    </div>
                </div>
            )}
        </ModalShell>
    );
};

export default StoryExportModal;
