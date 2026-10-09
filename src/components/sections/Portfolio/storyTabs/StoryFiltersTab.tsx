import React, { useMemo, useState } from 'react';
import type { StoryPhotoFilterId } from '../../../../utils/storyCanvas';
import { STORY_FILTER_CATEGORIES, STORY_PHOTO_FILTERS } from '../../../../utils/storyCanvas';
import { triggerHaptic, triggerScrubberHaptic } from '../../../../utils/haptics';
import { useStoryPanelLayout } from '../storyStudio/panelLayout';
import { StoryOptionsRow } from './shared/StoryOptionsRow';
import { StoryThumb, StoryThumbBrowser } from './shared/StoryThumbBrowser';
import { buildThumbSections } from './shared/thumbSections';

interface StoryFiltersTabProps {
    activeFilterId: StoryPhotoFilterId;
    setActiveFilterId: (filter: StoryPhotoFilterId) => void;
    filterStrength: number;
    setFilterStrength: (strength: number) => void;
    previewImageUrl?: string;
    setIsDownloaded: (val: boolean) => void;
    /** Most recently exported filters, newest first. */
    recentFilterIds?: readonly StoryPhotoFilterId[];
    /** Desktop hover / keyboard focus preview of a filter on the main preview (`null` to stop previewing). */
    onPreviewFilter?: (id: StoryPhotoFilterId | null) => void;
}

const FILTER_THEME_CATEGORIES = STORY_FILTER_CATEGORIES.filter((c) => c.group === 'themes');
const STRENGTH_PANEL_ID = 'story-filter-strength';

export const StoryFiltersTab: React.FC<StoryFiltersTabProps> = ({
    activeFilterId,
    setActiveFilterId,
    filterStrength,
    setFilterStrength,
    previewImageUrl,
    setIsDownloaded,
    recentFilterIds,
    onPreviewFilter,
}) => {
    const { browse } = useStoryPanelLayout();
    const isStrip = browse === 'strip';
    // Filmstrip: the strength slider replaces the filter description on demand (tap the selected filter
    // again, or the Strength button), so the controls stay one row tall on phones.
    const [isStrengthOpen, setIsStrengthOpen] = useState(false);

    const sections = useMemo(
        () =>
            buildThumbSections({
                items: STORY_PHOTO_FILTERS,
                getId: (f) => f.id,
                getCategory: (f) => f.category,
                categories: FILTER_THEME_CATEGORIES,
                recentIds: recentFilterIds,
            }),
        [recentFilterIds]
    );

    const activeFilter = STORY_PHOTO_FILTERS.find((f) => f.id === activeFilterId);
    const hasFilter = activeFilterId !== 'none';
    const strengthPercent = Math.round(filterStrength * 100);
    const showSlider = hasFilter && (!isStrip || isStrengthOpen);

    const slider = (
        <label className="story-strength" id={STRENGTH_PANEL_ID}>
            <span className="story-strength__label">Strength</span>
            <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={filterStrength}
                onChange={(e) => {
                    setFilterStrength(Math.max(0.1, Math.min(1.0, parseFloat(e.target.value))));
                    setIsDownloaded(false);
                    triggerScrubberHaptic();
                }}
                className="story-export-modal__slider story-strength__slider"
                aria-label="Filter Strength"
            />
            <span className="story-strength__value">{strengthPercent}%</span>
        </label>
    );

    const filterInfo = activeFilter && hasFilter && (
        <span className="story-filter-info">
            <span className="story-filter-info__name">{activeFilter.label}</span>
            <span className="story-filter-info__desc">{activeFilter.description}</span>
        </span>
    );

    let start: React.ReactNode;
    let end: React.ReactNode = null;
    if (!hasFilter) {
        start = <span className="story-options-row__hint">Pick a filter to adjust its strength</span>;
    } else if (showSlider) {
        start = slider;
        if (isStrip) {
            end = (
                <button
                    type="button"
                    className="story-pill-btn story-strength__done"
                    onClick={() => setIsStrengthOpen(false)}
                >
                    Done
                </button>
            );
        }
    } else {
        start = filterInfo;
        end = (
            <button
                type="button"
                className="story-pill-btn story-strength__toggle"
                aria-expanded={false}
                aria-label={`Adjust filter strength (${strengthPercent}%)`}
                onClick={() => {
                    triggerHaptic('tick');
                    setIsStrengthOpen(true);
                }}
            >
                Strength <span className="story-strength__toggle-value">{strengthPercent}%</span>
            </button>
        );
    }

    return (
        <div className="story-export-modal__tab-content story-tab story-tab--browser story-tab--filters">
            <StoryOptionsRow start={start} end={end} />
            {/* Desktop grid: the slider has the row, so the description sits underneath */}
            {!isStrip && filterInfo && <div className="story-filter-caption">{filterInfo}</div>}

            <StoryThumbBrowser
                id="story-export-filters-grid"
                ariaLabel="Photo filters"
                sections={sections}
                getKey={(filter) => filter.id}
                selectedKey={activeFilterId}
                onPreview={onPreviewFilter ? (key) => onPreviewFilter(key as StoryPhotoFilterId | null) : undefined}
                renderThumb={(filter, isSelected) => (
                    <StoryThumb
                        thumbKey={filter.id}
                        label={filter.label}
                        isSelected={isSelected}
                        title={filter.description}
                        ariaLabel={`Photo filter: ${filter.label}`}
                        className="story-thumb--filter"
                        onSelect={() => {
                            triggerHaptic('tap');
                            if (filter.id === activeFilterId) {
                                // Tap the selected filter again to show / hide its strength (filmstrip)
                                if (isStrip && hasFilter) setIsStrengthOpen((open) => !open);
                                return;
                            }
                            setIsStrengthOpen(false);
                            setActiveFilterId(filter.id);
                            setIsDownloaded(false);
                        }}
                    >
                        {previewImageUrl ? (
                            <img
                                src={previewImageUrl}
                                alt=""
                                className="story-thumb__photo"
                                style={{
                                    filter: filter.cssFilter || 'none',
                                    WebkitFilter: filter.cssFilter || 'none',
                                }}
                                loading="eager"
                                decoding="sync"
                            />
                        ) : (
                            <span className="story-thumb__photo story-thumb__photo--empty" />
                        )}
                    </StoryThumb>
                )}
            />
        </div>
    );
};
