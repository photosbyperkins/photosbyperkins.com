# Photos By Perkins - Deep Project Analysis

This document provides a comprehensive structural and feature analysis of the `photosbyperkins` web application, detailing the core systems currently in place and outlining strategic opportunities for future feature implementation.

---

## 🏗️ Core Architecture & Major Features

The application is a highly customized, performance-oriented React SPA built with Vite. Its architecture deviates from standard templates in order to maximize visual fidelity while strictly managing the browser's main thread and network pipeline.

### 1. Build-Time Static Data Orchestration
Instead of relying on a traditional backend database, the project uses a highly resilient static JSON generation pipeline.
*   **`chunkData.js`**: Analyzes the raw portfolio data and splits it into manageable, year-based chunks. This prevents the client from downloading a monolithic database and drastically reduces initial time-to-interactive.
*   **SEO Asset Generation**: `generateSharePages.js` and `generateSitemap.js` dynamically create static HTML endpoints for OpenGraph social sharing, bypassing the traditional SPA SEO limitations.

### 2. Algorithmic Recap Engine (`Recap.tsx`)
The hero component of the site is a dynamic, responsive photo grid.
*   **Mathematical Grid Packing**: The component utilizes a 31-column CSS grid natively, with mathematical spans that pack a 10-image cycle efficiently on desktop and a 5-image cycle on mobile.
*   **Main-Thread Protection**: The grid recalculation logic is strictly wrapped in `useMemo` and the resize event listener uses a bespoke `useDebounce` hook to prevent layout thrashing and preserve a 60fps scroll.
*   **AI Face Framing**: The `detectFaces.py` script preprocesses images to calculate facial centroids, ensuring that heavily cropped hero slices always focus on the subject.

### 3. High-Performance Lightbox (`Lightbox.tsx`)
The Lightbox is a custom-built, hardware-accelerated gallery viewer.
*   **Track Container Architecture**: Instead of mounting/unmounting images (which causes rendering jank), it uses a sliding `transform: translateX` track container that shifts full-viewport slides using the GPU.
*   **Smart Expanding Radius Preloader**: Instead of downloading the entire album or just the immediate next image, the lightbox fans out asynchronously, downloading nearest-neighbor images across the entire network queue.
*   **Ambient Glassmorphism**: Utilizes the user's current image, blown up with a 70px blur filter and saturated by 130%, acting as an ambient environmental backdrop.

### 4. Robust Global State
*   **Zustand**: Extracts state out of the React rendering tree for global UI overlays (like the Global Search Modal and Lightbox).

---

## 🚀 Opportunities for New Features

With the foundation perfectly optimized, the project is ripe for advanced feature integrations.

### 1. Native View Transitions API
**The Opportunity:** When a user clicks a photo in the grid, it currently "pops" open the Lightbox.
**The Implementation:** We can implement the native Browser `View Transitions API` (`document.startViewTransition`). By assigning matching `view-transition-name` tags to the thumbnail and the full-res lightbox image, the browser will natively animate the thumbnail seamlessly expanding into the lightbox across the screen.

### 2. Fuzzy Search Engine (Fuse.js)
**The Opportunity:** The current Global Search overlay filters the JSON arrays. 
**The Implementation:** By implementing `fuse.js` inside the `TeamFilter.tsx` or a new search hook, we can allow for typo-tolerant, multi-layered searching. Users could search "jammer 2024" or misspell team names and still find the exact portfolio events they are looking for.

### 3. Pointer-Hover Predictive Preloading
**The Opportunity:** The `ProgressiveImage` component currently waits for IntersectionObserver to load. 
**The Implementation:** Add a lightweight `onPointerEnter` event to the thumbnails. If a user's mouse hovers over an event or a recap slice for more than 200ms, immediately pre-fetch the full-resolution image or JSON data for that event, reducing perceived latency to zero when they finally click.

### 4. WebGL / Canvas Rendering for Recap
**The Opportunity:** The DOM is inherently slow at rendering massive amounts of images rapidly. 
**The Implementation:** Using `react-three-fiber` to render the `Recap` component inside a WebGL canvas. This would completely decouple the images from the DOM, allowing for wild, 60fps 3D parallax effects, infinite smooth scrolling, and curved cylindrical carousels.

### 5. Advanced Progressive Web App (PWA) Offline Caching
**The Opportunity:** The Vite PWA plugin is generating service workers, but it can be optimized for media.
**The Implementation:** Configure Workbox to use a `CacheFirst` strategy specifically for `/webp/` and `/thumb/` images with an LRU (Least Recently Used) expiration strategy. This would allow the user to browse previously viewed portfolio events perfectly while entirely offline, acting like a native mobile app.

### 6. Batch Download / Zip Worker
**The Opportunity:** Users can share individual photos using the `useCanShare` hook.
**The Implementation:** Add a feature using JSZip inside a Web Worker. A user can select multiple photos from an event and the Web Worker will fetch the blobs in the background, zip them, and trigger a single file download, entirely client-side.
