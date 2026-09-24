export interface GearItem {
    id: string;
    name: string;
    shortName: string;
    compactName: string;
    brand: 'Nikon' | 'Sigma' | 'Olympus' | 'Panasonic' | 'Other';
    type: 'camera' | 'lens';
    officialUrl: string;
    specs: Record<string, string>;
    modalTitle: string;
    searchAliases?: string[];
}

export const GEAR_REGISTRY: Record<string, GearItem> = {
    // ==========================================
    // CAMERAS
    // ==========================================
    'nikon-z8': {
        id: 'nikon-z8',
        name: 'Nikon ℤ8',
        shortName: 'Nikon ℤ8',
        compactName: 'Nikon ℤ8',
        brand: 'Nikon',
        type: 'camera',
        officialUrl: 'https://www.nikonusa.com/p/z-8/1695',
        modalTitle: 'NIKON ℤ8',
        searchAliases: ['Nikon Z8', 'Nikon Z 8', 'Z8', 'Z 8', 'Z'],
        specs: {
            Sensor: '45.7 MP Full-Frame Stacked CMOS (No Mechanical Shutter)',
            Mount: 'Nikon ℤ Mount',
            Autofocus: '493-Point Phase-Detection with Deep Learning Subject Tracking',
            'Continuous Shooting': '20 fps RAW / 120 fps JPEG',
            Video: '8.3K/60p N-RAW, 4.1K/120p, 10-Bit ProRes 422 HQ',
            Weight: '910 g (2.0 lbs)',
        },
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
        searchAliases: ['D750', 'Nikon D750'],
        specs: {
            Sensor: '24.3 MP Full-Frame CMOS',
            Mount: 'Nikon F Mount',
            Autofocus: 'Advanced Multi-CAM 3500FX II 51-Point AF System',
            'Continuous Shooting': '6.5 fps',
            'Low-Light AF': 'Sensitive down to -3 EV',
            Weight: '840 g (1.85 lbs)',
        },
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
        searchAliases: ['D850', 'Nikon D850'],
        specs: {
            Sensor: '45.7 MP Back-Illuminated (BSI) Full-Frame CMOS',
            Mount: 'Nikon F Mount',
            Autofocus: 'Multi-CAM 20K 153-Point AF System with 99 Cross-Sensors',
            'Continuous Shooting': '7 fps (up to 9 fps with MB-D18 battery grip)',
            'ISO Range': '64 – 25,600 (Expandable to 32 – 102,400)',
            Weight: '1,005 g (2.2 lbs)',
        },
    },
    'panasonic-gh4': {
        id: 'panasonic-gh4',
        name: 'Panasonic Lumix DMC-GH4',
        shortName: 'Lumix GH4',
        compactName: 'Lumix GH4',
        brand: 'Panasonic',
        type: 'camera',
        officialUrl: 'https://shop.panasonic.com',
        modalTitle: 'LUMIX DMC-GH4',
        searchAliases: ['GH4', 'DMC-GH4', 'Panasonic GH4', 'Lumix'],
        specs: {
            Sensor: '16.05 MP Live MOS Micro Four Thirds',
            Mount: 'Micro Four Thirds (MFT)',
            Autofocus: 'Contrast AF with DFD (Depth-from-Defocus) Technology',
            'Continuous Shooting': '12 fps',
            Video: 'Cinema 4K (4096x2160) at 24p / UHD 4K at 30p',
            Weight: '560 g (1.23 lbs)',
        },
    },
    'nikon-z5-ii': {
        id: 'nikon-z5-ii',
        name: 'Nikon ℤ5 II',
        shortName: 'Nikon ℤ5 II',
        compactName: 'Nikon ℤ5 II',
        brand: 'Nikon',
        type: 'camera',
        officialUrl: 'https://www.nikonusa.com',
        modalTitle: 'NIKON ℤ5 II',
        searchAliases: ['Nikon Z5 II', 'Nikon Z5', 'Nikon Z5_2', 'Z5', 'Z5 II', 'Z5_2', 'Z'],
        specs: {
            Sensor: '24.3 MP Full-Frame CMOS',
            Mount: 'Nikon ℤ Mount',
            Autofocus: '273-Point Hybrid Phase-Detection AF with Subject Detection',
            'Continuous Shooting': 'High-Speed Continuous Shooting',
            Stabilization: '5-Axis In-Body Sensor-Shift VR (5.0 Stops)',
            Weight: '675 g (1.49 lbs)',
        },
    },
    'olympus-em5-ii': {
        id: 'olympus-em5-ii',
        name: 'Olympus OM-D E-M5 Mark II',
        shortName: 'Olympus E-M5 II',
        compactName: 'Olympus E-M5 II',
        brand: 'Olympus',
        type: 'camera',
        officialUrl: 'https://explore.omsystem.com',
        modalTitle: 'OLYMPUS E-M5 MARK II',
        searchAliases: ['EM5 II', 'E-M5 II', 'EM5 Mark II', 'E-M5 Mark II', 'Olympus EM5'],
        specs: {
            Sensor: '16.1 MP Live MOS Micro Four Thirds',
            Mount: 'Micro Four Thirds (MFT)',
            Stabilization: '5-Axis In-Body VCM Image Stabilization (5 EV)',
            'Continuous Shooting': '10 fps High-Speed Sequential',
            Shutter: 'Electronic Shutter up to 1/16,000s',
            Weight: '469 g (1.03 lbs)',
        },
    },
    'nikon-z6-ii': {
        id: 'nikon-z6-ii',
        name: 'Nikon ℤ6 II',
        shortName: 'Nikon ℤ6 II',
        compactName: 'Nikon ℤ6 II',
        brand: 'Nikon',
        type: 'camera',
        officialUrl: 'https://www.nikonusa.com/p/z-6ii/1659',
        modalTitle: 'NIKON ℤ6 II',
        searchAliases: ['Nikon Z6 II', 'Nikon Z6', 'Nikon Z6_2', 'Z6', 'Z6 II', 'Z6_2', 'Z'],
        specs: {
            Sensor: '24.5 MP BSI Full-Frame CMOS',
            Mount: 'Nikon ℤ Mount',
            Autofocus: '273-Point Hybrid AF with Eye/Animal Subject Detection',
            'Continuous Shooting': '14 fps Continuous H (Extended)',
            Processors: 'Dual EXPEED 6 Image Processing Engines',
            Weight: '705 g (1.55 lbs)',
        },
    },
    'olympus-em5': {
        id: 'olympus-em5',
        name: 'Olympus OM-D E-M5',
        shortName: 'Olympus E-M5',
        compactName: 'Olympus E-M5',
        brand: 'Olympus',
        type: 'camera',
        officialUrl: 'https://explore.omsystem.com',
        modalTitle: 'OLYMPUS E-M5',
        searchAliases: ['EM5', 'E-M5', 'Olympus EM5'],
        specs: {
            Sensor: '16.1 MP Live MOS Micro Four Thirds',
            Mount: 'Micro Four Thirds (MFT)',
            Stabilization: '5-Axis In-Body Image Stabilization',
            'Continuous Shooting': '9 fps',
            Body: 'Dust- and Splash-Proof Magnesium Alloy',
            Weight: '425 g (0.94 lbs)',
        },
    },

    // ==========================================
    // LENSES
    // ==========================================
    'nikon-135mm-plena': {
        id: 'nikon-135mm-plena',
        name: 'Nikon NIKKOR ℤ 135mm f/1.8 S Plena',
        shortName: 'NIKKOR ℤ 135mm Plena',
        compactName: 'Nikon ℤ 135mm Plena',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/nikkor-z-135mm-f18-s-plena/20123/overview',
        modalTitle: 'NIKKOR ℤ 135mm PLENA',
        searchAliases: ['Nikon Z 135mm', 'NIKKOR Z 135mm', '135mm', 'Plena', 'Z'],
        specs: {
            'Focal Length': '135mm Prime',
            'Max Aperture': 'f/1.8',
            Mount: 'Nikon ℤ Mount',
            'Optical Design':
                '16 Elements in 14 Groups (4 ED, 1 Aspherical, 1 SR Element, Meso Amorphous & ARNEO Coat)',
            'Aperture Blades': '11 Rounded Diaphragm Blades',
            Weight: '995 g (2.19 lbs)',
        },
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
        searchAliases: ['120-300mm', '120-300', 'Nikon 120-300', '300mm f/2.8'],
        specs: {
            'Focal Range': '120 – 300mm',
            'Max Aperture': 'f/2.8 Constant',
            Mount: 'Nikon F (adapted seamlessly to ℤ via FTZ II)',
            'Optical Design': '25 Elements in 19 Groups (1 Fluorite, 2 ED, 1 SR, Nano Crystal & ARNEO Coat)',
            'Vibration Reduction': '4.0 Stops VR with Sport Mode',
            Weight: '3,250 g (7.17 lbs)',
        },
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
        searchAliases: ['Sigma 135mm', '135mm f/1.8', 'Sigma Art 135'],
        specs: {
            'Focal Length': '135mm Prime',
            'Max Aperture': 'f/1.8',
            Mount: 'Nikon F Mount',
            'Optical Design': '13 Elements in 10 Groups (2 FLD, 2 SLD Elements)',
            'Autofocus Motor': 'Hyper Sonic Motor (HSM) with 1.3x Torque',
            Weight: '1,130 g (2.49 lbs)',
        },
    },
    'nikon-35mm-12s': {
        id: 'nikon-35mm-12s',
        name: 'Nikon NIKKOR ℤ 35mm f/1.2 S',
        shortName: 'NIKKOR ℤ 35mm f/1.2 S',
        compactName: 'Nikon ℤ 35mm f/1.2',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com',
        modalTitle: 'NIKKOR ℤ 35mm f/1.2 S',
        searchAliases: ['Nikon Z 35mm', 'NIKKOR Z 35mm', '35mm f/1.2', '35mm', 'Z'],
        specs: {
            'Focal Length': '35mm Prime',
            'Max Aperture': 'f/1.2',
            Mount: 'Nikon ℤ Mount',
            'Optical Design': 'S-Line Ultra-Fast Wide Prime with Multi-Focus AF',
            'Aperture Blades': '11 Rounded Diaphragm Blades',
            Weight: '1,090 g (2.40 lbs)',
        },
    },
    'sigma-35mm-art': {
        id: 'sigma-35mm-art',
        name: 'Sigma 35mm f/1.4 DG HSM | Art',
        shortName: 'Sigma 35mm f/1.4 Art',
        compactName: 'Sigma 35mm f/1.4 Art',
        brand: 'Sigma',
        type: 'lens',
        officialUrl: 'https://www.sigmaphoto.com/35mm-f1-4-dg-hsm-a',
        modalTitle: 'SIGMA 35mm f/1.4 ART',
        searchAliases: ['Sigma 35mm', '35mm f/1.4', 'Sigma Art 35'],
        specs: {
            'Focal Length': '35mm Prime',
            'Max Aperture': 'f/1.4',
            Mount: 'Nikon F Mount (adapted to ℤ via FTZ)',
            'Optical Design': '13 Elements in 11 Groups (1 FLD, 4 SLD, 2 Aspherical)',
            Weight: '665 g (1.47 lbs)',
        },
    },
    'nikon-85mm-12s': {
        id: 'nikon-85mm-12s',
        name: 'Nikon NIKKOR ℤ 85mm f/1.2 S',
        shortName: 'NIKKOR ℤ 85mm f/1.2 S',
        compactName: 'Nikon ℤ 85mm f/1.2',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/nikkor-z-85mm-f12-s/20115/overview',
        modalTitle: 'NIKKOR ℤ 85mm f/1.2 S',
        searchAliases: ['Nikon Z 85mm', 'NIKKOR Z 85mm', '85mm f/1.2', '85mm', 'Z'],
        specs: {
            'Focal Length': '85mm Prime',
            'Max Aperture': 'f/1.2',
            Mount: 'Nikon ℤ Mount',
            'Optical Design': '15 Elements in 10 Groups (2 Aspherical, 1 ED Element, Nano Crystal Coat)',
            'Aperture Blades': '11 Rounded Diaphragm Blades',
            Weight: '1,160 g (2.56 lbs)',
        },
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
        searchAliases: ['85mm f/1.8', 'Nikon 85mm 1.8G', 'AF-S 85mm'],
        specs: {
            'Focal Length': '85mm Prime',
            'Max Aperture': 'f/1.8',
            Mount: 'Nikon F Mount',
            'Optical Design': '9 Elements in 9 Groups',
            'Autofocus Motor': 'Silent Wave Motor (SWM)',
            Weight: '350 g (12.4 oz)',
        },
    },
    'nikon-50mm-12s': {
        id: 'nikon-50mm-12s',
        name: 'Nikon NIKKOR ℤ 50mm f/1.2 S',
        shortName: 'NIKKOR ℤ 50mm f/1.2 S',
        compactName: 'Nikon ℤ 50mm f/1.2',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/nikkor-z-50mm-f12-s/20095/overview',
        modalTitle: 'NIKKOR ℤ 50mm f/1.2 S',
        searchAliases: ['Nikon Z 50mm', 'NIKKOR Z 50mm', '50mm f/1.2', '50mm', 'Z'],
        specs: {
            'Focal Length': '50mm Prime',
            'Max Aperture': 'f/1.2',
            Mount: 'Nikon ℤ Mount',
            'Optical Design': '17 Elements in 15 Groups (3 Aspherical, 2 ED Elements, ARNEO & Nano Crystal)',
            Weight: '1,090 g (2.40 lbs)',
        },
    },
    'nikon-24-70mm-28s': {
        id: 'nikon-24-70mm-28s',
        name: 'Nikon NIKKOR ℤ 24-70mm f/2.8 S',
        shortName: 'NIKKOR ℤ 24-70mm f/2.8 S',
        compactName: 'Nikon ℤ 24-70mm f/2.8',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/nikkor-z-24-70mm-f28-s/20089/overview',
        modalTitle: 'NIKKOR ℤ 24-70mm f/2.8 S',
        searchAliases: ['Nikon Z 24-70mm', 'NIKKOR Z 24-70mm', '24-70mm f/2.8', '24-70mm', 'Z'],
        specs: {
            'Focal Range': '24 – 70mm',
            'Max Aperture': 'f/2.8 Constant',
            Mount: 'Nikon ℤ Mount',
            'Optical Design': '17 Elements in 15 Groups (4 Aspherical, 2 ED Elements)',
            Weight: '805 g (1.77 lbs)',
        },
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
        searchAliases: ['Sigma 50mm', '50mm f/1.4', 'Sigma Art 50'],
        specs: {
            'Focal Length': '50mm Prime',
            'Max Aperture': 'f/1.4',
            Mount: 'Nikon F Mount',
            'Optical Design': '13 Elements in 8 Groups (3 SLD, 1 Aspherical Element)',
            'Autofocus Motor': 'Hyper Sonic Motor (HSM)',
            Weight: '815 g (1.80 lbs)',
        },
    },
    'panasonic-42-5mm': {
        id: 'panasonic-42-5mm',
        name: 'Panasonic Leica DG Nocticron 42.5mm f/1.2 ASPH. POWER O.I.S.',
        shortName: 'Leica DG 42.5mm f/1.2',
        compactName: 'Leica 42.5mm f/1.2',
        brand: 'Panasonic',
        type: 'lens',
        officialUrl: 'https://shop.panasonic.com',
        modalTitle: 'LEICA DG 42.5mm f/1.2 NOCTICRON',
        searchAliases: ['Nocticron', 'Leica 42.5mm', '42.5mm', 'Panasonic 42.5'],
        specs: {
            'Focal Length': '42.5mm (85mm Full-Frame Equivalent)',
            'Max Aperture': 'f/1.2',
            Mount: 'Micro Four Thirds (MFT)',
            'Optical Design': '14 Elements in 11 Groups (2 Aspherical, 1 ED, 1 UHR)',
            Stabilization: 'POWER O.I.S.',
            Weight: '425 g (0.94 lbs)',
        },
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
        searchAliases: ['Sigma 85mm', '85mm f/1.4', 'Sigma Art 85'],
        specs: {
            'Focal Length': '85mm Prime',
            'Max Aperture': 'f/1.4',
            Mount: 'Nikon F Mount',
            'Optical Design': '14 Elements in 12 Groups (2 SLD Elements)',
            'Aperture Blades': '9 Rounded Blades',
            Weight: '1,130 g (2.49 lbs)',
        },
    },
    'olympus-75mm-18': {
        id: 'olympus-75mm-18',
        name: 'Olympus M.Zuiko Digital ED 75mm f/1.8',
        shortName: 'M.Zuiko 75mm f/1.8',
        compactName: 'Olympus 75mm f/1.8',
        brand: 'Olympus',
        type: 'lens',
        officialUrl: 'https://explore.omsystem.com',
        modalTitle: 'OLYMPUS 75mm f/1.8',
        searchAliases: ['Olympus 75mm', '75mm f/1.8', 'M.Zuiko 75mm'],
        specs: {
            'Focal Length': '75mm (150mm Full-Frame Equivalent)',
            'Max Aperture': 'f/1.8',
            Mount: 'Micro Four Thirds (MFT)',
            'Optical Design': '10 Elements in 9 Groups (3 ED, 2 HR)',
            Weight: '305 g (10.8 oz)',
        },
    },
    'nikon-300mm-pf': {
        id: 'nikon-300mm-pf',
        name: 'Nikon AF-S NIKKOR 300mm f/4E PF ED VR',
        shortName: 'AF-S 300mm f/4E PF',
        compactName: 'Nikon 300mm f/4 PF',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/af-s-nikkor-300mm-f4e-pf-ed-vr/2223/overview',
        modalTitle: 'NIKON 300mm f/4 PF',
        searchAliases: ['Nikon 300mm', '300mm f/4', '300mm PF'],
        specs: {
            'Focal Length': '300mm Prime',
            'Max Aperture': 'f/4',
            Mount: 'Nikon F Mount',
            'Optical Design': 'Phase Fresnel (PF) Element, ED Glass, Nano Crystal Coat',
            'Vibration Reduction': '4.5 Stops VR with Sport Mode',
            Weight: '755 g (1.66 lbs)',
        },
    },
    'nikon-40mm-2': {
        id: 'nikon-40mm-2',
        name: 'Nikon NIKKOR ℤ 40mm f/2',
        shortName: 'NIKKOR ℤ 40mm f/2',
        compactName: 'Nikon ℤ 40mm f/2',
        brand: 'Nikon',
        type: 'lens',
        officialUrl: 'https://www.nikonusa.com/p/nikkor-z-40mm-f2/20102/overview',
        modalTitle: 'NIKKOR ℤ 40mm f/2',
        searchAliases: ['Nikon Z 40mm', 'NIKKOR Z 40mm', '40mm f/2', '40mm', 'Z'],
        specs: {
            'Focal Length': '40mm Prime',
            'Max Aperture': 'f/2.0',
            Mount: 'Nikon ℤ Mount',
            'Optical Design': '6 Elements in 4 Groups (2 Aspherical Elements)',
            Weight: '170 g (6.0 oz)',
        },
    },
    'olympus-12-40mm-pro': {
        id: 'olympus-12-40mm-pro',
        name: 'Olympus M.Zuiko Digital ED 12-40mm f/2.8 PRO',
        shortName: 'M.Zuiko 12-40mm f/2.8 PRO',
        compactName: 'Olympus 12-40mm f/2.8',
        brand: 'Olympus',
        type: 'lens',
        officialUrl: 'https://explore.omsystem.com',
        modalTitle: 'OLYMPUS 12-40mm f/2.8 PRO',
        searchAliases: ['Olympus 12-40mm', '12-40mm f/2.8', 'M.Zuiko 12-40mm'],
        specs: {
            'Focal Range': '12 – 40mm (24–80mm Equivalent)',
            'Max Aperture': 'f/2.8 Constant',
            Mount: 'Micro Four Thirds (MFT)',
            'Optical Design': '14 Elements in 9 Groups',
            Weight: '382 g (0.84 lbs)',
        },
    },
    'olympus-40-150mm-pro': {
        id: 'olympus-40-150mm-pro',
        name: 'Olympus M.Zuiko Digital ED 40-150mm f/2.8 PRO',
        shortName: 'M.Zuiko 40-150mm f/2.8 PRO',
        compactName: 'Olympus 40-150mm f/2.8',
        brand: 'Olympus',
        type: 'lens',
        officialUrl: 'https://explore.omsystem.com',
        modalTitle: 'OLYMPUS 40-150mm f/2.8 PRO',
        searchAliases: ['Olympus 40-150mm', '40-150mm f/2.8', 'M.Zuiko 40-150mm'],
        specs: {
            'Focal Range': '40 – 150mm (80–300mm Equivalent)',
            'Max Aperture': 'f/2.8 Constant',
            Mount: 'Micro Four Thirds (MFT)',
            'Optical Design': 'Dual VCM AF System, 16 Elements in 10 Groups',
            Weight: '760 g (1.68 lbs)',
        },
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

    // 2. Camera resolution
    if (
        typeHint === 'camera' ||
        normalizedId.includes('nikon') ||
        normalizedId.includes('olympus') ||
        normalizedId.includes('panasonic') ||
        normalizedId.includes('lumix') ||
        normalizedId.includes('gh4') ||
        normalizedId.includes('e-m5') ||
        normalizedId.includes('em5') ||
        normalizedId.includes('d750') ||
        normalizedId.includes('d850')
    ) {
        if (normalizedId.includes('z8') || normalizedId.includes('ℤ8')) return GEAR_REGISTRY['nikon-z8'];
        if (normalizedId.includes('z6') || normalizedId.includes('ℤ6')) return GEAR_REGISTRY['nikon-z6-ii'];
        if (normalizedId.includes('z5') || normalizedId.includes('ℤ5')) return GEAR_REGISTRY['nikon-z5-ii'];
        if (normalizedId.includes('d850')) return GEAR_REGISTRY['nikon-d850'];
        if (normalizedId.includes('d750')) return GEAR_REGISTRY['nikon-d750'];
        if (normalizedId.includes('gh4')) return GEAR_REGISTRY['panasonic-gh4'];
        if (
            normalizedId.includes('markii') ||
            normalizedId.includes('mark ii') ||
            normalizedId.includes('e-m5 ii') ||
            normalizedId.includes('em5 ii') ||
            normalizedId.includes('e-m5markii')
        ) {
            return GEAR_REGISTRY['olympus-em5-ii'];
        }
        if (normalizedId.includes('e-m5') || normalizedId.includes('em5')) return GEAR_REGISTRY['olympus-em5'];
    }

    // 3. Lens resolution
    if (normalizedId.includes('plena')) return GEAR_REGISTRY['nikon-135mm-plena'];
    if (normalizedId.includes('120-300')) return GEAR_REGISTRY['nikon-120-300mm'];
    if (normalizedId.includes('135mm') && normalizedId.includes('1.8')) return GEAR_REGISTRY['sigma-135mm-art'];
    if (normalizedId.includes('35mm') && (normalizedId.includes('1.2') || normalizedId.includes('f/1.2'))) {
        return GEAR_REGISTRY['nikon-35mm-12s'];
    }
    if (normalizedId.includes('35mm') && (normalizedId.includes('1.4') || normalizedId.includes('f/1.4'))) {
        return GEAR_REGISTRY['sigma-35mm-art'];
    }
    if (normalizedId.includes('85mm') && (normalizedId.includes('1.2') || normalizedId.includes('f/1.2'))) {
        return GEAR_REGISTRY['nikon-85mm-12s'];
    }
    if (normalizedId.includes('85mm') && (normalizedId.includes('1.4') || normalizedId.includes('f/1.4'))) {
        return GEAR_REGISTRY['sigma-85mm-art'];
    }
    if (normalizedId.includes('85mm') && (normalizedId.includes('1.8') || normalizedId.includes('f/1.8'))) {
        return GEAR_REGISTRY['nikon-85mm-18g'];
    }
    if (normalizedId.includes('50mm') && (normalizedId.includes('1.2') || normalizedId.includes('f/1.2'))) {
        return GEAR_REGISTRY['nikon-50mm-12s'];
    }
    if (normalizedId.includes('50mm') && (normalizedId.includes('1.4') || normalizedId.includes('f/1.4'))) {
        return GEAR_REGISTRY['sigma-50mm-art'];
    }
    if (normalizedId.includes('24-70')) return GEAR_REGISTRY['nikon-24-70mm-28s'];
    if (normalizedId.includes('42.5') || normalizedId.includes('nocticron')) return GEAR_REGISTRY['panasonic-42-5mm'];
    if (normalizedId.includes('75mm')) return GEAR_REGISTRY['olympus-75mm-18'];
    if (normalizedId.includes('300mm') || normalizedId.includes('pf')) return GEAR_REGISTRY['nikon-300mm-pf'];
    if (normalizedId.includes('12-40')) return GEAR_REGISTRY['olympus-12-40mm-pro'];
    if (normalizedId.includes('40-150')) return GEAR_REGISTRY['olympus-40-150mm-pro'];
    if (normalizedId.includes('40mm')) return GEAR_REGISTRY['nikon-40mm-2'];

    // 4. Camera Fallback check
    if (normalizedId.includes('z8') || normalizedId.includes('ℤ8')) return GEAR_REGISTRY['nikon-z8'];
    if (normalizedId.includes('z6') || normalizedId.includes('ℤ6')) return GEAR_REGISTRY['nikon-z6-ii'];
    if (normalizedId.includes('z5') || normalizedId.includes('ℤ5')) return GEAR_REGISTRY['nikon-z5-ii'];
    if (normalizedId.includes('d850')) return GEAR_REGISTRY['nikon-d850'];
    if (normalizedId.includes('d750')) return GEAR_REGISTRY['nikon-d750'];
    if (normalizedId.includes('gh4')) return GEAR_REGISTRY['panasonic-gh4'];
    if (
        normalizedId.includes('markii') ||
        normalizedId.includes('mark ii') ||
        normalizedId.includes('e-m5 ii') ||
        normalizedId.includes('em5 ii') ||
        normalizedId.includes('e-m5markii')
    ) {
        return GEAR_REGISTRY['olympus-em5-ii'];
    }
    if (normalizedId.includes('e-m5') || normalizedId.includes('em5')) return GEAR_REGISTRY['olympus-em5'];

    // 5. Fallback search by name, shortName, compactName, or searchAliases
    for (const item of Object.values(GEAR_REGISTRY)) {
        if (
            item.name.toLowerCase().includes(normalizedId) ||
            item.shortName.toLowerCase().includes(normalizedId) ||
            item.compactName.toLowerCase().includes(normalizedId) ||
            (item.searchAliases && item.searchAliases.some((a) => a.toLowerCase().includes(normalizedId)))
        ) {
            return item;
        }
    }

    return null;
}
