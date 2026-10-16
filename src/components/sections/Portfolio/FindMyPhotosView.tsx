import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from '../../ui/icons';
import type { SkaterRole } from '../../../types';
import {
    fetchFindTeamsIndex,
    fetchTeamFindData,
    extractJerseyNumbersWithCounts,
    filterTeamFindPhotos,
    type FindTeamEntry,
    type TeamFindPayload,
} from '../../../utils/findMyPhotos';

interface FindMyPhotosViewProps {
    initialTeamSlug?: string;
    initialNumberQuery?: string;
}

const ROLE_OPTIONS: Array<{ value: 'all' | SkaterRole; label: string }> = [
    { value: 'all', label: 'All Roles' },
    { value: 'jammer', label: '★ Jammer' },
    { value: 'pivot', label: '⚡ Pivot' },
    { value: 'blocker', label: '🛡️ Blocker' },
    { value: 'ref', label: '🦓 Referee' },
    { value: 'spectator', label: '🧢 Spectator / Coach' },
];

export default function FindMyPhotosView({
    initialTeamSlug,
    initialNumberQuery = '',
}: FindMyPhotosViewProps) {
    const navigate = useNavigate();
    const [teamsList, setTeamsList] = useState<FindTeamEntry[] | null>(null);
    const [teamFilterQuery, setTeamFilterQuery] = useState('');
    const [userSelectedSlug, setUserSelectedSlug] = useState<string>(initialTeamSlug || '');
    const [loadedTeam, setLoadedTeam] = useState<{ slug: string; payload: TeamFindPayload | null } | null>(null);

    const [numberQuery, setNumberQuery] = useState(initialNumberQuery);
    const [roleFilter, setRoleFilter] = useState<'all' | SkaterRole>('all');
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [onlyBestInBurst, setOnlyBestInBurst] = useState(false);

    const teams = useMemo(() => teamsList ?? [], [teamsList]);
    const isIndexLoading = teamsList === null;
    const selectedTeamSlug = initialTeamSlug || userSelectedSlug || (teams[0]?.slug ?? '');
    const teamPayload = loadedTeam?.slug === selectedTeamSlug ? loadedTeam.payload : null;
    const isTeamLoading = Boolean(selectedTeamSlug && loadedTeam?.slug !== selectedTeamSlug);

    useEffect(() => {
        let cancelled = false;
        fetchFindTeamsIndex()
            .then((idx) => {
                if (cancelled) return;
                setTeamsList(idx?.teams || []);
            })
            .catch(() => {
                if (!cancelled) setTeamsList([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedTeamSlug) {
            return;
        }
        let cancelled = false;
        fetchTeamFindData(selectedTeamSlug)
            .then((payload) => {
                if (!cancelled) {
                    setLoadedTeam({ slug: selectedTeamSlug, payload });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadedTeam({ slug: selectedTeamSlug, payload: null });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [selectedTeamSlug]);

    const filteredTeams = useMemo(() => {
        const q = teamFilterQuery.trim().toLowerCase();
        if (!q) return teams;
        return teams.filter(
            (t) =>
                t.name.toLowerCase().includes(q) ||
                t.slug.toLowerCase().includes(q) ||
                t.topNumbers.some((n) => n.toLowerCase().includes(q.replace(/^#/, '')))
        );
    }, [teams, teamFilterQuery]);

    const numberChips = useMemo(() => extractJerseyNumbersWithCounts(teamPayload).slice(0, 20), [teamPayload]);

    const availableYears = useMemo(() => {
        if (!teamPayload) return [];
        const yearsSet = new Set(teamPayload.events.map((e) => e.y));
        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [teamPayload]);

    const matchingPhotos = useMemo(
        () =>
            filterTeamFindPhotos(teamPayload, {
                numberQuery,
                roleFilter,
                yearFilter,
                onlyBestInBurst,
            }),
        [teamPayload, numberQuery, roleFilter, yearFilter, onlyBestInBurst]
    );

    const handleSelectTeam = (slug: string) => {
        setUserSelectedSlug(slug);
        setYearFilter('all');
        navigate(`/portfolio/find/${encodeURIComponent(slug)}`, { replace: true });
    };

    const handleOpenPhoto = (year: string, albumSlug: string, photoIndex: number) => {
        navigate(`/portfolio/${encodeURIComponent(year)}/${encodeURIComponent(albumSlug)}/${photoIndex}`);
    };

    return (
        <div
            className="portfolio__find-my-photos"
            aria-label="Find My Photos by Team and Jersey Number"
            style={{
                padding: '1.5rem 0 3rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                    paddingBottom: '1rem',
                }}
            >
                <div>
                    <h2
                        style={{
                            margin: 0,
                            fontFamily: 'var(--font-display)',
                            fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                        }}
                    >
                        <span style={{ color: 'var(--color-accent)' }}>FIND MY </span>
                        PHOTOS
                    </h2>
                    <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
                        Pick your team, enter your <strong>#Jersey</strong> number, or filter by Jammer / Pivot role across seasons.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/portfolio')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '999px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-2)',
                        color: 'var(--color-text)',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    <X size={15} />
                    <span>Back to Albums</span>
                </button>
            </div>

            {/* Step 1: Pick Team */}
            <section aria-label="1. Select Team">
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        marginBottom: '0.65rem',
                    }}
                >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                        1. Pick Team ({teams.length})
                    </span>
                    {teams.length > 6 && (
                        <div style={{ position: 'relative', minWidth: '210px' }}>
                            <input
                                type="search"
                                value={teamFilterQuery}
                                onChange={(e) => setTeamFilterQuery(e.target.value)}
                                placeholder="Filter teams..."
                                aria-label="Filter teams"
                                style={{
                                    width: '100%',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '999px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-2)',
                                    color: 'var(--color-text)',
                                    fontSize: '0.82rem',
                                }}
                            />
                        </div>
                    )}
                </div>

                {isIndexLoading ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading team index…</p>
                ) : filteredTeams.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        No indexed teams found yet. Run <code>npm run ml</code> to generate team &amp; jersey sidecars.
                    </p>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.45rem',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            padding: '0.2rem 0',
                        }}
                    >
                        {filteredTeams.map((t) => {
                            const isSelected = t.slug === selectedTeamSlug;
                            return (
                                <button
                                    key={t.slug}
                                    type="button"
                                    onClick={() => handleSelectTeam(t.slug)}
                                    aria-pressed={isSelected}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.38rem 0.8rem',
                                        borderRadius: '999px',
                                        border: isSelected
                                            ? '1px solid #b91c1c'
                                            : '1px solid var(--color-border)',
                                        background: isSelected
                                            ? '#b91c1c'
                                            : 'var(--color-bg-2)',
                                        color: isSelected ? '#ffffff' : 'var(--color-text)',
                                        fontSize: '0.82rem',
                                        fontWeight: isSelected ? 600 : 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {t.colorHex && (
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: '9px',
                                                height: '9px',
                                                borderRadius: '50%',
                                                backgroundColor: t.colorHex,
                                                border: '1px solid rgba(255,255,255,0.5)',
                                            }}
                                        />
                                    )}
                                    <span>{t.name}</span>
                                    <span style={{ color: isSelected ? '#f8fafc' : 'var(--color-text-muted)', fontSize: '0.74rem' }}>{t.photoCount}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Step 2: Enter #Jersey & Role / Season Filters */}
            {selectedTeamSlug && (
                <section
                    aria-label="2. Enter Jersey Number and Filters"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        background: 'var(--color-bg-2)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.85rem',
                        padding: '1rem',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}
                    >
                        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
                            <Search
                                size={15}
                                style={{
                                    position: 'absolute',
                                    left: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--color-text-muted)',
                                }}
                            />
                            <input
                                type="search"
                                value={numberQuery}
                                onChange={(e) => setNumberQuery(e.target.value)}
                                placeholder="Enter #Jersey (e.g. 42)..."
                                aria-label="Enter Jersey Number"
                                style={{
                                    width: '100%',
                                    padding: '0.48rem 0.85rem 0.48rem 2.15rem',
                                    borderRadius: '999px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg)',
                                    color: 'var(--color-text)',
                                    fontSize: '0.88rem',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                            {ROLE_OPTIONS.map((opt) => {
                                const active = roleFilter === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setRoleFilter(opt.value)}
                                        aria-pressed={active}
                                        style={{
                                            padding: '0.34rem 0.7rem',
                                            borderRadius: '999px',
                                            border: active
                                                ? '1px solid #b91c1c'
                                                : '1px solid var(--color-border)',
                                            background: active ? '#b91c1c' : 'var(--color-bg)',
                                            color: active ? '#ffffff' : 'var(--color-text)',
                                            fontSize: '0.78rem',
                                            fontWeight: active ? 600 : 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setOnlyBestInBurst((v) => !v)}
                                aria-pressed={onlyBestInBurst}
                                style={{
                                    padding: '0.34rem 0.7rem',
                                    borderRadius: '999px',
                                    border: onlyBestInBurst
                                        ? '1px solid #b45309'
                                        : '1px solid var(--color-border)',
                                    background: onlyBestInBurst ? '#b45309' : 'var(--color-bg)',
                                    color: onlyBestInBurst ? '#ffffff' : 'var(--color-text)',
                                    fontSize: '0.78rem',
                                    fontWeight: onlyBestInBurst ? 600 : 500,
                                    cursor: 'pointer',
                                }}
                            >
                                ★ Best Shots Only
                            </button>

                            {availableYears.length > 1 && (
                                <select
                                    aria-label="Filter by season year"
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    style={{
                                        padding: '0.34rem 0.65rem',
                                        borderRadius: '999px',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-bg)',
                                        color: 'var(--color-text)',
                                        fontSize: '0.78rem',
                                    }}
                                >
                                    <option value="all">All Seasons</option>
                                    {availableYears.map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {numberChips.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>
                                Detected #s:
                            </span>
                            {numberChips.map(({ number, count }) => {
                                const isActive = numberQuery.replace(/^#/, '').toUpperCase() === number;
                                return (
                                    <button
                                        key={number}
                                        type="button"
                                        onClick={() => setNumberQuery(isActive ? '' : number)}
                                        aria-pressed={isActive}
                                        style={{
                                            padding: '0.2rem 0.55rem',
                                            borderRadius: '999px',
                                            border: isActive
                                                ? '1px solid #0369a1'
                                                : '1px solid var(--color-border)',
                                            background: isActive ? '#0369a1' : 'var(--color-bg)',
                                            color: isActive ? '#ffffff' : 'var(--color-text)',
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        #{number} <span style={{ color: isActive ? '#e0f2fe' : 'var(--color-text-muted)' }}>({count})</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* Step 3: Results Grid */}
            <section aria-label="Matching Photos">
                <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {isTeamLoading
                        ? 'Loading team photos…'
                        : `Showing ${matchingPhotos.length} matching photo${matchingPhotos.length === 1 ? '' : 's'}`}
                </div>

                {!isTeamLoading && matchingPhotos.length > 0 && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                            gap: '0.75rem',
                        }}
                    >
                        {matchingPhotos.slice(0, 120).map((item) => (
                            <button
                                key={`${item.year}-${item.albumSlug}-${item.photoIndex}`}
                                type="button"
                                onClick={() => handleOpenPhoto(item.year, item.albumSlug, item.photoIndex)}
                                aria-label={`Open photo ${item.photoIndex + 1} from ${item.eventName} (${item.year})`}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: 0,
                                    borderRadius: '0.65rem',
                                    overflow: 'hidden',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-2)',
                                    color: 'var(--color-text)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 2', background: '#111' }}>
                                    <img
                                        src={item.thumbUrl}
                                        alt={`${item.eventName} (${item.year})`}
                                        loading="lazy"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                        }}
                                    />
                                    {item.numbers.length > 0 && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '0.4rem',
                                                left: '0.4rem',
                                                background: '#0a0c12',
                                                color: '#7dd3fc',
                                                padding: '0.15rem 0.45rem',
                                                borderRadius: '999px',
                                                fontSize: '0.72rem',
                                                fontFamily: 'monospace',
                                                fontWeight: 700,
                                            }}
                                        >
                                            #{item.numbers.join(' #')}
                                        </span>
                                    )}
                                </div>
                                <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.76rem' }}>
                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)' }}>
                                        {item.eventName}
                                    </div>
                                    <div style={{ color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                        {item.year} {item.role ? `· ${item.role}` : ''}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
