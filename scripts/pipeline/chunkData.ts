// Chunk Data Pipeline
import fs from 'fs';
import path from 'path';
import type { IndexState, RecapDefinitions } from './types.js';
import { logger } from './logger';

const WFTDA_FILE = path.join(process.cwd(), 'data', 'wftda-matches.json');
const INDEX_FILE = path.join(process.cwd(), 'public', 'data', 'index.json');
const YEARS_DIR = path.join(process.cwd(), 'public', 'data', 'years');

function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
}

function generateRecapImages(eventsObj: Record<string, any>) {
    const eventsArray = Object.entries(eventsObj);
    const validEvents = eventsArray.filter(([eventName]) => !eventName.toLowerCase().includes('headshot')).reverse();
    
    const images = [];
    const seenSrcs = new Set();

    const formatImage = (photoInput: any, eventName: string, ev: any) => {
        const src = typeof photoInput === 'string' ? photoInput : photoInput.src || photoInput.original;
        if (seenSrcs.has(src)) return null;
        seenSrcs.add(src);

        const focusX = typeof photoInput === 'object' ? photoInput.focusX : undefined;
        const focusY = typeof photoInput === 'object' ? photoInput.focusY : undefined;

        const titleMatch = eventName.match(/^(?:\[(\d{4})\]\s*)?(\d{2}\.\d{2})\s+(.*)/);
        const baseDatePrefix = titleMatch ? titleMatch[2] : '';
        const mainTitle = titleMatch ? titleMatch[3] : eventName;

        const teams = mainTitle
            .split(/\s+(?:vs|versus)\s+/i)
            .map((t) => t.trim())
            .filter(Boolean);

        return {
            src,
            focusX,
            focusY,
            title: eventName,
            date: ev.date || baseDatePrefix,
            teams: teams.length > 0 ? teams : undefined,
            albumIndex: typeof photoInput === 'object' ? photoInput.albumIndex : undefined,
        };
    };

    validEvents.forEach(([eventName, ev]) => {
        if (ev.recapImages && ev.recapImages.length > 0) {
             const img = formatImage(ev.recapImages[0], eventName, ev);
             if (img) images.push(img);
        }
    });

    if (images.length < 48 && validEvents.length > 0) {
        let addedInRound = true;
        let photoIndex = 1;
        while (images.length < 48 && addedInRound) {
            addedInRound = false;
            for (const [eventName, ev] of validEvents) {
                if (images.length >= 48) break;
                if (ev.recapImages && ev.recapImages.length > photoIndex) {
                    const img = formatImage(ev.recapImages[photoIndex], eventName, ev);
                    if (img) {
                        images.push(img);
                        addedInRound = true;
                    }
                }
            }
            photoIndex++;
        }
    }
    images.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
            return dateB.localeCompare(dateA); // Latest events first
        }
        return (a.src || '').localeCompare(b.src || ''); // Keep chronological order within the same event
    });

    return images;
}

function writeChunkedFile(baseDir: string, baseName: string, dataEvents: Record<string, any>, extraPayload: any, chunkSize = 10) {
    const eventEntries = Object.entries(dataEvents);
    
    if (eventEntries.length === 0) {
        fs.writeFileSync(path.join(baseDir, `${baseName}.json`), JSON.stringify({ events: {}, ...extraPayload }, null, 0));
        return;
    }

    const parts = [];
    for (let i = 0; i < eventEntries.length; i += chunkSize) {
        parts.push(eventEntries.slice(i, i + chunkSize));
    }

    for (let i = 0; i < parts.length; i++) {
        const isFirst = i === 0;
        const isLast = i === parts.length - 1;
        const fileName = isFirst ? `${baseName}.json` : `${baseName}_part${i + 1}.json`;
        const nextPart = isLast ? null : `${baseName}_part${i + 2}`;

        const eventsObj: Record<string, any> = {};
        for (const [k, v] of parts[i]) {
            eventsObj[k] = v;
        }

        const payload: any = {
            events: eventsObj
        };
        
        if (nextPart) {
            payload.nextPart = nextPart;
        }
        
        if (isFirst && extraPayload) {
            Object.assign(payload, extraPayload);
        }

        fs.writeFileSync(path.join(baseDir, fileName), JSON.stringify(payload, null, 0));
    }
}

