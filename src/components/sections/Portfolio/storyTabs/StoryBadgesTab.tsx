import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { BadgeOptions } from '../../../../utils/storyCanvas';
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
    setIsDownloaded: (val: boolean) => void;
}

export const StoryBadgesTab: React.FC<StoryBadgesTabProps> = ({
    badges,
    setBadges,
    cardTheme,
    setCardTheme,
    eventInfo,
    setIsDownloaded,
}) => {
    return (
        <div className="story-export-modal__tab-content story-export-modal__tab-content--badges">
            <div className="story-export-modal__section story-export-modal__section--badges">
                <div className="story-export-modal__badges-header">
                    <span className="story-export-modal__section-heading">BADGES</span>
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
                            aria-label="Light badge theme"
                            title="Light badge theme"
                        >
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
                            aria-label="Dark badge theme"
                            title="Dark badge theme"
                        >
                            <Moon size={16} />
                        </button>
                    </div>
                </div>

                <div className="story-export-modal__badges-list">
                    <div className="story-export-modal__checkbox-row">
                        <label className="story-export-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={badges.showAttribution}
                                onChange={(e) => {
                                    setBadges((prev) => ({
                                        ...prev,
                                        showAttribution: e.target.checked,
                                    }));
                                    setIsDownloaded(false);
                                }}
                            />
                            <span className="sr-only">Photographer Attribution</span>
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
                        </label>
                    </div>

                    {(eventInfo.title || (eventInfo.teams && eventInfo.teams.length > 0)) && (
                        <div className="story-export-modal__checkbox-row">
                            <label className="story-export-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={badges.showScoreboard}
                                    onChange={(e) => {
                                        setBadges((prev) => ({
                                            ...prev,
                                            showScoreboard: e.target.checked,
                                        }));
                                        setIsDownloaded(false);
                                    }}
                                />
                                <span className="sr-only">Event Badge</span>
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
                            </label>
                            {badges.teams &&
                                badges.teams.length >= 2 &&
                                badges.score1 != null &&
                                badges.score2 != null && (
                                    <div
                                        className={`portfolio__segmented-toggle story-export-modal__scores-toggle ${
                                            !badges.showScoreboard ? 'story-export-modal__scores-toggle--disabled' : ''
                                        }`}
                                        role="group"
                                        aria-label="Toggle event scores"
                                    >
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                badges.showScores !== false
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                setBadges((prev) => ({
                                                    ...prev,
                                                    showScores: true,
                                                }));
                                                setIsDownloaded(false);
                                            }}
                                            aria-label="Show event scores"
                                            title="Show scores"
                                            disabled={!badges.showScoreboard}
                                        >
                                            Scores
                                        </button>
                                        <button
                                            type="button"
                                            className={`story-export-modal__scores-btn ${
                                                badges.showScores === false
                                                    ? 'active story-export-modal__scores-btn--active'
                                                    : ''
                                            }`}
                                            onClick={() => {
                                                setBadges((prev) => ({
                                                    ...prev,
                                                    showScores: false,
                                                }));
                                                setIsDownloaded(false);
                                            }}
                                            aria-label="Hide event scores"
                                            title="Hide scores"
                                            disabled={!badges.showScoreboard}
                                        >
                                            Off
                                        </button>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
