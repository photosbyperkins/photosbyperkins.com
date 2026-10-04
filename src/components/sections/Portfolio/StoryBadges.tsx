import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BadgeOptions, StoryBadgePosition } from '../../../utils/storyCanvas';
import {
    DEFAULT_SCOREBOARD_POSITION,
    DEFAULT_ATTRIBUTION_POSITION,
    resolveBadgeDrop,
    pickSlotFromDrag,
} from '../../../utils/storyCanvas';
import { formatTeamName } from '../../../utils/formatters';
import { Move, X } from '../../ui/icons';

type BadgeKey = 'scoreboard' | 'attribution';

interface StoryBadgesProps {
    badges?: BadgeOptions;
    theme?: 'dark' | 'light';
    onBadgesChange?: (badges: BadgeOptions) => void;
    /** @deprecated Badges now measure against their own full-frame layer; kept for call-site compatibility. */
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface DragState {
    key: BadgeKey;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    /** Pointer offset from the badge's top-left corner at grab time */
    grabOffsetX: number;
    grabOffsetY: number;
    /** Current badge top-left inside the frame (px) */
    x: number;
    y: number;
    w: number;
    h: number;
    target: StoryBadgePosition;
    moved: boolean;
}

/** Pixels of pointer travel before a press becomes a drag (keeps taps as taps). */
const DRAG_THRESHOLD_PX = 4;
/** Free-drag inset from the frame edge (final snapped positions use the 5% / 5.5% safe margins). */
const DRAG_INSET_PX = 6;

const BADGE_LABEL: Record<BadgeKey, string> = { scoreboard: 'event', attribution: 'attribution' };

const slotLabel = (slot: StoryBadgePosition) => slot.replace('-', ' ');

export const StoryBadges: React.FC<StoryBadgesProps> = ({ badges, theme = 'dark', onBadgesChange }) => {
    const layerRef = useRef<HTMLDivElement | null>(null);
    const badgeRefs = useRef<Record<BadgeKey, HTMLDivElement | null>>({ scoreboard: null, attribution: null });
    const prevLayout = useRef<Partial<Record<BadgeKey, { x: number; y: number; fw: number; fh: number }>>>({});

    const [drag, setDrag] = useState<DragState | null>(null);
    const [selected, setSelected] = useState<BadgeKey | null>(null);
    const [status, setStatus] = useState('');

    const interactive = Boolean(onBadgesChange);

    const isScoreboardActive = Boolean(
        badges?.showScoreboard && (badges.scoreboardTitle || (badges.teams && badges.teams.length > 0))
    );
    const isAttributionActive = Boolean(badges?.showAttribution);
    const isActive: Record<BadgeKey, boolean> = { scoreboard: isScoreboardActive, attribution: isAttributionActive };

    const positions: Record<BadgeKey, StoryBadgePosition> = {
        scoreboard: badges?.scoreboardPosition || DEFAULT_SCOREBOARD_POSITION,
        attribution: badges?.attributionPosition || DEFAULT_ATTRIBUTION_POSITION,
    };
    const otherOf = (key: BadgeKey): BadgeKey => (key === 'scoreboard' ? 'attribution' : 'scoreboard');

    // While dragging, render the *resolved* layout live so the other badge visibly gets out of the way.
    const displayed: Record<BadgeKey, StoryBadgePosition> =
        drag && drag.moved
            ? resolveBadgeDrop(drag.key, drag.target, positions, isActive[otherOf(drag.key)])
            : positions;

    // ---------------------------------------------------------------------------------------
    // FLIP animation: whenever a badge's resting layout changes (drop, swap, tab picker, toggle),
    // animate from where it was drawn last frame to where it now sits. Uses offsetLeft/Top, which
    // ignore transforms, so in-flight animations never feed back into the measurement.
    // ---------------------------------------------------------------------------------------
    useLayoutEffect(() => {
        const layer = layerRef.current;
        if (!layer) return;
        const fw = layer.clientWidth;
        const fh = layer.clientHeight;
        const reduceMotion =
            typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        (['scoreboard', 'attribution'] as const).forEach((key) => {
            const el = badgeRefs.current[key];
            if (!el) {
                delete prevLayout.current[key];
                return;
            }
            const next = { x: el.offsetLeft, y: el.offsetTop, fw, fh };
            const prev = prevLayout.current[key];
            prevLayout.current[key] = next;

            if (!prev || reduceMotion || typeof el.animate !== 'function') return;
            if (drag?.moved && drag.key === key) return; // follows the pointer 1:1
            if (prev.fw !== fw || prev.fh !== fh) return; // frame resized, not a move
            const dx = prev.x - next.x;
            const dy = prev.y - next.y;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

            el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], {
                duration: 300,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            });
        });
    });

    // Tap anywhere outside the selected badge to deselect it (hides its handles on touch devices).
    useEffect(() => {
        if (!selected) return;
        const onDocPointerDown = (e: PointerEvent) => {
            const el = badgeRefs.current[selected];
            if (el && e.target instanceof Node && el.contains(e.target)) return;
            setSelected(null);
        };
        document.addEventListener('pointerdown', onDocPointerDown, true);
        return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
    }, [selected]);

    // A badge that gets hidden can't stay selected.
    if (selected && !isActive[selected]) {
        setSelected(null);
    }

    if (!badges) return null;

    const commit = (key: BadgeKey, slot: StoryBadgePosition, verb: 'Moved' | 'Placed') => {
        if (!onBadgesChange) return;
        const other = otherOf(key);
        const next = resolveBadgeDrop(key, slot, positions, isActive[other]);
        if (next.scoreboard === positions.scoreboard && next.attribution === positions.attribution) return;
        onBadgesChange({ ...badges, scoreboardPosition: next.scoreboard, attributionPosition: next.attribution });
        const swapped = next[other] !== positions[other];
        setStatus(
            `${verb} ${BADGE_LABEL[key]} badge to ${slotLabel(slot)}.` +
                (swapped ? ` ${BADGE_LABEL[other]} badge moved to ${slotLabel(next[other])}.` : '')
        );
    };

    // ---------------------------------------------------------------------------------------
    // Pointer gestures (whole badge is the drag surface; pointer capture keeps tracking outside)
    // ---------------------------------------------------------------------------------------
    const handlePointerDown = (key: BadgeKey) => (e: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.story-cropper__badge-handle--close')) return;
        e.stopPropagation(); // don't pan the photo underneath

        const el = badgeRefs.current[key];
        const layer = layerRef.current;
        if (!el || !layer) return;
        const frame = layer.getBoundingClientRect();
        const x = el.offsetLeft;
        const y = el.offsetTop;

        try {
            el.setPointerCapture?.(e.pointerId);
        } catch {
            // Pointer capture is best-effort (unsupported in some test environments)
        }

        setSelected(key);
        setDrag({
            key,
            pointerId: e.pointerId,
            startClientX: e.clientX,
            startClientY: e.clientY,
            grabOffsetX: e.clientX - frame.left - x,
            grabOffsetY: e.clientY - frame.top - y,
            x,
            y,
            w: el.offsetWidth,
            h: el.offsetHeight,
            target: positions[key],
            moved: false,
        });
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        e.stopPropagation();
        const travelled = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
        if (!drag.moved && travelled < DRAG_THRESHOLD_PX) return;

        const layer = layerRef.current;
        if (!layer) return;
        const frame = layer.getBoundingClientRect();
        const maxX = Math.max(DRAG_INSET_PX, frame.width - drag.w - DRAG_INSET_PX);
        const maxY = Math.max(DRAG_INSET_PX, frame.height - drag.h - DRAG_INSET_PX);
        const x = Math.min(maxX, Math.max(DRAG_INSET_PX, e.clientX - frame.left - drag.grabOffsetX));
        const y = Math.min(maxY, Math.max(DRAG_INSET_PX, e.clientY - frame.top - drag.grabOffsetY));
        const target = pickSlotFromDrag(x, y, drag.w, drag.h, frame.width, frame.height, DRAG_INSET_PX);

        setDrag({ ...drag, x, y, target, moved: true });
    };

    const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        e.stopPropagation();
        try {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        if (drag.moved && !cancelled) commit(drag.key, drag.target, 'Placed');
        setDrag(null);
    };

    // ---------------------------------------------------------------------------------------
    // Keyboard (on the move handle): arrows step between slots, Delete removes, Escape deselects
    // ---------------------------------------------------------------------------------------
    const handleKeyDown = (key: BadgeKey) => (e: React.KeyboardEvent) => {
        const pos = positions[key];
        const [tier, col] = pos.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
        const cols = ['left', 'center', 'right'] as const;
        const ci = cols.indexOf(col);
        let target: StoryBadgePosition;

        switch (e.key) {
            case 'ArrowLeft':
                target = `${tier}-${cols[Math.max(0, ci - 1)]}` as StoryBadgePosition;
                break;
            case 'ArrowRight':
                target = `${tier}-${cols[Math.min(2, ci + 1)]}` as StoryBadgePosition;
                break;
            case 'ArrowUp':
                target = `top-${col}` as StoryBadgePosition;
                break;
            case 'ArrowDown':
                target = `bottom-${col}` as StoryBadgePosition;
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                e.stopPropagation();
                hideBadge(key);
                return;
            case 'Escape':
                e.stopPropagation();
                (e.currentTarget as HTMLElement).blur();
                setSelected(null);
                return;
            default:
                return;
        }
        // Always swallow arrows so the photo cropper underneath doesn't pan too.
        e.preventDefault();
        e.stopPropagation();
        if (target !== pos) commit(key, target, 'Moved');
    };

    const hideBadge = (key: BadgeKey) => {
        if (!onBadgesChange) return;
        onBadgesChange(
            key === 'scoreboard' ? { ...badges, showScoreboard: false } : { ...badges, showAttribution: false }
        );
        setSelected(null);
        setStatus(`${BADGE_LABEL[key] === 'event' ? 'Event' : 'Attribution'} badge hidden.`);
    };

    // ---------------------------------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------------------------------
    const isLight = theme === 'light';
    const renderScores = badges.showScores !== false;
    const isDragging = Boolean(drag?.moved);

    const renderBadge = (key: BadgeKey, content: React.ReactNode) => {
        const beingDragged = isDragging && drag?.key === key;
        const classes = [
            'story-cropper__badge',
            `story-cropper__badge--${key}`,
            `story-cropper__badge--pos-${displayed[key]}`,
            isLight ? 'story-cropper__badge--light' : '',
            interactive ? 'story-cropper__badge--interactive' : '',
            selected === key ? 'story-cropper__badge--selected' : '',
            beingDragged ? 'story-cropper__badge--dragging' : '',
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div
                ref={(el) => {
                    badgeRefs.current[key] = el;
                }}
                className={classes}
                style={
                    beingDragged && drag
                        ? { top: drag.y, left: drag.x, right: 'auto', bottom: 'auto', margin: 0 }
                        : undefined
                }
                onPointerDown={handlePointerDown(key)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => endDrag(e, false)}
                onPointerCancel={(e) => endDrag(e, true)}
                onDoubleClick={(e) => e.stopPropagation()}
            >
                {interactive && (
                    <>
                        <button
                            type="button"
                            className="story-cropper__badge-handle story-cropper__badge-handle--move"
                            aria-label={`Move ${BADGE_LABEL[key]} badge`}
                            title="Drag to move · Arrow keys to step"
                            onKeyDown={handleKeyDown(key)}
                            onFocus={() => setSelected(key)}
                        >
                            <Move size={12} />
                        </button>
                        <button
                            type="button"
                            className="story-cropper__badge-handle story-cropper__badge-handle--close"
                            aria-label={`Remove ${BADGE_LABEL[key]} badge`}
                            title="Remove badge"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                hideBadge(key);
                            }}
                        >
                            <X size={12} />
                        </button>
                    </>
                )}
                {content}
            </div>
        );
    };

    const scoreboardContent = (
        <>
            {badges.matchDate && <div className="story-cropper__event-date">{badges.matchDate}</div>}
            {badges.matchDate && <div className="story-cropper__event-divider" />}
            <div className="story-cropper__event-teams-stack">
                {badges.teams && badges.teams.length >= 2 ? (
                    <>
                        <div className="story-cropper__team-row">
                            <span className="story-cropper__team-name">{formatTeamName(badges.teams[0])}</span>
                            {renderScores && badges.score1 != null && (
                                <span
                                    className={`story-cropper__team-score ${
                                        badges.score2 != null && Number(badges.score1) > Number(badges.score2)
                                            ? 'is-win'
                                            : ''
                                    }`}
                                >
                                    {badges.score1}
                                </span>
                            )}
                        </div>
                        <div className="story-cropper__team-row">
                            <span className="story-cropper__team-name">{formatTeamName(badges.teams[1])}</span>
                            {renderScores && badges.score2 != null && (
                                <span
                                    className={`story-cropper__team-score ${
                                        badges.score1 != null && Number(badges.score2) > Number(badges.score1)
                                            ? 'is-win'
                                            : ''
                                    }`}
                                >
                                    {badges.score2}
                                </span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="story-cropper__team-row">
                        <span className="story-cropper__team-name">{badges.scoreboardTitle || badges.teams?.[0]}</span>
                    </div>
                )}
            </div>
        </>
    );

    const attributionContent = (
        <>
            <span className="story-cropper__logo-icon" aria-hidden="true" />
            <span className="story-cropper__logo-text">
                {badges.attributionLogoText || 'PHOTOS BY'}{' '}
                <span className="story-cropper__logo-accent">{badges.attributionLogoAccent || 'PERKINS'}</span>
            </span>
            {badges.attributionDomain && <span className="story-cropper__logo-domain">{badges.attributionDomain}</span>}
        </>
    );

    return (
        <div
            ref={layerRef}
            className={`story-cropper__badges-container${isDragging ? ' story-cropper__badges-container--dragging' : ''}`}
        >
            <span className="sr-only" role="status" aria-live="polite">
                {status}
            </span>

            {/* Drop guide: a true-size ghost exactly where the badge will land */}
            {isDragging && drag && (
                <div className="story-cropper__drop-guides" aria-hidden="true">
                    <div
                        key={drag.target}
                        className={`story-cropper__drop-ghost story-cropper__drop-ghost--${drag.key} story-cropper__badge--pos-${drag.target}`}
                        style={{ width: drag.w, height: drag.h }}
                    />
                </div>
            )}

            {isScoreboardActive && renderBadge('scoreboard', scoreboardContent)}
            {isAttributionActive && renderBadge('attribution', attributionContent)}
        </div>
    );
};
