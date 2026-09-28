import type { StateCreator } from 'zustand';
import type { GearItem } from '../../data/gearData';

export interface ModalSlice {
    isAboutOpen: boolean;
    openAbout: () => void;
    closeAbout: () => void;

    isAiPolicyOpen: boolean;
    openAiPolicy: () => void;
    closeAiPolicy: () => void;

    isCodeLicenseOpen: boolean;
    openCodeLicense: () => void;
    closeCodeLicense: () => void;

    isPhotoLicenseOpen: boolean;
    openPhotoLicense: () => void;
    closePhotoLicense: () => void;

    activeGear: GearItem | null;
    openGearModal: (gear: GearItem) => void;
    closeGearModal: () => void;

    iframeUrl: string | null;
    iframeTitle: string;
    iframeExternalUrl: string | null;
    openIframe: (url: string, title?: string, externalUrl?: string) => void;
    closeIframe: () => void;
}

export const createModalSlice: StateCreator<ModalSlice, [], [], ModalSlice> = (set) => ({
    isAboutOpen: false,
    openAbout: () => set({ isAboutOpen: true }),
    closeAbout: () => set({ isAboutOpen: false }),

    isAiPolicyOpen: false,
    openAiPolicy: () => set({ isAiPolicyOpen: true }),
    closeAiPolicy: () => set({ isAiPolicyOpen: false }),

    isCodeLicenseOpen: false,
    openCodeLicense: () => set({ isCodeLicenseOpen: true }),
    closeCodeLicense: () => set({ isCodeLicenseOpen: false }),

    isPhotoLicenseOpen: false,
    openPhotoLicense: () => set({ isPhotoLicenseOpen: true }),
    closePhotoLicense: () => set({ isPhotoLicenseOpen: false }),

    activeGear: null,
    openGearModal: (gear: GearItem) => set({ activeGear: gear }),
    closeGearModal: () => set({ activeGear: null }),

    iframeUrl: null,
    iframeTitle: 'WFTDA STATS',
    iframeExternalUrl: null,
    openIframe: (url: string, title: string = 'WFTDA STATS', externalUrl?: string) =>
        set({ iframeUrl: url, iframeTitle: title, iframeExternalUrl: externalUrl || url }),
    closeIframe: () => set({ iframeUrl: null, iframeTitle: 'WFTDA STATS', iframeExternalUrl: null }),
});
