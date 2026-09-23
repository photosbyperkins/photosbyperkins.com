import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    computeYearMonths,
    getEventMonth,
    formatEventElementId,
    type MonthData,
} from '../../../utils/monthTrack';
import { scrollToElement } from '../../../utils/scroll';
import type { EventData } from '../../../types';

interface PortfolioMonthTrackProps {
    events: [string, EventData][];
    selectedYear: string;
}

export const PortfolioMonthTrack: React.FC<PortfolioMonthTrackProps> = ({ events, selectedYear }) => {
    const monthData = useMemo(() => computeYearMonths(events), [events]);

    // Initialize active month to the first available event month in the list
    const initialActiveMonth = useMemo(() => {
        if (events.length > 0) {
            return getEventMonth(events[0][0]);
        }
        return null;
    }, [events]);

    const [activeMonth, setActiveMonth] = useState<number | null>(initialActiveMonth);
    const [prevEvents, setPrevEvents] = useState(events);

    // Adjust state during render when events reference changes (React Compiler safe pattern)
    if (events !== prevEvents) {
        setPrevEvents(events);
        setActiveMonth(initialActiveMonth);
    }

    // Track active month based on viewport scroll position
    useEffect(() => {
        if (typeof window === 'undefined' || events.length === 0) return;

        let ticking = false;

        const updateActiveMonth = () => {
            if (window.scrollY <= 10 && events.length > 0) {
                const firstMonth = getEventMonth(events[0][0]);
                if (firstMonth !== null) {
                    setActiveMonth((prev) => (prev !== firstMonth ? firstMonth : prev));
                    ticking = false;
                    return;
                }
            }

            const viewportAnchor = window.innerHeight * 0.35;
            let detectedMonth: number | null = null;

            for (const [eventName] of events) {
                const elId = formatEventElementId(eventName);
                const el = document.getElementById(elId);
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                if (rect.top <= viewportAnchor && rect.bottom > 80) {
                    const m = getEventMonth(eventName);
                    if (m) {
                        detectedMonth = m;
                        break;
                    }
                }
            }

            if (detectedMonth === null && events.length > 0) {
                // If user is scrolled above the first event (e.g. season summary/recap)
                const firstElId = formatEventElementId(events[0][0]);
                const firstEl = document.getElementById(firstElId);
                if (firstEl && firstEl.getBoundingClientRect().top > viewportAnchor) {
                    detectedMonth = getEventMonth(events[0][0]);
                } else {
                    // Scrolled below the last event (into footer)
                    detectedMonth = getEventMonth(events[events.length - 1][0]);
                }
            }

            if (detectedMonth !== null) {
                setActiveMonth((prev) => (prev !== detectedMonth ? detectedMonth : prev));
            }

            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateActiveMonth);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        // Initial run to capture position
        updateActiveMonth();

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, [events]);

    const handleMonthClick = useCallback(
        (m: MonthData) => {
            // Do nothing if month has no photos or if already in that month and at the top
            if (!m.hasPhotos || !m.firstEventId) return;
            if (m.num === activeMonth && window.scrollY <= 10) return;

            scrollToElement(m.firstEventId);
        },
        [activeMonth]
    );

    // Only render if there are events in this year
    if (events.length === 0) return null;

    return (
        <aside
            className="portfolio__month-track"
            aria-label={`${selectedYear} season calendar scroll tracker`}
        >
            <div className="portfolio__month-track-pill">
                {monthData.map((m) => {
                    const isCurrent = m.num === activeMonth;
                    const hasPhotos = m.hasPhotos;
                    const isEmpty = !hasPhotos;

                    const stateClass = isCurrent
                        ? 'is-current'
                        : hasPhotos
                          ? 'is-populated'
                          : 'is-empty';

                    if (isEmpty) {
                        return (
                            <div
                                key={m.num}
                                className={`portfolio__month-item ${stateClass}`}
                                aria-hidden="true"
                            >
                                <span className="portfolio__month-label">{m.label}</span>
                                <span className="portfolio__month-meter" aria-hidden="true">
                                    <span className="portfolio__month-empty-dash" />
                                </span>
                            </div>
                        );
                    }

                    const meterWidth = Math.max(3, Math.round(m.volumeRatio * 11));

                    return (
                        <button
                            key={m.num}
                            type="button"
                            className={`portfolio__month-item ${stateClass}`}
                            onClick={() => handleMonthClick(m)}
                            aria-label={`Jump to ${m.fullName}: ${m.eventCount} game${m.eventCount === 1 ? '' : 's'}, ${m.photoCount} photos (${m.seasonPercent}% of season)`}
                            aria-current={isCurrent ? 'true' : undefined}
                        >
                            <span className="portfolio__month-label">{m.label}</span>

                            {/* Micro volume meter indicating photo spread across season */}
                            <span
                                className="portfolio__month-meter"
                                data-density={m.densityLevel}
                                aria-hidden="true"
                            >
                                <span
                                    className="portfolio__month-meter-bar"
                                    style={{ width: `${meterWidth}px` }}
                                />
                            </span>

                            {/* Floating hover badge */}
                            <span className="portfolio__month-tooltip" role="tooltip">
                                <span className="portfolio__month-tooltip-title">{m.fullName}</span>
                                <span className="portfolio__month-tooltip-meta">
                                    {m.eventCount} {m.eventCount === 1 ? 'game' : 'games'} • {m.photoCount.toLocaleString()} photos
                                </span>
                                {m.seasonPercent > 0 && (
                                    <span className="portfolio__month-tooltip-share">
                                        {m.seasonPercent}% of {selectedYear} season
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

export default PortfolioMonthTrack;
