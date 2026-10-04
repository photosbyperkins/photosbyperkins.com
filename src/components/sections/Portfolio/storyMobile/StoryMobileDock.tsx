import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';
import type { IconProps } from '../../../ui/icons';

interface StoryMobileDockProps {
    tabs: Array<{ id: StoryStudioTab; label: string; icon: React.FC<IconProps> }>;
    activeTab: StoryStudioTab;
    isOpen: boolean;
    onTabClick: (tab: StoryStudioTab) => void;
}

export const StoryMobileDock: React.FC<StoryMobileDockProps> = ({ tabs, activeTab, isOpen, onTabClick }) => {
    return (
        <nav
            className={`story-mobile-dock ${isOpen ? 'story-mobile-dock--open' : ''}`}
            role="toolbar"
            aria-label="Story editing tools"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <LayoutGroup id="storyMobileDockTabs">
                <div className="story-export-modal__studio-tabs story-mobile-dock__track">
                    {tabs.map((tab) => {
                        const IconComponent = tab.icon;
                        const isActive = isOpen && activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                id={`mobile-dock-tab-${tab.id}`}
                                className={`story-export-modal__tab-btn story-export-modal__studio-tab-btn story-mobile-dock__btn ${
                                    isActive
                                        ? 'active is-active story-export-modal__tab-btn--active story-export-modal__studio-tab-btn--active'
                                        : ''
                                }`}
                                onClick={() => onTabClick(tab.id)}
                                aria-label={tab.label}
                                aria-pressed={isActive}
                                aria-expanded={isActive}
                            >
                                {isActive && (
                                    <motion.span
                                        className="portfolio__segment-pill story-export-modal__studio-tab-pill story-mobile-dock__pill"
                                        layoutId="mobileDockActiveTabPill"
                                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                    />
                                )}
                                <IconComponent size={18} className="story-export-modal__studio-tab-icon" />
                                <span className="story-export-modal__tab-label story-export-modal__studio-tab-label story-mobile-dock__label">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </LayoutGroup>
        </nav>
    );
};

export default StoryMobileDock;
