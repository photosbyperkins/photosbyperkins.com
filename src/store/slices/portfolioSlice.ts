import type { StateCreator } from 'zustand';
import { getPhotoOriginalUrl } from '../../utils/formatters';
import type { PhotoInput, FavoriteStoreItem, SharedPhotoState, EventScore } from '../../types';

export interface PortfolioSlice {
    lightbox: {
        images: PhotoInput[];
        index: number;
        eventName: string;
        year: string;
        isOpen: boolean;
        maxExifChars?: number;
        localScore?: EventScore;
    };
    sharedPhoto: SharedPhotoState | null;
    favorites: FavoriteStoreItem[];

    openLightbox: (
        images: PhotoInput[],
        index: number,
        eventName: string,
        year: string,
        maxExifChars?: number,
        localScore?: EventScore
    ) => void;
    closeLightbox: () => void;
    setLightboxIndex: (index: number) => void;
    setSharedPhoto: (sharedPhoto: SharedPhotoState | null) => void;
    toggleFavorite: (item: FavoriteStoreItem) => void;
    clearFavorites: () => void;
}

export const extractLegacyFavorites = (): FavoriteStoreItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('portfolio-favorites');
        if (raw) {
            const parsed = JSON.parse(raw);
            const favs = parsed?.state?.favorites;
            if (Array.isArray(favs) && favs.length > 0) {
                return favs;
            }
        }
    } catch {
        // ignore
    }
    return [];
};

export const createPortfolioSlice: StateCreator<PortfolioSlice, [], [], PortfolioSlice> = (set) => ({
    lightbox: {
        images: [],
        index: 0,
        eventName: '',
        year: '',
        isOpen: false,
    },
    sharedPhoto: null,
    favorites: extractLegacyFavorites(),

    openLightbox: (images, index, eventName, year, maxExifChars, localScore) =>
        set({ lightbox: { images, index, eventName, year, isOpen: true, maxExifChars, localScore } }),

    closeLightbox: () => set((state) => ({ lightbox: { ...state.lightbox, isOpen: false } })),

    setLightboxIndex: (index) => set((state) => ({ lightbox: { ...state.lightbox, index } })),

    setSharedPhoto: (sharedPhoto) => set({ sharedPhoto }),

    toggleFavorite: (item) =>
        set((state) => {
            const photoOriginal = getPhotoOriginalUrl(item);
            const isFav = state.favorites.some((f) => getPhotoOriginalUrl(f) === photoOriginal);

            if (isFav) {
                return {
                    favorites: state.favorites.filter((f) => getPhotoOriginalUrl(f) !== photoOriginal),
                };
            } else {
                return { favorites: [...state.favorites, item] };
            }
        }),

    clearFavorites: () => set({ favorites: [] }),
});
