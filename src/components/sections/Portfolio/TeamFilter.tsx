import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatTeamName } from '../../../utils/formatters';

interface TeamMeta {
    name: string;
    slug: string;
    count: number;
}

interface TeamFilterProps {
    teamSearchQuery: string;
    filteredTeams: TeamMeta[];
    teamIndexLoading: boolean;
    onBack?: () => void;
}

export default function TeamFilter({ teamSearchQuery, filteredTeams, teamIndexLoading, onBack }: TeamFilterProps) {
    const sortedTeams = useMemo(() => {
        return [...filteredTeams].sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredTeams]);

    return (
        <div className="portfolio__team-search">
            {!teamIndexLoading ? (
                <div className="portfolio__team-grid container">
                    {sortedTeams.length > 0 ? (
                        sortedTeams.map((team) => {
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
                        })
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
