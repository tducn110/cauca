# Portrait-first Fishing Dock and WebP Asset Migration Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn the active Câu Cá dock into one coherent portrait-phone game that fills the safe visual viewport, has a shared responsive geometry contract for canvas, HUD, overlays, and input, and ships no PNG/JPEG/GIF raster from public.

**Architecture:** FishingDockScreen owns one portrait game stage and the only viewport/safe-area lifecycle. dockLayout.ts becomes the sole geometry producer. Pixi world rendering, DOM HUD, dialogs, and pointer mapping consume that output rather than independently using media queries, viewport units, fixed fullscreen positioning, or backing-canvas pixels. Portrait phones fill their visual safe viewport; desktop hosts a centered contained portrait stage; short phone landscape shows a non-interactive rotate-to-portrait fallback rather than a second landscape design.

**Tech Stack:** React 18, TypeScript, Vite 6, PixiJS 8.7, Vitest, CSS, and the existing ffmpeg executable used only during asset migration.

---

## Scope and locked decisions

- The four supplied Tiny Fishing screenshots are visual/interaction references only. Do not copy its artwork, text, game files, or code. Preserve Câu Cá village-fishing identity and its existing economy.
- Portrait is the product contract. Design reference is 390×844. Acceptance covers 320×568, 360×800, 390×844, 393×852, and 430×932, each with safe-area variants.
- The persistent dock composition is: compact safe top bar; dock/sky to waterline; primary cast control; three upgrade cards in the bottom safe band. When descending or ascending, the dock HUD disappears and only contextual underwater UI remains.
- The active product path is HomeScreen → FishingDockScreen → FishingDockCanvas. GameContainer → BatCaAoLang → GameCanvas has no caller and is legacy; do not build a second responsive system for it.
- Do not alter game rules, save keys, hook geometry, upgrade prices, audio policy, ads, or Wink bridge behavior. This work owns presentation, stage geometry, asset paths, and pointer projection.
- Do not stretch the existing 1448×1086 landscape background into a tall painting. Ship a Câu Cá-owned portrait art composition with declared protected zones and a waterline.

## Source evidence

| File | Source evidence | Planning consequence |
|---|---|---|
| src/app/components/bat-ca/dock/FishingDockScreen.tsx | Measures its full fixed screen, creates DockViewportLayout, and renders canvas plus dock/underwater/result/modal states. | It is the correct and only stage/resize owner after the refactor. |
| src/app/components/bat-ca/dock/dockLayout.ts | Starts from a 1280×720 design and branches compact, microLandscape, and wide; wide has a centered column and banks. | The public layout API is landscape-first and must become a portrait-stage contract. |
| src/app/components/bat-ca/dock/runtime/sceneLayout.ts | Scales the 1448×1086 background to fill viewport and renders wide-only banks/masks. | It must use a native portrait texture and shared stage fields. |
| fishing-dock.css, fishing-dock-screen.css, UnderwaterHud.tsx | HUD uses own viewport/media-query geometry, dialogs use mixed Tailwind sizing, UnderwaterHud is fixed inset 0. | Child components currently create competing coordinate systems. |
| runtime/createDockRuntime.ts | Pointer X uses app.canvas.width divided by client bounds while gameplay anchors are layout/CSS coordinates. | Add DPR projection tests and map to logical stage coordinates. |
| public and asset registries | All 28 tracked rasters are PNG; no WebP exists. Asset URLs are in fishingAnimation.ts, hooks-data.ts, DockHud.tsx, and two animation JSON files. | Conversion has to be complete, alpha-safe, and atomic; copies alone are not enough. |
| GameApp.tsx, useAppShell.ts, GameContainer.tsx | App renders loading, leaderboard, and home; legacy gameplay/end-game state has no rendered route. | Remove the dead presentation tree only after a fresh caller search. |

## Target ownership flow

    Browser visual viewport + safe insets
                  ↓
    FishingDockScreen measures one portrait stage
                  ↓
    createDockLayout returns named stage geometry
      ├── Pixi scene, renderer resize, and pointer projection
      ├── Dock HUD, cast hit target, and upgrade row
      ├── Underwater contextual HUD
      └── Modal bounds, backdrop, header/footer, scroll body

The pure layout result must name the top bar, waterline, cast-control rect, upgrade row, channel, underwater HUD anchors, and modal bounds. It may have one explicit shortPortrait fit policy. No consumer may create another orientation-specific position.

## Implementation sequence

### Task 1: Publish the portrait UI contract and write failing geometry tests

