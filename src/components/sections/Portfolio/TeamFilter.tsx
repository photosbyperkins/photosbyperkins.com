import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatTeamName } from '../../../utils/formatters';

export interface TeamMeta {
    name: string;
    slug: string;
    count: number;
    isMeta?: boolean;
}

const META_TEAM_SLUGS = new Set([
    'wftda-sanctioned',
    'adults-derby',
    'junior-derby',
    'sacramento-roller-derby',
    'sacramento-roller-derby-juniors',
    'sacramento-roller-derby-juniors-home-teams',
    'sacramento-roller-derby-home-teams',
    'sacramento-roller-derby-travel-teams',
    'sacred-city',
    'sacred-city-home-teams',
    'sacred-city-travel-teams',
    'bay-area-derby',
    'outlaw-roller-derby',
    'santa-cruz-roller-derby',
]);

function isMetaTeam(team: TeamMeta): boolean {
    return team.isMeta ?? META_TEAM_SLUGS.has(team.slug);
}

interface TeamFilterProps {
    teamSearchQuery: string;
    filteredTeams: TeamMeta[];
    teamIndexLoading: boolean;
    onBack?: () => void;
}

export default function TeamFilter({ teamSearchQuery, filteredTeams, teamIndexLoading, onBack }: TeamFilterProps) {
    const { individualTeams, leaguesAndGroups } = useMemo(() => {
        const sorted = [...filteredTeams].sort((a, b) => a.name.localeCompare(b.name));
        return {
            individualTeams: sorted.filter((team) => !isMetaTeam(team)),
            leaguesAndGroups: sorted.filter((team) => isMetaTeam(team)),
        };
    }, [filteredTeams]);

    const hasResults = individualTeams.length > 0 || leaguesAndGroups.length > 0;

    const renderTeamPill = (team: TeamMeta) => {
        const displayName = formatTeamName(team.name);
        return (
            <Link
                key={team.slug}
                to={`/portfolio/team/${team.slug}`}
                className={`portfolio__team-pill ${
                    team.slug === 'wftda-sanctioned' ? 'is-wftda' : ''
                }`}
                onClick={() => {
                    onBack?.();
                    window.scrollTo({ top: 0, behavior: 'instant' });
                }}
            >
                <span className="portfolio__team-name">{displayName}</span>
                <span className="portfolio__team-count">{team.count}</span>
            </Link>
        );
    };

    return (
        <div className="portfolio__team-search">
            {!teamIndexLoading ? (
                <div className="portfolio__team-grid container">
                    {hasResults ? (
                        <>
                            {individualTeams.length > 0 && (
                                <>
                                    <h3 className="portfolio__team-category-header">Individual Teams</h3>
                                    {individualTeams.map(renderTeamPill)}
                                </>
                            )}
                            {leaguesAndGroups.length > 0 && (
                                <>
                                    <h3 className="portfolio__team-category-header">Leagues &amp; Groups</h3>
                                    {leaguesAndGroups.map(renderTeamPill)}
                                </>
                            )}
                        </>
                    ) : (
                        <div className="portfolio__team-empty">No teams found matching "{teamSearchQuery}"</div>
                    )}
                </div>
            ) : (
                <div className="portfolio__loading container">Loading teams...</div>
            )}
        </div>
    );
}
