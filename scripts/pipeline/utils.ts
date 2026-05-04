import fs from 'fs';
import path from 'path';

/**
 * Run async tasks with a concurrency limit.
 * @param {(() => Promise<void>)[]} tasks
 * @param {number} concurrency
 */
export async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
    const results: Promise<T>[] = [];
    const executing: Promise<any>[] = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        if (concurrency <= tasks.length) {
            const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

/**
 * Recursively remove files not in the valid set, and empty directories.
 * @param {string} dir
 * @param {Set<string>} validSet
 * @param {{ removed: number }} [counters]
 */
export function removeStaleFiles(dir: string, validSet: Set<string>, counters: { removed: number } = { removed: 0 }): { removed: number } {
    if (!fs.existsSync(dir)) return counters;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) {
            removeStaleFiles(fullPath, validSet, counters);
            try { fs.rmdirSync(fullPath); } catch {}
        } else {
            if (!validSet.has(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`  🗑️  Removed stale: ${e.name}`);
                    counters.removed++;
                } catch {}
            }
        }
    }
    return counters;
}
