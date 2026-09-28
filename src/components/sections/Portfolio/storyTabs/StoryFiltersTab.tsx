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
                                <div
                                    className="story-export-modal__filter-preview-swatch"
                                    style={{
                                        filter: filter.cssFilter || 'none',
                                        backgroundImage: previewImageUrl ? `url(${previewImageUrl})` : undefined,
                                    }}
                                    aria-hidden="true"
                                />
                                <span className="story-export-modal__filter-label">{filter.label}</span>
                            </button>
                        );
                    })}
                </div>

                {activeFilterId !== 'none' && (
                    <div className="story-export-modal__zoom-control story-export-modal__filter-strength-control">
                        <div className="story-export-modal__zoom-header">
                            <span className="story-export-modal__sublabel">Filter Strength</span>
                            <span className="story-export-modal__zoom-value">{Math.round(filterStrength * 100)}%</span>
                        </div>
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
                            className="story-export-modal__slider"
                            aria-label="Filter Strength"
                        />
                        <div
                            className="story-export-modal__zoom-ticks"
                            role="group"
                            aria-label="Filter strength snap points"
                        >
                            {[0.1, 0.25, 0.5, 0.75, 1.0].map((pt) => {
                                const isActive = Math.abs(filterStrength - pt) < 0.04;
                                const fraction = (pt - 0.1) / (1.0 - 0.1);
                                return (
                                    <button
                                        key={pt}
                                        type="button"
                                        className={`story-export-modal__zoom-tick ${
                                            isActive ? 'story-export-modal__zoom-tick--active' : ''
                                        }`}
                                        style={{
                                            left: `calc(9px + ${fraction} * (100% - 18px))`,
                                        }}
                                        onClick={() => {
                                            setFilterStrength(pt);
                                            setIsDownloaded(false);
                                        }}
                                        aria-label={`Snap filter strength to ${Math.round(pt * 100)}%`}
                                    >
                                        <span className="story-export-modal__zoom-tick-mark" />
                                        <span className="story-export-modal__zoom-tick-label">
                                            {Math.round(pt * 100)}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
