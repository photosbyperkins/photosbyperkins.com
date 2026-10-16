import React, { useState } from 'react';
import type { PhotoTagEntry, SimilarPhotoRef } from '../../../types';
import { withBuild } from '../../../utils/build';

interface LightboxSimilarDrawerProps {
    entry: PhotoTagEntry | null;
    sceneTags: string[];
    currentYear: string;
    currentSlug: string;
    onSelectIndex: (index: number) => void;
    onCloseLightbox: () => void;
}

const ROLE_DISPLAY: Record<string, string> = {
    jammer: '★ Jammer',
    pivot: '⚡ Pivot',
    blocker: '🛡️ Blocker',
    ref: '🦓 Referee',
    spectator: '🧢 Spectator / Coach',
};

export const LightboxSimilarDrawer: React.FC<LightboxSimilarDrawerProps> = ({
    entry,
    sceneTags,
    currentYear,
    currentSlug,
    onSelectIndex,
    onCloseLightbox,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!entry) return null;

    const similar = entry.s || [];
    const hasBadges = Boolean(entry.r || (entry.n && entry.n.length > 0) || sceneTags.length > 0);
    if (similar.length === 0 && !hasBadges) return null;

    const handleNeighborClick = (ref: SimilarPhotoRef) => {
        const [simYear, simSlug, simIdx] = ref;
        if (simYear === currentYear && simSlug === currentSlug) {
            onSelectIndex(simIdx);
            setIsOpen(false);
        } else {
            onCloseLightbox();
            const targetPath = `/portfolio/${encodeURIComponent(simYear)}/${encodeURIComponent(simSlug)}/${simIdx}`;
            if (typeof window !== 'undefined') {
                window.history.pushState({}, '', targetPath);
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        }
    };

    return (
        <div
            className="portfolio__lightbox-similar"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                right: '1.25rem',
                bottom: '5.5rem',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '0.5rem',
                maxWidth: 'calc(100vw - 2.5rem)',
            }}
        >
            {isOpen && similar.length > 0 && (
                <div
                    role="region"
                    aria-label="More photos like this"
                    style={{
                        background: 'rgba(15, 17, 23, 0.92)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        borderRadius: '0.75rem',
                        padding: '0.65rem',
                        display: 'flex',
                        gap: '0.5rem',
                        overflowX: 'auto',
                        maxWidth: 'min(460px, 90vw)',
                    }}
                >
                    {similar.slice(0, 8).map(([simYear, simSlug, simIdx]) => {
                        const padNum = `photo_${String(simIdx + 1).padStart(3, '0')}.avif`;
                        const thumbUrl = withBuild(`/thumbnails/${simYear}/${simSlug}/${padNum}`);
                        return (
                            <button
                                key={`${simYear}-${simSlug}-${simIdx}`}
                                type="button"
                                onClick={() => handleNeighborClick([simYear, simSlug, simIdx])}
                                aria-label={`View similar photo ${simIdx + 1} from ${simSlug} (${simYear})`}
                                style={{
                                    flex: '0 0 auto',
                                    width: '64px',
                                    height: '64px',
                                    padding: 0,
                                    borderRadius: '0.5rem',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: '#111',
                                    cursor: 'pointer',
                                }}
                            >
                                <img
                                    src={thumbUrl}
                                    alt=""
                                    loading="lazy"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                {entry.r && ROLE_DISPLAY[entry.r] && (
                    <span
                        style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: 'rgba(15, 17, 23, 0.82)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: '#fff',
                        }}
                    >
                        {ROLE_DISPLAY[entry.r]}
                    </span>
                )}
                {entry.n &&
                    entry.n.map((num) => (
                        <span
                            key={num}
                            style={{
                                padding: '0.25rem 0.55rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(245, 158, 11, 0.22)',
                                border: '1px solid rgba(245, 158, 11, 0.5)',
                                color: '#fde68a',
                            }}
                        >
                            #{num}
                        </span>
                    ))}
                {similar.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsOpen((prev) => !prev)}
                        aria-expanded={isOpen}
                        style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: '999px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            background: isOpen ? 'rgba(245, 158, 11, 0.25)' : 'rgba(15, 17, 23, 0.85)',
                            border: isOpen
                                ? '1px solid var(--accent-primary, #f59e0b)'
                                : '1px solid rgba(255,255,255,0.22)',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        ✨ More Like This ({similar.length})
                    </button>
                )}
            </div>
        </div>
    );
};
