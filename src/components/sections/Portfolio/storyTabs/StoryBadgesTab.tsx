import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from '../../../ui/icons';
import { SPRING_SNAPPY } from '../../../../utils/motion';
import type { BadgeOptions, StoryBadgePosition } from '../../../../utils/storyCanvas';
import {
    DEFAULT_SCOREBOARD_POSITION,
    DEFAULT_ATTRIBUTION_POSITION,
    resolveBadgeDrop,
    resolveBadgeEnable,
} from '../../../../utils/storyCanvas';
import { formatTeamName } from '../../../../utils/formatters';

interface StoryBadgesTabProps {
    badges: BadgeOptions;
    setBadges: React.Dispatch<React.SetStateAction<BadgeOptions>>;
    cardTheme: 'dark' | 'light';
    setCardTheme: (theme: 'dark' | 'light') => void;
    eventInfo: {
        title: string;
        date: string;
        teams: string[];
    };
    isEventAmbiguous?: boolean;
    setIsDownloaded: (val: boolean) => void;
}

type BadgeKey = 'scoreboard' | 'attribution';
type Positions = { scoreboard: StoryBadgePosition; attribution: StoryBadgePosition };

const BADGE_NAME: Record<BadgeKey, string> = { scoreboard: 'Event', attribution: 'Attribution' };
const BADGE_ARIA: Record<BadgeKey, string> = { scoreboard: 'event', attribution: 'attribution' };

const TIERS = ['top', 'bottom'] as const;
const COLUMNS = ['left', 'center', 'right'] as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** 'top-left' -> 'Top Left' */
const slotLabel = (slot: StoryBadgePosition) => slot.split('-').map(capitalize).join(' ');

const positionsOf = (b: BadgeOptions): Positions => ({
    scoreboard: b.scoreboardPosition || DEFAULT_SCOREBOARD_POSITION,
    attribution: b.attributionPosition || DEFAULT_ATTRIBUTION_POSITION,
});

interface BadgeSlotPickerProps {
    badgeKey: BadgeKey;
    value: StoryBadgePosition;
    /** Slot held by the other badge, when it's showing */
    otherSlot: StoryBadgePosition | null;
    disabled: boolean;
    onPick: (slot: StoryBadgePosition) => void;
}

/**
 * A miniature story frame: three slots along the top edge, three along the bottom.
 * Shows where this badge sits, and where the other badge sits (picking its edge trades places).
 */