export async function chunkData(data: IndexState): Promise<RecapDefinitions> {
    logger.header('Chunking photos.json data...');



    // 1. Generate Index
    const years = Object.keys(data).sort((a, b) => b.localeCompare(a));
    const recapDefinitions: Record<string, any> = {};

    const indexData = {
        years: years,
    };

    // Ensure/Clean years dir
    if (fs.existsSync(YEARS_DIR)) {
        fs.rmSync(YEARS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(YEARS_DIR, { recursive: true });

    fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2));
    logger.success(`Wrote index.json with ${years.length} years.`);

    // 2. Generate chunks per year and individual albums
    const ALBUMS_DIR = path.join(process.cwd(), 'public', 'data', 'albums');
    if (fs.existsSync(ALBUMS_DIR)) {
        fs.rmSync(ALBUMS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(ALBUMS_DIR, { recursive: true });

    const TEAMS_DIR = path.join(process.cwd(), 'public', 'data', 'teams');
    if (fs.existsSync(TEAMS_DIR)) {
        fs.rmSync(TEAMS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEAMS_DIR, { recursive: true });

    const globalTeamsList: Record<string, any> = {};

    let customFilters = [];
    const CUSTOM_FILTERS_FILE = path.join(process.cwd(), 'data', 'customTeamFilters.json');
    if (fs.existsSync(CUSTOM_FILTERS_FILE)) {
        try {
            customFilters = JSON.parse(fs.readFileSync(CUSTOM_FILTERS_FILE, 'utf8'));
            logger.info(`Loaded ${customFilters.length} custom team filters.`);
        } catch (e: unknown) {
            logger.error('Failed to parse customTeamFilters.json:', e instanceof Error ? e.message : String(e));
        }
    }

    let wftdaData: { rankings: Record<string, any>; matches: any[] } = { rankings: {}, matches: [] };
    if (fs.existsSync(WFTDA_FILE)) {
        try {
            wftdaData = JSON.parse(fs.readFileSync(WFTDA_FILE, 'utf8'));
            logger.info(`Loaded WFTDA data (Rankings: ${Object.keys(wftdaData.rankings || {}).length}, Match logs for: ${Object.keys(wftdaData.matches || {}).length} teams).`);
        } catch (e: unknown) {
            logger.error('Failed to parse wftda configuration:', e instanceof Error ? e.message : String(e));
        }
    }

    // Helper to find a specific match based on matched team name keys
    function findWFTDAMatch(year: string, rawDateStr: string, teamsArray: string[]) {
        if (!wftdaData.matches || !Array.isArray(wftdaData.matches) || teamsArray.length < 2) return null;

        // Convert "10.22" frontend prefix + year into "2026-10-22"
        const targetDateStr = `${year}-${rawDateStr.replace('.', '-')}`;
        const localTeamsLower = teamsArray.map((t) => t.toLowerCase());

        let bestMatch = null;
        let bestScore = 0;

        for (const match of wftdaData.matches) {
            if (match.date === targetDateStr) {
                const team1 = match.team1.toLowerCase();
                const team2 = match.team2.toLowerCase();

                let score = 0;

                // Does team 1 align?
                if (localTeamsLower.some((lt) => team1.includes(lt) || lt.includes(team1))) {
                    score += 1;
                }
                // Does team 2 align?
                if (localTeamsLower.some((lt) => team2.includes(lt) || lt.includes(team2))) {
                    score += 1;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = match;
                }

                if (bestScore === 2) break; // Found exact match
            }
        }
        return bestMatch;
    }

    const sortedGlobalYears = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));
    const globalSeenTeams = new Set<string>();

    for (const year of sortedGlobalYears) {
        const yearData = data[year];
        const processedYearData: Record<string, { recapImages?: any[]; hero?: any; highlights?: any[]; wftdaMatch?: any; wftdaRankings?: any; [key: string]: any }> = {};
        const yearAlbumsDir = path.join(ALBUMS_DIR, year);

        if (!fs.existsSync(yearAlbumsDir)) {
            fs.mkdirSync(yearAlbumsDir, { recursive: true });
        }

        const teamCounts: Record<string, number> = {};
        const cameraCounts: Record<string, number> = {};
        const lensCounts: Record<string, number> = {};
        const firstSeenTeams = new Set<string>();

        const sortedYearEntries = Object.entries(yearData).sort((a, b) => {
            const [nameA, eventA] = a;
            const [nameB, eventB] = b;

            const dateMatchA = nameA.match(/^(\d{2}\.\d{2})/);
            const dateMatchB = nameB.match(/^(\d{2}\.\d{2})/);

            const dateA = dateMatchA ? dateMatchA[1] : '';
            const dateB = dateMatchB ? dateMatchB[1] : '';

            if (dateA !== dateB) {
                // Reverse chronological by date (latest first)
                return dateB.localeCompare(dateA);
            }

            const timeA = eventA.earliestTime || 0;
            const timeB = eventB.earliestTime || 0;
            if (timeA !== timeB) {
                // Reverse chronological by time (latest first)
                return timeB - timeA;
            }

            // Reverse alphabetical if dates are identical
            return nameB.localeCompare(nameA);
        });

        for (const [eventName, event] of sortedYearEntries) {
            const slug = slugify(eventName);
            const albumFile = path.join(yearAlbumsDir, `${slug}.json`);

            // Save album separately
            const cleanAlbum = (event.album || []).map(img => {
                if (typeof img === 'string') return img;
                const { ...rest } = img;
                return rest;
            });
            fs.writeFileSync(albumFile, JSON.stringify(cleanAlbum, null, 0));

            let maxExifChars = 0;
            for (const img of (event.album || [])) {
                if (img && typeof img === 'object' && img.exif) {
                    if (img.exif.cameraModel) cameraCounts[img.exif.cameraModel] = (cameraCounts[img.exif.cameraModel] || 0) + 1;
                    if (img.exif.lens) lensCounts[img.exif.lens] = (lensCounts[img.exif.lens] || 0) + 1;

                    const top = [img.exif.cameraModel, img.exif.lens].filter(Boolean).join(' \u2022 ');
                    const bottom = [img.exif.focalLength, img.exif.aperture, img.exif.shutterSpeed, img.exif.iso].filter(Boolean).join(' \u2022 ');
                    if (top.length > maxExifChars) maxExifChars = top.length;
                    if (bottom.length > maxExifChars) maxExifChars = bottom.length;
                }
            }

            const evMeta = {
                ...event,
                album: [], // Clear it to save space
                photoCount: (event.album || []).length,
                albumSlug: slug,
                originalYear: year, // Required when fetched from a team index!
                ...(maxExifChars > 0 && { maxExifChars }),
                recapImages: (event.album || [])
                    .map((img, idx) => ({ ...img, albumIndex: idx }))
                    .sort((a, b) => (b.recapScore || 0) - (a.recapScore || 0))
                    .slice(0, 24), // Pre-compute fallback images for the recap grid
            };

            // Keep metadata in year file
            processedYearData[eventName] = evMeta;

            // Extract Teams
            const titleMatch = eventName.match(/^(\d{2}\.\d{2})\s+(.*)/);
            const baseDatePrefix = titleMatch ? titleMatch[1] : '';
            const mainTitle = titleMatch ? titleMatch[2] : eventName;

            const parts = mainTitle.split(/\s+(?:vs\.?|versus)\s+/i);
            const isHeadshots = mainTitle.toLowerCase().includes('headshots');
            const isSRDRoundRobin = mainTitle.toLowerCase().includes('sacramento roller derby round robin');

            if (parts.length > 1 || isHeadshots || isSRDRoundRobin) {
                // It's a matchup, headshots, or Round Robin!
                const extractedTeams = parts.map((p) => p.trim()).filter(Boolean);

                let finalTeams: string[];
                if (isSRDRoundRobin) {
                    finalTeams = [
                        'Sacramento Roller Derby White',
                        'Sacramento Roller Derby Blue',
                        'Sacramento Roller Derby Yellow',
                    ];
                } else {
                    finalTeams = extractedTeams;
                }

                // Add WFTDA Meta
                if (baseDatePrefix) {
                    const wMatch = findWFTDAMatch(year, baseDatePrefix, finalTeams);
                    if (wMatch) {
                        (evMeta as any).wftdaMatch = wMatch;
                    }
                }

                // Grab ranking for teams
                (evMeta as any).wftdaRankings = {};
                finalTeams.forEach((tName) => {
                    for (const [rName, rData] of Object.entries(wftdaData.rankings || {})) {
                        if (
                            rName.toLowerCase().includes(tName.toLowerCase()) ||
                            tName.toLowerCase().includes(rName.toLowerCase())
                        ) {
                            (evMeta as any).wftdaRankings[tName] = rData;
                        }
                    }
                });

                finalTeams.forEach((teamRawName) => {
                    const cleanName = teamRawName.replace(/\s+/g, ' ').trim();
                    const isHomeTeam = cleanName.toLowerCase().includes('sacramento');

                    if (!isHomeTeam) {
                        teamCounts[cleanName] = (teamCounts[cleanName] || 0) + 1;
                        
                        if (!globalSeenTeams.has(cleanName)) {
                            globalSeenTeams.add(cleanName);
                            // Do not track "First Seen" for the very first baseline year, as every team would be new.
                            if (year !== sortedGlobalYears[0]) {
                                firstSeenTeams.add(cleanName);
                            }
                        }
                    }
                    
                    const teamSlug = slugify(cleanName);
                    if (!teamSlug) return;
                    if (!globalTeamsList[teamSlug]) {
                        globalTeamsList[teamSlug] = {
                            name: cleanName,
                            events: {},
                        } as any;
                    }

                    // Uniquely key the event by its original name plus its year to prevent cross-year collisions
                    globalTeamsList[teamSlug].events[`[${year}] ${eventName}`] = evMeta;
                });
            }

            // Evaluate custom filters against the full event title
            customFilters.forEach((filter: any) => {
                const { name, match, notMatch, wftdaOnly } = filter;
                if (!name) return; // name is required

                let isMatch = false;
                const subject = mainTitle.toLowerCase();

                if (wftdaOnly) {
                    isMatch = !!(evMeta as any).wftdaMatch;
                } else if (match && Array.isArray(match) && match.length > 0) {
                    isMatch = match.includes('*') || match.some((m) => subject.includes(m.toLowerCase()));
                }

                if (isMatch) {
                    // Check if it should NOT match
                    if (notMatch && Array.isArray(notMatch)) {
                        const hasExclusion = notMatch.some((nm) => subject.includes(nm.toLowerCase()));
                        if (hasExclusion) return;
                    }

                    const customSlug = slugify(name);
                    if (!globalTeamsList[customSlug]) {
                        const customEvMeta: any = {
                            ...event,
                            wftdaMatch: null,
                            wftdaRankings: {}
                        };
                        globalTeamsList[customSlug] = {
                            name: name,
                            events: {},
                        };
                        globalTeamsList[customSlug].events[`[${year}] ${eventName}`] = customEvMeta;
                    } else {
                        globalTeamsList[customSlug].events[`[${year}] ${eventName}`] = evMeta;
                    }
                }
            });
        }

        const recapImages = generateRecapImages(processedYearData);
        recapDefinitions[year] = recapImages;
        const recapEvents = recapImages.map(img => ({ eventName: img.title, photoIndex: img.albumIndex }));

        // Strip payload bloat from processedYearData before saving it.
        // Because globalTeamsList uses the exact same evMeta references, this also cleans the team chunks.
        for (const evKey in processedYearData) {
            delete processedYearData[evKey].recapImages;
            delete processedYearData[evKey].hero;

            if (processedYearData[evKey].highlights) {
                processedYearData[evKey].highlights = processedYearData[evKey].highlights.map((h) => ({
                    original: h.original,
                    thumb: h.thumb || h.original,
                    focusX: h.focusX,
                    focusY: h.focusY,
                }));
            }
        }

        const getMostFrequent = (counts: Record<string, number>): string[] => {
            let maxCount = 0;
            for (const count of Object.values(counts)) {
                if (count > maxCount) maxCount = count;
            }
            if (maxCount === 0) return [];
            
            return Object.entries(counts)
                .filter(([, count]) => count === maxCount)
                .map(([item]) => item);
        };

        const totalEvents = Object.keys(processedYearData).length;
        const totalPhotos = Object.values(processedYearData).reduce((sum, ev: any) => sum + (ev.photoCount || 0), 0);

        const yearStats = {
            totalEvents,
            totalPhotos,
            mostSeenTeams: getMostFrequent(teamCounts),
            mostUsedCamera: getMostFrequent(cameraCounts)[0] || null,
            mostUsedLens: getMostFrequent(lensCounts)[0] || null,
            firstSeenTeams: Array.from(firstSeenTeams),
        };

        writeChunkedFile(YEARS_DIR, year, processedYearData, { recapCount: recapImages.length, recapEvents, stats: yearStats });
        // logger.info(`Chunked year: ${year} into parts with ${Object.keys(processedYearData).length} albums`);
    }

    // Write out Teams Data
    logger.step(`Writing Team Chunks...`);
    const uniqueTeams: any[] = [];
    for (const [teamSlug, teamData] of Object.entries(globalTeamsList)) {
        const anyTeamData = teamData as any;
        uniqueTeams.push({ name: anyTeamData.name, slug: teamSlug, count: Object.keys(anyTeamData.events).length });
        
        // Sort team events in reverse chronological order across all years
        const sortedTeamEvents: Record<string, any> = {};
        const teamEventEntries = Object.entries(teamData.events).sort((a: [string, any], b: [string, any]) => {
            const keyA = a[0];
            const keyB = b[0];
            const evA = a[1];
            const evB = b[1];
            
            // Keys look like "[2024] 10.22 Event"
            const yearA = keyA.match(/^\[(\d{4})\]/)?.[1] || '';
            const yearB = keyB.match(/^\[(\d{4})\]/)?.[1] || '';
            
            if (yearA !== yearB) {
                return yearB.localeCompare(yearA); // Latest year first
            }
            
            const dateA = keyA.match(/\] (\d{2}\.\d{2})/)?.[1] || '';
            const dateB = keyB.match(/\] (\d{2}\.\d{2})/)?.[1] || '';
            
            if (dateA !== dateB) {
                return dateB.localeCompare(dateA); // Latest date first
            }
            
            const timeA = evA.earliestTime || 0;
            const timeB = evB.earliestTime || 0;
            if (timeA !== timeB) {
                return timeB - timeA; // Latest time first
            }
            
            return keyB.localeCompare(keyA);
        });
        
        for (const [k, v] of teamEventEntries) {
            sortedTeamEvents[k] = v;
        }

        // We no longer generate recap slices for teams since the random hero logic
        // often pulls images of the opposing team
        writeChunkedFile(TEAMS_DIR, teamSlug, sortedTeamEvents, { recapCount: 0, recapEvents: [] });
    }

    // Sort uniquely mapped teams by mostly alphabetically
    uniqueTeams.sort((a, b) => a.name.localeCompare(b.name));

    // Write the global list to index for fast fetching in the Search view
    fs.writeFileSync(path.join(TEAMS_DIR, `index.json`), JSON.stringify(uniqueTeams, null, 0));
    logger.info(`Wrote index.json with ${uniqueTeams.length} unique teams and ${uniqueTeams.length} team chunks.`);

    return recapDefinitions as RecapDefinitions;
}

if (process.argv[1] && process.argv[1].includes('chunkData')) {
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'photos.json');
        if (fs.existsSync(p)) {
            chunkData(JSON.parse(fs.readFileSync(p, 'utf8'))).catch(console.error);
        }
    });
}
