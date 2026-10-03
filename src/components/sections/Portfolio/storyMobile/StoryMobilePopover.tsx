import React from 'react';
import { motion, AnimatePresence, useDragControls, LayoutGroup } from 'framer-motion';
import { X, type IconProps } from '../../../ui/icons';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';

interface StoryMobilePopoverProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: StoryStudioTab;
    tabs: Array<{ id: StoryStudioTab; label: string; icon: React.FC<IconProps> }>;
    onSelectTab: (tab: StoryStudioTab) => void;
    children: React.ReactNode;
}

export const StoryMobilePopover: React.FC<StoryMobilePopoverProps> = ({
    isOpen,
    onClose,
    activeTab,
    tabs,
    onSelectTab,
    children,
}) => {
    const dragControls = useDragControls();

    const isTestEnv =
        (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test';
    if (isTestEnv && !isOpen) {
        return null;
    }

    const currentTab = tabs.find((t) => t.id === activeTab);
    const currentLabel = currentTab?.label ?? 'Controls';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Dimming backdrop over the top visible preview */}
                    <motion.div
                        className="story-mobile-popover__backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Slide-out drawer emerging directly from the docked menu */}
                    <motion.div
                        className="story-mobile-popover"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
                        drag="y"
                        dragListener={false}
                        dragControls={dragControls}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.35 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 50 || info.velocity.y > 250) {
                                onClose();
                            }
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Story editing controls"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* Pull handle for dragging down */}
                        <div
                            className="story-mobile-popover__handle-bar-wrap"
                            onPointerDown={(e) => dragControls.start(e)}
                            aria-label="Drag down to close"
                        >
                            <div className="story-mobile-popover__handle-bar" />
                        </div>

                        {/* Popover Header with 4-tab segmented control strip and close button */}
                        <div className="story-mobile-popover__header">
                            <LayoutGroup id="storyMobilePopoverTabs">
                                <div
                                    className="story-export-modal__studio-tabs story-mobile-popover__tabs"
                                    role="tablist"
                                    aria-label="Story editing categories"
                                >
                                    {tabs.map((tab) => {
                                        const IconComponent = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                role="tab"
                                                aria-selected={isActive}
                                                aria-controls={`mobile-tabpanel-${tab.id}`}
                                                id={`mobile-popover-tab-${tab.id}`}
                                                className={`story-export-modal__tab-btn story-export-modal__studio-tab-btn story-mobile-popover__tab-btn ${
                                                    isActive
                                                        ? 'active is-active story-export-modal__tab-btn--active story-export-modal__studio-tab-btn--active'
                                                        : ''
                                                }`}
                                                onClick={() => onSelectTab(tab.id)}
                                            >
                                                {isActive && (
                                                    <motion.span
                                                        className="portfolio__segment-pill story-export-modal__studio-tab-pill story-mobile-popover__tab-pill"
                                                        layoutId="mobilePopoverTabPill"
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

                            <button
                                type="button"
                                className="story-mobile-popover__close-btn"
                                onClick={onClose}
                                aria-label="Close controls"
                                title="Close controls"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Tab Panel Content */}
                        <div
                            className="story-mobile-popover__content"
                            role="tabpanel"
                            id={`mobile-tabpanel-${activeTab}`}
                            aria-labelledby={`mobile-popover-tab-${activeTab}`}
                            aria-label={`${currentLabel} settings`}
                        >
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default StoryMobilePopover;
