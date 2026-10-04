# Architecture Inventory & 14 Innovation Proposals

## 1. Executive Summary & Inventory
This document provides a comprehensive inventory of the architecture and features of **photosbyperkins.com** and presents 14 concrete, architected ideas to elevate user experience, visual storytelling, performance, and creative presentation.

---

## 2. Architectural Blueprint & Current Feature Set

```
├── Client Application (Vite 8 + React 19 + TypeScript 6 + Framer Motion)
│   ├── Routing & URL State
│   │   ├── Year-based navigation (/2026, /2025, ..., /2016)
│   │   ├── Team archives (/team/<slug> mapped via WFTDA & index)
│   │   ├── Gear archives (/gear/<camera|lens-id>)
│   │   ├── Favorites state (Local & base64 URL compression share)
│   │   └── Direct deep-linking to photos and burst sequences
│   │
│   ├── Core Visualization Systems
│   │   ├── Lightbox (Virtual scrubbing, multi-panel comparison, gestures, pan/zoom)
│   │   ├── StoryStudio / Story Export Modal (1:1, 4:5, 9:16 canvas generation)
│   │   │   ├── Solo frame export with smart focal-point centering
│   │   │   ├── Duet (2-panel) layout with interactive boundary divider
│   │   │   ├── Triptych (3-panel) story layout with burst sequencing
│   │   │   ├── Dynamic EXIF & match score telemetry overlay
│   │   │   └── Watermark and branding customization
│   │   ├── Recap System (Sprite-sheet scrub reels with canvas rendering)
│   │   ├── Virtualized Grid Engine (Windowed photo rendering for large events)
│   │   ├── Global Search Engine (Fuse.js indexing across teams, events, dates)
│   │   └── Floating Action Dock (Search and Batch Selection toggle)
│   │
│   ├── Client Processing & Off-Thread Workers
│   │   ├── Web Worker ZIP Compression (fflate in-memory streaming with AVIF/WebP fallbacks)
│   │   ├── Canvas export engine (OffscreenCanvas/2D context rendering)
│   │   └── PWA & Offline Service Worker (Cache-first asset strategy)
│   │
│   └── Backend Build & Pre-computation Pipeline (Node.js + TSX + Sharp + ExifR)
│       ├── Image optimization (AVIF + WebP generation at 600px/1800px)
│       ├── Facial detection & focal point computation
│       ├── WFTDA match scores & team taxonomy extraction
│       ├── Sprite sheet aggregation for timeline scrubbers
│       └── Year chunking & metadata delta sync via rsync/SSH
```

---

## 3. 14 High-Impact Ideas & Architectural Proposals

### 1. Roller Derby Jam Timeline & Penalty Tracker Overlay
- **Concept**: Synchronize photo metadata timestamps with game track intervals or jam cycles.
- **Implementation**: Display a miniature interactive timeline track under games showing jam numbers, team points scored during each segment, and jump directly to key game moments.

### 2. Side-by-Side Action Synchronizer (Split-View Compare)
- **Concept**: Allow users to compare 2 or 3 photos side-by-side with synchronized zoom and pan (ideal for comparing consecutive frames in a burst or different photographer angles of the same jam).
- **Implementation**: Double-viewport Canvas with linked transform matrices (panX, panY, scale) and synchronized pointer coordinates.

### 3. Smart Color Palette & Team Jersey Dynamic Theme Engine
- **Concept**: Extract dominant event colors (e.g. green/gold for Maulstars, blue/white for High Rollers) from images or match metadata and softly tint UI accents, bokeh highlights, or story borders dynamically.
- **Implementation**: Extract vibrant swatches during pipeline build, injected into `data/years/*.json`, driving CSS custom properties `--color-event-primary` and `--color-event-secondary`.

### 4. Interactive Roster / Skater Tagging & Face Recognition Explorer
- **Concept**: Group recurring skaters or roster numbers across seasons using facial embedding clusters or jersey number OCR.
- **Implementation**: Build on top of the existing `scripts/detectFaces.py` with an open-source face clustering model (like InsightFace or face-api.js) to allow clicking a skater to view all their photos across years.

