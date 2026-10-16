import fs from 'fs';
import path from 'path';

export interface RumBeaconRecord {
    build: string;
    route: string;
    metric: 'LCP' | 'INP' | 'CLS' | 'TTFB';
    value: number;
    ts?: number;
}

export interface MetricSummary {
    metric: string;
    count: number;
    p50: number;
    p75: number;
    p95: number;
}

export function computePercentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1));
    return sortedValues[idx];
}

export function summarizeRumRecords(records: RumBeaconRecord[]): MetricSummary[] {
    const byMetric = new Map<string, number[]>();
    for (const r of records) {
        if (!r || typeof r.metric !== 'string' || typeof r.value !== 'number' || !Number.isFinite(r.value)) continue;
        const list = byMetric.get(r.metric) || [];
        list.push(r.value);
        byMetric.set(r.metric, list);
    }

    const summaries: MetricSummary[] = [];
    for (const metric of ['LCP', 'INP', 'CLS', 'TTFB']) {
        const vals = byMetric.get(metric);
        if (!vals || vals.length === 0) continue;
        const sorted = [...vals].sort((a, b) => a - b);
        const decimals = metric === 'CLS' ? 4 : 1;
        summaries.push({
            metric,
            count: sorted.length,
            p50: Number(computePercentile(sorted, 50).toFixed(decimals)),
            p75: Number(computePercentile(sorted, 75).toFixed(decimals)),
            p95: Number(computePercentile(sorted, 95).toFixed(decimals)),
        });
    }
    return summaries;
}

export function parseRumJsonl(raw: string): RumBeaconRecord[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
        try {
            return JSON.parse(trimmed) as RumBeaconRecord[];
        } catch {
            return [];
        }
    }
    const records: RumBeaconRecord[] = [];
    for (const line of trimmed.split(/\r?\n/)) {
        const l = line.trim();
        if (!l) continue;
        try {
            records.push(JSON.parse(l) as RumBeaconRecord);
        } catch {
            // Skip malformed lines
        }
    }
    return records;
}

async function main() {
    const args = process.argv.slice(2);
    const fileArg = args.find((a) => !a.startsWith('--')) || path.join(process.cwd(), 'public', 'api', 'vitals.jsonl');
    const urlArg = process.env.VITE_TELEMETRY_ENDPOINT;

    let raw = '';
    if (fs.existsSync(fileArg)) {
        raw = fs.readFileSync(fileArg, 'utf8');
    } else if (urlArg && /^https?:\/\//i.test(urlArg)) {
        const res = await fetch(urlArg);
        if (res.ok) raw = await res.text();
    }

    const records = parseRumJsonl(raw);
    if (records.length === 0) {
        console.log('No RUM beacon samples found yet. Configure VITE_TELEMETRY_ENDPOINT=/api/vitals.php or pass a vitals.jsonl path.');
        return;
    }

    const summaries = summarizeRumRecords(records);
    console.log(`\n📊 Real-User Monitoring (RUM) Summary (${records.length} total samples)\n`);
    console.table(summaries);
}

import { fileURLToPath } from 'url';

const isMain =
    Boolean(process.argv[1]) &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
