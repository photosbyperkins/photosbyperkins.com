# Photography Portfolio Boilerplate

An incredibly fast, highly automated photography portfolio built for action photographers. Originally designed for [photosbyperkins.com](https://photosbyperkins.com), this open-source template transforms raw image directories into a blazingly fast, standalone PWA with automated EXIF extraction, face detect cropping, WebP processing, and ZIP archive generation.

## Features
- **Fully Automated Data Pipeline**: Drop images in folders, and the system automatically extracts metadata, resizes, compresses, and maps faces.
- **SSIMULACRA 2 Quality Optimization**: Every thumbnail, scrubber sprite, and recap sprite is optimized to the lowest WebP quality that meets a perceptual quality threshold, balancing file size and visual fidelity.
- **Glassmorphic UI**: A stunning, modern, hardware-accelerated interface.
- **100% Client-Side**: Once built, it's a completely static site (JSON + Media).
- **Service Worker PWA**: Works offline, fully cache-enabled using Vite PWA.
- **Fuzzy Search Engine**: Instantly find teams with typo-tolerant search powered by `fuse.js`.
- **Favorites & Web Worker Zipping**: Star your favorite photos and batch download them entirely client-side using `jszip` in a background Web Worker!
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
Running `npm run build` is an intense, multi-phase pipeline orchestrated by `scripts/build.js`. All build step scripts live in `scripts/pipeline/`.

### Phase 1 — Sequential Setup
1. **Clean** → **Format** → **TypeScript Check** → **Index Photos** (`exifr` EXIF extraction into JSON)

### Phase 2 — Parallel Image Generation (shared SSIM pool)
Scripts that need SSIMULACRA 2 quality optimization (thumbnails, scrubber sprites) run **in the same process**, sharing a single worker pool. Non-SSIM steps run as separate parallel processes.

| In-Process (shared pool)       | Separate Processes         |
|-------------------------------|---------------------------|
| `generateThumbnails.js`       | `generateWebp.js`         |
| `generateScrubberThumbs.js`   | `generateFavicon.js`      |
|                               | `scrapeWftda.js`          |
|                               | `detectFaces.py`          |

### Phase 3 — Data Pipeline
- **Chunk Data**: Splits `photos.json` into per-year JSON payloads with computed stats

### Phase 4 — Recap Sprites (shared SSIM pool)
- **Generate Recaps**: Composites recap slices into SSIM-optimized sprite sheets

### Phase 5 — Parallel Build
- **Process & Copy Photos** and **Vite Build** run simultaneously (both write to non-overlapping subdirectories of `dist/`)

### Phase 6 — Post-Build
- **Sitemap** → **Share Pages**

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
