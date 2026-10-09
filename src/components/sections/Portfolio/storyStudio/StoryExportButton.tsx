import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Download, Share2, X } from '../../../ui/icons';
import { DURATION, EASE_OUT_EXPO } from '../../../../utils/motion';

const TOAST_ERROR_KEYWORDS = ['fail', 'unavailable', 'lacks', 'error', 'supported'];

const isErrorToast = (message: string) => {
    const lower = message.toLowerCase();
    return TOAST_ERROR_KEYWORDS.some((k) => lower.includes(k));
};

type ExportButtonState = 'idle' | 'rendering' | 'done';

interface StoryExportButtonProps {
    canShare: boolean;
    isDownloaded: boolean;
    isExporting: boolean;
    /** Export not possible yet (tainted image, missing burst picks, image still loading). */
    isBlocked: boolean;
    /** Video render progress 0-100, or null when not rendering. */
    progress: number | null;
    /** Full accessible description of the current state (e.g. "Pick 1 more frame to download"). */
    accessibleLabel: string;
    statusToast: string | null;
    onExport: () => void;
    onCancel: () => void;
}

/**
 * Download / Share action with the video-render cancel built in.
 * The button keeps fixed dimensions in every state: labels are stacked in one grid cell and
 * crossfade, and the ✕ segment always occupies its reserved right slot (invisible and inert until
 * a render is in progress), so nothing shifts when the state changes.
 */
export const StoryExportButton: React.FC<StoryExportButtonProps> = ({
    canShare,
    isDownloaded,
    isExporting,
    isBlocked,
    progress,
    accessibleLabel,
    statusToast,
    onExport,
    onCancel,
}) => {
    const isRendering = progress !== null;
    const state: ExportButtonState = isDownloaded ? 'done' : isRendering ? 'rendering' : 'idle';
    const actionLabel = canShare ? 'Share Story Card' : 'Download Story Card';
    const doneLabel = canShare ? 'Story Card Shared' : 'Story Card Downloaded';
    const isDisabled = isExporting || isBlocked || isDownloaded;

    return (
        <div className="story-export-button-wrap">
            <AnimatePresence>
                {statusToast && (
                    <motion.div
                        key="story-toast"
                        className={`story-export-modal__toast ${isErrorToast(statusToast) ? 'story-export-modal__toast--error' : ''}`}
                        role="status"
                        aria-live="polite"
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98, transition: { duration: DURATION.instant } }}
                        transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                    >
                        {statusToast}
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className={`story-export-button story-export-button--${state} ${
                    isDisabled && state === 'idle' ? 'story-export-button--disabled' : ''
                }`}
                style={{ '--story-export-progress': (progress ?? 0) / 100 } as React.CSSProperties}
            >
                <span className="story-export-button__fill" aria-hidden="true" />
                <button
                    type="button"
                    className={`story-export-modal__primary-action story-export-button__main ${
                        isDownloaded ? 'is-done' : ''
                    } ${isRendering ? 'story-export-modal__primary-action--rendering' : ''}`}
                    onClick={onExport}
                    disabled={isDisabled}
                    title={accessibleLabel}
                    aria-label={accessibleLabel}
                >
                    <span className="story-export-button__labels">
                        <span className="story-export-button__label" data-visible={state === 'idle'}>
                            {canShare ? <Share2 size={18} /> : <Download size={18} />}
                            <span>{actionLabel}</span>
                        </span>
                        <span className="story-export-button__label" data-visible={state === 'rendering'}>
                            <span className="story-export-button__progress-text">Rendering {progress ?? 0}%</span>
                        </span>
                        <span className="story-export-button__label" data-visible={state === 'done'}>
                            <Check size={18} />
                            <span>{doneLabel}</span>
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    className="story-export-button__cancel"
                    onClick={onCancel}
                    disabled={!isRendering}
                    tabIndex={isRendering ? 0 : -1}
                    aria-hidden={!isRendering}
                    aria-label="Cancel video export"
                    title={isRendering ? 'Cancel video export' : undefined}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default StoryExportButton;
