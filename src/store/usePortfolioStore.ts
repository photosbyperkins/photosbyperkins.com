import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPhotoOriginalUrl } from '../utils/formatters';
import type { PortfolioStore } from '../types';

export const usePortfolioStore = create<PortfolioStore>()(
    persist(
        (set) => ({
            lightbox: {
                images: [],
                index: 0,
                eventName: '',
                year: '',
                isOpen: false,
            },
            sharedPhoto: null,
            favorites: [],

            openLightbox: (images, index, eventName, year, maxExifChars) =>
                set({ lightbox: { images, index, eventName, year, isOpen: true, maxExifChars } }),

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
        }),
        {
            name: 'portfolio-favorites',
            partialize: (state) => ({ favorites: state.favorites }),
        }
    )
);
