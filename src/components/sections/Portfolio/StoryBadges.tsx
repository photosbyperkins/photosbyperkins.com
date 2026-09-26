import React from 'react';
import type { BadgeOptions } from '../../../utils/storyCanvas';
import { formatTeamName } from '../../../utils/formatters';

interface StoryBadgesProps {
    badges?: BadgeOptions;
    theme?: 'dark' | 'light';
}

export const StoryBadges: React.FC<StoryBadgesProps> = ({ badges, theme = 'dark' }) => {
    if (!badges) return null;

    const isLight = theme === 'light';
    const lightClass = isLight ? 'story-cropper__badge--light' : '';

    return (
        <>
            {/* Scoreboard Badge Overlay (portfolio__event-header style) */}
            {badges.showScoreboard && (badges.scoreboardTitle || (badges.teams && badges.teams.length > 0)) && (
                <div className={`story-cropper__badge story-cropper__badge--scoreboard ${lightClass}`.trim()}>
                    {badges.matchDate && <div className="story-cropper__event-date">{badges.matchDate}</div>}
                    {badges.matchDate && <div className="story-cropper__event-divider" />}
                    <div className="story-cropper__event-teams-stack">
                        {badges.teams && badges.teams.length >= 2 ? (
                            <>
                                <div className="story-cropper__team-row">
                                    <span className="story-cropper__team-name">{formatTeamName(badges.teams[0])}</span>
                                    {badges.score1 != null && (
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
                                    {badges.score2 != null && (
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
                                <span className="story-cropper__team-name">
                                    {badges.scoreboardTitle || badges.teams?.[0]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Photographer Attribution Overlay (nav__logo style) */}
            {badges.showAttribution && (
                <div className={`story-cropper__badge story-cropper__badge--attribution ${lightClass}`.trim()}>
                    <span className="story-cropper__logo-icon" aria-hidden="true" />
                    <span className="story-cropper__logo-text">
                        {badges.attributionLogoText || 'PHOTOS BY'}{' '}
                        <span className="story-cropper__logo-accent">{badges.attributionLogoAccent || 'PERKINS'}</span>
                    </span>
                    {badges.attributionDomain && (
                        <span className="story-cropper__logo-domain">{badges.attributionDomain}</span>
                    )}
                </div>
            )}
        </>
    );
};
