import React, { useRef } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';
import type { IconProps } from '../../../ui/icons';
import { triggerHaptic } from '../../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../../utils/motion';
import { STORY_TABPANEL_ID, storyTabId } from './panelLayout';

export type StudioTabDef = { id: StoryStudioTab; label: string; icon: React.FC<IconProps> };

interface StoryTabBarProps {
    tabs: StudioTabDef[];
    activeTab: StoryStudioTab;
    /** Called for clicks and keyboard selection. The panel decides whether a click also toggles the sheet. */
    onTabClick: (tab: StoryStudioTab) => void;
    /** Keyboard navigation always selects (never collapses). Defaults to `onTabClick`. */
    onTabSelect?: (tab: StoryStudioTab) => void;
    /** Hide the active pill (collapsed sheet: no tab is "open"). aria-selected still tracks the active tab. */
    showActivePill?: boolean;
    /** Sheet mode: expose expanded state on the tabs. */
    expanded?: boolean;
}

/**
 * The studio panel's header in every layout mode: one tablist with an animated segment pill,
 * roving focus and ←/→/Home/End keyboard support.
 */
export const StoryTabBar: React.FC<StoryTabBarProps> = ({
    tabs,
    activeTab,
    onTabClick,
    onTabSelect,
    showActivePill = true,
    expanded,
}) => {
    const tabRefs = useRef<Map<StoryStudioTab, HTMLButtonElement>>(new Map());
    const select = onTabSelect ?? onTabClick;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        let next: number;
        switch (e.key) {
            case 'ArrowRight':
                next = (index + 1) % tabs.length;
                break;
            case 'ArrowLeft':
                next = (index - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = tabs.length - 1;
                break;
            default:
                return;
        }
        // Handled here; the modal's window-level ←/→ shortcut skips defaultPrevented events.
        e.preventDefault();
        const nextTab = tabs[next];
        triggerHaptic('tick');
        select(nextTab.id);
        tabRefs.current.get(nextTab.id)?.focus();
    };

    return (
        <LayoutGroup id="storyStudioTabBar">
            <div className="story-tab-bar" role="tablist" aria-label="Story Studio Navigation">
                {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const showPill = isActive && showActivePill;
                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                if (el) tabRefs.current.set(tab.id, el);
                                else tabRefs.current.delete(tab.id);
                            }}
                            type="button"
                            role="tab"
                            id={storyTabId(tab.id)}
                            aria-selected={isActive}
                            aria-controls={STORY_TABPANEL_ID}
                            aria-expanded={expanded === undefined ? undefined : isActive && expanded}
                            aria-label={tab.label}
                            tabIndex={isActive ? 0 : -1}
                            className={`story-tab-bar__tab ${showPill ? 'is-active' : ''}`}
                            onClick={() => {
                                triggerHaptic('tick');
                                onTabClick(tab.id);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                        >
                            {showPill && (
                                <motion.span
                                    className="story-tab-bar__pill"
                                    layoutId="storyStudioTabPill"
                                    transition={SPRING_SNAPPY}
                                    aria-hidden="true"
                                />
                            )}
                            <Icon size={16} className="story-tab-bar__icon" />
                            <span className="story-tab-bar__label">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
};

export default StoryTabBar;
