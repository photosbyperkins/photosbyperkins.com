import React from 'react';
import type { StoryFrameDefinition, StoryFrameId, StoryFrameCategory, StoryFrameContext } from '../types';

/**
 * Wraps an inner SVG markup string in the standard 1080x1920 SVG container element.
 */
export function createSvgString(inner: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920" fill="none">${inner}</svg>`;
}

/**
 * Defines a declarative story frame from a single SVG generator function.
 * Automatically wires both React DOM preview (renderSvg via <g dangerouslySetInnerHTML>)
 * and Canvas 2D export (getSvgString via createSvgString), guaranteeing 100% parity
 * and eliminating hundreds of lines of duplicate JSX/string code.
 */
export function defineFrame(
    id: StoryFrameId,
    label: string,
    category: StoryFrameCategory | undefined,
    vibe: string,
    signaturePalette: string[],
    generateInnerSvg: (colorOverride?: string, context?: StoryFrameContext) => string
): StoryFrameDefinition {
    return {
        id,
        label,
        category,
        vibe,
        signaturePalette,
        renderSvg: (override, context) => (
            <g
                className={`story-frame-${id}`}
                dangerouslySetInnerHTML={{ __html: generateInnerSvg(override, context) }}
            />
        ),
        getSvgString: (override, context) => createSvgString(generateInnerSvg(override, context)),
    };
}
