import { createContext, useContext } from 'react';
import type { StoryLayoutMode } from '../../../../hooks/useStoryLayoutMode';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';

export const STORY_TABPANEL_ID = 'story-studio-tabpanel';
export const storyTabId = (tab: StoryStudioTab) => `story-studio-tab-${tab}`;

/** Open popovers inside the panel (e.g. frame tint) carry this attribute so Escape closes them first. */
export const STORY_POPOVER_ATTR = 'data-story-popover';

/**
 * How thumbnail browsers (Frames / Filters) lay out inside the studio panel:
 * - `grid`: vertical sectioned grid, used with a fine pointer in a panel at least 360px wide and 460px tall.
 * - `strip`: horizontal snap filmstrip for touch, narrow panels and short panels (where a grid would show
 *   barely more than one row). With a mouse the vertical wheel scrolls the strip sideways.
 */
export type StoryBrowseLayout = 'grid' | 'strip';

export interface StoryPanelLayout {
    mode: StoryLayoutMode;
    browse: StoryBrowseLayout;
}

/** Outside a panel (isolated tab renders / tests) tabs fall back to the desktop grid. */
export const StoryPanelLayoutContext = createContext<StoryPanelLayout>({ mode: 'side', browse: 'grid' });

export const useStoryPanelLayout = () => useContext(StoryPanelLayoutContext);

/** Minimum panel content width for the desktop thumbnail grid. */
export const STORY_GRID_MIN_WIDTH = 360;
/** Minimum panel content height for the desktop thumbnail grid. */
export const STORY_GRID_MIN_HEIGHT = 460;

export function resolveBrowseLayout(isFinePointer: boolean, panelWidth: number, panelHeight = 0): StoryBrowseLayout {
    if (!isFinePointer) return 'strip';
    // 0 = not measured yet (first paint / test environments): assume the common desktop case.
    if (panelWidth > 0 && panelWidth < STORY_GRID_MIN_WIDTH) return 'strip';
    if (panelHeight > 0 && panelHeight < STORY_GRID_MIN_HEIGHT) return 'strip';
    return 'grid';
}
