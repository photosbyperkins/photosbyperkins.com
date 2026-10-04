import React, { useState } from 'react';
import type { StoryPhotoFilter, StoryPhotoFilterId, StoryPhotoFilterTabCategory } from '../../../../utils/storyCanvas';
import { STORY_FILTER_CATEGORIES, STORY_PHOTO_FILTERS, STORY_PHOTO_FILTERS_MAP } from '../../../../utils/storyCanvas';

interface StoryFiltersTabProps {
    activeFilterId: StoryPhotoFilterId;
    setActiveFilterId: (filter: StoryPhotoFilterId) => void;
    filterStrength: number;
    setFilterStrength: (strength: number) => void;
    previewImageUrl?: string;
    setIsDownloaded: (val: boolean) => void;
    selectedFilterCategory?: StoryPhotoFilterTabCategory;
    setSelectedFilterCategory?: (cat: StoryPhotoFilterTabCategory) => void;
    categoryCounts?: Record<string, number>;
    displayedFilters?: StoryPhotoFilter[];
}

export const StoryFiltersTab: React.FC<StoryFiltersTabProps> = ({
    activeFilterId,
    setActiveFilterId,
    filterStrength,
    setFilterStrength,
    previewImageUrl,
    setIsDownloaded,
    selectedFilterCategory: controlledCategory,
    setSelectedFilterCategory: controlledSetCategory,
    categoryCounts: controlledCounts,
    displayedFilters: controlledDisplayedFilters,
}) => {
    // Uncontrolled fallback for isolated rendering or standalone tests
    const [internalCategory, setInternalCategory] = useState<StoryPhotoFilterTabCategory>('all');
    const selectedCategory = controlledCategory ?? internalCategory;
    const setSelectedCategory = controlledSetCategory ?? setInternalCategory;

    const displayedFilters =
        controlledDisplayedFilters ??
        (selectedCategory === 'all'
            ? STORY_PHOTO_FILTERS
            : selectedCategory === 'recent'
              ? [STORY_PHOTO_FILTERS_MAP['none']]
              : STORY_PHOTO_FILTERS.filter((f) => f.id === 'none' || f.category === selectedCategory));

    const categoryCounts =
        controlledCounts ??
        STORY_FILTER_CATEGORIES.reduce(
            (acc, cat) => {
                acc[cat.id] =
                    cat.id === 'all'
                        ? STORY_PHOTO_FILTERS.length
                        : cat.id === 'recent'
                          ? 0
                          : STORY_PHOTO_FILTERS.filter((f) => f.id === 'none' || f.category === cat.id).length;
                return acc;
            },
            {} as Record<string, number>
        );

    return (
        <div className="story-export-modal__tab-content story-export-modal__tab-content--filters">
            <div className="story-export-modal__section story-export-modal__section--filters">
                <div className="story-export-modal__accordion-header story-export-modal__filters-header">
                    <div className="story-export-modal__accordion-title">
                        <span className="story-export-modal__section-heading">FILTER</span>
                        <span className="story-export-modal__filter-current-badge">
                            {STORY_PHOTO_FILTERS_MAP[activeFilterId]?.label || 'None'}
                        </span>
                    </div>

                    {activeFilterId !== 'none' && (
                        <div className="story-export-modal__filters-header-slider">
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={filterStrength}
                                onChange={(e) => {
                                    setFilterStrength(Math.max(0.1, Math.min(1.0, parseFloat(e.target.value))));
                                    setIsDownloaded(false);
                                }}
                                className="story-export-modal__slider story-export-modal__slider--header"
                                aria-label="Filter Strength"
                            />
                        </div>
                    )}
                </div>

                {/* Filter Category Pills Bar */}
                <div className="story-export-modal__category-bar" role="tablist" aria-label="Filter categories">
                    {STORY_FILTER_CATEGORIES.map((cat) => {
                        const isCatActive = selectedCategory === cat.id;
                        const count = categoryCounts[cat.id] ?? 0;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                role="tab"
                                aria-selected={isCatActive}
                                className={`story-export-modal__category-pill ${
                                    isCatActive ? 'story-export-modal__category-pill--active' : ''
                                }`}
                                onClick={() => setSelectedCategory(cat.id)}
                                title={cat.description}
                            >
                                <span>{cat.label}</span>
                                <span className="story-export-modal__category-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="story-export-modal__filters-grid">
                    {displayedFilters.map((filter) => {
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
                                {previewImageUrl ? (
                                    <img
                                        src={previewImageUrl}
                                        alt=""
                                        className="story-export-modal__filter-preview-swatch"
                                        style={{
                                            filter: filter.cssFilter || 'none',
                                            WebkitFilter: filter.cssFilter || 'none',
                                        }}
                                        loading="eager"
                                        decoding="sync"
                                    />
                                ) : (
                                    <div className="story-export-modal__filter-preview-swatch" />
                                )}
                                <span className="story-export-modal__filter-label">{filter.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
