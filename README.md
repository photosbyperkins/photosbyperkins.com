# Photography Portfolio Boilerplate

An incredibly fast, highly automated photography portfolio built for action photographers. Originally designed for [photosbyperkins.com](https://photosbyperkins.com), this open-source template transforms raw image directories into a blazingly fast, standalone PWA with automated EXIF extraction, face detect cropping, WebP processing, and ZIP archive generation.

## Features
- **Fully Automated Data Pipeline**: Drop images in folders, and the system automatically extracts metadata, resizes, compresses, and maps faces.
- **SSIMULACRA 2 Quality Optimization**: Thumbnails are optimized to the lowest WebP quality that meets a perceptual quality threshold, balancing file size and visual fidelity. Sprites (scrubber and recap) use a static, high-performance quality setting for faster builds.
- **Glassmorphic UI**: A stunning, modern, hardware-accelerated interface.
- **100% Client-Side**: Once built, it's a completely static site (JSON + Media).
- **Service Worker PWA**: Works offline, fully cache-enabled using Vite PWA.
- **Fuzzy Search Engine**: Instantly find teams with typo-tolerant search powered by `fuse.js`.
- **Favorites & Web Worker Zipping**: Star your favorite photos and batch download them entirely client-side using `jszip` in a background Web Worker!
- **Shareable Favorites URLs**: Share curated photo selections via lightweight, DEFLATE-compressed, database-free URLs.
- **WFTDA Stats Integration**: Automatically fetches global rankings and match histories from official WFTDA data if folder names match known bouts.
- **Automated Social Cards**: Generates beautifully branded OpenGraph images for every single album to ensure rich link previews across social media.
- **Lightbox Scrubber**: Drag-to-navigate sprite-sheet scrubber for fast album browsing within the lightbox.
- **Year Recap Sprites**: Animated recap banners composited from focus-cropped album highlights.

---

## 🛠 Prerequisites
1. **Node.js** (v18+)
2. **Python** (for OpenCV face detection logic in `scripts/detectFaces.py`)
   - Run `pip install opencv-python`
3. **Environment Config**: Copy `.env.example` to `.env` and fill out your variables!
4. **Favicon**: Drop an `icon.svg` into the root folder to completely customize the PWA icons, otherwise it defaults to a clean, generic camera.

## 📂 Organizing Your Photos
This project relies aggressively on folder structure! Place your unwatermarked, full-resolution JPEG files inside the `photos/` directory at the project root.

Expects structure exactly like this:
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
The build pipeline parses your folder names. If it sees `vs` or `versus`, it attempts to match it against **WFTDA stats**.
1. **Name Format**: `MM_DD Team One vs Team Two` allows the script to derive the Match Date and both competing teams.
2. **Local Scores**: Drop a `score.json` file inside that folder to explicitly set match scores on the UI:
   ```json
   {
     "team1Score": 320,
     "team2Score": 102
   }
   ```
3. **WFTDA Integration**: `npm run wftda` fetches global rankings and match histories from `stats.wftda.com`. If your folder's derived date and derived team names correspond to an actual WFTDA bout configured in `data/wftda-urls.json`, those official stats automatically populate on the frontend!
4. **Team Abbreviations**: You can automatically abbreviate long team names in the Frontend UI (e.g. "Sacramento Roller Derby" -> "SRD") by providing a JSON string dictionary in your `.env` file under the key `VITE_TEAM_ABBREVIATIONS`. Example: `VITE_TEAM_ABBREVIATIONS='{"Sacramento Roller Derby":"SRD"}'`.
5. **About Me Blurb**: To customize the text in the "Behind the Lens" popup, define `VITE_ABOUT_ME` in your `.env`. You can use `\n\n` to automatically create new paragraphs!
6. **Profile Photo**: To display your own picture in the "Behind the Lens" popup, simply drop a file named `profile_photo.jpg` into your `photos/` directory (making it available at `/photos/profile_photo.jpg` on your server).

## 🚀 Build Pipeline (`npm run build`)
Running `npm run build` is an intense, multi-phase pipeline orchestrated by `scripts/build.ts`. All build step scripts live in `scripts/pipeline/`.

### Phase 1 — Setup
1. **Clean** → **Format** → **TypeScript Check**

### Phase 2 — In-Memory Pipeline (Indexing & Master Encoding)
- **Index Photos**: `exifr` EXIF extraction into a global JSON state.
- **Master Encoder (`encodePhotos`)**: Generates thumbnails (using a shared SSIM worker pool), WebP conversions, and processed JPEGs.
- **Favicon Generation** & **WFTDA Scraping**: Run in parallel.

### Phase 3 — Python Interop
- Serializes the state to `data/photos.json`, runs **Face Detection** (`detectFaces.py`), and deserializes state.

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
- **Generate Social Cards**, **Sitemap**, and **Share Pages** run in parallel.

## 🚢 Deployment (`npm run deploy`)
Deployment wraps up exactly what is needed into the staging directory and transfers it over SSH via `scp`.
Edit your `.env` file to match your SFTP/SSH host. The deploy script intelligently prunes orphaned UI build artifacts inside `/assets` but heavily decreases deployment times by ignoring media!

**⚠️ Important Media Upload Note**: 
Because media generation produces massive directories, `npm run deploy` intentionally **skips** deploying the following folders to save bandwidth and guarantee lightning-fast code updates:
- `/photos`
- `/thumbnails`
- `/webp`
- `/zips`
- `/scrubber`
- `/recap`

**You must manually upload your finalized media!** Once you finish a sprint of editing and run `npm run build`, open an FTP client (like **FileZilla** or **Cyberduck**) and manually drag those directories from your local `dist/` into your server's `public_html` directory to sync them.
