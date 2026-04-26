import fs from 'fs';
import path from 'path';
const WFTDA_FILE = path.join(process.cwd(), 'data', 'wftda-matches.json');

const DATA_FILE = path.join(process.cwd(), 'data', 'photos.json');
const INDEX_FILE = path.join(process.cwd(), 'public', 'data', 'index.json');
const YEARS_DIR = path.join(process.cwd(), 'public', 'data', 'years');

const getUrl = (p) => p;

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-'); // Replace multiple - with single -
}

// getHeroImages removed because hero images are generated dynamically at runtime

function generateRecapImages(eventsObj) {
    const eventsArray = Object.entries(eventsObj);
    const validEvents = eventsArray.filter(([eventName]) => !eventName.toLowerCase().includes('headshot')).reverse();
    
    const images = [];
    const seenSrcs = new Set();

    const formatImage = (photoInput, eventName, ev) => {
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

function writeChunkedFile(baseDir, baseName, dataEvents, extraPayload, chunkSize = 10) {
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

        const eventsObj = {};
        for (const [k, v] of parts[i]) {
            eventsObj[k] = v;
        }

        const payload = {
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

async function processChunks() {
    console.log('📦 Chunking photos.json data...');

    if (!fs.existsSync(DATA_FILE)) {
        console.error('❌ Cannot find photos.json! Run `npm run index` first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // 1. Generate Index
    const years = Object.keys(data).sort((a, b) => b.localeCompare(a));
    const recapDefinitions = {};

    const indexData = {
        years: years,
    };

    // Ensure/Clean years dir
    if (fs.existsSync(YEARS_DIR)) {
        fs.rmSync(YEARS_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(YEARS_DIR, { recursive: true });

    fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2));
    console.log(`✨ Wrote index.json with ${years.length} years.`);

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

    const globalTeamsList = {};

    let customFilters = [];
    const CUSTOM_FILTERS_FILE = path.join(process.cwd(), 'data', 'customTeamFilters.json');
    if (fs.existsSync(CUSTOM_FILTERS_FILE)) {
        try {
            customFilters = JSON.parse(fs.readFileSync(CUSTOM_FILTERS_FILE, 'utf8'));
            console.log(`🔍 Loaded ${customFilters.length} custom team filters.`);
        } catch (e) {
            console.error('❌ Failed to parse customTeamFilters.json:', e);
        }
    }

    let wftdaData = { rankings: {}, matches: {} };
    if (fs.existsSync(WFTDA_FILE)) {
        try {
            wftdaData = JSON.parse(fs.readFileSync(WFTDA_FILE, 'utf8'));
            console.log(
                `🏆 Loaded WFTDA data (Rankings: ${Object.keys(wftdaData.rankings || {}).length}, Match logs for: ${Object.keys(wftdaData.matches || {}).length} teams).`
            );
        } catch (e) {
            console.error('❌ Failed to parse wftda configuration:', e);
        }
    }

    // Helper to find a specific match based on matched team name keys
    function findWFTDAMatch(year, rawDateStr, teamsArray) {
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

    for (const year of Object.keys(data)) {
        const yearData = data[year];
        const processedYearData = {};
        const yearAlbumsDir = path.join(ALBUMS_DIR, year);

        if (!fs.existsSync(yearAlbumsDir)) {
            fs.mkdirSync(yearAlbumsDir, { recursive: true });
        }

        const sortedYearEntries = Object.entries(yearData).sort((a, b) => {
            const [nameA, eventA] = a;
            const [nameB, eventB] = b;

            const dateMatchA = nameA.match(/^(\d{2}\.\d{2})/);
            const dateMatchB = nameB.match(/^(\d{2}\.\d{2})/);

            const dateA = dateMatchA ? dateMatchA[1] : '';
            const dateB = dateMatchB ? dateMatchB[1] : '';

            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }

            const timeA = eventA.earliestTime || 0;
            const timeB = eventB.earliestTime || 0;
            if (timeA !== timeB) {
                return timeA - timeB;
            }

            return nameA.localeCompare(nameB);
        });

        for (const [eventName, event] of sortedYearEntries) {
            const slug = slugify(eventName);
            const albumFile = path.join(yearAlbumsDir, `${slug}.json`);

            // Save album separately
            fs.writeFileSync(albumFile, JSON.stringify(event.album || [], null, 0));

            const evMeta = {
                ...event,
                album: [], // Clear it to save space
                photoCount: (event.album || []).length,
                albumSlug: slug,
                originalYear: year, // Required when fetched from a team index!
                recapImages: (event.album || [])
                    .map((img, idx) => ({ ...img, albumIndex: idx }))
                    .sort((a, b) => (b.faceScore || 0) - (a.faceScore || 0))
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
                let extractedTeams = parts.map((p) => p.trim()).filter(Boolean);

                let finalTeams = [];
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
                        evMeta.wftdaMatch = wMatch;
                    }
                }

                // Grab ranking for teams
                evMeta.wftdaRankings = {};
                finalTeams.forEach((tName) => {
                    // Because there are no explicit aliases for ranking fetches (which load entirely off wftda names),
                    // we'll just try to cross match them basically. Or if they mapped an explicit URL, it's safer
                    // to just accept whatever subset match works.
                    for (const [rName, rData] of Object.entries(wftdaData.rankings || {})) {
                        if (
                            rName.toLowerCase().includes(tName.toLowerCase()) ||
                            tName.toLowerCase().includes(rName.toLowerCase())
                        ) {
                            evMeta.wftdaRankings[tName] = rData;
                        }
                    }
                });

                finalTeams.forEach((teamRawName) => {
                    const cleanName = teamRawName.replace(/\s+/g, ' ').trim();
                    const teamSlug = slugify(cleanName);
                    if (!teamSlug) return;

                    if (!globalTeamsList[teamSlug]) {
                        globalTeamsList[teamSlug] = {
                            name: cleanName,
                            events: {},
                        };
                    }

                    // Uniquely key the event by its original name plus its year to prevent cross-year collisions
                    globalTeamsList[teamSlug].events[`[${year}] ${eventName}`] = evMeta;
                });
            }

            // Evaluate custom filters against the full event title
            customFilters.forEach((filter) => {
                const { name, match, notMatch, wftdaOnly } = filter;
                if (!name) return; // name is required

                let isMatch = false;
                const subject = mainTitle.toLowerCase();

                if (wftdaOnly) {
                    isMatch = !!evMeta.wftdaMatch;
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
                        globalTeamsList[customSlug] = {
                            name: name,
                            events: {},
                        };
                    }
                    globalTeamsList[customSlug].events[`[${year}] ${eventName}`] = evMeta;
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

        writeChunkedFile(YEARS_DIR, year, processedYearData, { recapCount: recapImages.length, recapEvents });
        console.log(`  📄 Chunked year: ${year} into parts with ${Object.keys(processedYearData).length} albums`);
    }

    // Write out Teams Data
    console.log(`\n📦 Writing Team Chunks...`);
    const uniqueTeams = [];
    for (const [teamSlug, teamData] of Object.entries(globalTeamsList)) {
        uniqueTeams.push({ name: teamData.name, slug: teamSlug, count: Object.keys(teamData.events).length });
        // We no longer generate recap slices for teams since the random hero logic
        // often pulls images of the opposing team
        writeChunkedFile(TEAMS_DIR, teamSlug, teamData.events, { recapCount: 0, recapEvents: [] });
    }

    // Sort uniquely mapped teams by mostly alphabetically
    uniqueTeams.sort((a, b) => a.name.localeCompare(b.name));

    // Write the global list to index for fast fetching in the Search view
    fs.writeFileSync(path.join(TEAMS_DIR, `index.json`), JSON.stringify(uniqueTeams, null, 0));
    console.log(`  📄 Wrote index.json with ${uniqueTeams.length} unique teams and ${uniqueTeams.length} team chunks.`);

    // Write definitions file for generateRecaps.js
    fs.writeFileSync(path.join(process.cwd(), 'data', 'recap_definitions.json'), JSON.stringify(recapDefinitions, null, 2));
    console.log(`  📄 Wrote recap_definitions.json with ${Object.keys(recapDefinitions).length} definitions.`);
}

processChunks();
