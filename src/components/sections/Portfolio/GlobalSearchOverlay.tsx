import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import TeamFilter from './TeamFilter';
import GearFilter, { type GearMeta } from './GearFilter';

interface TeamMeta {
    name: string;
    slug: string;
    count: number;
}

interface GlobalSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    teamSearchQuery: string;
    setTeamSearchQuery: (query: string) => void;
    filteredTeams: TeamMeta[];
    isTeamIndexLoading: boolean;
    gearSearchQuery: string;
    setGearSearchQuery: (query: string) => void;
    filteredGear: GearMeta[];
    isGearIndexLoading: boolean;
}

export default function GlobalSearchOverlay({
    isOpen,
    onClose,
    teamSearchQuery,
    setTeamSearchQuery,
    filteredTeams,
    isTeamIndexLoading,
    gearSearchQuery,
    setGearSearchQuery,
    filteredGear,
    isGearIndexLoading,
}: GlobalSearchOverlayProps) {
    const [activeTab, setActiveTab] = useState<'teams' | 'gear'>('teams');
    const overlayRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useFocusTrap(overlayRef, isOpen);
    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen, activeTab]);

    if (typeof document === 'undefined') return null;

    const isTeams = activeTab === 'teams';
    const currentQuery = isTeams ? teamSearchQuery : gearSearchQuery;
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isTeams) {
            setTeamSearchQuery(e.target.value);
        } else {
            setGearSearchQuery(e.target.value);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={overlayRef}
                    className="portfolio__global-search-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Search portfolio"
                    tabIndex={-1}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    <div className="portfolio__search-topbar">
                        <div className="portfolio__search-topbar-inner container">
                            <div className="portfolio__search-topbar-left">
                                <div className="portfolio__segmented-toggle portfolio__search-tab-toggle">
                                    <button
                                        type="button"
                                        className={activeTab === 'teams' ? 'active' : ''}
                                        onClick={() => setActiveTab('teams')}
                                    >
                                        Teams
                                    </button>
                                    <button
                                        type="button"
                                        className={activeTab === 'gear' ? 'active' : ''}
                                        onClick={() => setActiveTab('gear')}
                                    >
                                        Gear
                                    </button>
                                </div>
                                <div className="portfolio__search-input-wrap">
                                    <Search size={16} className="portfolio__search-input-icon" />
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        enterKeyHint="search"
                                        aria-label={isTeams ? 'Search teams' : 'Search gear'}
                                        value={currentQuery}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                            </div>
                            <button
                                className="portfolio__global-search-back-btn"
                                onClick={onClose}
                                aria-label="Close search"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="portfolio__global-search-content">
                        {isTeams ? (
                            <TeamFilter
                                teamSearchQuery={teamSearchQuery}
                                filteredTeams={filteredTeams}
                                teamIndexLoading={isTeamIndexLoading}
                                onBack={onClose}
                            />
                        ) : (
                            <GearFilter
                                gearSearchQuery={gearSearchQuery}
                                filteredGear={filteredGear}
                                gearIndexLoading={isGearIndexLoading}
                                onBack={onClose}
                            />
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
