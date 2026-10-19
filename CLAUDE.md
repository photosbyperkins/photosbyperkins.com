# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static photography portfolio (React 19 + Vite 8 + TypeScript, Zustand, Framer Motion, PWA) for sports/roller-derby photos. There is no backend: a Node build pipeline (`scripts/`) turns a local `photos/YYYY/MM_DD Event Name/*.jpg` tree into AVIF media plus chunked JSON under `public/data/`, and the SPA fetches those static files. A Python ML pipeline (`scripts/ml/`) adds face/subject detection and other tags. Deployment is SSH/SCP to a shared host (`public/.htaccess`, `public/api/vitals.php`).

`photos/`, `build/`, `data/*` (except `customTeamFilters.json`), `public/data/*` (except `story/`), `build.json` and `.env` are all gitignored and generated locally. A fresh checkout has no photo data, so the dev server renders little until the pipeline has run. Copy `.env.example` to `.env` first; the `VITE_*` values are baked in at build time (CI does exactly this).

## Commands

The dev shell is Windows; use `npm.cmd` from PowerShell if `npm` is blocked by execution policy.

```bash
npm run dev               # Vite on :5173 (also serves /photos, /thumbnails, /avif, ... from photos/ and build/ via middleware)
npm test                  # Vitest, all unit tests
npx vitest run src/utils/dataCodec.test.ts      # single file
npx vitest run -t "decodes burst"               # by test name
npm run typecheck         # tsc over src (tsconfig.json) AND scripts (tsconfig.scripts.json)
npm run lint              # ESLint (src: browser rules; scripts: node rules)
npm run format            # Prettier: 4-space indent, single quotes, 120 cols
npm run test:e2e          # Playwright; starts/reuses `npm run dev`; 5 browser projects
npx playwright test e2e/lightbox.spec.ts --project=chromium
npm run test:ml           # pytest for scripts/ml
npm run build:client      # Vite production build only
npm run bundle:check      # fail if initial JS/CSS grows >5% vs bundle-budget.json (run after build:client)
npm run bundle:baseline   # accept new sizes; commit bundle-budget.json
npm run build             # FULL pipeline (needs photos/ and Python ML deps); see below
npm run publish -- --event "<filter>" [--deploy] [--skip-ml] [--skip-client-build]   # rebuild one event incrementally
```

CI (`.github/workflows/bundle-budget.yml`) runs: typecheck → lint → `npm test` → `test:ml` + `ml:eval` (≥90% precision gate) → `build:client` → `bundle:check` → Lighthouse CI (`lhci:fixtures` then `lhci`). Keep all of these green.

### Testing notes
- Vitest uses `pool: 'vmThreads'` with happy-dom (`vite.config.ts` → `test`). `src/test/setup.ts` polyfills `CompressionStream` and patches `Uint8Array instanceof` across realms, and **replaces `fetch` with one that always rejects**, so any test that loads data must mock `fetch` explicitly.
- Hooks with module-level caches expose reset helpers (e.g. `_clearYearDataCache()` in `usePortfolioData.ts`); call them between tests.
- Playwright `capture-*.spec.ts` files are screenshot-capture scripts, skipped unless `CAPTURE=1`. Visual-regression baselines are `*-win32.png`, so they only match on Windows.

## Architecture

### Build pipeline → static data (`scripts/build.ts`, `scripts/pipeline/`)
`npm run build` first runs clean, typecheck, lint and unit tests, then:
1. `generatePhotoIndex` reads EXIF (exifr), parses folder names (`MM_DD Team A vs Team B`, optional `score.json`), hydrates focus/faces from `data/.faces_cache.json`.
2. `encodePhotos` encodes AVIF thumbnails/display images, with quality calibrated by a SSIMULACRA 2 worker pool (`ssim2Pool.ts`/`ssim2Worker.ts`), and writes copyright-tagged JPEGs. The favicon and WFTDA scrape run in parallel.
3. The state is serialized to `data/photos.json`, `npm run faces` (Python) mutates it, and the state is read back. This JSON file is the Node↔Python interop boundary.
4. `generateZips`, then `chunkData` splits into `public/data/index.json`, `years/<year>.json`, `albums/<year>/<slug>.json`, and per-team and per-gear chunks.
5. `generateRecaps` and `generateScrubber` build content-hashed sprite sheets (`recapHash`, `scrubberHash`).
6. `processAndCopyPhotos` stages media into `dist/`, then the Vite build, social cards, sitemap and share pages run in parallel, then the bundle budget check.

`scripts/publishEvent.ts` re-runs a subset of these steps for a single event and can delta-deploy it.

