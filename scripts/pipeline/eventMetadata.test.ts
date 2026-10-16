import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    detectIsJuniorBout,
    parseEventTeamsFromFolder,
    inferTeamJerseyColorHex,
    loadEventMetadata,
    buildEventJsonFromDirectory,
} from './eventMetadata.js';

describe('eventMetadata', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'event-meta-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects junior bouts from folder names and team names', () => {
        expect(detectIsJuniorBout('11.08 Sacramento vs Outlaws (JB)')).toBe(true);
        expect(detectIsJuniorBout('04.12 SLOCO Junior Roller Derby vs Sacramento')).toBe(true);
        expect(detectIsJuniorBout('05.10 JRDA Championship Game')).toBe(true);
        expect(detectIsJuniorBout('11.08 Sacramento vs Outlaws')).toBe(false);
    });

    it('parses team names from folder labels', () => {
        expect(parseEventTeamsFromFolder('11.08 Sacramento vs Outlaws (JB)')).toEqual(['Sacramento', 'Outlaws']);
        expect(parseEventTeamsFromFolder('06.14 Capital Maulers vs Bashing Dead')).toEqual([
            'Capital Maulers',
            'Bashing Dead',
        ]);
        expect(parseEventTeamsFromFolder('All Photos')).toEqual(['All Photos']);
    });

    it('infers jersey hex colors for recurring teams', () => {
        expect(inferTeamJerseyColorHex('Sacramento')).toBe('#4B2E83');
        expect(inferTeamJerseyColorHex('Outlaws')).toBe('#1C1C1C');
        expect(inferTeamJerseyColorHex('Unknown Derby League')).toBeNull();
    });

    it('falls back to score.json when event.json does not exist', () => {
        fs.writeFileSync(path.join(tmpDir, 'score.json'), JSON.stringify({ team1Score: 185, team2Score: 142 }));
        const meta = loadEventMetadata(tmpDir, '11.08 Sacramento vs Outlaws');
        expect(meta.sourceFile).toBe('score.json');
        expect(meta.localScore).toEqual({ team1Score: 185, team2Score: 142 });
        expect(meta.teams).toHaveLength(2);
        expect(meta.teams[0]).toEqual({ name: 'Sacramento', jerseyColorHex: '#4B2E83', score: 185 });
        expect(meta.teams[1]).toEqual({ name: 'Outlaws', jerseyColorHex: '#1C1C1C', score: 142 });
        expect(meta.isJuniorBout).toBe(false);
    });

    it('prioritizes event.json and normalizes hiddenPhotos and coverPhoto', () => {
        fs.writeFileSync(path.join(tmpDir, 'score.json'), JSON.stringify({ team1Score: 100, team2Score: 90 }));
        fs.writeFileSync(
            path.join(tmpDir, 'event.json'),
            JSON.stringify({
                version: 1,
                title: '11.08 Sacramento vs Outlaws',
                isJuniorBout: true,
                teams: [
                    { name: 'Sacramento', jerseyColorHex: '#552288', score: 210 },
                    { name: 'Outlaws', jerseyColorHex: '#111111', score: 175 },
                ],
                coverPhoto: 'IMG_0042.jpg',
                hiddenPhotos: ['IMG_0010.JPG', 'subdir/IMG_0099.jpg'],
            })
        );

        const meta = loadEventMetadata(tmpDir, '11.08 Sacramento vs Outlaws');
        expect(meta.sourceFile).toBe('event.json');
        expect(meta.isJuniorBout).toBe(true);
        expect(meta.localScore).toEqual({ team1Score: 210, team2Score: 175 });
        expect(meta.teams[0].jerseyColorHex).toBe('#552288');
        expect(meta.coverPhoto).toBe('IMG_0042.jpg');
        expect(meta.hiddenPhotos.has('img_0010.jpg')).toBe(true);
        expect(meta.hiddenPhotos.has('img_0099.jpg')).toBe(true);

        const built = buildEventJsonFromDirectory(tmpDir, '11.08 Sacramento vs Outlaws');
        expect(built.version).toBe(1);
        expect(built.hiddenPhotos).toEqual(['img_0010.jpg', 'img_0099.jpg']);
    });
});
