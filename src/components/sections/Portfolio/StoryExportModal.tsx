import { Check, Download, RotateCcw, Share2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useStoryImageLoader } from '../../../hooks/useStoryImageLoader';
import { useStoryStudio, type StoryStudioTab } from '../../../hooks/useStoryStudio';
import { parseEventTitle } from '../../../utils/formatters';
import { STORY_ASPECT_RATIO } from '../../../utils/storyCanvas';
import type { EventScore, PhotoInput } from '../../../types';
import ModalShell from '../../ui/ModalShell';
import { StoryBadges } from './StoryBadges';
import { StoryCropper } from './StoryCropper';
import { StoryFrameOverlay } from './storyFrames/StoryFrameOverlay';
import { StoryLayoutTabIcon, StoryFiltersTabIcon, StoryFramesTabIcon, StoryBadgesTabIcon } from '../../ui/icons';
import type { IconProps } from '../../ui/icons';
import { StoryLayoutTab } from './storyTabs/StoryLayoutTab';
import { StoryFiltersTab } from './storyTabs/StoryFiltersTab';
import { StoryFramesTab } from './storyTabs/StoryFramesTab';
import { StoryBadgesTab } from './storyTabs/StoryBadgesTab';
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

    const {
        photoObj,
        originalSrc,
        displaySrc,
        thumbSrc,
        withBuild,
        loadedImage,
        imageError,
        naturalDimensions,
        setNaturalDimensions,
    } = useStoryImageLoader({ photo, isOpen });

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
        isExporting,
        isDownloaded,
        setIsDownloaded,
        statusToast,
        resetToDefaults,
        handleClose,
        handleExportAction,
        previewCanvasRef,
    } = useStoryStudio({
        photoObj,
        naturalDimensions,
        eventInfo,
        originalSrc,
        localScore,
        loadedImage,
        year,
        canShare,
        onClose,
    });

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
            {/* Temporary Feedback Notification / Action Status */}
            {statusToast && (
                <div className="story-export-modal__toast" role="status" aria-live="polite">
                    {statusToast}
                </div>
            )}

            <div className="story-export-modal__content">
                {/* Visual Canvas Stage / Preview Workspace */}
                <div className="story-export-modal__preview-pane">
                    <div
                        className="story-export-modal__card-scaler"
                        style={{
                            aspectRatio: `${STORY_ASPECT_RATIO}`,
                        }}
                    >
                        {/* Interactive Cropper when in custom crop mode */}
                        {activeMode === 'crop' && (
                            <StoryCropper
                                imageSrc={displaySrc}
                                naturalWidth={naturalDimensions.width}
                                naturalHeight={naturalDimensions.height}
                                crop={activeCrop}
                                onChange={handleCropChange}
                                filterId={activeFilterId}
                                filterStrength={filterStrength}
                            />
                        )}

                        {/* Fast live Canvas rendering for padded mode and filter rendering */}
                        {activeMode === 'padded' && (
                            <canvas
                                ref={previewCanvasRef}
                                className="story-export-modal__live-canvas"
                                width="1080"
                                height="1920"
                            />
                        )}

                        {/* Image load error fallback */}
                        {imageError && (
                            <div className="story-export-modal__error-placeholder">
                                <p>Unable to load full resolution photo.</p>
                                <img
                                    src={thumbSrc}
                                    alt="Fallback thumbnail"
                                    className="story-export-modal__error-thumb"
                                />
                            </div>
                        )}

                        {/* Interactive Frame Overlay Layer */}
                        <StoryFrameOverlay
                            frameId={activeFrameId}
                            colorOverride={effectiveFrameColor}
                            context={frameContext}
                        />

                        {/* Interactive Badges Layer (HTML preview overlay) */}
                        <StoryBadges
                            badges={badges}
                            theme={cardTheme}
                        />

                        {/* Hidden native image loader for natural dimension detection */}
                        <img
                            src={withBuild(originalSrc)}
                            alt=""
                            style={{ display: 'none' }}
                            onLoad={(e) => {
                                const target = e.currentTarget;
                                if (target.naturalWidth > 0 && target.naturalHeight > 0) {
                                    setNaturalDimensions({
                                        width: target.naturalWidth,
                                        height: target.naturalHeight,
                                    });
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Studio Control Tabs Panel */}
                <div className="story-export-modal__tabs-panel">
                    <div className="story-export-modal__tab-nav story-export-modal__studio-tabs" role="tablist" aria-label="Story Studio Navigation">
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
                                        isActive ? 'story-export-modal__tab-btn--active story-export-modal__studio-tab-btn--active' : ''
                                    }`}
                                    onClick={() => setActiveStudioTab(tab.id)}
                                >
                                    <IconComponent size={18} className="story-export-modal__studio-tab-icon" />
                                    <span className="story-export-modal__tab-label story-export-modal__studio-tab-label">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

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
                        />
                    )}

                    {/* Filters & Atmosphere Tab Content */}
                    {activeStudioTab === 'filters' && (
                        <StoryFiltersTab
                            activeFilterId={activeFilterId}
                            setActiveFilterId={setActiveFilterId}
                            filterStrength={filterStrength}
                            setFilterStrength={setFilterStrength}
                            setIsDownloaded={setIsDownloaded}
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
                            badges={badges}
                            setBadges={setBadges}
                            cardTheme={cardTheme}
                            setCardTheme={setCardTheme}
                            eventInfo={eventInfo}
                            setIsDownloaded={setIsDownloaded}
                        />
                    )}
                </div>
            </div>
        </ModalShell>
    );
};

export default StoryExportModal;
