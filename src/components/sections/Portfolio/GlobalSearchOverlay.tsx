import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from '../../ui/icons';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useAppStore } from '../../../store/useAppStore';
import { DURATION, EASE_OUT_EXPO, EASE_IN_OUT, SPRING_SNAPPY } from '../../../utils/motion';
import TeamFilter from './TeamFilter';
import GearFilter, { type GearMeta } from './GearFilter';
import JerseySearchFilter from './JerseySearchFilter';
import type { FindTeamEntry } from '../../../utils/findMyPhotos';

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
    jerseySearchQuery?: string;
    setJerseySearchQuery?: (query: string) => void;
    findTeams?: FindTeamEntry[];
    isFindIndexLoading?: boolean;
    initialTab?: 'teams' | 'gear' | 'jersey';
    initialTeamSlug?: string;
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
    jerseySearchQuery = '',
    setJerseySearchQuery,
    findTeams = [],
    isFindIndexLoading = false,
    initialTab = 'teams',
    initialTeamSlug,
}: GlobalSearchOverlayProps) {
    const [activeTab, setActiveTab] = useState<'teams' | 'gear' | 'jersey'>(initialTab);
    const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
    if (initialTab !== prevInitialTab) {
        setPrevInitialTab(initialTab);
        setActiveTab(initialTab);
    }

    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);
    const overlayRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useFocusTrap(overlayRef, isOpen && !isLightboxOpen, searchInputRef);
    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const state = useAppStore.getState();
                if (state.lightbox.isOpen) return;
                if (state.isBatchSelectMode) {
                    e.stopPropagation();
                    state.setIsBatchSelectMode(false);
                    return;
                }
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && !isLightboxOpen) {
            requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
        }
    }, [isOpen, activeTab, isLightboxOpen]);

    if (typeof document === 'undefined') return null;

    const isTeams = activeTab === 'teams';
    const isGear = activeTab === 'gear';
    const isJersey = activeTab === 'jersey';
    const currentQuery = isTeams ? teamSearchQuery : isGear ? gearSearchQuery : jerseySearchQuery;

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Auto-switch to Jersey tab if user types #<digit> in Teams or Gear tab
        if (!isJersey && /(?:^|\s)#\d/.test(val) && setJerseySearchQuery) {
            setActiveTab('jersey');
            setJerseySearchQuery(val);
            if (isTeams) setTeamSearchQuery('');
            if (isGear) setGearSearchQuery('');
            return;
        }
        if (isTeams) {
            setTeamSearchQuery(val);
        } else if (isGear) {
            setGearSearchQuery(val);
        } else {
            setJerseySearchQuery?.(val);
        }
    };

    const searchAriaLabel = isTeams
        ? 'Search teams'
        : isGear
          ? 'Search gear'
          : 'Search jersey number';

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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_IN_OUT } }}
                    transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
                >
                    <div className="portfolio__search-topbar">
                        <div className="portfolio__search-topbar-inner container">
                            <div className="portfolio__search-topbar-left">
                                <div
                                    className="portfolio__segmented-toggle portfolio__search-tab-toggle"
                                    role="group"
                                    aria-label="Search category"
                                >
                                    <button
                                        type="button"
                                        className={activeTab === 'teams' ? 'active' : ''}
                                        onClick={() => setActiveTab('teams')}
                                        aria-pressed={activeTab === 'teams'}
                                    >
                                        {activeTab === 'teams' && (
                                            <motion.span
                                                className="portfolio__segment-pill"
                                                layoutId="searchTabPill"
                                                transition={SPRING_SNAPPY}
                                            />
                                        )}
                                        <span>Teams</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={activeTab === 'jersey' ? 'active' : ''}
                                        onClick={() => setActiveTab('jersey')}
                                        aria-pressed={activeTab === 'jersey'}
                                    >
                                        {activeTab === 'jersey' && (
                                            <motion.span
                                                className="portfolio__segment-pill"
                                                layoutId="searchTabPill"
                                                transition={SPRING_SNAPPY}
                                            />
                                        )}
                                        <span>Jersey</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={activeTab === 'gear' ? 'active' : ''}
                                        onClick={() => setActiveTab('gear')}
                                        aria-pressed={activeTab === 'gear'}
                                    >
                                        {activeTab === 'gear' && (
                                            <motion.span
                                                className="portfolio__segment-pill"
                                                layoutId="searchTabPill"
                                                transition={SPRING_SNAPPY}
                                            />
                                        )}
                                        <span>Gear</span>
                                    </button>
                                </div>
                                <div className="portfolio__search-input-wrap">
                                    <Search size={16} className="portfolio__search-input-icon" />
                                    <input
                                        ref={searchInputRef}
                                        type="search"
                                        autoFocus
                                        enterKeyHint="search"
                                        aria-label={searchAriaLabel}
                                        value={currentQuery}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                            </div>
                            <button className="portfolio__global-search-back-btn" onClick={onClose} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {!isJersey && (
                        <div className="sr-only" role="status" aria-live="polite">
                            {currentQuery
                                ? isTeams
                                    ? `${filteredTeams.length} ${filteredTeams.length === 1 ? 'team' : 'teams'} found`
                                    : `${filteredGear.length} ${filteredGear.length === 1 ? 'gear item' : 'gear items'} found`
                                : ''}
                        </div>
                    )}

                    <div className="portfolio__global-search-content">
                        {isTeams ? (
                            <TeamFilter
                                teamSearchQuery={teamSearchQuery}
                                filteredTeams={filteredTeams}
                                teamIndexLoading={isTeamIndexLoading}
                                onBack={onClose}
                            />
                        ) : isGear ? (
                            <GearFilter
                                gearSearchQuery={gearSearchQuery}
                                filteredGear={filteredGear}
                                gearIndexLoading={isGearIndexLoading}
                                onBack={onClose}
                            />
                        ) : (
                            <JerseySearchFilter
                                jerseySearchQuery={jerseySearchQuery}
                                setJerseySearchQuery={setJerseySearchQuery}
                                findTeams={findTeams}
                                isFindIndexLoading={isFindIndexLoading}
                                initialTeamSlug={initialTeamSlug}
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

