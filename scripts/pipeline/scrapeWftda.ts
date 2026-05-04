// @ts-nocheck
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { IndexState } from './types';
import { logger } from './logger';

const URLS_FILE = path.join(process.cwd(), 'data', 'wftda-urls.json');
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'wftda-matches.json');

/**
 * Builds a stable fingerprint of all event names + years from photos.json.
 * This is content-based, so regenerating photos.json without adding events
 * produces the same fingerprint and correctly skips the scrape.
 */
function buildEventFingerprint(photosData: IndexState) {
    if (!photosData) return null;
    const keys = [];
    for (const [year, events] of Object.entries(photosData)) {
        for (const eventName of Object.keys(events)) {
            keys.push(`${year}::${eventName}`);
        }
    }
    keys.sort(); // stable ordering regardless of insertion order
    return crypto.createHash('sha1').update(keys.join('\n')).digest('hex');
}

export async function scrapeWftda(photosData?: IndexState) {
    if (!fs.existsSync(URLS_FILE)) {
        logger.info('No wftda-urls.json found, skipping WFTDA scrape.');
        return;
    }

    // Conditional Scraping: skip if the event list hasn't changed since last scrape
    const forceFlag = process.argv.includes('--force');
    if (!forceFlag && fs.existsSync(OUTPUT_FILE) && photosData) {
        const currentFingerprint = buildEventFingerprint(photosData);
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
            if (currentFingerprint && existing._eventFingerprint === currentFingerprint) {
                logger.info('No new events since last scrape. Skipping WFTDA integration...');
                return;
            }
        } catch {
            // Corrupt or missing fingerprint — fall through to scrape
        }
    }

    const urlsData = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));

    // Filter down to only teams with valid URLs
    const targets = Object.entries(urlsData).filter(([, url]) => url !== null);

    logger.info(`Found ${targets.length} explicit WFTDA team URLs to scrape.`);
    if (targets.length === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ rankings: {}, matches: {} }, null, 2));
        return;
    }

    logger.step('Launching headless browser to scrape results...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const uniqueMatches = new Map();
    const wftdaAliasMap = new Map();

    for (const [teamName, url] of targets) {
        const page = await browser.newPage();
        try {
            logger.info(`Scraping: ${teamName}`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            await page.waitForSelector('.gameRow', { timeout: 5000 }).catch(() => {});

            const matches = await page.evaluate(() => {
                const results = [];
                const elements = document.querySelectorAll('.gameRow--gameDate, .resultsForDate');
                let currentDate = '';

                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    if (el.classList.contains('gameRow--gameDate')) {
                        const rawText = el.innerText.trim();
                        const d = new Date(rawText);
                        if (!isNaN(d.valueOf())) {
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            currentDate = `${y}-${m}-${day}`;
                        } else {
                            currentDate = rawText;
                        }
                    } else if (el.classList.contains('resultsForDate')) {
                        const games = el.querySelectorAll('a.gameRow.resultRow');
                        for (let j = 0; j < games.length; j++) {
                            const game = games[j];
                            const href = game.href || game.getAttribute('href');
                            const teams = game.querySelectorAll('.gameRow--teamTitleRow');
                            const scores = game.querySelectorAll('.gameRow--score.resultRow--score');

                            if (teams.length >= 2 && scores.length >= 2) {
                                results.push({
                                    date: currentDate,
                                    eventInfo: 'Match', // Placeholder for compatibility
                                    href: href,
                                    team1: teams[0].innerText.trim(),
                                    score1: parseInt(scores[0].innerText.trim(), 10) || 0,
                                    team2: teams[1].innerText.trim(),
                                    score2: parseInt(scores[1].innerText.trim(), 10) || 0,
                                });
                            }
                        }
                    }
                }
                return results;
            });

            // Determine the WFTDA alias for this team
            if (matches.length > 0) {
                const tally = {};
                for (const m of matches) {
                    tally[m.team1] = (tally[m.team1] || 0) + 1;
                    tally[m.team2] = (tally[m.team2] || 0) + 1;
                }

                let candidates = [];
                let maxCount = -1;
                for (const [name, count] of Object.entries(tally)) {
                    if (count > maxCount) {
                        maxCount = count;
                        candidates = [name];
                    } else if (count === maxCount) {
                        candidates.push(name);
                    }
                }

                let bestAlias = candidates[0];
                if (candidates.length > 1) {
                    const localLower = teamName.toLowerCase();
                    const best = candidates.find((c) => localLower.includes(c.toLowerCase()));
                    if (best) bestAlias = best;
                }

                if (bestAlias) {
                    wftdaAliasMap.set(bestAlias, teamName);
                }
            }

            for (const match of matches) {
                if (match.href && !uniqueMatches.has(match.href)) {
                    uniqueMatches.set(match.href, match);
                }
            }
            logger.substep(`found ${matches.length} matches.`);
        } catch (err: any) {
            logger.error(`failed to scrape ${teamName}:`, err.message);
        } finally {
            await page.close();
        }
    }

    await browser.close();

    logger.step('Fetching global rankings...');
    try {
        const rRes = await fetch('https://stats.wftda.com/rankings/gur');
        const rHtml = await rRes.text();
        const trRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
        let match;
        const rankings = {};
        while ((match = trRegex.exec(rHtml)) !== null) {
            const trContent = match[1];
            const posMatch = trContent.match(/<td class="rankingsTable--position[^>]*>\s*(\d+)\s*<\/td>/);
            const titleMatch = trContent.match(/<td class="rankingsTable--teamTitleColumn[^>]*>.*?<a[^>]*>(.*?)<\/a>/s);
            const numbers = [...trContent.matchAll(/<td class="rankingsTable--number[^>]*>\s*([\d\.]+)\s*<\/td>/gs)];

            if (posMatch && titleMatch && numbers.length >= 3) {
                const name = titleMatch[1].trim().replace(/&amp;/g, '&');
                rankings[name] = {
                    rank: parseInt(posMatch[1], 10),
                    played: parseInt(numbers[0][1], 10),
                    wins: parseInt(numbers[1][1], 10),
                    losses: parseInt(numbers[2][1], 10),
                };
            }
        }

        let relevantEvents = [];
        if (photosData) {
            for (const [year, evts] of Object.entries(photosData)) {
                for (const title of Object.keys(evts)) {
                    const m = title.match(/^(\d{2}\.\d{2})\s+(.*)/);
                    if (m) {
                        const dateStr = `${year}-${m[1].replace('.', '-')}`;
                        const parts = m[2].split(/\s+(?:vs\.?|versus)\s+/i).map((p) => p.trim().toLowerCase());
                        relevantEvents.push({ date: dateStr, teams: parts });
                    }
                }
            }
        }

        const matchesArray = Array.from(uniqueMatches.values())
            .map((m) => {
                if (wftdaAliasMap.has(m.team1)) m.team1 = wftdaAliasMap.get(m.team1);
                if (wftdaAliasMap.has(m.team2)) m.team2 = wftdaAliasMap.get(m.team2);
                return m;
            })
            .filter((m) => {
                if (relevantEvents.length === 0) return true; // keep all if photos.json missing
                const m1 = m.team1.toLowerCase();
                const m2 = m.team2.toLowerCase();
                return relevantEvents.some((re) => {
                    if (re.date === m.date) {
                        return re.teams.some(
                            (t) => m1.includes(t) || m2.includes(t) || t.includes(m1) || t.includes(m2)
                        );
                    }
                    return false;
                });
            });

        const fingerprint = buildEventFingerprint(photosData as any);
        fs.writeFileSync(
            OUTPUT_FILE,
            JSON.stringify({ _eventFingerprint: fingerprint, rankings, matches: matchesArray }, null, 2)
        );
        logger.success(`Successfully wrote WFTDA data to ${OUTPUT_FILE}`);
    } catch (err) {
        logger.error('Failed ranking fetch:', err);
    }
}

if (process.argv[1] && process.argv[1].includes('scrapeWftda')) {
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'photos.json');
        if (fs.existsSync(p)) {
            scrapeWftda(JSON.parse(fs.readFileSync(p, 'utf8'))).catch(console.error);
        } else {
            scrapeWftda().catch(console.error);
        }
    })
}
