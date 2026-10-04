# Release Notes - v1.11.0

**Release Date:** October 4, 2026  
**Tag:** `v1.11.0`

---

## 🌟 Overview

Version 1.11.0 is a milestone release delivering major creative workflows and efficiency tools to the portfolio platform. This release introduces a comprehensive **Batch Selection & Actions system** for effortless multi-photo management and heavily upgrades the **Story Maker Studio** with multi-photo layouts (Duet & Triptych), interactive badge placement, expanded creative filters, custom frames, and refined mobile ergonomics.

---

## 📸 Story Maker Improvements

### 1. Multi-Photo Layout Harmonization (Solo, Duet & Triptych)
- **Duet Mode (2-Panel)**: Create split-screen story compositions (side-by-side or stacked) with independent pan, zoom, and framing controls per slot.
- **Triptych Mode (3-Panel Sequential Burst)**: Designed specifically for high-speed roller derby jammer runs, apex jumps, and action sequences. Includes chronological auto-sorting, sequential burst wizard, and aspect-derived default zoom.
- **Unified Controls**: Standardized zoom sliders, slot assignment selectors, and container scaling across Solo, Duet, and Triptych modes.
- **Aspect Ratio Resilience**: Resolved aspect ratio distortion when swapping frames or switching layout modes.

### 2. Intelligent Badge System & Collision Avoidance
- **Interactive Badge Placement**: Drag and reposition event attribution, scoreboard, and EXIF telemetry badges directly on the canvas.
- **Multi-Event Badge Suppression**: When photos from different bouts or dates are combined in multi-slot stories, ambiguous event badges are automatically suppressed while preserving attribution and scoreboard options.
- **Anti-Overlap Engine**: Dynamic badge placement algorithm prevents overlapping when switching between single-event and multi-event selections.
- **Streamlined Badges Tab**: Dedicated controls for toggle visibility, custom text, and placement presets.

### 3. Expanded Photo Filter Engine & Categorization
- **New Filter Presets**: Added **Selective Color** (red, yellow, blue isolation), **Analog Film** simulations (vintage grain, warm bleach bypass), and **Stylized Effects** (high-contrast noir, cyanotype, risograph).
- **Categorized Browser**: Filters organized into logical categories with an intuitive uniform grid layout.
- **Persisted Recent Filters Tab**: Fast one-tap access to your most frequently used filters across editing sessions.

### 4. Custom Decorative Story Frames & The "Punk" Remake
- **Vertical Scrolling Frame Selector**: Clean, responsive frame picker featuring an active "Recent Frames" tab.
- **Remade "Punk" Frame (`derby-punk`)**: Completely redesigned with an authentic 1970s DIY zine and roller derby aesthetic:
  - Coarse Xerox photocopy halftone paper textures (`#punk-halftone`).
  - Hand-cut newspaper ransom-note cutout collage spelling `P - U - N - K`.
  - Cascading black and crimson spray paint drip streams with falling paint beads.
  - Roller derby fishnet tights diamond mesh panel (`#punk-fishnet`).
  - Stenciled derby bout tally marks in hazard yellow and crimson (`|||| /`).
  - Urban cracked concrete fissure along the left margin.
  - Torn hazard caution warning tape strip (`#punk-caution`).
  - Canvas battle patch anchored by a 1-inch Mohawk Skull pinback button badge.
- **Dynamic Palette Overrides**: Custom color pickers dynamically adjust frame accent highlights while preserving zine contrast.

### 5. Mobile Story Studio Redesign & Export Fidelity
- **Mobile Ergonomics**: Redesigned bottom dock menu with fixed-height bottom tab sheets, intuitive touch gestures for pan/zoom, and overflow protection preventing cropper hints from colliding on small screens.
- **Export Parity**: Hardened Canvas 2D export pipeline ensuring 100% visual parity with DOM previews, resolving an issue where iOS WebKit dropped decorative SVG overlays and CSS filters during canvas rendering.

---

## 🗂️ Introduction of Batch Actions

### 1. Universal Multi-Photo Selection
- **Batch Selection Mode**: Enter selection mode via the floating dock, keyboard shortcut (`B`), or direct photo interaction.
- **Range & Individual Selection**: Select multiple photos across full album grids, curated highlights, and year recap slices with tap, click, or Shift+click range selection.
- **Select All / Deselect All**: One-click selection toggling with live count telemetry.
- **Top-Centered Selection Badges**: Refined badge positioning ensuring clean visibility across varying thumbnail aspect ratios and recap strips.

### 2. Floating Batch Action Bar
- **Batch Download (Client-Side ZIP)**: Packaged entirely in-browser using `fflate` in a dedicated Web Worker with streaming chunking and graceful desktop fallback.
- **Batch Favorite / Unfavorite**: Toggle favorite status across dozens of photos at once with unified red heart styling.
- **Direct Launch into Story Maker**: Send selected photos directly into Story Maker, automatically populating Solo, Duet, or Triptych slots with interactive slot switcher controls.
- **Batch Share**: Native `navigator.share` integration on mobile/supported browsers, generating shareable lightweight DEFLATE-compressed URLs.

---

## ⚡ Performance, UX & Infrastructure

- **In-House SVG Icon Suite**: Replaced external dependencies with an authentic, handcrafted in-house vector icon library refined across 5 design passes.
- **Spring Pill Animations**: Hardware-accelerated sliding pill indicators for smooth transitions across tabs, mode toggles, and modal headers.
- **Persistent Face Cache Hydration**: Build pipeline automatically hydrates facial crop coordinates from `data/.faces_cache.json`, accelerating pipeline runs and guaranteeing consistent thumbnail centering.
- **Month Track Elevator Polish**: Responsive vertical month elevator with immediate click feedback and viewport auto-centering.
- **Deployment & Cache Hardening**: Implemented `NetworkFirst` service worker navigation caching, Cloudflare `no-store` headers on HTML, and automatic cache bypass checks on `visibilitychange` to eliminate stale post-deployment states.
- **Codebase Resilience**: Comprehensive security, concurrency, portaling, and type-safety audits across all components and custom hooks.

---

## 🧪 Quality & Test Verification

- **TypeScript Typecheck**: 0 errors across client and pipeline scripts (`tsc --noEmit`).
- **Unit & Integration Suite**: 67 test files, **657 tests passing** (Vitest).
- **Production Client Build**: Tested and verified clean bundle compilation (`vite build`).
