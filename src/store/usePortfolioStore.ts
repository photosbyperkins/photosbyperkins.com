import { create } from 'zustand';
import type { PortfolioStore } from '../types';

export const usePortfolioStore = create<PortfolioStore>((set) => ({
    lightbox: {
        images: [],
        index: 0,
        eventName: '',
        year: '',
        isOpen: false,
    },
    sharedPhoto: null,

    openLightbox: (images, index, eventName, year) =>
        set({ lightbox: { images, index, eventName, year, isOpen: true } }),

    closeLightbox: () => set((state) => ({ lightbox: { ...state.lightbox, isOpen: false } })),

    setLightboxIndex: (index) => set((state) => ({ lightbox: { ...state.lightbox, index } })),

    setSharedPhoto: (sharedPhoto) => set({ sharedPhoto }),
}));