### Wire format (`src/utils/dataCodec.ts`)
JSON chunks use a compact **v2** format: asset paths are derived from year + album slug + photo number, EXIF is de-duplicated per album, coordinates are integer hundredths, and bursts reference album indices. The pipeline encodes; the client decodes back into the `PhotoRecord`/`EventData` shapes in `src/types.ts`. **The encoder throws on unknown photo fields.** When you add a field to a photo, add it to the codec's encode and decode paths and their tests. v1 payloads still pass through for stale service-worker caches.

### Zero-waterfall startup (`vite.config.ts` `html-transform` plugin + `src/App.tsx`)
At build time the plugin inlines `public/data/index.json` into `index.html` as `window.__INITIAL_INDEX__`. It also injects a script that inspects the URL, modulepreloads the `Portfolio`/`ModalShell`/`LightboxContainer` chunks, starts fetches for the year/album JSON into `window.__WARM_JSON__`, and preloads the LCP thumbnail. `usePortfolioData`'s `fetchChunkWithDedup` consumes those warm promises before falling back to `fetch`. The plugin finds chunks by filename regex (`assets/Portfolio-*.js` etc.), so renaming those components or changing how they are code-split silently breaks preloading. `main.tsx` delays the first render on `appReadyPromise` (portfolio warm-up, capped at 180 ms).

Data URLs carry a `?build=<n>` cache-buster. `build.json` holds the counter, which `vite.config.ts` increments on every non-test `vite build` (exposed as `__BUILD_NUMBER__` / `getBuildNumber()`).

### Client structure
- **Routing** is derived from the URL in `usePortfolioRoute.ts`, not from `<Routes>`: `/portfolio/:year`, `/portfolio/:year/:event/:photo` (deep link into the lightbox), `/portfolio/team/:slug`, `/portfolio/gear/:slug`, `/portfolio/find[/:slug]`, `/portfolio/favorites`, plus query params (`search`, `q`, `jersey`, `num`). Event slugs may contain dots, which is why the preview middleware rewrites `/portfolio*` to `index.html`.
- **State**: a single Zustand store (`src/store/useAppStore.ts`) composed from `modalSlice`, `themeSlice`, `portfolioSlice` (lightbox, favorites, batch selection) and `storySlice`. Only `favorites`, `theme`, `storySettings` and the `recent*Ids` lists are persisted (`partialize`), through a storage wrapper that skips writes when those references haven't changed. When you add persisted state, update `PersistedSlice`, `partialize`, the dedupe comparison and `merge`.
- **Lazy loading**: Portfolio, all modals, the lightbox, the Story Maker export modal and the ZIP worker are separate chunks. Modals mount only after they are first opened (`useHasEverBeenTrue` in `App.tsx`). The initial JS/CSS is budgeted, so keep new heavy dependencies out of the entry path.
- **Story Maker** (9:16 still/MP4 export): UI is under `src/components/sections/Portfolio/{storyStudio,storyTabs,storyFrames}`; the pure render/animation engine is under `src/utils/story/`. Frames are defined as layered SVGs via `defineLayeredFrame` (`storyFrames/frames/helper.tsx`), and the still frame is the joined layers, so the still and animated versions can't drift. Per-category motion recipes live in `src/utils/story/frameMotion/recipes/`, and the sampler (`sample.ts`) must stay pure and deterministic. Tests enforce that every frame is layered. MP4 encoding uses Mediabunny/WebCodecs (lazy-loaded), with a MediaRecorder MP4-only fallback. See `summary.md` for the full design.
- **ZIP downloads** are built client-side with fflate in `src/workers/zipWorker.ts`.
- **Styles**: SCSS partials in `src/styles/`, imported from `src/index.scss`. Shared reset rules live in `_base.scss`, which lazy modal styles reuse.
- Path alias `@/` → `src/`.

### ML pipeline (`scripts/ml/`)
- Results are cached in `data/ml_cache.sqlite`, keyed by the source JPEG's sha256 + stage name + stage fingerprint. The fingerprint hashes `STAGE_VERSION`, `PARAMS`, the model file hashes and the input recipe. Changing a constant in `PARAMS` reruns only that stage; bump `STAGE_VERSION` for logic changes that `PARAMS` can't capture.
- Stages (`scripts/ml/stages/`) implement `requests()` → `postprocess()` → `apply()` (`stage.py`) and never call models directly.
- One GPU scheduler thread owns every DirectML session. Never run two DirectML sessions concurrently (it can hang the driver).
- Golden parity tests (`tests/golden/subjects.json`) read local photos and skip when they're absent.
