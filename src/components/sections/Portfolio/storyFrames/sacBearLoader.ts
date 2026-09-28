import type { BearPathDef } from './sacBearData';

let cachedSacBearPaths: BearPathDef[] | null = null;
let sacBearLoadingPromise: Promise<BearPathDef[]> | null = null;

export function loadSacBearPaths(): Promise<BearPathDef[]> {
    if (cachedSacBearPaths) return Promise.resolve(cachedSacBearPaths);
    if (!sacBearLoadingPromise) {
        sacBearLoadingPromise = import('./sacBearData').then((mod) => {
            cachedSacBearPaths = mod.SAC_BEAR_PATHS;
            return mod.SAC_BEAR_PATHS;
        });
    }
    return sacBearLoadingPromise;
}
