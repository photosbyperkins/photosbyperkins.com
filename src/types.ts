export type PhotoInput =
    | string
    | {
          original: string;
          thumb: string;
          tiny?: string;
          focusX?: number;
          focusY?: number;
          width?: number;
          height?: number;
          exif?: {
              cameraModel?: string;
              lens?: string;
              focalLength?: string;
              aperture?: string;
              shutterSpeed?: string;
              iso?: string;
              isPrime?: boolean;
          };
      };

export interface WftdaMatch {
    href: string;
    team1: string;
    team2: string;
    score1: number | string;
    score2: number | string;
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
    wftdaMatch?: WftdaMatch;
    localScore?: {
        team1Score: number | string | null;
        team2Score: number | string | null;
    };
};

export type YearData = Record<string, EventData>;

// --- Store Types ---

export interface LightboxState {
    images: PhotoInput[];
    index: number;
    eventName: string;
    year: string;
    isOpen: boolean;
}

export interface SharedPhotoState {
    eventName: string;
    photoIndex?: number;
}

export interface PortfolioStore {
    lightbox: LightboxState;
    sharedPhoto: SharedPhotoState | null;
    openLightbox: (images: PhotoInput[], index: number, eventName: string, year: string) => void;
    closeLightbox: () => void;
    setLightboxIndex: (index: number) => void;
    setSharedPhoto: (shared: SharedPhotoState | null) => void;
}
