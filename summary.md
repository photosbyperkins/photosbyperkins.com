# Animated Story (MP4) — Feature Summary

Branch: `feature/animated-story` · Commits: `bec0208` (MP4 export + presets + preview) → `dbe6a94` (Motion tab switch, floating transport, frame motion engine) → `552c13a` (layered motion for all 35 frames) → Polish iteration → `b38b7b8` Simplification (continuous frame-only animation, eliminated Motion tab and transport, dual-function button) → Story Maker redesign (unified layouts, new Frames/Filters browser, integrated export button).

Story Maker can export a **1080×1920, 30 fps H.264 MP4** (10 s) of the user's story design, in addition to the still JPEG. Decorative story frames animate with rich multi-layer motion loops while the user's photo crop remains static and fully interactive. The **last video frame matches the still design exactly**.

---

## User experience
- **One studio, three layouts** (chosen by window shape, [useStoryLayoutMode.ts](src/hooks/useStoryLayoutMode.ts)):
  - `side` — landscape windows (desktop, landscape phones): preview left, panel right.
  - `stacked` — tall portrait windows (portrait **and** ≥600px wide **and** ≥820px tall, e.g. tablets): preview on top, panel permanently open beneath.
  - `sheet` — phones / short portrait windows: collapsible bottom sheet. Collapsed it shows only the tab bar + Download button. Tap a tab to open, tap the open tab / backdrop / Escape / drag the handle down to close. When open, the preview shrinks to sit fully above the sheet.
  - The width ≥600px condition exists because modern phones report 850–930px tall viewports.
- **Same panel everywhere** ([StoryStudioPanel.tsx](src/components/sections/Portfolio/storyStudio/StoryStudioPanel.tsx)): tab bar header (Layout, Filters, Frames, Badges) → tab content → Download button footer.
- **Frames & Filters tabs** share a browser ([storyTabs/shared/](src/components/sections/Portfolio/storyTabs/shared/)):
  - No category chips. The thumbnail list is split into sections ([thumbSections.ts](src/components/sections/Portfolio/storyTabs/shared/thumbSections.ts)): **None** (untitled, first) → **Recent** (up to 4 most recently exported, only once there is history) → one titled section per category.
  - Options row: Frames has `[Tint ●]` (popover with presets + custom colour; hidden when frame is None) and an `Animate [Off | On]` segmented toggle matching the Badges tab's Show/Hide toggles (disabled with a reason when no frame is selected or MP4 isn't supported). Filters has the strength slider.
  - Thumbnails show the current photo (cropped around its focus point). When the pointer is fine and the panel is ≥360px wide, sections stack as grids with a hairline header. Otherwise there is one horizontal snap filmstrip of large 9:16 thumbs where each section title sticks to the left edge while its thumbs scroll past. The selected thumb is highlighted (no header name badge).
- **Continuous live animation**:
  - No play / pause / stop transport overlays.
  - Frame animations play continuously in a loop directly inside the editor canvas whenever a frame is selected and Animate is on.
  - **Full live interactivity**: the photo cropper remains fully interactive (drag pan, zoom, pinch, switch layouts, tap badges) with zero interference while the frame animation loops on top.
  - **Calm, flash-free preview** ([StoryFrameOverlay.tsx](src/components/sections/Portfolio/storyFrames/StoryFrameOverlay.tsx)):
    - Assets reload only when the frame's artwork actually changes (a context content key, not object identity). Panning no longer restarts the loop.
    - The previous artwork stays up until the new one is ready.
    - One clock for the overlay's lifetime.
    - At-rest moments draw the static frame instead of a blank canvas.
    - The live loop skips entrance intros; they still play in the exported video.
    - Sampled at the default intensity (0.6).
  - **Softer ambients** ([sample.ts](src/utils/story/frameMotion/sample.ts), affects export too):
    - `flicker` is a smooth dim plus glow swell instead of a 15 fps strobe.
    - `glitch` defaults to one burst at half amount, with smaller slice jitter.
    - `blink` is a smooth dip on a 1.6 s period instead of a hard on/off.
- **Dual-function export button** ([StoryExportButton.tsx](src/components/sections/Portfolio/storyStudio/StoryExportButton.tsx)):
  - Labeled `"Download Story Card"` (`"Share Story Card"` where Web Share is available).
  - Animate on: renders a 10-second MP4. The button itself becomes the progress bar (`Rendering 45%`) with an integrated ✕ segment that cancels.
  - Animate off (or no frame): downloads the still JPEG story card.
  - Fixed size in every state: labels crossfade and the ✕ slot is always reserved (invisible and inert when idle), so nothing shifts.
- **Fixed natural timing**:
  - Streamlined to 10 seconds fixed export duration, 30 fps, 100% natural intensity (no redundant sliders).
- **Intro gating**: 30 frames exist from frame 0 and loop seamlessly; 5 stylized frames (`electric-lightning`, `claw-marks`, `vhs-glitch`, `derby-punk`, `ascii-matrix`) play entrance intros.
- **Camera frame**: subtle blinking low-battery indicator (1 red cell) in place of full HUD drifts.
- **Badges**: scoreboard and attribution render statically without distracting transitions.
- **Early capability detection** ([storyVideoSupport.ts](src/utils/story/storyVideoSupport.ts)) is warmed up on idle from the portfolio, so browser capability is ready on first paint in Story Maker.

