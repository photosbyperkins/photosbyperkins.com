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
    const { cameras, lenses } = useMemo(() => {
        const sorted = [...filteredGear].sort((a, b) => {
            return b.photoCount - a.photoCount || a.name.localeCompare(b.name);
        });
        return {
            cameras: sorted.filter((item) => item.type === 'camera'),
            lenses: sorted.filter((item) => item.type === 'lens'),
        };
    }, [filteredGear]);

    const hasResults = cameras.length > 0 || lenses.length > 0;

    const renderGearPill = (item: GearMeta) => (
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

    return (
        <div className="portfolio__team-search portfolio__gear-search">
            {!gearIndexLoading ? (
                <div className="portfolio__team-grid container">
                    {hasResults ? (
                        <>
                            {cameras.length > 0 && (
                                <>
                                    <h3 className="portfolio__gear-category-header">Cameras</h3>
                                    {cameras.map(renderGearPill)}
                                </>
                            )}
                            {lenses.length > 0 && (
                                <>
                                    <h3 className="portfolio__gear-category-header">Lenses</h3>
                                    {lenses.map(renderGearPill)}
                                </>
                            )}
                        </>
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
