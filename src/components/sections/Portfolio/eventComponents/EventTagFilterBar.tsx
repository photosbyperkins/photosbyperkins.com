import React, { useMemo, useState } from 'react';
import type { EventTagSidecar } from '../../../../types';
import { computeAvailableEventPills, type EventTagFilter } from '../../../../utils/tagSidecar';

interface EventTagFilterBarProps {
    sidecar: EventTagSidecar | null;
    totalPhotos: number;
    activeFilter: EventTagFilter;
    onSelectFilter: (filter: EventTagFilter) => void;
    filteredCount: number;
}

export const EventTagFilterBar: React.FC<EventTagFilterBarProps> = ({
    sidecar,
    totalPhotos,
    activeFilter,
    onSelectFilter,
    filteredCount,
}) => {
    const [numberQuery, setNumberQuery] = useState('');
    const pills = useMemo(
        () => computeAvailableEventPills(sidecar, totalPhotos),
        [sidecar, totalPhotos]
    );

    if (!sidecar || pills.length <= 1) {
        return null;
    }

    const hasNumbersSupport = !sidecar.isJuniorBout && pills.some((p) => p.filter === 'has-number');

    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 4);
        setNumberQuery(val);
        if (val.trim().length > 0) {
            onSelectFilter(`number:${val.trim().toUpperCase()}`);
        } else {
            onSelectFilter('all');
        }
    };

    return (
        <div
            className="portfolio__tag-filter-bar"
            role="toolbar"
            aria-label="Filter bout photos by skater role, team, jersey number, or action"
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
            }}
        >
            {pills.map((pill) => {
                const isActive = activeFilter === pill.filter;
                return (
                    <button
                        key={pill.filter}
                        type="button"
                        onClick={() => {
                            setNumberQuery('');
                            onSelectFilter(isActive && pill.filter !== 'all' ? 'all' : pill.filter);
                        }}
                        aria-pressed={isActive}
                        className={`portfolio__tag-pill${isActive ? ' portfolio__tag-pill--active' : ''}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.82rem',
                            fontWeight: isActive ? 700 : 500,
                            border: isActive
                                ? '1px solid var(--accent-primary, #f59e0b)'
                                : '1px solid rgba(255,255,255,0.16)',
                            background: isActive
                                ? 'rgba(245, 158, 11, 0.18)'
                                : 'rgba(255, 255, 255, 0.05)',
                            color: 'inherit',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {pill.colorHex && (
                            <span
                                aria-hidden="true"
                                style={{
                                    width: '0.6rem',
                                    height: '0.6rem',
                                    borderRadius: '50%',
                                    backgroundColor: pill.colorHex,
                                    border: '1px solid rgba(255,255,255,0.4)',
                                }}
                            />
                        )}
                        <span>{pill.label}</span>
                        <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>({pill.count})</span>
                    </button>
                );
            })}

            {hasNumbersSupport && (
                <label
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        border: activeFilter.startsWith('number:')
                            ? '1px solid var(--accent-primary, #f59e0b)'
                            : '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: '0.8rem',
                    }}
                >
                    <span aria-hidden="true">#</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={numberQuery}
                        onChange={handleNumberInputChange}
                        placeholder="Jersey #"
                        aria-label="Search by skater jersey number"
                        style={{
                            width: '4.5rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            fontSize: '0.8rem',
                            outline: 'none',
                        }}
                    />
                </label>
            )}

            {activeFilter !== 'all' && (
                <span
                    aria-live="polite"
                    style={{ fontSize: '0.8rem', opacity: 0.75, marginLeft: '0.25rem' }}
                >
                    Showing {filteredCount} of {totalPhotos}
                </span>
            )}
        </div>
    );
};