**Objective:** Lock measurable visual rules before changing CSS or Pixi.

**Files:**

- Create: doc/architecture_design/portrait-dock-ui-contract.md
- Modify: src/app/components/bat-ca/dock/dockLayout.test.ts

**Steps:**

1. Document active versus legacy paths and that screenshots are reference only.
2. Define minimums: all icon targets are at least 44×44 CSS px; cast hit area at least 72×72; boat hull stays at waterline; cast control cannot overlap upgrades; all three price buttons fit bottom safe area; underwater controls stay inside stage; modal header/footer remain reachable.
3. Add exact layout cases for 320×568, 360×800, 390×844, 393×852, 430×932, short landscape 844×390, desktop contained stage, and safe insets top 47/bottom 34.
4. Run npm test -- dockLayout.test.ts. New stage assertions should fail before the layout rewrite and pass only when all geometry is coherent.

### Task 2: Make dockLayout.ts the single portrait-stage geometry source

**Objective:** Replace the 1280×720/wide-mode API with named portrait geometry.

**Files:**

- Modify: src/app/components/bat-ca/dock/dockLayout.ts
- Modify: src/app/components/bat-ca/dock/dockLayout.test.ts
- Modify: src/app/components/bat-ca/dock/FishingDockScreen.tsx
- Modify: src/app/components/bat-ca/dock/fishing-dock-screen.css

**Steps:**

1. Make the layout result include stage mode (portrait, desktop-contained, rotate-required), actual width/height, safe insets, top-bar rect, waterline Y, cast center/size, upgrade row/card dimensions, channel center/width, underwater anchors, and modal bounds.
2. Derive all values through semantic constraints and continuous clamps. Remove wide, microLandscape, worldLeft/worldWidth, and bank-related presentation fields from the public contract.
3. Change FishingDockScreen into outer app plus inner fishing-dock-stage. In portrait it fills the safe visual viewport; desktop contains and centers it; short phone landscape shows rotate-required and disables gameplay input.
4. Keep the existing RAF-coalesced ResizeObserver and visualViewport listener only here, but observe the stage element. Do not add listeners in renderer, HUD, or modal code.
5. Emit every geometry field as CSS variables. CSS owns only surface styling, typography, motion, and visibility—not a second position model.
6. Run the focused layout test until all physical bounds and minimum-target assertions pass.

### Task 3: Rebase Pixi scene and input on stage coordinates

**Objective:** Preserve gameplay model while rendering and steering correctly in the portrait stage.

**Files:**

- Modify: src/app/components/bat-ca/dock/FishingDockCanvas.tsx
- Modify: src/app/components/bat-ca/dock/runtime/createDockRuntime.ts
- Modify: src/app/components/bat-ca/dock/runtime/sceneLayout.ts
- Modify: src/app/components/bat-ca/dock/runtime/captureController.ts
- Modify: src/app/components/bat-ca/dock/runtime/fishRenderer.ts
- Modify: src/app/components/bat-ca/dock/runtime/dockRuntime.test.ts

**Steps:**

1. Keep one Pixi Application and existing async init/cancel/shared-texture cleanup. applyLayout resizes to the stage logical size only and never reads the browser viewport.
2. Remove wide-bank rendering. Drive boat, rod origin, hook, power gauge, waves, ambient, fish channel, depth label, and payout text from the shared portrait layout fields.
3. Move pointer ownership to stage/canvas. Project client X through the CSS stage rect to layout logical pixels, clamp it to the channel, ignore outside-stage input, and clean pointer capture/listeners on destruction.
4. Add DPR 1 and DPR 2 tests proving physical left/right touches map to the same logical channel edges. Add portrait resize-during-descent tests asserting finite capture state, boat/waterline alignment, gauge bounds, and fish remaining in channel.
5. Run npm test -- dockRuntime.test.ts fishRenderer.test.ts. Do not change catch rules or payout math to solve geometry defects.

### Task 4: Rebuild the dock and underwater HUD with the portrait hierarchy

**Objective:** Make the primary home screen visually deliberate rather than a desktop HUD compressed by media queries.

**Files:**

- Modify: src/app/components/bat-ca/dock/DockHud.tsx
- Modify: src/app/components/bat-ca/dock/FishingPowerGauge.ts
- Modify: src/app/components/bat-ca/dock/UnderwaterHud.tsx
- Modify: src/app/components/bat-ca/dock/fishing-dock.css
- Modify: src/app/components/bat-ca/dock/fishing-dock-scene.css

