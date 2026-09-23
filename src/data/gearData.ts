export interface GearItem {
    id: string;
    name: string;
    shortName: string;
    compactName: string;
    brand: 'Nikon' | 'Sigma' | 'Olympus' | 'Panasonic' | 'Other';
    type: 'camera' | 'lens';
    officialUrl: string;
    specs: Record<string, string>;
    description: string;
    modalTitle: string;
}

export const GEAR_REGISTRY: Record<string, GearItem> = {
    'nikon-z8': {
        id: 'nikon-z8',
        name: 'Nikon Z 8',
        shortName: 'Nikon ℤ8',
        compactName: 'Nikon Z 8',
        brand: 'Nikon',
        type: 'camera',
        officialUrl: 'https://www.nikonusa.com/p/z-8/1695',
        modalTitle: 'NIKON ℤ8',
        specs: {
            Sensor: '45.7 MP Full-Frame Stacked CMOS (No Mechanical Shutter)',
            Mount: 'Nikon Z Mount',
            Autofocus: '493-Point Phase-Detection with Deep Learning Subject Tracking',
            'Continuous Shooting': '20 fps RAW / 120 fps JPEG',
            Video: '8.3K/60p N-RAW, 4.1K/120p, 10-Bit ProRes 422 HQ',
            Weight: '910 g (2.0 lbs)',
        },
        description:
            'Primary camera body for modern trackside action. The high-speed blackout-free electronic shutter and deep learning AF tracking effortlessly freeze rapid apex jumps and jammer movements under challenging indoor arena lighting.',
    },
    'nikon-d850': {
        id: 'nikon-d850',
        name: 'Nikon D850',
        shortName: 'Nikon D850',
        compactName: 'Nikon D850',
        brand: 'Nikon',
        type: 'camera',
        officialUrl: 'https://www.nikonusa.com/p/d850/1585',
        modalTitle: 'NIKON D850',
        specs: {
            Sensor: '45.7 MP Back-Illuminated (BSI) Full-Frame CMOS',
            Mount: 'Nikon F Mount',
            Autofocus: 'Multi-CAM 20K 153-Point AF System with 99 Cross-Sensors',
            'Continuous Shooting': '7 fps (up to 9 fps with MB-D18 battery grip)',
            'ISO Range': '64 – 25,600 (Expandable to 32 – 102,400)',
            Weight: '1,005 g (2.2 lbs)',
        },
        description:
            'Flagship full-frame D-SLR bridging high resolution with relentless dynamic range. A workhorse for tournament coverage and high-detail athletic action.',
    },
    'nikon-d750': {
        id: 'nikon-d750',
        name: 'Nikon D750',
        shortName: 'Nikon D750',
        compactName: 'Nikon D750',
        brand: 'Nikon',
        type: 'camera',
        officialUrl: 'https://www.nikonusa.com/p/d750/1543',
        modalTitle: 'NIKON D750',
        specs: {
            Sensor: '24.3 MP Full-Frame CMOS',
            Mount: 'Nikon F Mount',
            Autofocus: 'Advanced Multi-CAM 3500FX II 51-Point AF System',
            'Continuous Shooting': '6.5 fps',
            'Low-Light AF': 'Sensitive down to -3 EV',
            Weight: '840 g (1.85 lbs)',
        },
        description:
            'The original Sacramento Roller Derby season workhorse from 2016 to 2019. Renowned for its superb low-light high-ISO performance, agile handling, and compact monocoque body.',
    },
    'nikon-120-300mm': {
        id: 'nikon-120-300mm',
        name: 'Nikon AF-S NIKKOR 120-300mm f/2.8E FL ED SR VR',
        shortName: 'AF-S 120-300mm f/2.8E FL',
        compactName: 'Nikon 120-300mm f/2.8',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/af-s-nikkor-120-300mm-f28e-fl-ed-sr-vr/20088/overview',
        modalTitle: 'NIKON 120-300mm f/2.8',
        specs: {
            'Focal Range': '120 – 300mm',
            'Max Aperture': 'f/2.8 Constant',
            Mount: 'Nikon F (adapted seamlessly to Z via FTZ II)',
            'Optical Design': '25 Elements in 19 Groups (1 Fluorite, 2 ED, 1 SR, Nano Crystal & ARNEO Coat)',
            'Vibration Reduction': '4.0 Stops VR with Sport Mode',
            Weight: '3,250 g (7.17 lbs)',
        },
        description:
            'Nikon’s pro-grade telephoto zoom. Offers prime-rivaling edge-to-edge sharpness with the versatility of a constant f/2.8 zoom, capturing both full-pack tactical formations and tight facial expressions across the track.',
    },
    'nikon-135mm-plena': {
        id: 'nikon-135mm-plena',
        name: 'Nikon NIKKOR Z 135mm f/1.8 S Plena',
        shortName: 'NIKKOR Z 135mm Plena',
        compactName: 'Nikon Z 135mm Plena',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/nikkor-z-135mm-f18-s-plena/20123/overview',
        modalTitle: 'NIKKOR Z 135mm PLENA',
        specs: {
            'Focal Length': '135mm Prime',
            'Max Aperture': 'f/1.8',
            Mount: 'Nikon Z Mount',
            'Optical Design':
                '16 Elements in 14 Groups (4 ED, 1 Aspherical, 1 SR Element, Meso Amorphous & ARNEO Coat)',
            'Aperture Blades': '11 Rounded Diaphragm Blades',
            Weight: '995 g (2.19 lbs)',
        },
        description:
            'The pinnacle of Z-mount optical engineering. Named Plena (from plenum, signifying completeness), it delivers unmatched edge-to-edge brightness, completely circular bokeh highlights even wide open at f/1.8, and breathtaking separation for individual athlete moments.',
    },
    'sigma-135mm-art': {
        id: 'sigma-135mm-art',
        name: 'Sigma 135mm f/1.8 DG HSM | Art',
        shortName: 'Sigma 135mm f/1.8 Art',
        compactName: 'Sigma 135mm f/1.8 Art',
        brand: 'Sigma',
        type: 'lens',
        officialUrl: 'https://www.sigmaphoto.com/135mm-f1-8-dg-hsm-a',
        modalTitle: 'SIGMA 135mm f/1.8 ART',
        specs: {
            'Focal Length': '135mm Prime',
            'Max Aperture': 'f/1.8',
            Mount: 'Nikon F Mount',
            'Optical Design': '13 Elements in 10 Groups (2 FLD, 2 SLD Elements)',
            'Autofocus Motor': 'Hyper Sonic Motor (HSM) with 1.3x Torque',
            Weight: '1,130 g (2.49 lbs)',
        },
        description:
            'Celebrated as one of the sharpest telephoto prime lenses ever built. The favorite lens for the 2018 and 2019 seasons, delivering blistering autofocus speed and cinematic subject isolation down the derby straightaways.',
    },
    'sigma-85mm-art': {
        id: 'sigma-85mm-art',
        name: 'Sigma 85mm f/1.4 DG HSM | Art',
        shortName: 'Sigma 85mm f/1.4 Art',
        compactName: 'Sigma 85mm f/1.4 Art',
        brand: 'Sigma',
        type: 'lens',
        officialUrl: 'https://www.sigmaphoto.com/85mm-f1-4-dg-hsm-a',
        modalTitle: 'SIGMA 85mm f/1.4 ART',
        specs: {
            'Focal Length': '85mm Prime',
            'Max Aperture': 'f/1.4',
            Mount: 'Nikon F Mount',
            'Optical Design': '14 Elements in 12 Groups (2 SLD Elements)',
            'Aperture Blades': '9 Rounded Blades',
            Weight: '1,130 g (2.49 lbs)',
        },
        description:
            'An optical heavyweight for 2020 action. The wide f/1.4 aperture sucked in tremendous amounts of light in poorly lit venues while resolving ultra-fine detail on the D850 sensor.',
    },
    'sigma-50mm-art': {
        id: 'sigma-50mm-art',
        name: 'Sigma 50mm f/1.4 DG HSM | Art',
        shortName: 'Sigma 50mm f/1.4 Art',
        compactName: 'Sigma 50mm f/1.4 Art',
        brand: 'Sigma',
        type: 'lens',
        officialUrl: 'https://www.sigmaphoto.com/50mm-f1-4-dg-hsm-a',
        modalTitle: 'SIGMA 50mm f/1.4 ART',
        specs: {
            'Focal Length': '50mm Prime',
            'Max Aperture': 'f/1.4',
            Mount: 'Nikon F Mount',
            'Optical Design': '13 Elements in 8 Groups (3 SLD, 1 Aspherical Element)',
            'Autofocus Motor': 'Hyper Sonic Motor (HSM)',
            Weight: '815 g (1.80 lbs)',
        },
        description:
            'Redefined the standard focal length for modern sensors. Favorite lens for the 2017 season, allowing natural perspective trackside pack coverage with stellar sharpness wide open.',
    },
    'nikon-85mm-18g': {
        id: 'nikon-85mm-18g',
        name: 'Nikon AF-S NIKKOR 85mm f/1.8G',
        shortName: 'AF-S NIKKOR 85mm f/1.8G',
        compactName: 'Nikon 85mm f/1.8G',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/af-s-nikkor-85mm-f18g/2201',
        modalTitle: 'NIKON 85mm f/1.8G',
        specs: {
            'Focal Length': '85mm Prime',
            'Max Aperture': 'f/1.8',
            Mount: 'Nikon F Mount',
            'Optical Design': '9 Elements in 9 Groups',
            'Autofocus Motor': 'Silent Wave Motor (SWM)',
            Weight: '350 g (12.4 oz)',
        },
        description:
            'Lightweight, nimble, and razor-sharp portrait prime. Served as the favorite trackside companion throughout the inaugural 2016 season paired with the Nikon D750.',
    },
};

