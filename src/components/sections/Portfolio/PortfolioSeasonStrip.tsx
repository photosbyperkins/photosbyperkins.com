import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from '../../ui/icons';
import { getTeamNameFormats, findEarliestEventForTeam } from '../../../utils/formatters';
import { scrollToElement } from '../../../utils/scroll';
import type { GearItem } from '../../../data/gearData';
import type { SeasonStats, EventData } from '../../../types';

export interface PortfolioSeasonStripProps {
    stats: SeasonStats;
    totalEvents: number;
    totalPhotos: number;
    firstSeenTeam: string | null;
    mostSeenTeam: string | null;
    cameraGear: GearItem | null;
    lensGear: GearItem | null;
    events: [string, EventData][];
}

export default function PortfolioSeasonStrip({
    stats,
    totalEvents,
    totalPhotos,
    firstSeenTeam,
    mostSeenTeam,
    cameraGear,
    lensGear,
    events,
}: PortfolioSeasonStripProps) {
    return (
        <div className="portfolio__season-summary">
            <div className="portfolio__season-strip">
                <div className="portfolio__season-stat-compact portfolio__season-stat-compact--events">
                    <span className="portfolio__season-stat-label">Games</span>
                    <span className="portfolio__season-stat-value">{totalEvents}</span>
                </div>
                {totalPhotos > 0 && (
                    <div className="portfolio__season-stat-compact portfolio__season-stat-compact--photos">
                        <span className="portfolio__season-stat-label">Photos</span>
                        <span className="portfolio__season-stat-value">{totalPhotos.toLocaleString()}</span>
                    </div>
                )}
                {firstSeenTeam ? (
                    <div className="portfolio__season-stat-compact portfolio__season-stat-compact--first-seen">
                        <span className="portfolio__season-stat-label">First Seen</span>
                        <button
                            type="button"
                            className="portfolio__season-stat-value portfolio__season-stat-btn"
                            title={`Scroll to event: ${firstSeenTeam}`}
                            aria-label={`Scroll to event: ${firstSeenTeam}`}
                            onClick={() => {
                                const foundEventName = findEarliestEventForTeam(events, firstSeenTeam);
                                if (foundEventName) {
                                    const elementId = `event-${foundEventName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
                                    scrollToElement(elementId);
                                }
                            }}
                        >
                            {getTeamNameFormats(firstSeenTeam).short || firstSeenTeam}
                        </button>
                    </div>
                ) : mostSeenTeam ? (
                    <div className="portfolio__season-stat-compact portfolio__season-stat-compact--team">
                        <span className="portfolio__season-stat-label">Most Seen</span>
                        <span className="portfolio__season-stat-value" title={mostSeenTeam}>
                            {getTeamNameFormats(mostSeenTeam).short || mostSeenTeam}
                        </span>
                    </div>
                ) : null}
                {stats.mostUsedCamera && (
                    <div className="portfolio__season-stat-compact portfolio__season-stat-compact--camera">
                        <span className="portfolio__season-stat-label">
                            <Heart
                                size={10}
                                style={{
                                    display: 'inline',
                                    marginRight: '4px',
                                    transform: 'translateY(-1px)',
                                }}
                                fill="var(--color-text-muted)"
                            />
                            Camera
                        </span>
                        {cameraGear ? (
                            <Link
                                to={`/portfolio/gear/${cameraGear.id}`}
                                className="portfolio__season-stat-value portfolio__season-stat-btn"
                                title={`View photos taken with ${cameraGear.name}`}
                                aria-label={`View photos taken with ${cameraGear.name}`}
                                onClick={() => {
                                    window.scrollTo({ top: 0, behavior: 'instant' });
                                }}
                            >
                                {stats.mostUsedCamera}
                            </Link>
                        ) : (
                            <span className="portfolio__season-stat-value">{stats.mostUsedCamera}</span>
                        )}
                    </div>
                )}
                {stats.mostUsedLens && (
                    <div className="portfolio__season-stat-compact portfolio__season-stat-compact--lens">
                        <span className="portfolio__season-stat-label">
                            <Heart
                                size={10}
                                style={{
                                    display: 'inline',
                                    marginRight: '4px',
                                    transform: 'translateY(-1px)',
                                }}
                                fill="var(--color-text-muted)"
                            />
                            Lens
                        </span>
                        {lensGear ? (
                            <Link
                                to={`/portfolio/gear/${lensGear.id}`}
                                className="portfolio__season-stat-value portfolio__season-stat-btn"
                                title={`View photos taken with ${lensGear.name}`}
                                aria-label={`View photos taken with ${lensGear.name}`}
                                onClick={() => {
                                    window.scrollTo({ top: 0, behavior: 'instant' });
                                }}
                            >
                                {stats.mostUsedLens}
                            </Link>
                        ) : (
                            <span className="portfolio__season-stat-value">{stats.mostUsedLens}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
