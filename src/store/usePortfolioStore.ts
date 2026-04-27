import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PortfolioStore, FavoriteStoreItem } from '../types';

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

            openLightbox: (images, index, eventName, year) =>
                set({ lightbox: { images, index, eventName, year, isOpen: true } }),

            closeLightbox: () => set((state) => ({ lightbox: { ...state.lightbox, isOpen: false } })),

            setLightboxIndex: (index) => set((state) => ({ lightbox: { ...state.lightbox, index } })),

            setSharedPhoto: (sharedPhoto) => set({ sharedPhoto }),

            toggleFavorite: (item) =>
                set((state) => {
                    const getPhotoInput = (f: FavoriteStoreItem) =>
                        f && typeof f === 'object' && 'photo' in f ? f.photo : f;
                    const photoInput = getPhotoInput(item);
                    const photoOriginal = typeof photoInput === 'string' ? photoInput : photoInput.original;

                    const isFav = state.favorites.some((f) => {
                        const fInput = getPhotoInput(f);
                        const fOriginal = typeof fInput === 'string' ? fInput : fInput.original;
                        return fOriginal === photoOriginal;
                    });

                    if (isFav) {
                        return {
                            favorites: state.favorites.filter((f) => {
                                const fInput = getPhotoInput(f);
                                const fOriginal = typeof fInput === 'string' ? fInput : fInput.original;
                                return fOriginal !== photoOriginal;
                            }),
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