**Steps:**

1. Render semantic zones: safe top bar with settings/currency; attached utilities for hooks/gift/aquarium; central cast affordance; exactly three bottom upgrade cards.
2. Retain all existing callbacks, disabled states, prices, values, aria labels, and current power math. Do not reintroduce record/trophy UI.
3. Keep FishingPowerGauge authoritative. Its Pixi event hit area and any DOM fallback need identical bounds/state and must never double cast.
4. Change UnderwaterHud from fixed fullscreen to absolute stage-relative. Show only caught count, depth/phase guidance, and relevant feedback. Dock HUD, upgrades, and gauge must be absent and noninteractive while fishing.
5. Delete wide/height media-query geometry and dead best-score CSS. Retain reduced motion, focus-visible, pressed feedback, touch-action manipulation, and 44 px targets.
6. Capture dock, active gauge, descending, ascending, result, and return-to-dock at all portrait target sizes; reject clipping, overlapped hits, and unexplained unused space.

### Task 5: Migrate every dialog to one stage-relative modal frame

**Objective:** Make settings, hooks, aquarium, gift, offline earnings, and catch result follow one compact phone pattern.

**Files:**

- Create: src/app/components/bat-ca/dock/DockModalFrame.tsx
- Modify: SettingsModal.tsx, HooksPanel.tsx, AquariumPanel.tsx, GiftModal.tsx, OfflineEarningsModal.tsx, CatchResultOverlay.tsx in the dock directory
- Modify: src/app/components/bat-ca/dock/fishing-dock-screen.css

**Steps:**

1. Create DockModalFrame owning stage backdrop, dialog semantics, safe padding, framed header/close action, fixed footer slot, and scrollable body. It must not own save, audio, gift randomization, or progression.
2. Migrate Settings first and verify close/outside click/Escape, keyboard focus, manual language choice, sound, music, and 320×568 reachability.
3. Migrate Hooks and Gift as portrait three-column grids; migrate Aquarium as a scrollable collection; migrate Offline and Catch Result as short result sheets. Footer action stays visible while only grid/list body scrolls.
4. Replace repeated viewport Tailwind geometry with semantic modal CSS. Tailwind may remain for non-geometric color/text utilities only.
5. Manually test all open/close, hook select/unlock, aquarium scroll, gift cooldown/claim, offline claim, and catch collect flows at 390×844 and 320×568.

### Task 6: Convert every public raster to verified WebP

**Objective:** Remove every shipping PNG while retaining alpha, dimensions, animation frame order, and asset-cache behavior.

**Files:**

- Create: scripts/convert-public-images-to-webp.mjs
- Create: scripts/verify-public-webp-assets.mjs
- Replace: every public/**/*.png with its verified .webp counterpart
- Modify: public/character/animation.json
- Modify: public/rod_tip_debug_pack/animation_with_rod_tips.json
- Modify: fishingAnimation.ts, hooks-data.ts, DockHud.tsx, relevant asset tests, package.json
- Update: only the asset-reference documents that currently advertise stale active paths

**Steps:**

1. Write an explicit manifest for all 28 current PNGs: background, six runtime character frames, six debug frames, dial/pointer/glow, hook/coin, five hook skins, four upgrade icons, and the normal.png file in the existing spaced directory. Each manifest entry has source, output, expected dimensions, alpha requirement, and encoder mode.
2. Use one checked ffmpeg script. Use high-quality lossy WebP for opaque background art only after the portrait art is supplied. Use lossless-alpha WebP for transparent sprites/icons/frames/hook skins and retain max_glow as a transparent 1×1 texture.
3. Verify each output before deleting its PNG source. Final public must contain no PNG/JPG/JPEG/GIF fallback.
4. Update every runtime and JSON reference atomically to .webp. Extend fishingAnimation.test.ts and dockRuntime.test.ts to assert six unique WebP frames, unchanged texture dimensions, and Assets.load requests for WebP.
5. Add verify:assets package command. The verifier reads the manifest, confirms each file is decodable WebP at its expected dimensions, fails on legacy raster suffixes in public, and statically scans active src asset references/animation JSON for stale .png paths.
6. Run npm run verify:assets followed by focused Pixi texture tests. A build passing without the no-PNG network check is insufficient.

### Task 7: Supply a native portrait dock artwork and bind its protected zones

**Objective:** Prevent a landscape crop from undermining the portrait redesign.

**Files:**

