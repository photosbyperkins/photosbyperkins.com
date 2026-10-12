import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    compareToBaseline,
    extractInitialAssets,
    measureBundle,
    renderMarkdown,
    stableKey,
    toBaseline,
    type BudgetBaseline,
} from './bundleBudget';

describe('bundleBudget', () => {
    describe('stableKey', () => {
        it('strips Rolldown content hashes, including ones containing - and _', () => {
            expect(stableKey('assets/index-Co1aOxuP.js')).toBe('assets/index.js');
            expect(stableKey('assets/rolldown-runtime-hePW80VL.js')).toBe('assets/rolldown-runtime.js');
            expect(stableKey('assets/modalAnimation-B1aUh-b_.js')).toBe('assets/modalAnimation.js');
            expect(stableKey('assets/index-BxZUFoYk.css')).toBe('assets/index.css');
        });

        it('leaves unhashed names alone', () => {
            expect(stableKey('assets/app.js')).toBe('assets/app.js');
        });
    });

    describe('extractInitialAssets', () => {
        it('collects entry scripts, modulepreloads and stylesheets only', () => {
            const html = `
                <script>inline()</script>
                <script type="module" crossorigin src="/assets/index-AAAAAAAA.js"></script>
                <link rel="modulepreload" crossorigin href="/assets/vendor-BBBBBBBB.js">
                <link crossorigin rel="stylesheet" href="/assets/index-CCCCCCCC.css?v=2">
                <link rel="preload" href="/assets/fonts/outfit.woff2" as="font">
                <link rel="preload" href="/data/years/2026.json" as="fetch">
                <link rel="stylesheet" href="https://cdn.example.com/x.css">
                <link rel="icon" href="/favicon.svg">
            `;
            expect(extractInitialAssets(html).sort()).toEqual([
                'assets/index-AAAAAAAA.js',
                'assets/index-CCCCCCCC.css',
                'assets/vendor-BBBBBBBB.js',
            ]);
        });
    });

    describe('measureBundle + compareToBaseline', () => {
        let dist: string;

        const write = (rel: string, content: string) => {
            const abs = path.join(dist, rel);
            fs.mkdirSync(path.dirname(abs), { recursive: true });
            fs.writeFileSync(abs, content);
        };

        beforeEach(() => {
            dist = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-budget-'));
            write(
                'index.html',
                '<script type="module" src="/assets/index-AAAAAAAA.js"></script><link rel="stylesheet" href="/assets/index-CCCCCCCC.css">'
            );
            write('assets/index-AAAAAAAA.js', 'x'.repeat(1000));
            write('assets/index-CCCCCCCC.css', 'y'.repeat(400));
            write('assets/Lazy-DDDDDDDD.js', 'z'.repeat(5000));
            write('assets/Stale-EEEEEEEE.js', 'stale');
        });

        afterEach(() => {
            fs.rmSync(dist, { recursive: true, force: true });
        });

        it('totals initial files and lists lazy chunks from the build manifest only', () => {
            const m = measureBundle(dist, ['assets/index-AAAAAAAA.js', 'assets/index-CCCCCCCC.css', 'assets/Lazy-DDDDDDDD.js']);
            expect(m.initial.js.raw).toBe(1000);
            expect(m.initial.css.raw).toBe(400);
            expect(m.initial.js.files).toEqual(['assets/index.js']);
            expect(m.files.map((f) => f.key)).toEqual(['assets/index.js', 'assets/index.css', 'assets/Lazy.js']);
            expect(m.files.find((f) => f.key === 'assets/Lazy.js')?.initial).toBe(false);
            expect(m.files.some((f) => f.key === 'assets/Stale.js')).toBe(false);
        });

        it('passes within tolerance and fails beyond it', () => {
            const baseline = toBaseline(measureBundle(dist));

            write('assets/index-AAAAAAAA.js', 'x'.repeat(1040)); // +4% raw
            expect(compareToBaseline(measureBundle(dist), baseline).find((r) => r.kind === 'js' && r.metric === 'raw')?.ok).toBe(true);

            write('assets/index-AAAAAAAA.js', 'x'.repeat(1060)); // +6% raw
            const results = compareToBaseline(measureBundle(dist), baseline);
            const jsRaw = results.find((r) => r.kind === 'js' && r.metric === 'raw')!;
            expect(jsRaw.ok).toBe(false);
            expect(jsRaw.delta).toBeCloseTo(0.06, 5);
            expect(results.find((r) => r.kind === 'css' && r.metric === 'raw')?.ok).toBe(true);
        });

        it('counts a newly added initial chunk against the budget', () => {
            const baseline = toBaseline(measureBundle(dist));
            write(
                'index.html',
                '<script type="module" src="/assets/index-AAAAAAAA.js"></script><link rel="modulepreload" href="/assets/Lazy-DDDDDDDD.js"><link rel="stylesheet" href="/assets/index-CCCCCCCC.css">'
            );
            const results = compareToBaseline(measureBundle(dist), baseline);
            expect(results.filter((r) => r.kind === 'js').every((r) => !r.ok)).toBe(true);
        });

        it('throws when index.html references a missing file', () => {
            fs.unlinkSync(path.join(dist, 'assets/index-CCCCCCCC.css'));
            expect(() => measureBundle(dist)).toThrow(/missing from dist/);
        });

        it('renders a markdown report with totals and per-chunk rows', () => {
            const baseline: BudgetBaseline = toBaseline(measureBundle(dist));
            const current = measureBundle(dist, ['assets/Lazy-DDDDDDDD.js']);
            const md = renderMarkdown(current, compareToBaseline(current, baseline), baseline);
            expect(md).toContain('within budget');
            expect(md).toContain('| `assets/index.js` | **initial** js |');
            expect(md).toContain('| `assets/Lazy.js` | lazy js |');
        });
    });
});
