import { useMemo } from 'react';
import { Link } from 'react-router-dom';

export interface GearMeta {
    id: string;
    name: string;
    shortName: string;
    compactName: string;
    brand: string;
    type: 'camera' | 'lens';
    photoCount: number;
    eventCount: number;
    searchAliases?: string[];
}

interface GearFilterProps {
    gearSearchQuery: string;
    filteredGear: GearMeta[];
    gearIndexLoading: boolean;
    onBack?: () => void;
}

export default function GearFilter({ gearSearchQuery, filteredGear, gearIndexLoading, onBack }: GearFilterProps) {
    const sortedGear = useMemo(() => {
        return [...filteredGear].sort((a, b) => {
            return b.photoCount - a.photoCount || a.name.localeCompare(b.name);
        });
    }, [filteredGear]);

    return (
        <div className="portfolio__team-search portfolio__gear-search">
            {!gearIndexLoading ? (
                <div className="portfolio__team-grid container">
                    {sortedGear.length > 0 ? (
                        sortedGear.map((item) => {
                            return (
                                <Link
                                    key={item.id}
                                    to={`/portfolio/gear/${item.id}`}
                                    className="portfolio__team-pill portfolio__gear-pill"
                                    onClick={() => {
                                        onBack?.();
                                        window.scrollTo({ top: 0, behavior: 'instant' });
                                    }}
                                >
                                    <span className="portfolio__team-name" title={item.name}>
                                        {item.compactName || item.name}
                                    </span>
                                    <span
                                        className="portfolio__team-count"
                                        title={`${item.photoCount.toLocaleString()} photos`}
                                    >
                                        {item.photoCount.toLocaleString()}
                                    </span>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="portfolio__team-empty">No gear found matching "{gearSearchQuery}"</div>
                    )}
                </div>
            ) : (
                <div className="portfolio__loading container">Loading gear...</div>
            )}
        </div>
    );
}
