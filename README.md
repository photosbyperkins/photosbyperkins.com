# Photography Portfolio Boilerplate

An incredibly fast, highly automated photography portfolio built for action and sports photographers. Originally designed for [photosbyperkins.com](https://photosbyperkins.com), this open-source template transforms raw image directories into a blazingly fast, standalone PWA with automated EXIF extraction, machine learning subject and face detection, next-gen AVIF encoding with SSIMULACRA 2 quality calibration, an animated 9:16 Story Maker Studio, and background Web Worker ZIP generation.

---

## ⚡ Features

### 🎬 Animated Story Maker Studio (9:16 Social Export)
- **High-Resolution Social Cards**: Full-featured client-side canvas studio exporting 1080×1920 social cards for Instagram Stories, TikTok, and mobile viewing.
- **Solo, Duet & Triptych Layouts**: Supports 9:16 Full-Bleed Crop, Padded Canvas, 2-panel Duet, and 3-panel sequential burst mode with dynamic aspect ratio preservation, interactive slot reordering (Swap & Reverse), and delta timestamps (+Δt).
- **36 Handcrafted SVG Frames**: Spanning 6 distinct categories (Action, Cosmic, Retro, Tech, Derby, and ASCII) with dynamic badge avoidance for attribution watermarks and scoreboard badges.
- **Live Motion & Client-Side MP4 Export**: Real-time 30 FPS animated frame engine compositing dynamic entrance effects (wipe, slide, pop, slash, typewriter) and looping ambient animations (twinkle, pulse, drift, glitch, shimmer, blink, scanline scroll, spin, flicker). Exports hardware-accelerated 1080×1920 MP4 videos via `mediabunny` or crisp still PNGs.
- **Dynamic Frame Tint & Background Color**: Live color popover featuring ink, white, gold, red, and cyan swatches alongside a custom hex color picker.
- **8 Non-Destructive Photo Filters**: Tailored grading styles with a real-time filter strength slider.
- **Adaptive Studio Ergonomics**: Responsive layouts tailored to the device:
  - `side`: Landscape desktop & tablet view with side-by-side preview and controls.
  - `stacked`: Tall tablet view with top preview and persistent lower panel.
  - `sheet`: Mobile phone view with collapsible swipeable bottom drawer and integrated multi-state export button.

### 🚀 Zero-Waterfall Performance & Modern Architecture
- **React 19 + Vite 8 + TypeScript**: Built on modern web standards with strict typing.
- **Zero-Waterfall Startup**: Inlined `__INITIAL_INDEX__` in `index.html` eliminates initial manifest roundtrips; active season JSON and content-hashed recap sprites are preloaded immediately.
- **Content-Hashed Sprite Versioning**: Content-hashed filenames (`recapHash`, `scrubberHash`) for both season recap banners and album scrubber sprites guarantee immutable long-term caching and zero stale asset bugs.
- **Modular CSS Architecture**: Extracted base/reset rules into `_base.scss`, reducing lazy modal SCSS bundle duplication across dialogs by 63%–91%.
- **GPU-Accelerated Touch Motion**: Hardware-composited animations via Framer Motion v14 with spring physics, roving tabindex navigation, and tactile haptic feedback (`navigator.vibrate`) on supported mobile devices.
- **Optimized Store Sync**: Deduplicated `localStorage` serialization in Zustand for persisted state slices.

### 🖼️ Next-Gen AVIF & Automated Subject Detection
- **SSIMULACRA 2 Calibrated AVIF**: Gallery thumbnails and full-display lightbox photos are encoded in AVIF calibrated via SSIMULACRA 2 ($\ge 78$ visual score), saving ~35% bandwidth over WebP while preserving pristine image detail. Full-resolution JPEG originals and album ZIPs remain standard `.jpg` and `.zip` for universal client compatibility.
- **Machine Learning Subject & Face Detection**: SCRFD-10G face detection combined with YOLOX-L person detection (DirectML GPU on Windows / CPU fallback), ranking subjects by sharpness, size, and confidence.
- **Intelligent Fallbacks**: Skaters with helmet-obscured faces automatically fall back to upper-body/head region estimation and sharpness-weighted saliency maps.
- **Persistent Focal Coordinates**: Caches detected subjects (`focusX`, `focusY`, `faces`, `subjects`) in `data/.faces_cache.json` across indexing runs to power CSS `object-position` thumbnail framing, album scrubber sprites, and Story Maker initial centering.

### 📦 Multi-Photo Selection, Batch Actions & Favorites
- **Multi-Photo Selection**: Tap, click, or Shift+click range selection across album grids.
- **Client-Side ZIP Generation**: Batch download customized ZIP archives generated entirely client-side using `fflate` inside a dedicated background Web Worker.
- **Event & Global Favorites**: Organize favorites globally or by specific event, and download event-scoped favorite archives.
- **Direct Studio Launch**: Launch multi-photo selections directly into Story Maker Duet or Triptych sequential burst modes with automatic slot assignment.
- **Shareable Favorites URLs**: Share curated selections through lightweight, DEFLATE-compressed query parameters without requiring a backend database.

### 🔍 Discovery, Lightbox & Stats
- **Interactive Lightbox & Scrubber**: Drag-to-navigate sprite-sheet scrubber with touch gesture support, isolated EXIF telemetry display, full-screen zoom, and keyboard shortcuts.
- **Categorized Fuzzy Search**: Powered by `fuse.js`, prioritizing Leagues & Groups above Individual Teams, season gear, and year archives.
- **Season Recaps & Gear Showcase**: Animated recap banners composited from highlight slices, plus interactive Apple-glass modals (`GearModal.tsx`) detailing each season's primary camera and lens with technical specifications and direct links to manufacturer product pages.
- **WFTDA Stats Integration**: Automatically fetches global rankings and match histories from official WFTDA data if folder names match known bouts.
- **Automated Social Cards**: Generates branded OpenGraph images for every album for rich social media link previews.
- **Service Worker PWA**: Fully offline-capable Progressive Web App with intelligent precache quota recovery.

---

## 🛠 Prerequisites

1. **Node.js** (v18+)
2. **Python 3.10+** (for subject and face detection in `scripts/ml/run.py` / `scripts/detectFaces.py`):
   - Run `pip install -r requirements-ml.txt` (uses ONNX Runtime with DirectML on Windows for GPU inference; models are downloaded and checksum-verified into `data/models/` on first run).
3. **Environment Config**: Copy `.env.example` to `.env` and configure your variables.
4. **Favicon**: Drop an `icon.svg` into the root directory to customize the PWA icons (defaults to a generic camera icon).

---

## 📂 Organizing Your Photos

Place your unwatermarked, full-resolution JPEG files inside the `photos/` directory at the project root:

```text
photos/
  ├── 2024/
  │    ├── 01_15 Team Alpha vs Team Beta/
  │    │    ├── score.json
  │    │    ├── raw_image_1.jpg
  │    │    └── raw_image_2.jpg
  ├── 2025/
  │    ├── 04_12 Championship Game/
  │    │    ├── raw_image_1.jpg
```

### 🏆 Team Names & Scores (`score.json`)

The build pipeline intelligently parses folder names:

- **Name Format**: Naming a folder `MM_DD Team One vs Team Two` allows the script to derive the match date and both competing teams.
- **Local Scores**: Drop a `score.json` file inside the folder to set match scores:
  ```json
  {
    "team1Score": 320,
    "team2Score": 102
  }
  ```
- **WFTDA Integration**: Automatically matches derived dates and teams against `data/wftda-urls.json` to scrape official rankings and match histories.
- **Team Abbreviations**: Define `VITE_TEAM_ABBREVIATIONS` in `.env` to abbreviate long team names on mobile (e.g. `VITE_TEAM_ABBREVIATIONS='{"Sacramento Roller Derby":"SRD"}'`).
- **About Me Blurb**: Define `VITE_ABOUT_ME` in `.env` to customize the "Behind the Lens" modal (`\n\n` creates paragraphs).
- **Profile Photo**: Place `profile_photo.jpg` in `photos/` (served at `/photos/profile_photo.jpg`).
- **Season Gear Showcase**: Define favorite camera bodies and lenses in `data/gearData.ts`. Clicking badges in the Season Recap strip opens detailed specs and manufacturer product links.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the local Vite development server. |
| `npm test` | Runs the full Vitest unit test suite (108 test files, 995+ tests). |
| `npm run test:e2e` | Runs Playwright end-to-end integration tests. |
| `npm run typecheck` | Validates TypeScript across application code and build scripts. |
| `npm run build` | Executes the complete multi-phase asset and data generation pipeline. |
| `npm run build:client` | Builds production frontend client assets with Vite. |
| `npm run bundle:check` | Fails if initial JS/CSS grew >5% vs `bundle-budget.json`; writes `reports/bundle/`. |
| `npm run bundle:baseline` | Records the current build as the new bundle budget baseline. |
| `npm run deploy` | Deploys static build artifacts to remote server via SSH/SCP. |
| `npm run sync-media` | Synchronizes generated media assets (`thumbnails/`, `avif/`, `scrubber/`, `recap/`, `zips/`) to the remote server over SSH. |
| `npm run populate-scores` | Scaffolds empty `score.json` stubs for event folders with `"vs"`. |
| `npm run fix-permissions` | Normalizes remote directory (755) and file (644) permissions over SSH. |
| `npm run favicon` | Generates PWA and web icons from `icon.svg`. |
| `npm run faces` | Runs subject/face detection (incremental; cached by photo content hash). |
| `npm run ml` / `npm run ml:budget` | Runs every ML stage / projects a full 12k reprocess against the 2-hour budget. |
| `npm run test:ml` | Runs the Python ML pipeline tests (pytest). |
| `npm run clean` | Cleans `dist/` and build staging folders. |
| `npm run lint` / `npm run format` | Runs ESLint and Prettier. |

---

## 🚀 Build Pipeline (`npm run build`)

Running `npm run build` triggers a multi-phase pipeline orchestrated by `scripts/build.ts` with modules in `scripts/pipeline/`:

### Phase 1 — Setup
- **Clean** → **Format** → **TypeScript Validation**.

### Phase 2 — In-Memory Pipeline (Indexing & Master Encoding)
- **Index Photos (`generatePhotoIndex`)**: Extracts EXIF metadata via `exifr`. Hydrates focal coordinates (`focusX`, `focusY`, `faces`) from `data/.faces_cache.json`.
- **Master Encoder (`encodePhotos`)**: Generates AVIF thumbnails (using a multi-core SSIMULACRA 2 worker pool), full-display AVIF conversions, and copyright-tagged JPEGs.
- **Parallel Tasks**: Favicon generation and WFTDA stats scraping run simultaneously.

### Phase 3 — Machine Learning Subject & Face Detection
- Serializes state to `data/photos.json`.
- Runs **Subject Detection** (`npm run faces` → `scripts/ml/run.py --stages subjects`): SCRFD-10G face detection + YOLOX-L person detection with DirectML GPU acceleration, ranked by sharpness, size, and confidence. Falls back to upper body/head estimation and sharpness-weighted saliency maps. Exports detected boxes to `data/.faces_cache.json` for `generatePhotoIndex`.
- Deserializes updated coordinates back into pipeline state.

#### ML pipeline (`scripts/ml/`)
- **Content-addressed cache** (`data/ml_cache.sqlite`): results are keyed by the **sha256 of the source JPEG** + stage name + **stage fingerprint**. Renaming or moving photos/albums never recomputes; re-exporting a photo recomputes just that photo. Source hashes are memoised by path + size + mtime (a cold hash of the whole library takes seconds).
- **Automatic invalidation**: a stage fingerprint hashes its `STAGE_VERSION`, every tuning constant in `PARAMS`, the sha256 of each model file and its input recipe. Changing a threshold or swapping a model recomputes that stage only — no manual version bumps. Bump `STAGE_VERSION` for logic changes `PARAMS` can't see.
- **One decode, many stages**: each photo is decoded once and fed to every stage that still needs it. Stages implement `requests()` → `postprocess()` → `apply()` (`scripts/ml/stage.py`) and never call models directly.
- **GPU scheduler**: a single GPU thread owns every DirectML session (no lock contention; never run two DirectML sessions concurrently — it can hang the driver). Requests are queued per model and batched up to the model's `batch_size` (dynamic-batch exports are pinned to static shapes via free-dimension overrides). SCRFD and YOLOX are fixed batch-1 exports; the subjects stage is GPU-bound at ~35 img/s (≈5½ min for the full library).
- **Budget gate**: `npm run ml:budget` projects a full 12,000-photo reprocess from a 1,000-photo sample against the 2-hour budget in `scripts/ml/budget.py` (measured stages + reserved time for planned taggers) and writes `reports/ml/budget.md`; it exits 1 if over. VLM alt text runs as its own job outside the 2-hour target.
- **Commands**: `npm run ml` (all stages), `python scripts/ml/run.py --stats | --gc | --sample N | --force | --dry-run | --cpu`, `npm run test:ml` (pytest: cache, batching, runner and golden parity against `scripts/ml/tests/golden/subjects.json`; golden photos are read from your local `build/`/`photos/` and the test skips without them).
- **Setup**: `python -m pip install -r requirements-ml.txt`.

### Phase 4 — Data Modifiers & Chunking
- **Generate Zips**: Builds offline event ZIP archives.
- **Chunk Data**: Splits `photos.json` into per-year, per-team, per-gear and per-album JSON payloads with computed season statistics.
- **Compact Data Format (v2)**: Payloads are encoded by [`src/utils/dataCodec.ts`](src/utils/dataCodec.ts): asset paths are rebuilt from year + album slug + photo number, EXIF blocks are de-duplicated per album, coordinates ship as integer hundredths, and burst frames reference album indices. The client decodes back to the same `PhotoRecord` / `EventData` shapes, so nothing downstream changes. Albums are ~87% smaller raw and ~62% smaller gzipped than the previous format. The encoder throws on unknown photo fields, so add new fields to the codec when extending the schema.

### Phase 5 — Sprites & Scrubber Generation
- **Generate Recaps**: Composites focus-cropped highlight slices into sprite sheets with content-hashed versioning (`recapHash`).
- **Generate Scrubber**: Generates 72×48 lightbox scrubber sprites per album with content-hashed versioning (`scrubberHash`).

### Phase 6 — Asset Staging
- Moves finalized media and sprite assets to `dist/`.

### Phase 7 — Vite Client Build & Outputs
- Builds client bundle with inlined `__INITIAL_INDEX__`.
- Generates OpenGraph social cards, XML sitemaps, and standalone share pages in parallel.
- **Bundle Budget**: Checks the initial JS/CSS (the entry script, `modulepreload`s and stylesheets referenced by `dist/index.html`) against `bundle-budget.json`. Fails if raw or gzip size grows more than 5%.

### Bundle Budget
- `npm run bundle:check` runs after any `vite build` (also in `predeploy` and the `Bundle budget` GitHub Actions workflow).
- `npm run bundle:baseline` records the current build as the new baseline. Commit `bundle-budget.json` when growth is intentional.
- Reports (gitignored) are written to `reports/bundle/`: `stats.html` is a `rollup-plugin-visualizer` treemap (raw/gzip/brotli), and `budget.md` has a per-chunk table with the change from the baseline. CI uploads both as the `bundle-report` artifact and posts the table to the job summary.

---

## 🚢 Deployment (`npm run deploy`)

Deployment bundles code artifacts and uploads them over SSH via `scp`. Configure your SFTP/SSH host settings in `.env`.

### ⚠️ Important Media Upload Note

To ensure fast code updates and conserve bandwidth, `npm run deploy` intentionally **skips** uploading heavy media directories:
- `/photos` (original high-res JPEGs)
- `/avif` (full-display AVIFs)
- `/thumbnails` (AVIF thumbnails)
- `/recap` (sprite sheets)
- `/scrubber` (sprite sheets)
- `/zips` (offline zip archives)
- `/webp` (legacy webp fallback, if present)

To upload media, run `npm run sync-media` to incrementally transfer new or modified media assets without re-uploading existing files, or use an SFTP client (like FileZilla or Cyberduck) to sync media directories to your server's `public_html`.

---

## 🔧 Standalone Utilities

These scripts live in `scripts/` and can be run independently:

### `syncMedia.ts`
Synchronizes generated static media (`thumbnails/`, `avif/`, `scrubber/`, `recap/`, `zips/`) from `dist/` or `build/` to the remote server over SSH.
- **Single-Pass Catalog**: Catalogs existing remote files in one pass before transferring, skipping any files already present.
- **Atomic Transfer**: Uses SSH/SCP streaming with automated permission verification (755 directories, 644 files).
```bash
npm run sync-media
```

### `populateEventScores.ts`
Scans event directories under `photos/` and creates a `score.json` stub in any event folder containing `"vs"` that lacks one.
```bash
npm run populate-scores
```

### `fixPermissions.ts`
SSH recovery utility to reset and normalize remote server file permissions (`chmod 755` for directories, `chmod 644` for files).
```bash
npm run fix-permissions
```
