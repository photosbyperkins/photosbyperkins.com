import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import TeamFilter from './TeamFilter';

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
}

export default function GlobalSearchOverlay({
    isOpen,
    onClose,
    teamSearchQuery,
    setTeamSearchQuery,
    filteredTeams,
    isTeamIndexLoading,
}: GlobalSearchOverlayProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="portfolio__global-search-overlay"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    <div className="portfolio__global-search-content">
                        <TeamFilter
                            teamSearchQuery={teamSearchQuery}
                            setTeamSearchQuery={setTeamSearchQuery}
                            filteredTeams={filteredTeams}
                            teamIndexLoading={isTeamIndexLoading}
                            onBack={onClose}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
