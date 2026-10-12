/**
 * Bundle budget gate.
 *
 *   npm run bundle:check     -> fails (exit 1) if initial JS or CSS grew > tolerance vs bundle-budget.json
 *   npm run bundle:baseline  -> records the current build as the new baseline
 *
 * Run after `vite build`. Reads dist/index.html for the initial asset set and
 * reports/bundle/chunks.json (written by the build) for the per-chunk table.
 * Writes reports/bundle/budget.md and appends it to $GITHUB_STEP_SUMMARY in CI.
 */
import fs from 'fs';
import path from 'path';
import {
    DEFAULT_TOLERANCE,
    compareToBaseline,
    formatBytes,
    formatDelta,
    measureBundle,
    renderMarkdown,
    toBaseline,
    type BudgetBaseline,
} from './bundle/bundleBudget.js';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const BASELINE_PATH = path.join(ROOT, 'bundle-budget.json');
const REPORT_DIR = path.join(ROOT, 'reports', 'bundle');
const CHUNKS_PATH = path.join(REPORT_DIR, 'chunks.json');
const MARKDOWN_PATH = path.join(REPORT_DIR, 'budget.md');

const update = process.argv.includes('--update');

function readChunkFiles(): string[] | undefined {
    if (!fs.existsSync(CHUNKS_PATH)) {
        console.warn(`⚠️  ${path.relative(ROOT, CHUNKS_PATH)} not found; per-chunk table will only list initial files.`);
        return undefined;
    }
    const data = JSON.parse(fs.readFileSync(CHUNKS_PATH, 'utf8')) as { files: string[] };
    return data.files;
}

function readBaseline(): BudgetBaseline | null {
    if (!fs.existsSync(BASELINE_PATH)) return null;
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as BudgetBaseline;
}

function writeReport(markdown: string) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(MARKDOWN_PATH, markdown);
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    }
}

function main() {
    const current = measureBundle(DIST_DIR, readChunkFiles());
    const baseline = readBaseline();

    console.log('\n📦 Bundle budget');
    console.log('========================================');
    for (const kind of ['js', 'css'] as const) {
        const t = current.initial[kind];
        console.log(
            `Initial ${kind.toUpperCase().padEnd(3)} ${formatBytes(t.raw).padStart(10)} raw  ${formatBytes(t.gzip).padStart(10)} gzip  ${formatBytes(t.brotli).padStart(10)} brotli  (${t.files.length} file${t.files.length === 1 ? '' : 's'})`
        );
    }

    if (update) {
        const tolerance = baseline?.tolerance ?? DEFAULT_TOLERANCE;
        const next = toBaseline(current, tolerance);
        fs.writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
        writeReport(renderMarkdown(current, null, null));
        console.log(`\n✅ Baseline written to ${path.relative(ROOT, BASELINE_PATH)} (tolerance ${(tolerance * 100).toFixed(0)}%). Commit it.`);
        return;
    }

    if (!baseline) {
        writeReport(renderMarkdown(current, null, null));
        console.error(`\n❌ No baseline at ${path.relative(ROOT, BASELINE_PATH)}. Run \`npm run bundle:baseline\` and commit the result.`);
        process.exit(1);
    }

    const results = compareToBaseline(current, baseline);
    writeReport(renderMarkdown(current, results, baseline));

    console.log(`\nBaseline from ${baseline.updatedAt.slice(0, 10)}, tolerance +${(baseline.tolerance * 100).toFixed(0)}%:`);
    for (const r of results) {
        const label = `${r.kind.toUpperCase()} ${r.metric}`.padEnd(9);
        console.log(
            `  ${r.ok ? '✅' : '❌'} ${label} ${formatBytes(r.current).padStart(10)} / limit ${formatBytes(r.limit).padStart(10)}  (${formatDelta(r.delta)} vs ${formatBytes(r.baseline)})`
        );
    }

    const newInitial = (['js', 'css'] as const).flatMap((k) =>
        current.initial[k].files.filter((f) => !baseline.initial[k].files.includes(f))
    );
    if (newInitial.length) console.log(`\nℹ️  New initial files since baseline: ${newInitial.join(', ')}`);
    console.log(`\nPer-chunk report: ${path.relative(ROOT, MARKDOWN_PATH)} (treemap: reports/bundle/stats.html)`);

    const failures = results.filter((r) => !r.ok);
    if (failures.length) {
        console.error(
            `\n❌ Bundle budget exceeded. Shrink the initial bundle (lazy-load, drop deps) or, if the growth is intentional, run \`npm run bundle:baseline\` and commit bundle-budget.json.`
        );
        process.exit(1);
    }

    const shrunk = results.some((r) => r.delta < -DEFAULT_TOLERANCE);
    if (shrunk) console.log('\n💡 Initial bundle shrank noticeably. Run `npm run bundle:baseline` to lock in the savings.');
    console.log('\n✅ Bundle budget OK');
}

try {
    main();
} catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
}