### 5. Animated Story GIF / MP4 Burst Reel Generator
- **Concept**: Currently, Story Studio exports static png/jpeg cards for Instagram stories. Add an option to export high-speed burst sequences as animated GIFs or short WebM/MP4 reels.
- **Implementation**: Use `@ffmpeg/ffmpeg` (WebAssembly) or lightweight canvas frame-stitching to compile 3-8 burst frames with smooth loop and text overlays directly in the browser.

### 6. Interactive Mini-Map & Venue Tour
- **Concept**: Visual representation of the venues where games were held (e.g. The Hall at NorCal Ice, Royer Park, etc.) with photo pins and venue history.
- **Implementation**: Leaflet or MapLibre integration displaying geotagged events with thumbnail cards.

### 7. Sound Effect & Trackside Ambience Audio Layer
- **Concept**: Optional subtle audio toggle with authentic roller derby track audio: whistle blows, skate wheels on hardwood, crowd cheers, jammer buzzer.
- **Implementation**: Web Audio API with spatial panning or low-pass filtered background track when navigating games.

### 8. Focal-Point Heatmap & Composition Overlay in Lightbox
- **Concept**: For photography enthusiasts and portfolio viewers, toggle an "Exif & Composition View" showing the rule-of-thirds grid, golden spiral, calculated focus point coordinates, and face bounding boxes overlaid on the photo.
- **Implementation**: SVG overlay layer over `LightboxSlide` referencing existing `focusX`, `focusY`, and `faces` coordinates from metadata.

### 9. Custom Client Album Proofing & Print Request Basket
- **Concept**: Allow visiting skaters or parents to curate a private proofing gallery, write notes/crop instructions on specific photos, and generate an exportable inquiry sheet or print order.
- **Implementation**: Extend the existing Favorites store with a "Client Proofing Mode" allowing notes per image and exporting a formatted PDF/PDF-Kit proof sheet.

### 10. AI-Assisted Action Caption Generator
- **Concept**: Automatically generate high-energy editorial captions for social media sharing using game score and action context (e.g., "Sacramento Maulstars jammer pushes past the Rose City defense in a tight 196-131 battle!").
- **Implementation**: Template-driven dynamic caption engine combining `localScore`, `eventName`, `wftdaMatch`, and camera focal length metadata into ready-to-copy social post text.

### 11. 3D Tilt / Parallax Card Effect on Featured Highlights
- **Concept**: Subtle 3D gyroscope/mouse parallax tilt effect on highlight cards in desktop and mobile view.
- **Implementation**: `framer-motion` `useMotionValue` and `useTransform` hooked to pointer movement, applying CSS `perspective(1000px) rotateX(...) rotateY(...)`.

### 12. Smart Bandwidth Adaptor & Network-Aware Image Delivery
- **Concept**: Dynamically switch thumbnail and display resolutions based on `navigator.connection.effectiveType` ('4g', '3g', '2g', 'slow-2g') or `saveData` header.
- **Implementation**: Hook `useNetworkQuality` that chooses between 600px AVIF, 1200px AVIF, or ultra-compact WebP placeholders.

### 13. Year-in-Review Wrapped Story
- **Concept**: A Spotify-Wrapped style year recap presentation summarizing the user's favorite photos, total games covered, fastest shutter speeds, most covered teams, and favorite lenses of the season.
- **Implementation**: Full-screen modal stepper using Framer Motion with animated count-up numbers and seasonal hero photos.

### 14. PWA Background Sync for Offline Favorite Downloads
- **Concept**: When downloading high-resolution batches on unreliable connections, queue downloads in the Background Fetch / Sync API to resume seamlessly when connection is restored.
- **Implementation**: Service Worker `backgroundFetch` registration triggered by `startZipping` when supported by Chromium.
