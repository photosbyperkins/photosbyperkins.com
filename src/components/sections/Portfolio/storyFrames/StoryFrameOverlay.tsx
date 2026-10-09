import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { StoryFrameId, StoryFrameContext } from './types';
import { STORY_FRAMES_MAP } from './frameDefinitions';
import { loadStoryFrameImage } from '../../../../utils/story/storyDraw';
import {
    prepareFrameMotionAssets,
    drawFrameMotion,
    type StoryFrameMotionAssets,
} from '../../../../utils/story/storyFrameMotionDraw';
import { DEFAULT_FRAME_INTENSITY, getFrameMotionRecipe, sampleFrameMotion } from '../../../../utils/story/frameMotion';
import { STORY_VIDEO_DURATION } from '../../../../utils/story/storyAnimation';
import { contextFromKey, frameContextKey } from './frameContextKey';

interface StoryFrameOverlayProps {
    frameId: StoryFrameId;
    colorOverride?: string;
    context?: StoryFrameContext;
    className?: string;
    animated?: boolean;
}

type LoadedAssets = { key: string; assets: StoryFrameMotionAssets };

export const StoryFrameOverlay: React.FC<StoryFrameOverlayProps> = ({
    frameId,
    colorOverride,
    context,
    className,
    animated = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [loaded, setLoaded] = useState<LoadedAssets | null>(null);
    // One clock for the overlay's lifetime: re-rasterizing (tint, badges, layout) never restarts the loop
    const clockStartRef = useRef<number | null>(null);

    const hasFrame = Boolean(frameId && frameId !== 'none' && STORY_FRAMES_MAP[frameId]);
    const frameDef = hasFrame ? STORY_FRAMES_MAP[frameId] : null;
    const shouldLoad = Boolean(animated && hasFrame && frameId);

    // Callers may pass a fresh context object every render (e.g. while panning); depend on its content only.
    const contextKey = frameContextKey(context);
    const stableContext = useMemo(() => contextFromKey(contextKey), [contextKey]);
    const assetKey = `${frameId}|${colorOverride ?? ''}|${contextKey}`;

    useEffect(() => {
        if (!shouldLoad || !frameId) return;
        let active = true;
        loadStoryFrameImage(frameId, colorOverride, stableContext).then((img) => {
            if (!active || !img) return;
            prepareFrameMotionAssets(frameId, colorOverride, stableContext ?? {}, img, 1080, 1920).then(
                (prepared) => {
                    if (active && prepared) setLoaded({ key: assetKey, assets: prepared });
                }
            );
        });
        // Keep showing the previous assets until the new ones are ready (no fallback flash between them)
        return () => {
            active = false;
        };
    }, [shouldLoad, frameId, colorOverride, assetKey, stableContext]);

    // A different frame must not show the previous frame's artwork while it loads
    const activeAssets =
        shouldLoad && loaded && loaded.key.startsWith(`${frameId}|`) ? loaded.assets : null;

    const recipe = useMemo(() => (frameId ? getFrameMotionRecipe(frameId) : undefined), [frameId]);
    // The live preview loops ambient motion only. Intros play once in the exported video; replaying them
    // every loop (or whenever the overlay re-renders) reads as the frame flashing off and on.
    const liveRecipe = useMemo(() => (recipe ? { ...recipe, intro: false } : undefined), [recipe]);

    useEffect(() => {
        if (!animated || !activeAssets || !liveRecipe) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let animId = 0;
        let isRunning = true;
        if (clockStartRef.current === null) clockStartRef.current = performance.now();
        const startTime = clockStartRef.current;

        const render = () => {
            if (!isRunning) return;
            const t = ((performance.now() - startTime) / 1000) % STORY_VIDEO_DURATION;
            const motionState = sampleFrameMotion(liveRecipe, t, STORY_VIDEO_DURATION, DEFAULT_FRAME_INTENSITY);
            ctx.clearRect(0, 0, 1080, 1920);
            // `undefined` means everything is at rest: draw the static frame (never leave the canvas blank)
            drawFrameMotion(ctx, activeAssets, motionState ?? {}, 1080, 1920);
            animId = requestAnimationFrame(render);
        };

        const handleVisibilityChange = () => {
            cancelAnimationFrame(animId);
            if (document.visibilityState !== 'hidden') animId = requestAnimationFrame(render);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        animId = requestAnimationFrame(render);

        return () => {
            isRunning = false;
            cancelAnimationFrame(animId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [animated, activeAssets, liveRecipe]);

    if (!hasFrame || !frameDef) {
        return null;
    }

    if (!animated) {
        return (
            <svg
                viewBox="0 0 1080 1920"
                className={`story-frame-overlay ${className || ''}`}
                aria-hidden="true"
                preserveAspectRatio="none"
            >
                {frameDef.renderSvg(colorOverride, context)}
            </svg>
        );
    }

    return (
        <>
            {!activeAssets && (
                <svg
                    viewBox="0 0 1080 1920"
                    className={`story-frame-overlay ${className || ''}`}
                    aria-hidden="true"
                    preserveAspectRatio="none"
                >
                    {frameDef.renderSvg(colorOverride, context)}
                </svg>
            )}
            <canvas
                ref={canvasRef}
                width={1080}
                height={1920}
                className={`story-frame-overlay ${className || ''}`}
                aria-hidden="true"
                style={{
                    display: activeAssets ? 'block' : 'none',
                }}
            />
        </>
    );
};

export default StoryFrameOverlay;