### Known trade-offs / ideas for next iterations
- The cropper's drag hint is hidden inside the new preview card.
- Thumbnails crop around the photo's focus point, not the user's live pan position.
- Tapping the preview while the sheet is open closes the sheet (the backdrop catches it) rather than panning.
- A recent item appears twice (in Recent and in its category); both copies show as selected.
- The selected-category state in `useStoryStudio` / `storySlice` is now unused by the UI (cleanup follow-up).
- Unrelated e2e bug: `capture-all-resolutions` step 20 (`/portfolio/favorites` after accepting shared favorites) never shows grid items.

---

## Architecture & pipeline
| Stage | File | Notes |
|---|---|---|
| Live Editor Overlay | [StoryFrameOverlay.tsx](src/components/sections/Portfolio/storyFrames/StoryFrameOverlay.tsx) | Renders `<svg>` when static. When `animated: true`, rasterizes frame motion assets once and runs a smooth `requestAnimationFrame` loop on `<canvas className="story-frame-overlay">`. `pointer-events: none` allows all mouse/touch events through to the cropper underneath. Visibility listener automatically pauses rAF when tab is hidden. |
| Timeline (pure) | [storyAnimation.ts](src/utils/story/storyAnimation.ts) | `sampleStoryTimeline(spec, config, t, ctx)` → `StoryAnimState`; returns `FINAL_ANIM_STATE` at `t ≥ D`. Fixed preset `'static-hold'` locks photo crop to user design while animating the frame. No DOM, no framer-motion. |
| Assets (once) | [storyAssets.ts](src/utils/story/storyAssets.ts) | Fonts, baked filters, frosted blur, frame rasterization (whole + layers). |
| Draw (per frame) | [storyRender.ts](src/utils/story/storyRender.ts), [storyDraw.ts](src/utils/story/storyDraw.ts) | `drawStoryScene` applies the anim state over the static design. Synchronous and cheap. |
| Frame motion draw | [storyFrameMotionDraw.ts](src/utils/story/storyFrameMotionDraw.ts) | Composites pre-rasterized layers with transforms, reveals, glitch slices, banded scroll, shimmer and additive glow. **No per-frame SVG rasterization.** |
| Encode | [storyVideo.ts](src/utils/story/storyVideo.ts) | WebCodecs H.264 via Mediabunny (lazy-loaded, faster than real time). Fallback: `captureStream` + `MediaRecorder`, MP4 only (IG rejects WebM). |
| Export hook | [useStoryExport.ts](src/hooks/useStoryExport.ts) | Manages dual-function export: MP4 when `isFrameAnimated` + frame active, JPEG otherwise. |
| Studio state | [useStoryStudio.ts](src/hooks/useStoryStudio.ts), [storySlice.ts](src/store/slices/storySlice.ts) | Exposes `isFrameAnimated: boolean` and `setIsFrameAnimated`. Persists in store. |

---

## Frame motion system
All **35 decorative frames are layered** (enforced by tests). Code: [`src/utils/story/frameMotion/`](src/utils/story/frameMotion/).

- **Frames** (`storyFrames/frames/*.ts(x)`) use `defineLayeredFrame(id, label, category, vibe, palette, generateLayers)` ([helper.tsx](src/components/sections/Portfolio/storyFrames/frames/helper.tsx)).
  - `generateLayers` returns `{ defs?, layers: [{ id, svg, pivot?, clip? }] }` in bottom-to-top draw order.
  - The still frame is the joined layers (`joinFrameLayers`), so still and animated versions cannot drift apart.
  - `sac-bear` is async (its bear paths are fetched); has custom `getLayers`.
- **Recipes** (`frameMotion/recipes/{action,ascii,cosmic,derby,retro,tech}.ts`): `{ whole, layers: { [layerId]: { entrance?, ambient?[] } } }`.
- **Entrances**: `fade`, `slide`, `pop`, `wipe`, `type`, `slash`, `split`, `flicker-on`, `glitch-in`.
- **Ambient loops**: `pulse`, `twinkle`, `glitch`, `shimmer`, `blink`, `flicker`, `drift`, `scroll`, `spin`.
- **Sampler** ([sample.ts](src/utils/story/frameMotion/sample.ts)): pure, deterministic and seekable.
  - Loop periods are fitted to whole loops between ambient start and `D`, so everything returns to rest at loop boundary.

---

## Verification & quality
- **Typecheck**: `npm.cmd run typecheck` passes with 0 errors across main and scripts projects.
- **Linter**: `npm.cmd run lint` passes with 0 errors and 0 warnings.
- **Unit & Integration Tests**: `npm.cmd run test`: all **106 test files** (966 tests) pass. Occasional cross-file flakes (Lightbox, useSlideZoom, AnimatedNumber, formatters) also occur on the baseline and pass in isolation.
- **Production Build**: `npm.cmd run build:client` succeeds cleanly with all chunks and PWA service worker generated.
- **E2E Tests**:
  - [e2e/story-export.spec.ts](e2e/story-export.spec.ts) (24 tests) covers side / stacked / sheet layouts, sections (including Recent appearing after a download), tint, the export button and cancel.
  - [e2e/capture-animated-story.spec.ts](e2e/capture-animated-story.spec.ts) captures design-review screenshots per layout, including a scrolled filmstrip with sticky section headers.