- Create: public/dock/dock-portrait.webp, from a Câu Cá-owned approved source
- Modify: src/app/components/bat-ca/dock/fishingAnimation.ts
- Modify: src/app/components/bat-ca/dock/runtime/sceneLayout.ts
- Modify: src/app/components/bat-ca/dock/fishing-dock-scene.css
- Modify: scripts/verify-public-webp-assets.mjs

**Steps:**

1. Define native asset dimensions and protected normalized zones: readable top HUD, dock/boat at waterline, centered cast-line corridor, and low-contrast water below.
2. Replace background source metadata with actual portrait dimensions/waterline. Scale uniformly, align declared waterline to layout.waterlineY, and never use non-uniform scaling or object-fit cropping for gameplay anchors.
3. Compare visually to the supplied reference only for hierarchy: legible HUD, cast as focal point, visible three upgrades, and continuous underwater depth. Confirm all Câu Cá art/labels remain original.

### Task 8: Remove unreachable legacy presentation only after dock is green

**Objective:** Leave one real game UI and prevent a second stale responsive system from returning.

**Likely delete candidates after fresh caller proof:**

- src/app/screens/GameContainer.tsx
- src/app/components/bat-ca/BatCaAoLang.tsx
- src/app/components/bat-ca/GameCanvas.tsx
- src/app/components/bat-ca/engine.ts
- src/app/components/bat-ca/render.ts and render.ts.bak
- src/app/components/bat-ca/ui/
- src/app/screens/EndGameScreen.tsx
- legacy-only tests and DashboardPanel if its trigger remains absent

**Files to simplify:** GameApp.tsx, useAppShell.ts, and HomeScreen.tsx.

**Steps:**

1. Immediately before deletion, run caller searches for every candidate and inspect imports. Preserve any module that the active dock genuinely consumes.
2. Remove dead gameplay/end-game/record routing and props only after isolation is proven. Keep loading, active dock progression, language persistence, bridge lifecycle, and user wallet/fish/upgrades.
3. Run npm run typecheck and npm test. No stale imports, unused props, duplicate game-loop route, or orphan score screen may remain.

### Task 9: Run static, browser, and physical-device acceptance as distinct gates

**Objective:** Make completion claims match the requested phone experience.

**Files:**

- Modify source only for regressions found by validation.
- Create temporary evidence only under ignored artifacts/portrait-dock-qa/.

**Steps:**

1. Run and record each independently: npm run verify:assets; npm test; npm run typecheck; npm run build; git diff --check.
2. Browser visual matrix at DPR 1 and 2: 320×568, 360×800, 390×844, 393×852, 430×932, desktop-contained portrait stage, and short-landscape rotate state. Check console/network for WebP HTTP 200, zero PNG image request, and no Pixi/WebGL error.
3. Touch matrix on a phone: first trusted audio unlock, gauge lock, descent, steering to both channel edges, catch/capacity, surface payout, collection, three upgrades, settings, hooks, aquarium, gift, offline reward, visibility pause, and portrait-landscape-portrait recovery.
4. Physical iPhone Safari gate: repeat portrait flow with safe areas, touch, sound/music, WebP load, and rotation. Chrome emulation is not physical Safari evidence; anything untested stays NOT VERIFIED.

## Boundaries, risks, and completion definition

This plan changes active dock layout/runtime/HUD/modal files, WebP assets, registries, conversion verification, focused tests, and only proven-dead legacy presentation. It excludes economy, fish eligibility/payout math, storage schema, ads/Wink runtime, commits, pushes, and deployment.

| Risk | Mitigation |
|---|---|
| Visual refactor alters hook/fish collision truth. | Rebase only presentation through shared layout and assert DPR/channel/capture invariants. |
| WebP loses alpha or dimensions. | Use lossless-alpha where required, manifest verification, texture tests, then delete PNG. |
| Portrait art is a stretched landscape crop. | Require native portrait source with protected-zone metadata before registry switch. |
| Modal migration breaks rewards/preferences. | Shared frame owns only presentation; preserve callbacks and test every flow. |
| Legacy deletion removes a hidden entry. | Fresh caller search and full typecheck/test before deletion. |
| Desktop becomes another competing game layout. | Contained portrait host only; short phone landscape explicitly rotates. |

Completion requires: one documented portrait stage owner; all active states consume its coordinates; all public rasters verify as WebP; no runtime PNG request remains; static checks pass; browser evidence covers the matrix; and physical phone evidence covers portrait interaction. No commit, push, or deploy is included in this request.

