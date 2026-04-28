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
        Headshots: '',
    };
})();
