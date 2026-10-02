import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Save, Share2, X, CheckSquare, Check, StoryCropIcon } from '../../../ui/icons';
import { useCanShare } from '../../../../hooks/useCanShare';

export interface BatchActionBarProps {
    isVisible: boolean;
    selectedCount: number;
    totalCount: number;
    isAllSelected: boolean;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onFavoriteAll: () => void;
    isAllFavorited?: boolean;
    onDownloadZip: () => void;
    isZipping: boolean;
    zipProgress: number;
    onShare: () => void;
    onDone: () => void;
    onStory?: () => void;
    canShare?: boolean;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
    isVisible,
    selectedCount,
    totalCount: _totalCount,
    isAllSelected,
    onSelectAll,
    onDeselectAll,
    onFavoriteAll,
    isAllFavorited = false,
    onDownloadZip,
    isZipping,
    zipProgress,
    onShare,
    onDone,
    onStory,
    canShare: canShareProp,
}) => {
    const isDeviceCanShare = useCanShare();
    const canShare = canShareProp ?? isDeviceCanShare;
    const [isCopied, setIsCopied] = useState(false);
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.aside
                    className="portfolio__batch-bar"
                    initial={{ x: '-50%', y: 80, opacity: 0 }}
                    animate={{ x: '-50%', y: 0, opacity: 1 }}
                    exit={{ x: '-50%', y: 80, opacity: 0 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    role="toolbar"
                    aria-label="Batch photo actions toolbar"
                >
                    <div className="portfolio__batch-bar-inner">
                        {/* 1. Selection indicator & Select/Deselect All */}
                        <div className="portfolio__batch-meta">
                            <span className="portfolio__batch-count" aria-live="polite">
                                <CheckSquare size={15} className="portfolio__batch-count-icon" />
                                <strong key={selectedCount} className="portfolio__batch-count-num">
                                    {selectedCount}
                                </strong>{' '}
                                <span className="portfolio__batch-count-label">Selected</span>
                            </span>

                            <button
                                type="button"
                                className="portfolio__batch-btn portfolio__batch-btn--subtle"
                                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                                title={isAllSelected ? 'Deselect all photos' : 'Select all photos in album'}
                                aria-label={isAllSelected ? 'Deselect All' : 'Select All'}
                            >
                                <span className="portfolio__batch-btn-text-full">
                                    {isAllSelected ? 'Deselect All' : 'Select All'}
                                </span>
                                <span className="portfolio__batch-btn-text-compact" aria-hidden="true">
                                    {isAllSelected ? 'Clear' : 'All'}
                                </span>
                            </button>
                        </div>

                        <span className="portfolio__batch-divider" aria-hidden="true" />

                        {/* 2. Action buttons (Favorite, Story, Download ZIP, Share) */}
                        <div className="portfolio__batch-actions">
                            <button
                                type="button"
                                className={`portfolio__batch-btn ${
                                    isAllFavorited ? 'portfolio__batch-btn--favorited' : ''
                                }`}
                                onClick={onFavoriteAll}
                                disabled={selectedCount === 0}
                                title={isAllFavorited ? 'Remove selected from favorites' : 'Add selected to favorites'}
                                aria-label={
                                    isAllFavorited ? 'Remove selected from favorites' : 'Add selected to favorites'
                                }
                            >
                                <Heart
                                    size={16}
                                    fill={isAllFavorited ? 'currentColor' : 'none'}
                                    className="portfolio__batch-btn-icon"
                                />
                                <span className="portfolio__batch-btn-text">
                                    {isAllFavorited ? 'Favorited' : 'Favorite'}
                                </span>
                            </button>

                            {onStory &&
                                (() => {
                                    const canStory = selectedCount >= 1;
                                    const storyTooltip = canStory
                                        ? selectedCount > 3
                                            ? `Create 3-panel triptych story with selected photos (${selectedCount} selected)`
                                            : selectedCount === 3
                                              ? 'Create 3-panel triptych story with selected photos'
                                              : selectedCount === 2
                                                ? 'Create story with selected photos (2 selected)'
                                                : 'Create story with selected photo'
                                        : 'Select photos to create a story';

                                    return (
                                        <button
                                            type="button"
                                            className={`portfolio__batch-btn portfolio__batch-btn--story ${
                                                canStory ? 'portfolio__batch-btn--story-active' : ''
                                            }`}
                                            onClick={onStory}
                                            disabled={!canStory}
                                            title={storyTooltip}
                                            aria-label={storyTooltip}
                                        >
                                            <StoryCropIcon size={16} className="portfolio__batch-btn-icon" />
                                            <span className="portfolio__batch-btn-text">Story</span>
                                        </button>
                                    );
                                })()}

                            {!canShare && (
                                <button
                                    type="button"
                                    className="portfolio__batch-btn portfolio__batch-btn--zip"
                                    onClick={onDownloadZip}
                                    disabled={selectedCount === 0 || isZipping}
                                    title="Download selected photos as ZIP"
                                    aria-label={
                                        isZipping ? `Compressing ZIP: ${zipProgress}%` : 'Download selected photos as ZIP'
                                    }
                                    style={{
                                        cursor: isZipping ? 'wait' : selectedCount === 0 ? 'not-allowed' : 'pointer',
                                        backgroundImage: isZipping
                                            ? 'linear-gradient(to right, var(--color-accent) 100%, transparent 100%)'
                                            : 'none',
                                        backgroundSize: `${isZipping ? zipProgress : 0}% 100%`,
                                        backgroundRepeat: 'no-repeat',
                                    }}
                                >
                                    <Save size={16} className="portfolio__batch-btn-icon" />
                                    <span className="portfolio__batch-btn-text">
                                        {isZipping ? `${zipProgress}%` : 'Download'}
                                    </span>
                                </button>
                            )}

                            {canShare && (
                                <button
                                    type="button"
                                    className={`portfolio__batch-btn ${isCopied ? 'portfolio__batch-btn--copied' : ''}`}
                                    onClick={async () => {
                                        await onShare?.();
                                        setIsCopied(true);
                                        setTimeout(() => setIsCopied(false), 2200);
                                    }}
                                    disabled={selectedCount === 0}
                                    title={isCopied ? 'Link copied to clipboard!' : 'Share selected photos link'}
                                    aria-label={isCopied ? 'Link copied to clipboard!' : 'Share selected photos link'}
                                >
                                    {isCopied ? (
                                        <Check size={16} className="portfolio__batch-btn-icon" />
                                    ) : (
                                        <Share2 size={16} className="portfolio__batch-btn-icon" />
                                    )}
                                    <span className="portfolio__batch-btn-text">{isCopied ? 'Copied!' : 'Share'}</span>
                                </button>
                            )}
                        </div>

                        <span className="portfolio__batch-divider" aria-hidden="true" />

                        {/* 3. Exit Select Mode */}
                        <button
                            type="button"
                            className="portfolio__batch-btn portfolio__batch-btn--done"
                            onClick={onDone}
                            title="Exit selection mode"
                            aria-label="Done selecting photos"
                        >
                            <X size={16} className="portfolio__batch-btn-icon" />
                        </button>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
};
