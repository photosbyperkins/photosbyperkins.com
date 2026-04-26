import { TEAM_ABBREVIATIONS } from './constants';

export function formatTeamName(teamName: string): string {
    let formattedName = teamName;
    for (const [full, abbr] of Object.entries(TEAM_ABBREVIATIONS)) {
        formattedName = formattedName.replace(full, abbr);
    }

    return formattedName.replace('Roller Derby', '');
}

export function parseEventTitle(eventName: string, originalYear?: string, selectedYear?: string) {
    const titleMatch = eventName.match(/^(?:\[(\d{4})\]\s*)?(\d{2}\.\d{2})\s+(.*)/);
    const parsedYear = titleMatch ? titleMatch[1] : undefined;
    const baseDatePrefix = titleMatch ? titleMatch[2] : '';
    const mainTitle = titleMatch ? titleMatch[3] : eventName;

    let datePrefix = baseDatePrefix && parsedYear ? `${baseDatePrefix}.${parsedYear.slice(-2)}` : baseDatePrefix;

    if (baseDatePrefix) {
        const [monthStr, dayStr] = baseDatePrefix.split('.');
        const yearStr = parsedYear || originalYear || selectedYear;

        if (yearStr) {
            try {
                const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
                if (!isNaN(dateObj.getTime())) {
                    const options: Intl.DateTimeFormatOptions = {
                        month: '2-digit',
                        day: '2-digit',
                    };
                    if (parsedYear) {
                        options.year = '2-digit';
                    }

                    const parts = new Intl.DateTimeFormat(undefined, options).formatToParts(dateObj);

                    datePrefix = parts
                        .filter((part) => part.type === 'month' || part.type === 'day' || part.type === 'year')
                        .map((part) => part.value)
                        .join('.');
                }
            } catch (e) {
                console.error('Failed to localize date:', e);
            }
        }
    }

    return { parsedYear, baseDatePrefix, mainTitle, datePrefix };
}
