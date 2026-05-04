export interface PhotoExif {
    cameraModel?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
    isPrime?: boolean;
}

export interface PhotoObject {
    source: string;
    thumb: string;
    original: string;
    focusX?: number;
    focusY?: number;
    faceScore?: number;
    recapScore?: number;
    width?: number;
    height?: number;
    spriteIndex?: number;
    exif?: PhotoExif;
    absPath?: string;
    basename?: string;
    normalized?: string;
    tiny?: string;
}

export type Photo = string | PhotoObject;

export interface EventData {
    album: PhotoObject[];
    highlights: PhotoObject[];
    zip?: string;
    hero?: {
        src: string;
        focusX?: number;
        focusY?: number;
    };
    date?: string | null;
    description?: string | null;
    localScore?: Record<string, any>;
    earliestTime?: number;
}

export type YearData = Record<string, EventData>;

export interface IndexState {
    [year: string]: YearData;
}

export interface RecapDefinitions {
    [slug: string]: Array<{
        src: string;
        focusX?: number;
        focusY?: number;
    }>;
}

export interface WftdaMatch {
    date: string;
    eventInfo: string;
    href: string;
    team1: string;
    score1: number;
    team2: string;
    score2: number;
}
