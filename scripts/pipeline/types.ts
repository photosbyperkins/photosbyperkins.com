import type { ExifData, FaceBox, FocusSource, PhotoRecord } from '../../src/types';

export type { FaceBox, FocusSource };
export type PhotoExif = ExifData;

export interface PhotoObject extends PhotoRecord {
    source: string;
    faceScore?: number;
    recapScore?: number;
    absPath?: string;
    basename?: string;
    normalized?: string;
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
    title?: string;
    photoCount?: number;
    localScore?: Record<string, unknown>;
    earliestTime?: number;
    scrubberHash?: string;
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
        focusSource?: FocusSource;
        faces?: FaceBox[];
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
