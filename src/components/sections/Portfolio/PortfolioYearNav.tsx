import { Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { SPRING_SNAPPY } from '../../../utils/motion';
import { X, Heart } from '../../ui/icons';
import { formatTeamName } from '../../../utils/formatters';
import type { GearItem } from '../../../data/gearData';

export interface PortfolioYearNavProps {
    years: string[];
    selectedTab: string;
    isGearRoute: boolean;
    currentGearItem: GearItem | null;
    isTeamMode: boolean;
    activeTeamMeta: { name: string; slug: string; count?: number } | null;
    prefetchTab: (tab: string) => void;
}

export default function PortfolioYearNav({
    years,
    selectedTab,
    isGearRoute,
    currentGearItem,
    isTeamMode,
    activeTeamMeta,
    prefetchTab,
}: PortfolioYearNavProps) {
    return (
        <nav className="portfolio__years" aria-label="Year Navigation">
            {isGearRoute && currentGearItem ? (
                <Link
                    to="/portfolio"
                    className="portfolio__active-filter active"
                    aria-label={`Remove filter for ${currentGearItem.name}`}
                    title={`Remove filter for ${currentGearItem.name}`}
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                >
                    <span>{currentGearItem.compactName || currentGearItem.name}</span>
                    <span className="portfolio__team-clear-icon" aria-hidden="true">
                        <X size={15} strokeWidth={3} />
                    </span>
                </Link>
            ) : isTeamMode && activeTeamMeta ? (
                <Link
                    to="/portfolio"
                    className="portfolio__active-filter active"
                    aria-label={`Remove filter for ${activeTeamMeta.name}`}
                    title={`Remove filter for ${activeTeamMeta.name}`}
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                >
                    <span>{formatTeamName(activeTeamMeta.name)}</span>
                    <span className="portfolio__team-clear-icon" aria-hidden="true">
                        <X size={15} strokeWidth={3} />
                    </span>
                </Link>
            ) : (
                <LayoutGroup id="year-nav">
                    {years.map((y) => (
                        <Link
                            key={y}
                            to={`/portfolio/${y}`}
                            className={`${y === selectedTab ? 'active' : ''}`}
                            aria-label={`Season ${y}`}
                            onPointerEnter={() => prefetchTab(y)}
                            onFocus={() => prefetchTab(y)}
                            onClick={(e) => {
                                if (y === selectedTab) {
                                    e.preventDefault();
                                }
                                window.scrollTo({ top: 0, behavior: 'instant' });
                            }}
                        >
                            <span className="portfolio__year-full" style={{ transform: 'translateY(1px)' }}>
                                {y}
                            </span>
                            <span
                                className="portfolio__year-short"
                                aria-hidden="true"
                                style={{ transform: 'translateY(1px)' }}
                            >
                                {y.slice(-2)}
                            </span>
                            {y === selectedTab && (
                                <motion.span
                                    className="portfolio__year-indicator"
                                    layoutId="yearNavIndicator"
                                    transition={SPRING_SNAPPY}
                                    aria-hidden="true"
                                />
                            )}
                        </Link>
                    ))}
                    <Link
                        to="/portfolio/favorites"
                        className={`${selectedTab === 'favorites' ? 'active' : ''}`}
                        onClick={(e) => {
                            if (selectedTab === 'favorites') {
                                e.preventDefault();
                            }
                            window.scrollTo({ top: 0, behavior: 'instant' });
                        }}
                        title="Favorites"
                        aria-label="Favorites"
                    >
                        <span className="portfolio__year-full">
                            <Heart
                                size={16}
                                fill={selectedTab === 'favorites' ? 'currentColor' : 'none'}
                                style={{
                                    color: selectedTab === 'favorites' ? 'var(--color-accent)' : 'inherit',
                                    transform: 'translateY(3px)',
                                }}
                            />
                        </span>
                        <span className="portfolio__year-short">
                            <Heart
                                size={16}
                                fill={selectedTab === 'favorites' ? 'currentColor' : 'none'}
                                style={{
                                    color: selectedTab === 'favorites' ? 'var(--color-accent)' : 'inherit',
                                    transform: 'translateY(3px)',
                                }}
                            />
                        </span>
                        {selectedTab === 'favorites' && (
                            <motion.span
                                className="portfolio__year-indicator"
                                layoutId="yearNavIndicator"
                                transition={SPRING_SNAPPY}
                                aria-hidden="true"
                            />
                        )}
                    </Link>
                </LayoutGroup>
            )}
        </nav>
    );
}
