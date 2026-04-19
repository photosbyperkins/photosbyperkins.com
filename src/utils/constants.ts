import { Mail, Aperture } from 'lucide-react';
import { CameraFaviconIcon, TikTokIcon, FacebookIcon, InstagramIcon } from '../components/ui/icons';

// ==========================================
// USER CONFIGURATION
// Adjust these constants to match your brand
// ==========================================

export const TEAM_ABBREVIATIONS: Record<string, string> = (() => {
    try {
        const envStr = import.meta.env.VITE_TEAM_ABBREVIATIONS;
        if (envStr) return JSON.parse(envStr);
    } catch (e) {
        console.warn('Failed to parse VITE_TEAM_ABBREVIATIONS from env');
    }
    return {
        'My Local Roller Derby': 'MLRD',
        'Rival City Roller Derby': 'Rival City',
        'Long Name League': 'LNL',
        Headshots: '',
    };
})();
export const GEAR = [
    {
        name: 'Camera Model',
        href: '#',
        Icon: CameraFaviconIcon,
    },
    {
        name: 'Telephoto Lens',
        href: '#',
        Icon: Aperture,
    },
    {
        name: 'Prime Lens',
        href: '#',
        Icon: Aperture,
    },
];

export const SOCIAL = [
    {
        icon: FacebookIcon,
        label: 'facebook.com/yourbrand',
        href: 'https://www.facebook.com/',
        display: '/yourbrand',
    },
    {
        icon: InstagramIcon,
        label: 'instagram.com/yourbrand',
        href: 'https://www.instagram.com/',
        display: '@yourbrand',
    },
    {
        icon: Mail,
        label: 'contact@yourbrand.com',
        href: 'mailto:contact@yourbrand.com',
        display: 'contact@yourbrand.com',
    },
];

export const SRD_LINKS = [
    {
        icon: FacebookIcon,
        label: 'facebook.com/partner_org',
        href: 'https://www.facebook.com/',
        display: '/partner_org',
    },
    {
        icon: InstagramIcon,
        label: 'instagram.com/partner_org',
        href: 'https://www.instagram.com/',
        display: '@partner_org',
    },
    {
        icon: TikTokIcon,
        label: 'tiktok.com/@partner_org',
        href: 'https://www.tiktok.com/',
        display: '@partner_org',
    },
];