/**
 * Resolves a gear item either by explicit ID, or by matching the display name and year context.
 */
export function getGearItem(
    identifier?: string | null,
    year?: string | null,
    typeHint?: 'camera' | 'lens'
): GearItem | null {
    if (!identifier) return null;

    const normalizedId = identifier.toLowerCase().trim();

    // 1. Direct ID match
    if (GEAR_REGISTRY[normalizedId]) {
        return GEAR_REGISTRY[normalizedId];
    }

    // 2. Exact match on known camera names
    if (
        typeHint === 'camera' ||
        normalizedId.includes('nikon') ||
        normalizedId.includes('d750') ||
        normalizedId.includes('d850') ||
        normalizedId.includes('z8') ||
        normalizedId.includes('ℤ8')
    ) {
        if (normalizedId.includes('z8') || normalizedId.includes('ℤ8')) return GEAR_REGISTRY['nikon-z8'];
        if (normalizedId.includes('d850')) return GEAR_REGISTRY['nikon-d850'];
        if (normalizedId.includes('d750')) return GEAR_REGISTRY['nikon-d750'];
    }

    // 3. Year-based contextual lens match
    const cleanLens = identifier.replace(/^[Fℤ]\s+/, '').trim();

    if (year === '2026' || cleanLens.includes('120-300')) {
        return GEAR_REGISTRY['nikon-120-300mm'];
    }
    if (year === '2024' || year === '2025' || cleanLens.toLowerCase().includes('plena')) {
        return GEAR_REGISTRY['nikon-135mm-plena'];
    }
    if (year === '2020' || (cleanLens.includes('85mm') && cleanLens.includes('1.4'))) {
        return GEAR_REGISTRY['sigma-85mm-art'];
    }
    if (year === '2018' || year === '2019' || cleanLens.includes('135mm')) {
        return GEAR_REGISTRY['sigma-135mm-art'];
    }
    if (year === '2017' || (cleanLens.includes('50mm') && cleanLens.includes('1.4'))) {
        return GEAR_REGISTRY['sigma-50mm-art'];
    }
    if (year === '2016' || (cleanLens.includes('85mm') && cleanLens.includes('1.8'))) {
        return GEAR_REGISTRY['nikon-85mm-18g'];
    }

    // 4. Fallback search by name or shortName
    for (const item of Object.values(GEAR_REGISTRY)) {
        if (
            item.name.toLowerCase().includes(normalizedId) ||
            item.shortName.toLowerCase().includes(normalizedId) ||
            normalizedId.includes(item.shortName.toLowerCase())
        ) {
            return item;
        }
    }

    return null;
}
