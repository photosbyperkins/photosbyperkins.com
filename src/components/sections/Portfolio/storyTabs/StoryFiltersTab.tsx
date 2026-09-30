import React from 'react';
import type { StoryPhotoFilterId } from '../../../../utils/storyCanvas';
import { STORY_PHOTO_FILTERS, STORY_PHOTO_FILTERS_MAP } from '../../../../utils/storyCanvas';

interface StoryFiltersTabProps {
    activeFilterId: StoryPhotoFilterId;
    setActiveFilterId: (filter: StoryPhotoFilterId) => void;
    filterStrength: number;
    setFilterStrength: (strength: number) => void;
    previewImageUrl?: string;
    setIsDownloaded: (val: boolean) => void;
}

export const StoryFiltersTab: React.FC<StoryFiltersTabProps> = ({
    activeFilterId,
    setActiveFilterId,
    filterStrength,
    setFilterStrength,
    previewImageUrl,
    setIsDownloaded,
}) => {
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
