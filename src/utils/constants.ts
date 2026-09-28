// ==========================================
// USER CONFIGURATION
// Adjust these constants to match your brand
// ==========================================

export const TEAM_ABBREVIATIONS: Record<string, string> = (() => {
    try {
        const envStr = import.meta.env.VITE_TEAM_ABBREVIATIONS;
        if (envStr) return JSON.parse(envStr);
    } catch {
        console.warn('Failed to parse VITE_TEAM_ABBREVIATIONS from env');
    }
    return {
        'My Local Roller Derby': 'MLRD',
        'Rival City Roller Derby': 'Rival City',
        'Long Name League': 'LNL',
        'Sacramento Roller Derby': 'SRD',
        'Rose City Rollers': 'RCR',
        'Rose City': 'RCR',
        'California Derby Galaxy': 'CDG',
        'Bay Area Derby': 'BAD',
        'Outlaw Roller Derby': 'Outlaws',
        'Santa Cruz': 'SC',
        'San Luis Obispo County Junior Roller Derby': 'SLOCO Juniors',
        'San Luis Obispo County Roller Derby': 'SLOCO',
        'SLOCO Junior Roller Derby': 'SLOCO Juniors',
        'SLOCO Roller Derby': 'SLOCO',
        'Sacred City Roller Derby': 'SCRD',
        'Sacred City': 'SCRD',
        Headshots: '',
    };
})();
