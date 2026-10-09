import { useMediaQuery } from './useMediaQuery';

/**
 * Story Maker layout, chosen by the window's shape rather than the device:
 * - `side`: landscape windows. Preview on the left, studio panel docked on the right.
 * - `stacked`: tall portrait windows (tablets, tall desktop windows). Preview on top, panel always open beneath.
 * - `sheet`: phones / short portrait windows. Preview fills the stage; the panel is a collapsible bottom sheet.
 */
export type StoryLayoutMode = 'side' | 'stacked' | 'sheet';

/** Portrait = height >= width. Queried positively so environments without matchMedia fall back to `side`. */
export const STORY_PORTRAIT_QUERY = '(orientation: portrait)';

/**
 * Portrait windows that are too small for a permanently open panel. Height alone is not enough:
 * modern phones report 850-930px tall viewports, so a minimum width keeps them on the sheet.
 */
export const STORY_COMPACT_QUERY = '(max-width: 599px), (max-height: 819px)';

export function resolveStoryLayoutMode(isPortrait: boolean, isCompact: boolean): StoryLayoutMode {
    if (!isPortrait) return 'side';
    return isCompact ? 'sheet' : 'stacked';
}

export function useStoryLayoutMode(): StoryLayoutMode {
    const isPortrait = useMediaQuery(STORY_PORTRAIT_QUERY);
    const isCompact = useMediaQuery(STORY_COMPACT_QUERY);
    return resolveStoryLayoutMode(isPortrait, isCompact);
}
