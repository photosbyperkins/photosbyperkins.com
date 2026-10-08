# Photography Portfolio Boilerplate

An incredibly fast, highly automated photography portfolio built for action photographers. Originally designed for [photosbyperkins.com](https://photosbyperkins.com), this open-source template transforms raw image directories into a blazingly fast, standalone PWA with automated EXIF extraction, face detect cropping, next-gen AVIF processing, and ZIP archive generation.

## Features

- **100% Client-Side**: Once built, it's a completely static site (JSON + Media).
- **Fully Automated Data Pipeline**: Drop images in folders, and the system automatically extracts metadata, resizes, compresses, and maps faces.
- **Story Maker Studio (9:16 Social Export)**: Full-featured client-side canvas studio creating high-resolution 1080×1920 social cards for Instagram Stories and TikTok. Features 9:16 Crop Mode, Padded Canvas, 3-panel Sequential Burst / Triptych mode (with arbitrary aspect ratio support and dynamic zoom), 8 non-destructive photo filters, 27 handcrafted frames with dynamic badge avoidance, live EXIF telemetry viewfinder, and native Web Share.
- **Multi-Photo Selection & Batch Actions**: Select multiple photos across an album grid with tap, click, or Shift+click range selection. Batch favorite, batch download customized ZIP archives via Web Worker, generate shareable DEFLATE URLs, or launch directly into Story Maker (in single-photo or 3-panel triptych mode with interactive slot assignment).
- **AVIF Next-Gen Format & SSIMULACRA 2 Optimization**: Gallery thumbnails and full-display lightbox photos are encoded in AVIF calibrated via SSIMULACRA 2 ($\ge 78$ visual score), saving ~35% storage and bandwidth over legacy WebP while preserving pristine image fidelity. Original full-resolution downloads and album ZIP archives are preserved as standard `.jpg` and `.zip` for universal client compatibility.
- **Persistent Face Tracking & Focal Centering**: Build pipeline automatically hydrates focal coordinates (`focusX`, `focusY`, `faces`) across indexing runs from `data/.faces_cache.json`, ensuring responsive CSS `object-position` thumbnail framing and multi-person story presets are preserved.
- **Zero-Downtime Migration & Transparent Fallback**: Apache rewrite rules transparently map any cached or external `.webp` requests to `.avif`, ensuring zero 404s.
- **Service Worker PWA**: Works offline, fully cache-enabled using Vite PWA.
- **Glassmorphic UI**: A stunning, modern, hardware-accelerated interface with rigid, touch-friendly ergonomics.
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
2. **Python 3.10+** (for subject detection in `scripts/detectFaces.py`)
   - Run `pip install -r scripts/requirements.txt` (uses ONNX Runtime with DirectML on Windows for GPU inference; models are downloaded and checksum-verified into `data/models/` on first run)
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
- **WFTDA Integration**: Automatically fetches global rankings and match histories from `stats.wftda.com` during the build pipeline. If your folder's derived date and derived team names correspond to an actual WFTDA bout configured in `data/wftda-urls.json`, those official stats automatically populate on the frontend!
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
- **Index Photos (`generatePhotoIndex`)**: `exifr` EXIF extraction into a global JSON state. Automatically hydrates existing focal coordinates (`focusX`, `focusY`, `faces`) and quality scores directly from `data/.faces_cache.json`, preventing standalone indexing runs from wiping out face centering data.
- **Master Encoder (`encodePhotos`)**: Generates AVIF thumbnails (using a shared SSIMULACRA 2 worker pool), full-display AVIF conversions, and processed JPEGs with IPTC/XMP copyright tags.
- **Parallel Tasks**: Favicon Generation & WFTDA Scraping run simultaneously.

### Phase 3 — Python Interop
- Serializes the state to `data/photos.json`.
- Runs **Subject Detection** (`detectFaces.py`): tiled SCRFD-10G face detection plus YOLOX-L person detection (ONNX Runtime, GPU via DirectML when available; OpenCV YuNet fallback), ranked by sharpness, size and confidence so the primary subject comes first. Photos without a usable face fall back to the lead person's head region, then to a sharpness-weighted saliency map. Writes `focusX`/`focusY`/`focusSource`, `faces` and `subjects` boxes, and caches results (keyed by thumbnail size + mtime) to `data/.faces_cache.json`.
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

These scripts live in `scripts/` and can be run independently — they are **not** invoked by the main build pipeline. Run them with `npm run <script>` or `npx tsx scripts/<name>.ts`.

---

### `populateEventScores.ts`

Scans all event directories under `/photos` and creates a `score.json` stub in any event folder containing `"vs"` that doesn't already have one. This is a convenience scaffold — fill in the generated stubs with the actual scores before building.

**Generated `score.json` structure:**
```json
{ "team1Score": null, "team2Score": null }
```

```bash
npm run populate-scores
# or
npx tsx scripts/populateEventScores.ts
```

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

### `fixPermissions.ts`

SSH recovery utility to reset and normalize remote server file permissions on Bluehost (`chmod 755` on directories, `chmod 644` on files).

```bash
npm run fix-permissions
# or
npx tsx scripts/fixPermissions.ts
```


