import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { computeViewYears, detectActiveYear, type YearTrackData } from '../../../utils/yearTrack';
import { scrollToElement } from '../../../utils/scroll';
import type { EventData } from '../../../types';

interface PortfolioYearTrackProps {
    events: [string, EventData][];
    title?: string;
}

export const PortfolioYearTrack: React.FC<PortfolioYearTrackProps> = ({ events, title }) => {
    const yearData = useMemo(() => computeViewYears(events), [events]);

    const initialActiveYear = useMemo(() => {
        if (yearData.length > 0) {
            return yearData[0].year;
        }
        return null;
    }, [yearData]);

    const [activeYear, setActiveYear] = useState<string | null>(initialActiveYear);
    const [prevEvents, setPrevEvents] = useState(events);

    // Adjust state during render when events reference changes (React Compiler safe pattern)
    if (events !== prevEvents) {
        setPrevEvents(events);
        setActiveYear(initialActiveYear);
    }

    // Track active year based on viewport scroll position
    useEffect(() => {
        if (typeof window === 'undefined' || yearData.length === 0) return;

        let ticking = false;

        const updateActiveYear = () => {
            const detected = detectActiveYear({
                years: yearData,
                getRect: (elId) => {
                    const el = document.getElementById(elId);
                    return el ? el.getBoundingClientRect() : null;
                },
                scrollY: window.scrollY,
                viewportHeight: window.innerHeight,
                scrollHeight: document.documentElement.scrollHeight,
            });

            if (detected !== null) {
                setActiveYear((prev) => (prev !== detected ? detected : prev));
            }

            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateActiveYear);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        updateActiveYear();

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, [yearData]);

    const handleYearClick = useCallback(
        (y: YearTrackData) => {
            if (!y.hasPhotos) return;
            setActiveYear(y.year);
            const targetId = document.getElementById(y.dividerId) ? y.dividerId : y.firstEventId;
            if (targetId) {
                scrollToElement(targetId);
            }
        },
        []
    );

    // Only render if there are at least 2 distinct years with events
    if (yearData.length <= 1) return null;

    const activeYearIndex = yearData.findIndex((y) => y.year === activeYear);

    const trackAriaLabel = title
        ? `${title} multi-year timeline scroll tracker`
        : 'Multi-year timeline scroll tracker';

    return (
        <aside className="portfolio__year-track" aria-label={trackAriaLabel}>
            <div
                className="portfolio__year-track-pill"
                style={{ '--active-year-index': activeYearIndex } as React.CSSProperties}
            >
                {activeYearIndex !== -1 && (
                    <div
                        className="portfolio__year-elevator-pill"
                        style={{ '--active-year-index': activeYearIndex } as React.CSSProperties}
                        aria-hidden="true"
                    />
                )}
                {yearData.map((y) => {
                    const isCurrent = y.year === activeYear;
                    const meterWidth = Math.max(3, Math.round(y.volumeRatio * 11));

                    return (
                        <button
                            key={y.year}
                            type="button"
                            className={`portfolio__year-item ${isCurrent ? 'is-current' : 'is-populated'}`}
                            onClick={() => handleYearClick(y)}
                            aria-label={`Jump to ${y.year}: ${y.eventCount} game${y.eventCount === 1 ? '' : 's'}, ${y.photoCount} photos (${y.totalPercent}% of collection)`}
                            aria-current={isCurrent ? 'true' : undefined}
                        >
                            <span className="portfolio__year-label">{y.label}</span>

                            {/* Micro volume meter indicating photo spread across years */}
                            <span className="portfolio__year-meter" data-density={y.densityLevel} aria-hidden="true">
                                <span className="portfolio__year-meter-bar" style={{ width: `${meterWidth}px` }} />
                            </span>

                            {/* Floating hover badge */}
                            <span className="portfolio__year-tooltip" role="tooltip">
                                <span className="portfolio__year-tooltip-title">{y.year} Season</span>
                                <span className="portfolio__year-tooltip-meta">
                                    {y.eventCount} {y.eventCount === 1 ? 'game' : 'games'} •{' '}
                                    {y.photoCount.toLocaleString()} photos
                                </span>
                                {y.totalPercent > 0 && (
                                    <span className="portfolio__year-tooltip-share">
                                        {y.totalPercent}% of collection
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
};

export default PortfolioYearTrack;
