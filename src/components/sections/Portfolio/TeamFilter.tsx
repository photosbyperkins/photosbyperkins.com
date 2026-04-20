import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatTeamName } from '../../../utils/formatters';

interface TeamMeta {
    name: string;
    slug: string;
    count: number;
}

interface TeamFilterProps {
    teamSearchQuery: string;
    setTeamSearchQuery: (val: string) => void;
    filteredTeams: TeamMeta[];
    teamIndexLoading: boolean;
}

type SortMode = 'alpha' | 'count';

export default function TeamFilter({
    teamSearchQuery,
    setTeamSearchQuery,
    filteredTeams,
    teamIndexLoading,
}: TeamFilterProps) {
    const [sortMode, setSortMode] = useState<SortMode>('alpha');

    const sortedTeams = useMemo(() => {
        return [...filteredTeams].sort((a, b) => {
            if (sortMode === 'count') {
                return b.count - a.count || a.name.localeCompare(b.name);
            }
            // default: alpha
            return a.name.localeCompare(b.name);
        });
    }, [filteredTeams, sortMode]);

    const handleToggle = () => {
        setSortMode((prev) => (prev === 'alpha' ? 'count' : 'alpha'));
    };

    const isAlpha = sortMode === 'alpha';
    const isCount = sortMode === 'count';

    return (
        <div className="portfolio__team-search">
            {!teamIndexLoading ? (
                <>
                    <div className="portfolio__team-filter">
                        <div className="portfolio__team-filter-inner">
                            <input
                                type="text"
                                placeholder="Filter teams..."
                                value={teamSearchQuery}
                                onChange={(e) => setTeamSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="portfolio__sort-wrap">
                                <div className="portfolio__segmented-toggle">
                                    <button
                                        className={isAlpha ? 'active' : ''}
                                        onClick={handleToggle}
                                        aria-label="Sort Alphabetical"
                                        title="Sort Alphabetical"
                                    >
                                        <span className="portfolio__sort-icon portfolio__sort-icon--stacked">
                                            <span>A</span>
                                            <span>Z</span>
                                        </span>
                                    </button>
                                    <button
                                        className={isCount ? 'active' : ''}
                                        onClick={handleToggle}
                                        aria-label="Sort by Event Count"
                                        title="Sort by Event Count"
                                    >
                                        <span className="portfolio__sort-icon portfolio__sort-icon--stacked">
                                            <span>9</span>
                                            <span>1</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="portfolio__team-grid">
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
                </>
            ) : (
                <div className="portfolio__loading">Loading teams...</div>
            )}
        </div>
    );
}
