import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';
import type { StoryLayoutMode } from '../../../../hooks/useStoryLayoutMode';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { DURATION, EASE_OUT_EXPO, SPRING_SHEET } from '../../../../utils/motion';
import { StoryTabBar, type StudioTabDef } from './StoryTabBar';
import {
    StoryPanelLayoutContext,
    resolveBrowseLayout,
    STORY_POPOVER_ATTR,
    STORY_TABPANEL_ID,
    storyTabId,
    type StoryPanelLayout,
} from './panelLayout';
const isTestEnv =
    (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test';

interface StoryStudioPanelProps {
    mode: StoryLayoutMode;
    tabs: StudioTabDef[];
    activeTab: StoryStudioTab;
    onSelectTab: (tab: StoryStudioTab) => void;
    /** Sheet mode only: whether the sheet is expanded. Side / stacked panels are always open. */
    isSheetOpen: boolean;
    onSheetOpenChange: (open: boolean) => void;
    /** Pinned to the bottom of the panel (Download / Share button). */
    footer: React.ReactNode;
    /** Active tab content. */
    children: React.ReactNode;
}

/**
 * Studio controls: tab bar → tab content → export footer.
 * Renders inline in `side` / `stacked` modes and as a draggable bottom sheet in `sheet` mode, where the
 * collapsed sheet shows only the tab bar and the export button.
 */
export const StoryStudioPanel: React.FC<StoryStudioPanelProps> = ({
    mode,
    tabs,
    activeTab,
    onSelectTab,
    isSheetOpen,
    onSheetOpenChange,
    footer,
    children,
}) => {
    const isSheet = mode === 'sheet';
    const isContentVisible = !isSheet || isSheetOpen;
    const dragControls = useDragControls();
    const panelRef = useRef<HTMLElement>(null);
    const didDragRef = useRef(false);

    // --- Browse layout (grid vs filmstrip) from pointer type + measured content size ---
    const isFinePointer = useMediaQuery('(pointer: fine)');
    const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    // Callback ref: measure on mount and track resizes (the content node remounts when the sheet reopens).
    const contentRef = useCallback((el: HTMLDivElement | null) => {
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
        if (!el) return;
        const measure = () =>
            setContentSize((prev) =>
                prev.width === el.clientWidth && prev.height === el.clientHeight
                    ? prev
                    : { width: el.clientWidth, height: el.clientHeight }
            );
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        resizeObserverRef.current = observer;
    }, []);

    useEffect(() => () => resizeObserverRef.current?.disconnect(), []);

    const layout = useMemo<StoryPanelLayout>(
        () => ({ mode, browse: resolveBrowseLayout(isFinePointer, contentSize.width, contentSize.height) }),
        [mode, isFinePointer, contentSize]
    );

    // --- Sheet behaviour ---
    const closeSheet = useCallback(() => {
        // Keep focus in the panel when the focused control is about to unmount.
        const panel = panelRef.current;
        const active = document.activeElement;
        if (panel && active instanceof HTMLElement && panel.querySelector(`#${STORY_TABPANEL_ID}`)?.contains(active)) {
            document.getElementById(storyTabId(activeTab))?.focus({ preventScroll: true });
        }
        onSheetOpenChange(false);
    }, [activeTab, onSheetOpenChange]);

    const handleTabClick = (tab: StoryStudioTab) => {
        if (!isSheet) {
            onSelectTab(tab);
            return;
        }
        if (isSheetOpen && tab === activeTab) {
            closeSheet();
        } else {
            onSelectTab(tab);
            onSheetOpenChange(true);
        }
    };

    const handleTabSelect = (tab: StoryStudioTab) => {
        onSelectTab(tab);
        if (isSheet && !isSheetOpen) onSheetOpenChange(true);
    };

    // Escape collapses the sheet without closing the modal (capture phase beats ModalShell's listener).
    useEffect(() => {
        if (!isSheet || !isSheetOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (document.querySelector(`[${STORY_POPOVER_ATTR}]`)) return; // let the popover close first
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeSheet();
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isSheet, isSheetOpen, closeSheet]);

    const currentLabel = tabs.find((t) => t.id === activeTab)?.label ?? 'Controls';

    const content = (
        <div
            ref={contentRef}
            className="story-studio-panel__content"
            role="tabpanel"
            id={STORY_TABPANEL_ID}
            aria-labelledby={storyTabId(activeTab)}
            aria-label={`${currentLabel} settings`}
        >
            {children}
        </div>
    );

    const sheetBody = isTestEnv ? (
        isContentVisible && <div className="story-studio-panel__sheet-body">{content}</div>
    ) : (
        <AnimatePresence initial={false}>
            {isContentVisible && (
                <motion.div
                    key="sheet-body"
                    className="story-studio-panel__sheet-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING_SHEET}
                >
                    {content}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <StoryPanelLayoutContext.Provider value={layout}>
            {isSheet && (
                <AnimatePresence>
                    {isSheetOpen && (
                        <motion.div
                            key="sheet-backdrop"
                            className="story-studio-panel__backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
                            onClick={closeSheet}
                            aria-hidden="true"
                        />
                    )}
                </AnimatePresence>
            )}
            <motion.section
                ref={panelRef}
                className={`story-studio-panel story-studio-panel--${mode} ${
                    isSheet && isSheetOpen ? 'story-studio-panel--open' : ''
                }`}
                aria-label="Story editing controls"
                {...(isSheet
                    ? {
                          drag: 'y' as const,
                          dragListener: false,
                          dragControls,
                          dragConstraints: { top: 0, bottom: 0 },
                          dragElastic: { top: 0.08, bottom: 0.35 },
                          dragSnapToOrigin: true,
                          onDragStart: () => {
                              didDragRef.current = true;
                          },
                          onDragEnd: (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
                              if (isSheetOpen && (info.offset.y > 50 || info.velocity.y > 300)) closeSheet();
                              else if (!isSheetOpen && (info.offset.y < -24 || info.velocity.y < -300))
                                  onSheetOpenChange(true);
                          },
                      }
                    : {})}
            >
                {isSheet && (
                    <div
                        className="story-studio-panel__handle"
                        onPointerDown={(e) => dragControls.start(e)}
                        onClick={() => {
                            if (didDragRef.current) {
                                didDragRef.current = false;
                                return;
                            }
                            if (isSheetOpen) closeSheet();
                            else onSheetOpenChange(true);
                        }}
                        aria-hidden="true"
                    >
                        <span className="story-studio-panel__handle-bar" />
                    </div>
                )}

                <div className="story-studio-panel__header">
                    <StoryTabBar
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabClick={handleTabClick}
                        onTabSelect={handleTabSelect}
                        showActivePill={isContentVisible}
                        expanded={isSheet ? isSheetOpen : undefined}
                    />
                </div>

                {isSheet ? sheetBody : content}

                <div className="story-studio-panel__footer">{footer}</div>
            </motion.section>
        </StoryPanelLayoutContext.Provider>
    );
};

export default StoryStudioPanel;
