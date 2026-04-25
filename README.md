# Photography Portfolio Boilerplate

An incredibly fast, highly automated photography portfolio built for action photographers. Originally designed for [photosbyperkins.com](https://photosbyperkins.com), this open-source template transforms raw image directories into a blazingly fast, standalone PWA with automated EXIF extraction, face detect cropping, WebP processing, and ZIP archive generation.

## Features
- **Fully Automated Data Pipeline**: Drop images in folders, and the system automatically extracts metadata, resizes, compresses, and maps faces.
- **Glassmorphic UI**: A stunning, modern, hardware-accelerated interface.
- **100% Client-Side**: Once built, it's a completely static site (JSON + Media).
- **Service Worker PWA**: Works offline, fully cache-enabled using Vite PWA.

---

## 🛠 Prerequisites
1. **Node.js** (v18+)
2. **Python** (for OpenCV face detection logic in `scripts/detectFaces.py`)
   - Run `pip install opencv-python`
3. **Environment Config**: Copy `.env.example` to `.env` and fill out your variables!
4. **Favicon**: Drop an `icon.svg` into the root folder to completely customize the PWA icons, otherwise it defaults to a clean, generic camera.

## 📂 Organizing Your Photos
This project relies aggressively on folder structure! Place your unwatermarked, full-resolution JPEG files inside the `.photos/` directory (or symlink your drive to `public_html/photos`).

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
Running `npm run build` is an intense, multi-stage pipeline:
1. **`npm run thumbnails` & `npm run webp`**: Leverages `sharp` and `ssimulacra2` to generate massive amounts of optimized WebP variants and compressed thumbnails.
2. **`npm run index`**: Scans the photos using `exifr` and extracts EXIF metadata, lens focal lengths, and camera models into JSON structure.
3. **`npm run faces`**: Spawns Python scripts that use Haar Cascades to find faces within your images, setting smart responsive crop anchor points!
4. **`npm run zips`**: Generates full-resolution `.zip` bundles of every single album for easy client download.
5. **Vite Build**: The React frontend compiles into `/dist`.

## 🚢 Deployment (`npm run deploy`)
Deployment wraps up exactly what is needed into the staging directory and transfers it over SSH via `scp`.
Edit your `.env` file to match your SFTP/SSH host. The deploy script intelligently prunes orphaned UI build artifacts inside `/assets` but heavily decreases deployment times by ignoring media!

**⚠️ Important Media Upload Note**: 
Because media generation produces massive directories, `npm run deploy` intentionally **skips** deploying the following folders to save bandwidth and guarantee lightning-fast code updates:
- `/photos`
- `/thumbnails`
- `/webp`
- `/zips`

**You must manually upload your finalized media!** Once you finish a sprint of editing and run `npm run build`, open an FTP client (like **FileZilla** or **Cyberduck**) and manually drag those 4 directories from your local `public/` or root into your server's `public_html` directory to sync them.
