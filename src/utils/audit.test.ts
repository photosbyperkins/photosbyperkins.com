import { describe, it, expect, vi } from 'vitest';
import { getTeamNameFormats } from './formatters.ts';
import fs from 'fs';

vi.mock('./constants.ts', () => ({
    TEAM_ABBREVIATIONS: JSON.parse(
        '{"Arizona":"AZ","Sacramento Roller Derby":"SRD","Antique RollShow Nor Cal Chapter":"Antique Rollshow","Bay Area Derby":"BAD","Carson Junior Victory Rollers":"Carson Jr. Victory Rollers","Fresh As Fuck":"FAF","Happy Valley Derby Darlins":"HVDD","Juarez":"Juárez","Old as Fuck":"OAF","Outlaw Roller Derby":"Outlaws","Rat City Roller Derby":"RCRD","San Luis Obispo County Junior Roller Derby":"SLOCO Juniors","San Luis Obispo County Roller Derby":"SLOCO","Santa Cruz":"SC","Sonoma County Roller Derby":"Sonoma","Headshots":""}'
    ),
}));

const events = [
    '0312-sacred-city-trainwreckers-vs-sacred-city-donna-party',
    '0416-sacred-city-disciples-vs-sac-city-rollers',
    '0514-sacred-city-trainwreckers-vs-sacred-city-donna-party',
    '0625-sac-city-rollers-vs-red-bluff',
    '0625-sacred-city-disciples-vs-monterey-bay',
    '0625-sacred-city-disciples-vs-sac-city-rollers',
    '0626-monterey-bay-vs-fresh-as-fuck',
    '0626-sacred-city-sacrificers-vs-emerald-city',
    '0716-sacred-city-disciples-vs-auburn-gold-diggers',
    '0813-sacred-city-disciples-vs-sonoma-county-roller-derby',
    '0813-sacred-city-sacrificers-vs-bay-area-derby-team-gold',
    '1008-sacred-city-donna-party-vs-loco-city',
    '1112-sacred-city-trainwreckers-vs-sacred-city-donna-party',
    '0218-sacred-city-disciples-vs-fresh-me-ousside',
    '0218-sacred-city-sacrificers-vs-derby-republic',
    '0311-sacred-city-trainwreckers-vs-sacred-city-donna-party',
    '0513-sacred-city-trainwreckers-vs-sacred-city-donna-party',
    '0617-sacred-city-trainwreckers-vs-sacred-city-donna-party',
    '0812-sacred-city-disciples-vs-v-town-derby-darlings',
    '1015-sacred-city-disciples-vs-auburn-gold-diggers',
    '1022-sacred-city-sacrificers-vs-rat-city-roller-derby-rain-of-terror',
    '0414-sacramento-roller-derby-beastars-vs-dotkamikazes',
    '0414-sacramento-roller-derby-capital-maulstars-vs-bay-area-derby-team-gold',
    '0616-sacramento-roller-derby-capital-maulstars-vs-rat-city-roller-derby',
    '0616-sacramento-roller-derby-kodiak-attack-vs-so-derby',
    '0804-sacramento-roller-derby-bruin-trouble-vs-v-town-derby-darlings',
    '0908-sacramento-roller-derby-juniors-blue-vs-sacramento-roller-derby-white',
    '0908-sacramento-roller-derby-white-vs-sacramento-roller-derby-yellow',
    '1020-sacramento-roller-derby-juniors-beastie-bears-vs-lockeford-little-rascals',
    '1020-sacramento-roller-derby-kodiak-attack-vs-lockeford-liberators',
    '1103-sacramento-roller-derby-blue-vs-sacramento-roller-derby-white',
    '1103-sacramento-roller-derby-juniors-blue-vs-sacramento-roller-derby-white',
    '0223-sacramento-roller-derby-bruin-trouble-vs-sonoma-county-roller-derby',
    '0223-sacramento-roller-derby-capital-maulstars-vs-santa-cruz-boardwalk-bombshells',
    '0323-sacramento-roller-derby-juniors-white-vs-sacramento-roller-derby-juniors-blue',
    '0323-sacramento-roller-derby-kodiak-attack-vs-quad-city-derby-bombshells',
    '0427-sacramento-roller-derby-bruin-trouble-vs-humboldt-roller-derby',
    '0427-sacramento-roller-derby-kodiak-attack-vs-peninsula-roller-derby',
    '0518-sacramento-roller-derby-bruin-trouble-vs-vendolls',
    '0518-sacramento-roller-derby-kodiak-attack-vs-battalion-of-skates',
    '0622-sacramento-roller-derby-capital-maulstars-vs-bay-area-derby-all-stars',
    '0622-sacramento-roller-derby-kodiak-attack-vs-santa-cruz-seabright-sirens',
    '0817-sacramento-roller-derby-juniors-beastie-bears-vs-carson-junior-victory-rollers',
    '0817-sacramento-roller-derby-white-vs-sacramento-roller-derby-blue',
    '0914-sacramento-roller-derby-blue-vs-sacramento-roller-derby-yellow',
    '1012-old-as-fuck-vs-antique-rollshow-nor-cal-chapter',
    '1012-sacramento-roller-derby-white-vs-sacramento-roller-derby-yellow',
    '1102-sacramento-roller-derby-juniors-blue-vs-sacramento-roller-derby-juniors-white',
    '1102-sacramento-roller-derby-round-robin',
    '0215-sacramento-roller-derby-juniors-beastie-bears-vs-west-coast-jr-knockouts',
    '0215-santa-cruz-derby-groms-vs-west-coast-jr-knockouts',
    '0229-sacramento-roller-derby-bruin-trouble-vs-faultline-derby-devils',
    '0229-sacramento-roller-derby-juniors-white-vs-sacramento-roller-derby-juniors-blue',
    '0323-sacramento-roller-derby-capital-maulstars-vs-shevil-dead',
    '0323-sacramento-roller-derby-juniors-beastie-bears-vs-outlaw-roller-derby-bandits',
    '0518-sacramento-roller-derby-capital-maulstars-vs-arizona-rising',
    '0518-sacramento-roller-derby-juniors-beastie-bears-vs-renegades',
    '0125-sacramento-roller-derby-bad-habits-vs-sacramento-roller-derby-new-resolutions',
    '0125-sacramento-roller-derby-juniors-galinda-vs-sacramento-roller-derby-juniors-elphaba',
    '0222-sacramento-roller-derby-capital-maulstars-vs-outlaw-roller-derby-a',
    '0222-sacramento-roller-derby-juniors-beastie-bears-vs-outlaw-roller-derby-bandits',
    '0222-sacramento-roller-derby-kodiak-attack-vs-outlaw-roller-derby-desperados',
    '0323-sacramento-roller-derby-bruin-trouble-vs-misery-loves-company',
    '0323-sacramento-roller-derby-juniors-beastie-bears-vs-bay-area-derby-seeds',
    '0412-lockeford-liberators-vs-team-oregon',
    '0412-sacramento-roller-derby-bruin-trouble-vs-faultline-derby-devils',
    '0412-sacramento-roller-derby-capital-maulstars-vs-team-philippines',
    '0412-sacramento-roller-derby-juniors-beastie-bears-vs-lockeford-little-rascals',
    '0412-team-philippines-headshots',
    '0413-sacramento-roller-derby-capital-maulstars-vs-team-oregon',
    '0413-team-philippines-vs-team-oregon',
    '0503-sacramento-roller-derby-bruin-trouble-vs-sierra-regional-roller-derby',
    '0503-sacramento-roller-derby-juniors-jedi-vs-sacramento-roller-derby-juniors-sith',
    '0503-sacramento-roller-derby-kodiak-attack-vs-norcal-roller-derby',
    '0614-sacramento-roller-derby-bruin-trouble-vs-santa-cruz-harbor-hellcats',
    '0614-sacramento-roller-derby-juniors-rainbows-vs-sacramento-roller-derby-juniors-sparkles',
    '0614-sacramento-roller-derby-kodiak-attack-vs-outlaw-roller-derby-desperados',
    '1018-baja-a-vs-jet-city',
    '1018-sacramento-roller-derby-bruin-trouble-vs-bellingham-roller-betties',
    '1018-sacramento-roller-derby-capital-maulstars-vs-jet-city',
    '1018-sacramento-roller-derby-juniors-beastie-bears-vs-bay-area-derby-seeds',
    '1018-sin-city-ace-vs-baja-b',
    '1018-socal-kraken-vs-santa-cruz-boardwalk-bombshells',
    '1108-sacramento-roller-derby-juniors-beastie-bears-vs-san-luis-obispo-county-junior-roller-derby',
    '1108-sacramento-roller-derby-river-city-rapids-vs-sacramento-roller-derby-tower-bridge-terrors',
    '0221-juarez-all-stars-vs-happy-valley-derby-darlins',
    '0221-sacramento-roller-derby-capital-maulstars-vs-juarez-all-stars',
    '0221-sacramento-roller-derby-juniors-beastie-bears-vs-outlaw-roller-derby-bandits',
    '0221-sacramento-roller-derby-kodiak-attack-vs-bay-area-derby-bones',
    '0307-sacramento-roller-derby-bruin-trouble-vs-north-bay-derby',
    '0307-sacramento-roller-derby-kodiak-attack-vs-carquinez-quad-squad',
    '0307-sacramento-roller-derby-river-city-rapids-vs-sacramento-roller-derby-midtown-mayhem',
    '0411-sacramento-roller-derby-bruin-trouble-vs-santa-cruz-harbor-hellcats',
    '0411-sacramento-roller-derby-juniors-beastie-bears-vs-bay-area-derby-seeds',
    '0411-sacramento-roller-derby-tower-bridge-terrors-vs-sacramento-roller-derby-river-city-rapids',
];

describe('audit teams', () => {
    it('generates the markdown', () => {
        const uniqueTeams = new Set<string>();

        events.forEach((eventName) => {
            const noDate = eventName.replace(/^\d{4}-/, '').replace(/-/g, ' ');
            let parts = noDate.split(/\s+vs\s+/i);
            if (parts.length === 1) parts = noDate.split(/\s+versus\s+/i);
            if (parts.length === 1) parts = noDate.split(/\s+v\s+/i);

            parts.forEach((part) => {
                const teamName = part
                    .split(' ')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                if (teamName.trim()) {
                    uniqueTeams.add(teamName.trim());
                }
            });
        });

        let markdown = `# Team Name Formatting Audit\n\n`;
        markdown += `| Original/Full (Desktop) | Mid-Length (Tablet) | Short/Aggressive (Mobile) |\n`;
        markdown += `| :--- | :--- | :--- |\n`;

        for (const team of uniqueTeams) {
            const formats = getTeamNameFormats(team);
            markdown += `| ${formats.full} | ${formats.mid} | ${formats.short} |\n`;
        }

        fs.writeFileSync('team-audit.md', markdown);
        expect(true).toBe(true);
    });
});