const BadgeSlotPicker: React.FC<BadgeSlotPickerProps> = ({ badgeKey, value, otherSlot, disabled, onPick }) => {
    const otherKey: BadgeKey = badgeKey === 'scoreboard' ? 'attribution' : 'scoreboard';
    const otherTier = otherSlot?.split('-')[0];

    return (
        <div
            className={`story-export-modal__badge-position-picker ${
                disabled ? 'story-export-modal__badge-position-picker--disabled' : ''
            }`}
        >
            <div className="story-export-modal__position-meta">
                <span className="story-export-modal__position-label">Position</span>
                <span className="story-export-modal__position-value" aria-hidden="true">
                    {disabled ? 'Hidden' : slotLabel(value)}
                </span>
            </div>
            <div
                className="story-export-modal__slot-frame"
                role="group"
                aria-label={`${BADGE_NAME[badgeKey]} badge position`}
            >
                {TIERS.map((tier) => (
                    <React.Fragment key={tier}>
                        {tier === 'bottom' && (
                            <span className="story-export-modal__slot-frame-photo" aria-hidden="true" />
                        )}
                        <div className={`story-export-modal__slot-row story-export-modal__slot-row--${tier}`}>
                            {COLUMNS.map((col) => {
                                const slot = `${tier}-${col}` as StoryBadgePosition;
                                const isActive = slot === value;
                                const isOccupied = !isActive && slot === otherSlot;
                                const swaps = !isActive && tier === otherTier;
                                const label = slotLabel(slot);
                                const title = isActive
                                    ? `${label} (current)`
                                    : swaps
                                      ? `${label} · swaps with ${BADGE_NAME[otherKey]}`
                                      : label;
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        className={[
                                            'story-export-modal__slot-btn',
                                            `story-export-modal__slot-btn--${col}`,
                                            isActive ? 'story-export-modal__slot-btn--active' : '',
                                            isOccupied ? 'story-export-modal__slot-btn--occupied' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        onClick={() => onPick(slot)}
                                        title={disabled ? undefined : title}
                                        aria-label={`Position ${BADGE_ARIA[badgeKey]} at ${label}`}
                                        aria-pressed={isActive}
                                        disabled={disabled}
                                    >
                                        <span className="story-export-modal__slot-mark" aria-hidden="true" />
                                    </button>
                                );
                            })}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export const StoryBadgesTab: React.FC<StoryBadgesTabProps> = ({
    badges,
    setBadges,
    cardTheme,
    setCardTheme,
    eventInfo,
    isEventAmbiguous = false,
    setIsDownloaded,
}) => {
    const isScoreboardSuppressed = Boolean(isEventAmbiguous || badges.isEventAmbiguous);
    const isScoreboardAvailable = Boolean(
        !isScoreboardSuppressed && (eventInfo.title || (eventInfo.teams && eventInfo.teams.length > 0))
    );
    const isScoreboardActive = Boolean(badges.showScoreboard && isScoreboardAvailable);
    const isAttributionActive = Boolean(badges.showAttribution);

    const { scoreboard: currentScoreboardPos, attribution: currentAttributionPos } = positionsOf(badges);

    const applyPositions = (prev: BadgeOptions, next: Positions): BadgeOptions => ({
        ...prev,
        scoreboardPosition: next.scoreboard,
        attributionPosition: next.attribution,
    });

    const handleSetPosition = (badgeKey: BadgeKey, targetSlot: StoryBadgePosition) => {
        setBadges((prev) => {
            const isOtherActive =
                badgeKey === 'scoreboard'
                    ? Boolean(prev.showAttribution)
                    : Boolean(prev.showScoreboard);
            return applyPositions(prev, resolveBadgeDrop(badgeKey, targetSlot, positionsOf(prev), isOtherActive));
        });
        setIsDownloaded(false);
    };

    /** Toggling a badge back on must never stack it on the other badge's edge. */
    const handleToggleBadge = (badgeKey: BadgeKey, checked: boolean) => {
        setBadges((prev) => {
            if (!checked) {
                return badgeKey === 'scoreboard'
                    ? { ...prev, showScoreboard: false }
                    : { ...prev, showAttribution: false };
            }
            const isOtherActive =
                badgeKey === 'scoreboard'
                    ? Boolean(prev.showAttribution)
                    : Boolean(prev.showScoreboard);
            const next = applyPositions(prev, resolveBadgeEnable(badgeKey, positionsOf(prev), isOtherActive));
            return badgeKey === 'scoreboard' ? { ...next, showScoreboard: true } : { ...next, showAttribution: true };
        });
        setIsDownloaded(false);
    };

    /** Unified 3-way toggle for scoreboard badge: Scores / Event / Hide */
    const handleSetScoreboardMode = (mode: 'scores' | 'event' | 'hide') => {
        setBadges((prev) => {
            if (mode === 'hide') {
                return { ...prev, showScoreboard: false };
            }
            const isOtherActive = Boolean(prev.showAttribution);
            const next = applyPositions(prev, resolveBadgeEnable('scoreboard', positionsOf(prev), isOtherActive));
            return {
                ...next,
                showScoreboard: true,
                showScores: mode === 'scores',
            };
        });
        setIsDownloaded(false);
    };

    return (
        <div className="story-export-modal__tab-content story-export-modal__tab-content--badges">
            <div className="story-export-modal__section story-export-modal__section--badges">
                <div className="story-export-modal__badges-header">
                    <span className="story-export-modal__section-heading">BADGES</span>
                    <div className="story-export-modal__badges-header-actions">
                        <div
                            className="portfolio__segmented-toggle story-export-modal__theme-toggle"
                            role="group"
                            aria-label="Story badge theme"
                        >
                            <button
                                type="button"
                                className={`story-export-modal__theme-btn ${
                                    cardTheme === 'light' ? 'active story-export-modal__theme-btn--active' : ''
                                }`}
                                onClick={() => {
                                    setCardTheme('light');
                                    setIsDownloaded(false);
                                }}
                                aria-label="Light card theme"
                                aria-pressed={cardTheme === 'light'}
                                title="Light card theme"
                            >
                                {cardTheme === 'light' && (
                                    <motion.span
                                        className="portfolio__segment-pill"
                                        layoutId="storyBadgeThemePill"
                                        transition={SPRING_SNAPPY}
                                    />
                                )}
                                <Sun size={16} />
                            </button>
                            <button
                                type="button"
                                className={`story-export-modal__theme-btn ${
                                    cardTheme === 'dark' ? 'active story-export-modal__theme-btn--active' : ''
                                }`}
                                onClick={() => {
                                    setCardTheme('dark');
                                    setIsDownloaded(false);
                                }}
                                aria-label="Dark card theme"
                                aria-pressed={cardTheme === 'dark'}
                                title="Dark card theme"
                            >
                                {cardTheme === 'dark' && (
                                    <motion.span
                                        className="portfolio__segment-pill"
                                        layoutId="storyBadgeThemePill"
                                        transition={SPRING_SNAPPY}
                                    />
                                )}
                                <Moon size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="story-export-modal__badges-list">
                    {/* Attribution Badge Row */}
                    <div className="story-export-modal__checkbox-row">
                        <div className="story-export-modal__checkbox-main">
                            <div
                                className={`story-export-modal__badge-preview-item ${
                                    !badges.showAttribution ? 'story-export-modal__badge-preview-item--disabled' : ''
                                }`}
                            >
                                <div
                                    className={`story-export-modal__preview-badge story-export-modal__preview-badge--attribution ${
                                        cardTheme === 'light' ? 'story-export-modal__preview-badge--light' : ''
                                    }`}
                                >
                                    <span className="story-export-modal__preview-logo-icon" aria-hidden="true" />
                                    <span className="story-export-modal__preview-logo-text">
                                        {badges.attributionLogoText || 'PHOTOS BY'}{' '}
                                        <span className="story-export-modal__preview-logo-accent">
                                            {badges.attributionLogoAccent || 'PERKINS'}
                                        </span>
                                    </span>
                                    {badges.attributionDomain && (
                                        <span className="story-export-modal__preview-logo-domain">
                                            {badges.attributionDomain}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div
                                className="portfolio__segmented-toggle story-export-modal__scores-toggle"
                                role="group"
                                aria-label="Photographer Attribution visibility"
                            >
                                <button
                                    type="button"
                                    className={`story-export-modal__scores-btn ${
                                        badges.showAttribution ? 'active story-export-modal__scores-btn--active' : ''
                                    }`}
                                    onClick={() => handleToggleBadge('attribution', true)}
                                    aria-label="Show attribution badge"
                                    aria-pressed={Boolean(badges.showAttribution)}
                                >
                                    {badges.showAttribution && (
                                        <motion.span
                                            className="portfolio__segment-pill"
                                            layoutId="storyAttrTogglePill"
                                            transition={SPRING_SNAPPY}
                                        />
                                    )}
                                    <span>Show</span>
                                </button>
                                <button
                                    type="button"
                                    className={`story-export-modal__scores-btn ${
                                        !badges.showAttribution ? 'active story-export-modal__scores-btn--active' : ''
                                    }`}
                                    onClick={() => handleToggleBadge('attribution', false)}
                                    aria-label="Hide attribution badge"
                                    aria-pressed={!badges.showAttribution}
                                >
                                    {!badges.showAttribution && (
                                        <motion.span
                                            className="portfolio__segment-pill"
                                            layoutId="storyAttrTogglePill"
                                            transition={SPRING_SNAPPY}
                                        />
                                    )}
                                    <span>Hide</span>
                                </button>
                            </div>
                        </div>

                        <BadgeSlotPicker
                            badgeKey="attribution"
                            value={currentAttributionPos}
                            otherSlot={isScoreboardActive ? currentScoreboardPos : null}
                            disabled={!isAttributionActive}
                            onPick={(slot) => handleSetPosition('attribution', slot)}
                        />
                    </div>

                    {/* Event Scoreboard Badge Row */}
                    {isScoreboardSuppressed ? (
                        <div
                            className="story-export-modal__notice story-export-modal__notice--suppressed"
                            role="status"
                            aria-live="polite"
                        >
                            <span className="story-export-modal__notice-text">
                                Event badge is suppressed because chosen photos are from different events.
                            </span>
                        </div>
                    ) : (
                        isScoreboardAvailable && (
                            <div className="story-export-modal__checkbox-row">
                            <div className="story-export-modal__checkbox-main">
                                <div
                                    className={`story-export-modal__badge-preview-item ${
                                        !badges.showScoreboard ? 'story-export-modal__badge-preview-item--disabled' : ''
                                    }`}
                                >
                                    <div
                                        className={`story-export-modal__preview-badge story-export-modal__preview-badge--scoreboard ${
                                            cardTheme === 'light' ? 'story-export-modal__preview-badge--light' : ''
                                        }`}
                                    >
                                        {badges.matchDate && (
                                            <div className="story-export-modal__preview-event-date">
                                                {badges.matchDate}
                                            </div>
                                        )}
                                        {badges.matchDate && (
                                            <div className="story-export-modal__preview-event-divider" />
                                        )}
                                        <div className="story-export-modal__preview-event-teams-stack">
                                            {badges.teams && badges.teams.length >= 2 ? (
                                                <>
                                                    <div className="story-export-modal__preview-team-row">
                                                        <span className="story-export-modal__preview-team-name">
                                                            {formatTeamName(badges.teams[0])}
                                                        </span>
                                                        {badges.showScores !== false && badges.score1 != null && (
                                                            <span
                                                                className={`story-export-modal__preview-team-score ${
                                                                    badges.score2 != null &&
                                                                    Number(badges.score1) > Number(badges.score2)
                                                                        ? 'is-win'
                                                                        : ''
                                                                }`}
                                                            >
                                                                {badges.score1}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="story-export-modal__preview-team-row">
                                                        <span className="story-export-modal__preview-team-name">
                                                            {formatTeamName(badges.teams[1])}
                                                        </span>
                                                        {badges.showScores !== false && badges.score2 != null && (
                                                            <span
                                                                className={`story-export-modal__preview-team-score ${
                                                                    badges.score1 != null &&
                                                                    Number(badges.score2) > Number(badges.score1)
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
                                                <div className="story-export-modal__preview-team-row">
                                                    <span className="story-export-modal__preview-team-name">
                                                        {badges.scoreboardTitle || badges.teams?.[0]}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {badges.teams &&
                                badges.teams.length >= 2 &&
                                badges.score1 != null &&
                                badges.score2 != null ? (
                                    <div
                                        className="portfolio__segmented-toggle story-export-modal__scores-toggle"
                                        role="group"
                                        aria-label="Event badge visibility and scores"
                                    >
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                badges.showScoreboard && badges.showScores !== false
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => handleSetScoreboardMode('scores')}
                                            aria-label="Show event badge with scores"
                                            aria-pressed={Boolean(badges.showScoreboard && badges.showScores !== false)}
                                        >
                                            {badges.showScoreboard && badges.showScores !== false && (
                                                <motion.span
                                                    className="portfolio__segment-pill"
                                                    layoutId="storyEventTogglePill"
                                                    transition={SPRING_SNAPPY}
                                                />
                                            )}
                                            <span>Scores</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                badges.showScoreboard && badges.showScores === false
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => handleSetScoreboardMode('event')}
                                            aria-label="Show event badge without scores"
                                            aria-pressed={Boolean(badges.showScoreboard && badges.showScores === false)}
                                        >
                                            {badges.showScoreboard && badges.showScores === false && (
                                                <motion.span
                                                    className="portfolio__segment-pill"
                                                    layoutId="storyEventTogglePill"
                                                    transition={SPRING_SNAPPY}
                                                />
                                            )}
                                            <span>Event</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                !badges.showScoreboard
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => handleSetScoreboardMode('hide')}
                                            aria-label="Hide event badge"
                                            aria-pressed={!badges.showScoreboard}
                                        >
                                            {!badges.showScoreboard && (
                                                <motion.span
                                                    className="portfolio__segment-pill"
                                                    layoutId="storyEventTogglePill"
                                                    transition={SPRING_SNAPPY}
                                                />
                                            )}
                                            <span>Hide</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="portfolio__segmented-toggle story-export-modal__scores-toggle"
                                        role="group"
                                        aria-label="Event badge visibility"
                                    >
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                badges.showScoreboard
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => handleToggleBadge('scoreboard', true)}
                                            aria-label="Show event badge"
                                            aria-pressed={Boolean(badges.showScoreboard)}
                                        >
                                            {badges.showScoreboard && (
                                                <motion.span
                                                    className="portfolio__segment-pill"
                                                    layoutId="storyEventTogglePill"
                                                    transition={SPRING_SNAPPY}
                                                />
                                            )}
                                            <span>Show</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                !badges.showScoreboard
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => handleToggleBadge('scoreboard', false)}
                                            aria-label="Hide event badge"
                                            aria-pressed={!badges.showScoreboard}
                                        >
                                            {!badges.showScoreboard && (
                                                <motion.span
                                                    className="portfolio__segment-pill"
                                                    layoutId="storyEventTogglePill"
                                                    transition={SPRING_SNAPPY}
                                                />
                                            )}
                                            <span>Hide</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <BadgeSlotPicker
                                badgeKey="scoreboard"
                                value={currentScoreboardPos}
                                otherSlot={isAttributionActive ? currentAttributionPos : null}
                                disabled={!isScoreboardActive}
                                onPick={(slot) => handleSetPosition('scoreboard', slot)}
                            />
                        </div>
                    )
                )}
                </div>
            </div>
        </div>
    );
};
