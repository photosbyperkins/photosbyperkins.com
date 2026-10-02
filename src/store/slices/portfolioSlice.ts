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
    isBatchSelectMode: boolean;
    batchSelectedPhotos: FavoriteStoreItem[];
    visiblePhotosMap: Record<string, FavoriteStoreItem[]>;

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
    setIsBatchSelectMode: (active: boolean) => void;
    toggleBatchPhoto: (item: FavoriteStoreItem) => void;
    selectBatchPhotos: (items: FavoriteStoreItem[]) => void;
    clearBatchSelection: () => void;
    registerVisiblePhotos: (eventName: string, photos: FavoriteStoreItem[]) => void;
    unregisterVisiblePhotos: (eventName: string) => void;
    clearVisiblePhotos: () => void;
    toggleFavorite: (item: FavoriteStoreItem) => void;
    addFavorites: (items: FavoriteStoreItem[]) => void;
    removeFavorites: (items: FavoriteStoreItem[]) => void;
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
    isBatchSelectMode: false,
    batchSelectedPhotos: [],
    visiblePhotosMap: {},

    openLightbox: (images, index, eventName, year, maxExifChars, localScore) =>
        set({ lightbox: { images, index, eventName, year, isOpen: true, maxExifChars, localScore } }),

    closeLightbox: () => set((state) => ({ lightbox: { ...state.lightbox, isOpen: false } })),

    setLightboxIndex: (index) => set((state) => ({ lightbox: { ...state.lightbox, index } })),

    setSharedPhoto: (sharedPhoto) => set({ sharedPhoto }),

    setIsBatchSelectMode: (isBatchSelectMode) =>
        set((state) => ({
            isBatchSelectMode,
            batchSelectedPhotos: isBatchSelectMode ? state.batchSelectedPhotos : [],
        })),

    toggleBatchPhoto: (item) =>
        set((state) => {
            const url = getPhotoOriginalUrl(item);
            if (!url) return state;
            const exists = state.batchSelectedPhotos.some((p) => getPhotoOriginalUrl(p) === url);
            let next: FavoriteStoreItem[];
            if (exists) {
                next = state.batchSelectedPhotos.filter((p) => getPhotoOriginalUrl(p) !== url);
            } else {
                next = [...state.batchSelectedPhotos, item];
            }
            return {
                batchSelectedPhotos: next,
                isBatchSelectMode: true,
            };
        }),

    selectBatchPhotos: (items) =>
        set(() => ({
            batchSelectedPhotos: items,
            isBatchSelectMode: true,
        })),

    clearBatchSelection: () => set({ batchSelectedPhotos: [] }),

    registerVisiblePhotos: (eventName, photos) =>
        set((state) => {
            const existing = state.visiblePhotosMap[eventName];
            if (existing && existing.length === photos.length) {
                let identical = true;
                for (let i = 0; i < photos.length; i++) {
                    if (getPhotoOriginalUrl(existing[i]) !== getPhotoOriginalUrl(photos[i])) {
                        identical = false;
                        break;
                    }
                }
                if (identical) return state;
            }
            return {
                visiblePhotosMap: {
                    ...state.visiblePhotosMap,
                    [eventName]: photos,
                },
            };
        }),

    unregisterVisiblePhotos: (eventName) =>
        set((state) => {
            if (!(eventName in state.visiblePhotosMap)) return state;
            const next = { ...state.visiblePhotosMap };
            delete next[eventName];
            return { visiblePhotosMap: next };
        }),

    clearVisiblePhotos: () => set({ visiblePhotosMap: {} }),

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

    addFavorites: (items) =>
        set((state) => {
            const existingUrls = new Set(state.favorites.map((f) => getPhotoOriginalUrl(f)));
            const newItems = items.filter((item) => !existingUrls.has(getPhotoOriginalUrl(item)));
            if (newItems.length === 0) return state;
            return { favorites: [...state.favorites, ...newItems] };
        }),

    removeFavorites: (items) =>
        set((state) => {
            const removeUrls = new Set(items.map((item) => getPhotoOriginalUrl(item)));
            return {
                favorites: state.favorites.filter((f) => !removeUrls.has(getPhotoOriginalUrl(f))),
            };
        }),

    clearFavorites: () => set({ favorites: [] }),
});
