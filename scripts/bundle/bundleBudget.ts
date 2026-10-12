/**
 * Bundle budget core: measures the JS/CSS a first visit downloads and compares it with a
 * committed baseline (`bundle-budget.json`). Pure functions live here so they can be unit
 * tested; the CLI wrapper is `scripts/checkBundleBudget.ts`.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export const DEFAULT_TOLERANCE = 0.05;

export type AssetKind = 'js' | 'css';

export interface SizeTriple {
    raw: number;
    gzip: number;
    brotli: number;
}

export interface MeasuredFile extends SizeTriple {
    /** Path relative to dist, e.g. `assets/index-Co1aOxuP.js`. */
    file: string;
    /** Hash-free name used as a stable key across builds, e.g. `assets/index.js`. */
    key: string;
    kind: AssetKind;
    initial: boolean;
}

export interface KindTotals extends SizeTriple {
    files: string[];
}

export interface BundleMeasurement {
    initial: Record<AssetKind, KindTotals>;
    files: MeasuredFile[];
}

export interface BudgetBaseline {
    tolerance: number;
    updatedAt: string;
    initial: Record<AssetKind, KindTotals>;
    /** Informational per-chunk sizes (not enforced), keyed by hash-free name. */
    chunks: Record<string, SizeTriple & { initial: boolean }>;
}

/** Sizes that fail the build when they exceed the baseline by more than the tolerance. */
export const ENFORCED_METRICS: ReadonlyArray<{ kind: AssetKind; metric: keyof SizeTriple }> = [
    { kind: 'js', metric: 'raw' },
    { kind: 'js', metric: 'gzip' },
    { kind: 'css', metric: 'raw' },
    { kind: 'css', metric: 'gzip' },
];

export interface MetricResult {
    kind: AssetKind;
    metric: keyof SizeTriple;
    baseline: number;
    current: number;
    limit: number;
    /** Fractional change vs baseline (0.05 === +5%). */
    delta: number;
    ok: boolean;
}

/** Strips the content hash Vite/Rolldown appends, so chunks can be tracked across builds. */
export function stableKey(file: string): string {
    return file.replace(/\\/g, '/').replace(/-[A-Za-z0-9_-]{8}(\.(?:js|css))$/, '$1');
}

function kindOf(file: string): AssetKind | null {
    const clean = file.split(/[?#]/)[0];
    if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'js';
    if (clean.endsWith('.css')) return 'css';
    return null;
}

function parseAttributes(attrSource: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(attrSource))) {
        attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
    }
    return attrs;
}

/**
 * Returns the local JS/CSS files that `index.html` makes the browser fetch before the app can
 * render: module entry scripts, `modulepreload` links and stylesheets. Lazy chunks are excluded.
 * Paths are returned relative to the dist root, without query strings.
 */
export function extractInitialAssets(html: string): string[] {
    const found = new Set<string>();
    const tagRe = /<(script|link)\b([^>]*)>/gi;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(html))) {
        const tag = m[1].toLowerCase();
        const attrs = parseAttributes(m[2]);
        let url: string | undefined;
        if (tag === 'script' && attrs.src) {
            url = attrs.src;
        } else if (tag === 'link') {
            const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/);
            if (rel.includes('modulepreload') || rel.includes('stylesheet')) url = attrs.href;
        }
        if (!url || /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:')) continue;
        const clean = url.split(/[?#]/)[0].replace(/^\.?\//, '');
        if (kindOf(clean)) found.add(clean);
    }
    return [...found];
}

export function measureBuffer(buf: Buffer): SizeTriple {
    return {
        raw: buf.length,
        gzip: zlib.gzipSync(buf, { level: 9 }).length,
        brotli: zlib.brotliCompressSync(buf, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
        }).length,
    };
}

function emptyTotals(): KindTotals {
    return { raw: 0, gzip: 0, brotli: 0, files: [] };
}

/**
 * Measures every JS/CSS file of the current build.
 * @param distDir  build output directory (must contain index.html)
 * @param chunkFiles  files emitted by the latest build (from `reports/bundle/chunks.json`);
 *                    when omitted only the initial files are measured, which avoids picking up
 *                    stale hashed files left behind by `emptyOutDir: false`.
 */
