/**
 * Layout-switch transitions for the Story Maker preview (SOLO / DUET / TRIPTYCH).
 *
 * Ported from the sizzle reel: duet halves drop in from the top and rise from the bottom,
 * triptych thirds slide in from alternating sides, always over the previous layout.
 * Switching back to SOLO reveals the single photo underneath while the burst panels
 * reverse-slide out the way they came in.
 *
 * Preview-only: exported PNGs are drawn separately by storyRender.ts.
 */
import type { TargetAndTransition, Transition } from 'framer-motion';
import { EASE_OUT_EXPO_STRONG } from '../motion';

export type PreviewLayoutKey = 'solo' | 'burst-2' | 'burst-3';

/** Crop and padded are both single-photo layouts, so they share the SOLO key (no animation between them). */
export const previewLayoutKey = (mode: string, panelCount: 2 | 3): PreviewLayoutKey =>
    mode === 'burst' ? (panelCount === 2 ? 'burst-2' : 'burst-3') : 'solo';

/** Seconds a single panel takes to slide. */
export const PANEL_SLIDE_S = 0.45;
/** Seconds between consecutive panels. */
export const PANEL_STAGGER_S = 0.075;
/** How long the outgoing layout is held underneath the incoming one (covers the full staggered slide). */
export const LAYOUT_HOLD_S = PANEL_SLIDE_S + PANEL_STAGGER_S * 2 + 0.05;

const EXPO_OUT: Transition['ease'] = EASE_OUT_EXPO_STRONG;
const QUART_IN: Transition['ease'] = [0.5, 0, 0.75, 0];

/**
 * Off-card position a panel slides from (and back to). Percentages are of the panel itself:
 * duet panels are half the card tall, so ±104% clears the card; triptych panels clear sideways.
 */
export const panelOffset = (count: 2 | 3, idx: number): { x: string; y: string } =>
    count === 2 ? { x: '0%', y: idx === 0 ? '-104%' : '104%' } : { x: idx % 2 === 0 ? '-102%' : '102%', y: '0%' };

export const panelEnterTransition = (idx: number): Transition => ({
    duration: PANEL_SLIDE_S,
    ease: EXPO_OUT,
    delay: idx * PANEL_STAGGER_S,
});

/**
 * Exit target for a burst panel, resolved with the *next* layout key (AnimatePresence `custom`).
 * Leaving for SOLO: reverse-slide out, last panel first. Otherwise stay put while the new layout covers it.
 */
export const panelExit =
    (count: 2 | 3, idx: number) =>
    (nextKey?: PreviewLayoutKey): TargetAndTransition =>
        nextKey === 'solo'
            ? {
                  ...panelOffset(count, idx),
                  transition: {
                      duration: PANEL_SLIDE_S * 0.85,
                      ease: QUART_IN,
                      delay: (count - 1 - idx) * PANEL_STAGGER_S,
                  },
              }
            : { x: '0%', y: '0%', transition: { duration: LAYOUT_HOLD_S } };
