# Photography Portfolio Boilerplate

An incredibly fast, highly automated photography portfolio built for action photographers. Originally designed for [photosbyperkins.com](https://photosbyperkins.com), this open-source template transforms raw image directories into a blazingly fast, standalone PWA with automated EXIF extraction, face detect cropping, next-gen AVIF processing, and ZIP archive generation.

## Features

- **100% Client-Side**: Once built, it's a completely static site (JSON + Media).
- **Fully Automated Data Pipeline**: Drop images in folders, and the system automatically extracts metadata, resizes, compresses, and maps faces.
- **AVIF Next-Gen Format & SSIMULACRA 2 Optimization**: Gallery thumbnails and full-display lightbox photos are encoded in AVIF calibrated via SSIMULACRA 2 ($\ge 78$ visual score), saving ~35% storage and bandwidth over legacy WebP while preserving pristine image fidelity. Original full-resolution downloads and album ZIP archives are preserved as standard `.jpg` and `.zip` for universal client compatibility.
- **Zero-Downtime Migration & Transparent Fallback**: Apache rewrite rules transparently map any cached or external `.webp` requests to `.avif`, ensuring zero 404s.
- **Service Worker PWA**: Works offline, fully cache-enabled using Vite PWA.
- **Glassmorphic UI**: A stunning, modern, hardware-accelerated interface.
- **Favorites & Web Worker Zipping**: Star your favorite photos and batch download them entirely client-side using `fflate` in a background Web Worker!
- **Shareable Favorites URLs**: Share curated photo selections via lightweight, DEFLATE-compressed, database-free URLs.
- **Lightbox Scrubber**: Drag-to-navigate sprite-sheet scrubber for fast album browsing within the lightbox.
- **Fuzzy Search Engine**: Instantly find teams with typo-tolerant search powered by `fuse.js`.
- **WFTDA Stats Integration**: Automatically fetches global rankings and match histories from official WFTDA data if folder names match known bouts.
- **Year Recap Sprites**: Animated recap banners composited from focus-cropped album highlights.
- **Favorite Camera & Lens Modals**: Interactive badges in the season recap banner showcasing each season's primary camera and lens with technical specifications and direct links to official manufacturer product pages.
- **Automated Social Cards**: Generates beautifully branded OpenGraph images for every single album to ensure rich link previews across social media.

---

## 🛠 Prerequisites

1. **Node.js** (v18+)
2. **Python** (for OpenCV face detection logic in `scripts/detectFaces.py`)
   - Run `pip install opencv-python`
3. **Environment Config**: Copy `.env.example` to `.env` and fill out your variables!
4. **Favicon**: Drop an `icon.svg` into the root folder to completely customize the PWA icons, otherwise it defaults to a clean, generic camera.

## 📂 Organizing Your Photos

This project relies aggressively on folder structure! Place your unwatermarked, full-resolution JPEG files inside the `photos/` directory at the project root.

The system expects your directories to be structured exactly like this:

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

The build pipeline intelligently parses your folder names. If it sees `vs` or `versus`, it attempts to match it against **WFTDA stats**.

- **Name Format**: Naming a folder `MM_DD Team One vs Team Two` allows the script to derive the Match Date and both competing teams.
- **Local Scores**: Drop a `score.json` file inside that folder to explicitly set match scores on the UI:
  ```json
  {
    "team1Score": 320,
    "team2Score": 102
  }
  ```
- **WFTDA Integration**: `npm run wftda` fetches global rankings and match histories from `stats.wftda.com`. If your folder's derived date and derived team names correspond to an actual WFTDA bout configured in `data/wftda-urls.json`, those official stats automatically populate on the frontend!
- **Team Abbreviations**: You can automatically abbreviate long team names in the Frontend UI (e.g. "Sacramento Roller Derby" -> "SRD") by providing a JSON string dictionary in your `.env` file under the key `VITE_TEAM_ABBREVIATIONS`. 
  - *Example*: `VITE_TEAM_ABBREVIATIONS='{"Sacramento Roller Derby":"SRD"}'`
- **About Me Blurb**: To customize the text in the "Behind the Lens" popup, define `VITE_ABOUT_ME` in your `.env`. You can use `\n\n` to automatically create new paragraphs.
- **Profile Photo**: To display your own picture in the "Behind the Lens" popup, simply drop a file named `profile_photo.jpg` into your `photos/` directory (making it available at `/photos/profile_photo.jpg` on your server).
- **Favorite Camera & Lens Modals**: In the Season Recap strip, the photographer's favorite camera body and favorite lens for each season are featured with heart badges. Clicking either badge opens a native Apple-glass modal (`GearModal.tsx`) showcasing detailed technical specifications (sensor, mount, aperture, optical elements, autofocus, weight), and an external button navigating directly to the official product page on Nikon USA or Sigma Photo.

## 🚀 Build Pipeline (`npm run build`)

Running `npm run build` triggers an intense, multi-phase pipeline orchestrated by `scripts/build.ts`. All build step scripts live in `scripts/pipeline/`.

### Phase 1 — Setup
- **Clean** → **Format** → **TypeScript Check**

### Phase 2 — In-Memory Pipeline (Indexing & Master Encoding)
- **Index Photos**: `exifr` EXIF extraction into a global JSON state.
- **Master Encoder (`encodePhotos`)**: Generates AVIF thumbnails (using a shared SSIMULACRA 2 worker pool), full-display AVIF conversions, and processed JPEGs.
- **Parallel Tasks**: Favicon Generation & WFTDA Scraping run simultaneously.

### Phase 3 — Python Interop
- Serializes the state to `data/photos.json`.
- Runs **Face Detection** (`detectFaces.py`).
- Deserializes the updated state.

### Phase 4 — Data Modifiers & Chunking
- **Generate Zips**: Builds offline ZIP archives.
- **Chunk Data**: Splits `photos.json` into per-year JSON payloads with computed stats.

### Phase 5 — Sprites
- **Generate Recaps**: Composites pre-cropped highlight slices into sprite sheets.
- **Generate Scrubber**: Generates 72x48 lightbox scrubber sprites per album, utilizing the face-detection focus coordinates.

### Phase 6 — Process & Copy Photos
- Moves finalized image assets to the `dist/` directory for production.

### Phase 7 — Vite Build & External Outputs
- **Vite Build**
- **Parallel Tasks**: Generate Social Cards, Sitemap, and Share Pages run simultaneously.

## 🚢 Deployment (`npm run deploy`)

Deployment wraps up exactly what is needed into the staging directory and transfers it over SSH via `scp`. 

Edit your `.env` file to match your SFTP/SSH host. The deploy script intelligently prunes orphaned UI build artifacts inside `/assets` but heavily decreases deployment times by skipping media uploads.

### ⚠️ Important Media Upload Note

Because media generation produces massive directories, `npm run deploy` intentionally **skips** deploying the following folders to save bandwidth and guarantee lightning-fast code updates:

- `/photos` (original high-res JPEGs)
- `/avif` (full-display AVIFs)
- `/thumbnails` (AVIF thumbnails)
- `/recap` (sprite sheets)
- `/scrubber` (sprite sheets)
- `/zips` (offline zip archives)
- `/webp` (legacy webp fallback, if present)

To upload your media, use `npm run sync-media` to automatically synchronize new media assets over SSH without re-uploading existing files, or use an SFTP client (like **FileZilla** or **Cyberduck**) to drag those directories into your server's `public_html`.

## 🔧 Standalone Utilities

These scripts live in `scripts/` and can be run independently — they are **not** invoked by the main build pipeline. Run them with `npx tsx scripts/<name>.ts`.

---

### `renamePhotoFolders.ts`

Standardises subfolder names inside every event directory under `/photos` so the indexer can reliably find album and highlight photos.

**Rules applied automatically:**
- `Album` folders (contain "resize" or match `/^\d+\s*(final|resize)/i`) → renamed to `resized`
- `Highlight / IG` folders (start with "ig ", "ig adults", or contain "instagram") → renamed to `instagram`
- Multiple IG folders are **merged**: files moved into a single `instagram/` directory

**Skipped entirely:** `original`, `denoise`, `sharpen`, `rescued`, `process improvements`, `reddit`, `facebook`

```bash
npx tsx scripts/renamePhotoFolders.ts
```

> Run this **before** `npm run build` after adding a new shoot.

---

### `populateEventScores.ts`

Scans all event directories under `/photos` and creates a `score.json` stub in any event folder that doesn't already have one. This is a convenience scaffold — fill in the generated stubs with the actual scores before building.

**Generated `score.json` structure:**
```json
{ "team1Score": null, "team2Score": null }
```

```bash
npx tsx scripts/populateEventScores.ts
```

---

### `benchmark.ts`

Clears all build caches (`build/`, `dist/`, `.eslintcache`, Vite cache, face detection cache) and then runs the full `npm run build` pipeline from scratch, timing the total duration.

Results are appended to `.benchmark_results.json` in the project root, allowing you to track build performance over time. Build step telemetry (per-step timings) is also written to `data/build_stats.json` during each run.

```bash
npx tsx scripts/benchmark.ts
```

> Useful after major pipeline changes to verify regressions or improvements.

---

### `syncMedia.ts`

Synchronizes generated static media assets (`thumbnails/`, `avif/`, `scrubber/`, `recap/`, `zips/`) from your local `build/` directory directly to the remote server over SSH.

- **Smart Skip**: Catalogs all existing remote files in a single pass before transferring, skipping any files already present on the remote host.
- **Atomic Transfer**: Uses SSH/SCP streaming with automated permission verification (755 directories, 644 files).

```bash
npm run sync-media
# or
npx tsx scripts/syncMedia.ts
```

---

### `migrateToAvif.ts`

A transactional, zero-downtime storage migration utility designed to migrate legacy WebP galleries to next-gen AVIF on quota-constrained hosting environments (such as Bluehost's 20 GB limit).

#### Background & Architecture
- **Preserves Original JPEGs & Zips**: High-res download JPEGs in `photos/` and `.zip` archives in `zips/` are strictly preserved so visitors downloading originals receive universal `.jpg` files compatible with all print labs and social apps.
- **Album-by-Album Transactional Pipeline**: Processes one album at a time:
  1. Auto-encodes missing local AVIF assets on-the-fly via the multi-threaded SSIMULACRA 2 master encoder.
  2. Streams AVIF thumbnails and display assets to the remote server in a compressed tar pipe over SSH.
  3. Verifies remote extraction success.
  4. Immediately prunes the legacy WebP versions for that specific album on the server.
- **Zero Remote Storage Spike**: Because each album's AVIF assets are ~35% smaller than the legacy WebPs being replaced, available disk space increases after every single album, ensuring the server's hard quota is never breached.
- **Firewall & Rate-Limit Protection**: Employs a single-pass remote bootstrap query, pacing delays between albums, and automated 60s cooldown retries to prevent triggering shared-host SSH connection limits.

#### Command-Line Options
```bash
# Perform a dry-run audit (calculates sizes and tests remote connectivity without modifying files)
npx tsx scripts/migrateToAvif.ts --dry-run

# Migrate a specific year
npx tsx scripts/migrateToAvif.ts --year 2026

# Migrate a single album by slug or title filter
npx tsx scripts/migrateToAvif.ts --album "Sacramento Roller Derby"

# Run full migration across all albums
npx tsx scripts/migrateToAvif.ts
```