export function measureBundle(distDir: string, chunkFiles?: string[]): BundleMeasurement {
    const htmlPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(htmlPath)) {
        throw new Error(`${htmlPath} not found. Run \`npm run build:client\` first.`);
    }
    const initialFiles = extractInitialAssets(fs.readFileSync(htmlPath, 'utf8'));
    const initialSet = new Set(initialFiles);
    const allFiles = [...new Set([...initialFiles, ...(chunkFiles ?? []).filter((f) => kindOf(f))])];

    const initial: Record<AssetKind, KindTotals> = { js: emptyTotals(), css: emptyTotals() };
    const files: MeasuredFile[] = [];

    for (const file of allFiles) {
        const kind = kindOf(file)!;
        const abs = path.join(distDir, file);
        if (!fs.existsSync(abs)) {
            if (initialSet.has(file)) throw new Error(`index.html references ${file}, but it is missing from dist.`);
            continue;
        }
        const sizes = measureBuffer(fs.readFileSync(abs));
        const isInitial = initialSet.has(file);
        files.push({ file, key: stableKey(file), kind, initial: isInitial, ...sizes });
        if (isInitial) {
            const t = initial[kind];
            t.raw += sizes.raw;
            t.gzip += sizes.gzip;
            t.brotli += sizes.brotli;
            t.files.push(stableKey(file));
        }
    }

    initial.js.files.sort();
    initial.css.files.sort();
    files.sort((a, b) => Number(b.initial) - Number(a.initial) || b.gzip - a.gzip);
    return { initial, files };
}

export function compareToBaseline(
    current: BundleMeasurement,
    baseline: BudgetBaseline,
    tolerance = baseline.tolerance ?? DEFAULT_TOLERANCE
): MetricResult[] {
    return ENFORCED_METRICS.map(({ kind, metric }) => {
        const base = baseline.initial[kind][metric];
        const cur = current.initial[kind][metric];
        const limit = Math.floor(base * (1 + tolerance));
        const delta = base === 0 ? (cur === 0 ? 0 : Infinity) : cur / base - 1;
        return { kind, metric, baseline: base, current: cur, limit, delta, ok: cur <= limit };
    });
}

export function toBaseline(m: BundleMeasurement, tolerance = DEFAULT_TOLERANCE): BudgetBaseline {
    const chunks: BudgetBaseline['chunks'] = {};
    for (const f of [...m.files].sort((a, b) => a.key.localeCompare(b.key))) {
        chunks[f.key] = { raw: f.raw, gzip: f.gzip, brotli: f.brotli, initial: f.initial };
    }
    return { tolerance, updatedAt: new Date().toISOString(), initial: m.initial, chunks };
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    return `${(n / 1024).toFixed(2)} kB`;
}

export function formatDelta(delta: number): string {
    if (!Number.isFinite(delta)) return 'new';
    const pct = (delta * 100).toFixed(1);
    return `${delta > 0 ? '+' : ''}${pct}%`;
}

/** Markdown report: enforced totals plus a per-chunk table (initial chunks first). */
export function renderMarkdown(
    current: BundleMeasurement,
    results: MetricResult[] | null,
    baseline: BudgetBaseline | null
): string {
    const lines: string[] = ['## Bundle budget', ''];
    if (results && baseline) {
        const pass = results.every((r) => r.ok);
        lines.push(
            pass
                ? `✅ Initial JS/CSS is within budget (+${(baseline.tolerance * 100).toFixed(0)}% of baseline from ${baseline.updatedAt.slice(0, 10)}).`
                : `❌ Initial JS/CSS exceeds the budget (+${(baseline.tolerance * 100).toFixed(0)}% of baseline from ${baseline.updatedAt.slice(0, 10)}).`,
            '',
            '| Metric | Baseline | Current | Limit | Change | |',
            '| --- | ---: | ---: | ---: | ---: | :---: |'
        );
        for (const r of results) {
            lines.push(
                `| Initial ${r.kind.toUpperCase()} (${r.metric}) | ${formatBytes(r.baseline)} | ${formatBytes(r.current)} | ${formatBytes(r.limit)} | ${formatDelta(r.delta)} | ${r.ok ? '✅' : '❌'} |`
            );
        }
    } else {
        lines.push('No baseline found; current sizes only.');
    }

    lines.push('', '### Per-chunk sizes', '', '| Chunk | Type | Raw | Gzip | Brotli | vs. baseline (gzip) |', '| --- | --- | ---: | ---: | ---: | ---: |');
    for (const f of current.files) {
        const prev = baseline?.chunks[f.key];
        const change = prev ? formatDelta(prev.gzip === 0 ? 0 : f.gzip / prev.gzip - 1) : 'new';
        lines.push(
            `| \`${f.key}\` | ${f.initial ? `**initial** ${f.kind}` : `lazy ${f.kind}`} | ${formatBytes(f.raw)} | ${formatBytes(f.gzip)} | ${formatBytes(f.brotli)} | ${change} |`
        );
    }
    if (baseline) {
        const currentKeys = new Set(current.files.map((f) => f.key));
        const removed = Object.keys(baseline.chunks).filter((k) => !currentKeys.has(k));
        if (removed.length) lines.push('', `Removed since baseline: ${removed.map((k) => `\`${k}\``).join(', ')}`);
    }
    return lines.join('\n') + '\n';
}
