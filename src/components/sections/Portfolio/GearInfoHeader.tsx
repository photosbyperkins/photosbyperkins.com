import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { GearItem } from '../../../data/gearData';

interface GearInfoHeaderProps {
    gear: GearItem;
    totalPhotos: number;
    totalEvents: number;
}

export const GearInfoHeader: React.FC<GearInfoHeaderProps> = ({ gear, totalPhotos, totalEvents }) => {
    return (
        <div className="portfolio__gear-header">
            <div className="gear-info-card">
                <div className="gear-info-card__header">
                    <div className="gear-info-card__title-meta">
                        <div className="gear-info-card__badges">
                            <span className="gear-info-card__badge gear-info-card__badge--type">{gear.type}</span>
                            <span className="gear-info-card__badge gear-info-card__badge--brand">{gear.brand}</span>
                            <span className="gear-info-card__stats-pill">
                                {totalPhotos.toLocaleString()} {totalPhotos === 1 ? 'Photo' : 'Photos'} across{' '}
                                {totalEvents} {totalEvents === 1 ? 'Event' : 'Events'}
                            </span>
                        </div>
                        <h2 className="gear-info-card__title">
                            <span className="gear-modal__name-full">{gear.name}</span>
                            <span className="gear-modal__name-compact">{gear.compactName || gear.name}</span>
                        </h2>
                    </div>
                    {gear.officialUrl && (
                        <a
                            href={gear.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gear-info-card__official-link"
                            title="Open official product page"
                            aria-label={`Open official product page for ${gear.name}`}
                        >
                            <span>Official Page</span>
                            <ExternalLink size={15} />
                        </a>
                    )}
                </div>

                <div className="gear-modal__spec-grid">
                    {Object.entries(gear.specs).map(([key, val]) => (
                        <div key={key} className="gear-modal__spec-item">
                            <div className="gear-modal__spec-label">{key}</div>
                            <div className="gear-modal__spec-val">{val}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GearInfoHeader;
