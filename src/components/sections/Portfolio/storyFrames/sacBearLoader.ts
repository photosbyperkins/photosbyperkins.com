import type { BearPathDef } from './types';
import { getBuildNumber } from '../../../../utils/build';

let cachedSacBearPaths: BearPathDef[] | null = null;
let sacBearLoadingPromise: Promise<BearPathDef[]> | null = null;

export function loadSacBearPaths(): Promise<BearPathDef[]> {
    if (cachedSacBearPaths) return Promise.resolve(cachedSacBearPaths);
    if (!sacBearLoadingPromise) {
        sacBearLoadingPromise = fetch(`/data/story/sac-bear-paths.json?build=${getBuildNumber()}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch sac-bear-paths.json');
                return res.json();
            })
            .then((data: BearPathDef[]) => {
                cachedSacBearPaths = data;
                return data;
            })
            .catch(() => {
                // Reset promise so subsequent attempts can retry if the network recovers
                sacBearLoadingPromise = null;
                return [];
            });
    }
    return sacBearLoadingPromise;
}
