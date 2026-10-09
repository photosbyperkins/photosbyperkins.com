import type { StoryFrameContext } from './types';

/** Stable key for the parts of the frame context that change the rendered artwork. */
export function frameContextKey(context: StoryFrameContext | undefined): string {
    if (!context) return '';
    const { hasScoreboard, hasAttribution, layoutMode, exif } = context;
    return JSON.stringify([hasScoreboard, hasAttribution, layoutMode, exif ?? null]);
}

/** Inverse of `frameContextKey`: a context object that only changes when its content does. */
export function contextFromKey(key: string): StoryFrameContext | undefined {
    if (!key) return undefined;
    const [hasScoreboard, hasAttribution, layoutMode, exif] = JSON.parse(key) as [
        StoryFrameContext['hasScoreboard'] | null,
        StoryFrameContext['hasAttribution'] | null,
        StoryFrameContext['layoutMode'] | null,
        StoryFrameContext['exif'] | null,
    ];
    return {
        hasScoreboard: hasScoreboard ?? undefined,
        hasAttribution: hasAttribution ?? undefined,
        layoutMode: layoutMode ?? undefined,
        exif: exif ?? undefined,
    };
}
