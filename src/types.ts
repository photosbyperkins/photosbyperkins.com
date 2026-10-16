export interface ExifData {
    cameraModel?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
    isPrime?: boolean;
    gearLensId?: string;
}

/**
 * Normalised (0–1) detection box. `x`/`y` are the box centre and `w`/`h` its
 * size. Legacy entries without `w`/`h` only carry a point (the face top).
 */
export interface FaceBox {
    x: number;
    y: number;
    w?: number;
    h?: number;
    confidence?: number;
}

/** What produced a photo's focus point (see scripts/detectFaces.py). */
export type FocusSource = 'face' | 'person' | 'saliency';

export interface BurstMetadata {
    id: string;
    index: number;
    total: number;
    deltaSec?: number;
    frameSources: string[];
    frameThumbs?: string[];
    frameDeltas?: number[];
    isTriptych?: boolean;
    isDuet?: boolean;
    panelCount?: 2 | 3;
    frameFocusX?: (number | undefined)[];
    frameFocusY?: (number | undefined)[];
    frameWidths?: (number | undefined)[];
    frameHeights?: (number | undefined)[];
    frameEvents?: (string | undefined)[];
    frameEventNames?: (string | undefined)[];
    frameYears?: (string | undefined)[];
    frameScores?: (EventScore | undefined)[];
    bestFrameIndex?: number;
    frameQualityScores?: number[];
}

export interface PhotoRecord {
    original: string;
    thumb: string;
    tiny?: string;
    /** Compact 28-byte binary ThumbHash placeholder (base64-encoded). */
    th?: string;
    src?: string;
    focusX?: number;
    focusY?: number;
    focusSource?: FocusSource;
    /** Significant faces, primary subject first. */
    faces?: FaceBox[];
    /** Significant people (body boxes), primary subject first. */
    subjects?: FaceBox[];
    width?: number;
    height?: number;
    spriteIndex?: number;
    scrubberHash?: string;
    exif?: ExifData;
    burst?: BurstMetadata;
    bestInBurst?: boolean;
    qualityScore?: number;
    eventName?: string;
    year?: string;
}

export type PhotoInput = string | PhotoRecord;

export interface WftdaMatch {
    href: string;
    team1: string;
    team2: string;
    score1: number | string;
    score2: number | string;
}

export interface EventScore {
    team1Score: number | string | null;
    team2Score: number | string | null;
}

export interface SeasonStats {
    totalEvents?: number;
    totalPhotos?: number;
    mostSeenTeams?: string[];
    mostUsedCamera?: string | null;
    mostUsedCameraId?: string | null;
    mostUsedLens?: string | null;
    mostUsedLensId?: string | null;
    firstSeenTeams?: string[];
}

export type EventData = {
    album: PhotoInput[];
    highlights: PhotoInput[];
    date?: string | null;
    description?: string | null;
    zip?: string;
    photoCount?: number;
    albumSlug?: string;
    originalYear?: string;
    maxExifChars?: number;
    wftdaMatch?: WftdaMatch;
    localScore?: EventScore;
    scrubberHash?: string;
};

export type YearData = Record<string, EventData>;

// --- Store Types ---

export interface FavoriteItem {
    photo: PhotoInput;
    eventName: string;
    year: string;
}

export type FavoriteStoreItem = PhotoInput | FavoriteItem;

export interface LightboxState {
    images: PhotoInput[];
    index: number;
    eventName: string;
    year: string;
    isOpen: boolean;
    maxExifChars?: number;
    localScore?: EventScore;
    scrubberHash?: string;
}

export interface SharedPhotoState {
    eventName: string;
    photoIndex?: number;
    preventScroll?: boolean;
    openAlbumGrid?: boolean;
}

// --- Lazy Per-Event ML Tag Sidecar (/data/tags/<year>/<slug>.json) ---

export type SkaterRole = 'jammer' | 'pivot' | 'blocker' | 'ref' | 'spectator';

export type SimilarPhotoRef = [year: string, albumSlug: string, photoIndex: number];

export interface PhotoTagEntry {
    /** Detected primary subject role ('jammer' | 'pivot' | 'blocker' | 'ref' | 'spectator') */
    r?: SkaterRole;
    /** High-confidence jersey numbers */
    n?: string[];
    /** Team index (0 = team1, 1 = team2, null = unassigned/ref) */
    tm?: 0 | 1 | null;
    /** Indices into EventTagSidecar.vocab for matched scene/action tags */
    t?: number[];
    /** Grounded factual alt text (12-28 words) */
    a?: string;
    /** Top visually similar photos across the portfolio: [year, slug, idx][] */
    s?: SimilarPhotoRef[];
    /** Composite frame quality score (0..1) */
    q?: number;
    /** 1 if this photo is the highest-ranked frame in its burst */
    b?: 1;
}

export interface EventTagSidecar {
    v: 1;
    year?: string;
    slug?: string;
    eventName?: string;
    isJuniorBout?: boolean;
    teams?: Array<{
        name: string;
        jerseyColorHex?: string | null;
        score?: number | string | null;
    }>;
    vocab: string[];
    photos: Record<string, PhotoTagEntry>;
}

