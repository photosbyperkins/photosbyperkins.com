import type { EventScore, PhotoRecord, WftdaMatch } from '../types';
import { GEAR_REGISTRY, getGearItem } from '../data/gearData';
import { formatTeamName } from './formatters';

/**
 * Filter an array of album photos by camera or lens gear ID based on EXIF data.
 */
export function filterAlbumByGear(
    rawAlbumImages: PhotoRecord[],
    activeGearId: string | undefined,
    effectiveYear: string
): PhotoRecord[] {
    if (!activeGearId) return rawAlbumImages;
    const gear = GEAR_REGISTRY[activeGearId];
    if (!gear) return rawAlbumImages;

    return rawAlbumImages.filter((item) => {
        if (!item.exif) return false;
        if (gear.type === 'camera') {
            const match = getGearItem(item.exif.cameraModel, effectiveYear, 'camera');
            return match?.id === activeGearId;
        } else {
            const match = getGearItem(item.exif.gearLensId || item.exif.lens, effectiveYear, 'lens');
            return match?.id === activeGearId;
        }
    });
}

/**
 * Helper to extract trailing numeric photo sequence index from URL filename.
 */
function getPhotoNumericIndex(src: PhotoRecord): number {
    const url = src.original;
    const filename = url.split('/').pop() || '';
    const match = filename.match(/(\d+)\.[^.]+$/);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * Computes up to `maxCount` featured preview photos for an event album:
 * 1. Takes highlights, removes orphaned items not in the album.
 * 2. Sorts existing highlights sequentially.
 * 3. Fills remaining slots up to `maxCount` with album photos, also sorted sequentially.
 */
export function computeFeaturedPhotos(
    albumImages: PhotoRecord[],
    highlightImages: PhotoRecord[],
    maxCount = 5
): PhotoRecord[] {
    let photos: PhotoRecord[] = [...highlightImages];

    const albumMap = new Map(albumImages.map((ai) => [ai.original, ai]));

    if (photos.length > 0 && albumImages.length > 0) {
        photos = photos
            .filter((h) => albumMap.has(h.original))
            .map((h) => {
                const full = albumMap.get(h.original)!;
                return {
                    ...full,
                    ...h,
                    exif: full.exif || h.exif,
                    width: full.width ?? h.width,
                    height: full.height ?? h.height,
                    burst: full.burst ?? h.burst,
                };
            });
    }

    if (photos.length === 0) {
        if (albumImages.length > 0) {
            photos = albumImages.slice(0, maxCount);
        }
    } else {
        photos.sort((a, b) => getPhotoNumericIndex(a) - getPhotoNumericIndex(b));

        if (photos.length < maxCount && albumImages.length > 0) {
            const remaining = maxCount - photos.length;
            const featuredUrlSet = new Set(photos.map((f) => f.original));
            const extras = albumImages.filter((a) => !featuredUrlSet.has(a.original)).slice(0, remaining);
            extras.sort((a, b) => getPhotoNumericIndex(a) - getPhotoNumericIndex(b));
            photos = [...photos, ...extras];
        }
    }

    return photos.slice(0, maxCount);
}

/**
 * Builds an O(1) map from original photo URL to album array index.
 */
export function buildAlbumIndexMap(albumImages: PhotoRecord[]): Map<string, number> {
    const map = new Map<string, number>();
    albumImages.forEach((ai, i) => {
        map.set(ai.original, i);
    });
    return map;
}

/**
 * Resolves final team ordering and score visibility for an event:
 * - Prioritizes active team in search/filter view.
 * - Sorts teams by higher score when scores are available.
 */
export function sortTeamsByScore(
    baseTeams: string[],
    wftdaMatch?: WftdaMatch,
    localScore?: EventScore,
    activeTeamName?: string
): { finalTeams: string[]; shouldShowScores: boolean } {
    let activeSortedTeams = baseTeams;
    if (activeTeamName) {
        const activeTerms = activeTeamName.toLowerCase().split(/\s+/).filter(Boolean);
        activeSortedTeams = [...baseTeams].sort((a, b) => {
            const aRaw = a.toLowerCase();
            const bRaw = b.toLowerCase();
            const aDisplay = formatTeamName(a).toLowerCase();
            const bDisplay = formatTeamName(b).toLowerCase();

            const aScore = activeTerms.filter((term) => aRaw.includes(term) || aDisplay.includes(term)).length;
            const bScore = activeTerms.filter((term) => bRaw.includes(term) || bDisplay.includes(term)).length;

            return bScore - aScore;
        });
    }

    const hasLocalScore = Boolean(localScore && localScore.team1Score !== null && localScore.team2Score !== null);
    const shouldShowScores = activeSortedTeams.length > 1 && Boolean(wftdaMatch || hasLocalScore);

    const finalTeams = shouldShowScores
        ? [...activeSortedTeams].sort((a, b) => {
              const getExpectedScore = (tm: string): number => {
                  if (wftdaMatch) {
                      const t1 = wftdaMatch.team1.toLowerCase();
                      const t2 = wftdaMatch.team2.toLowerCase();
                      const tCurr = formatTeamName(tm).toLowerCase();
                      const tRaw = tm.toLowerCase();

                      if (t1.includes(tCurr) || tCurr.includes(t1) || t1.includes(tRaw) || tRaw.includes(t1)) {
                          return Number(wftdaMatch.score1) || -1;
                      }
                      if (t2.includes(tCurr) || tCurr.includes(t2) || t2.includes(tRaw) || tRaw.includes(t2)) {
                          return Number(wftdaMatch.score2) || -1;
                      }
                      return -1;
                  } else if (hasLocalScore) {
                      const originalTeams = baseTeams;
                      if (tm === originalTeams[0]) return Number(localScore!.team1Score) || -1;
                      if (tm === originalTeams[1]) return Number(localScore!.team2Score) || -1;
                      return -1;
                  }
                  return -1;
              };

              return getExpectedScore(b) - getExpectedScore(a);
          })
        : activeSortedTeams;

    return { finalTeams, shouldShowScores };
}
