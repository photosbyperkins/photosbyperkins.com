import { TEAM_ABBREVIATIONS } from './constants';

export function formatTeamName(teamName: string): string {
    let formattedName = teamName;
    for (const [full, abbr] of Object.entries(TEAM_ABBREVIATIONS)) {
        formattedName = formattedName.replace(full, abbr);
    }

    return formattedName.replace('Roller Derby', '');
}
