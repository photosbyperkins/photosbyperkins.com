import { formatTeamName, getTeamNameFormats } from '../../../utils/formatters';
import type { EventData } from '../../../types';

interface PortfolioEventTitleProps {
    eventName: string;
    ev: EventData;
    datePrefix: string | null;
    finalTeams: string[];
    shouldShowScores: boolean;
    mainTitle: string;
}

export default function PortfolioEventTitle({
    eventName,
    ev,
    datePrefix,
    finalTeams,
    shouldShowScores,
    mainTitle,
}: PortfolioEventTitleProps) {
    const hasLocalScore = ev.localScore && ev.localScore.team1Score !== null && ev.localScore.team2Score !== null;
    const TitleSideWrapper = ev.wftdaMatch ? 'a' : 'div';
    const titleSideProps = ev.wftdaMatch
        ? {
              href: ev.wftdaMatch.href,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'portfolio__event-title-side portfolio__event-title-side--link',
              title: 'Official WFTDA Match Details',
          }
        : { className: 'portfolio__event-title-side' };

    return (
        <TitleSideWrapper {...titleSideProps}>
            {datePrefix && <div className="portfolio__event-date">{datePrefix}</div>}
            <div className="portfolio__event-title-stack">
                {ev.wftdaMatch && (
                    <div className="portfolio__wftda-badge" title="Official WFTDA Match Details">
                        <span>WFTDA</span>
                    </div>
                )}
                <div className="portfolio__event-teams-row">
                    <div className="portfolio__event-teams">
                        {finalTeams.map((team, i) => {
                            const formats = getTeamNameFormats(team);
                            const hasVariations = formats.full !== formats.mid || formats.mid !== formats.short;

                            return (
                                <h3 key={i} title={team}>
                                    {eventName === 'Favorites' ? (
                                        <>
                                            <span style={{ color: 'var(--color-accent)' }}>YOUR&nbsp;</span>
                                            FAVORITES
                                        </>
                                    ) : hasVariations ? (
                                        <>
                                            <span className="portfolio__team-name--desktop">{formats.full}</span>
                                            <span className="portfolio__team-name--tablet">{formats.mid}</span>
                                            <span className="portfolio__team-name--mobile">{formats.short}</span>
                                        </>
                                    ) : (
                                        <>{team}</>
                                    )}
                                </h3>
                            );
                        })}
                    </div>
                    {shouldShowScores && (
                        <div className="portfolio__event-scores">
                            {finalTeams.map((team, i) => {
                                let score: number | string = '-';
                                let isWin = false;
                                if (ev.wftdaMatch) {
                                    const t1 = ev.wftdaMatch.team1.toLowerCase();
                                    const t2 = ev.wftdaMatch.team2.toLowerCase();
                                    const tCurr = formatTeamName(team).toLowerCase();
                                    const tRaw = team.toLowerCase();
                                    if (
                                        t1.includes(tCurr) ||
                                        tCurr.includes(t1) ||
                                        t1.includes(tRaw) ||
                                        tRaw.includes(t1)
                                    ) {
                                        score = ev.wftdaMatch.score1;
                                        isWin = Number(ev.wftdaMatch.score1) > Number(ev.wftdaMatch.score2);
                                    } else if (
                                        t2.includes(tCurr) ||
                                        tCurr.includes(t2) ||
                                        t2.includes(tRaw) ||
                                        tRaw.includes(t2)
                                    ) {
                                        score = ev.wftdaMatch.score2;
                                        isWin = Number(ev.wftdaMatch.score2) > Number(ev.wftdaMatch.score1);
                                    }
                                } else if (hasLocalScore) {
                                    const originalTeams = mainTitle.split(/\s+(?:vs|versus)\s+/i).map((t) => t.trim());
                                    const isTeam1 = team === originalTeams[0];
                                    score = isTeam1 ? ev.localScore!.team1Score! : ev.localScore!.team2Score!;
                                    const otherScore = isTeam1
                                        ? ev.localScore!.team2Score!
                                        : ev.localScore!.team1Score!;
                                    isWin = Number(score) > Number(otherScore);
                                }
                                return (
                                    <span key={i} className={`portfolio__team-score ${isWin ? 'is-win' : ''}`}>
                                        {score}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </TitleSideWrapper>
    );
}
