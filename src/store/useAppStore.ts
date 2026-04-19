import { create } from 'zustand';

interface AppStore {
    isAboutOpen: boolean;
    openAbout: () => void;
    closeAbout: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
    isAboutOpen: false,
    openAbout: () => set({ isAboutOpen: true }),
    closeAbout: () => set({ isAboutOpen: false }),
}));
