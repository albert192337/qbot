# Game Nursery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship an Electron + Phaser nursery with a complete image → appearance approval → background incubation → birth → desktop flow using existing generation APIs.

**Architecture:** A new nursery renderer owns presentation only. A testable controller reads authoritative hatch snapshots, filters events by task ID, and guards asynchronous navigation. Electron owns generation, assets and activation. Existing desktop Player is reused as a DOM actor above the Phaser scene. Existing room/decor, console editing and generation recovery remain accessible.

**Tech Stack:** TypeScript, Phaser 3.90, Electron/Vite, HTML/CSS input overlays, Vitest.

---

Execution: work in the current checkout because it contains the user's uncommitted P0 generation implementation. The optional superpowers execution skills are not installed; implement locally with checkpoints. Do not commit unrelated work. No paid generation calls during verification.

Visual direction: a quiet illustrated wooden conservatory, parchment dialogue, sage/ochre/brown palette, serif scene titles, readable system-font controls. A physical glass incubator, task ledger and doorway provide navigation. Motion is short and skippable, never a fake progress clock. Native HTML controls support Chinese IME, focus, keyboard navigation and reduced motion.

### Task 1: State boundary and regression coverage
Files: `app/src/renderer/nursery/model.ts`, `controller.ts`, `app/test/nursery.test.ts`.
- [x] Derive scene state from HatchStatus (`awaiting_pick`, `done`, paused/failed, queued, working); count actually completed actions rather than inventing a percentage.
- [x] Implement a controller with `open(id)`, `refresh()`, `receive(id, status?)`, `dispose()` and an exclusive mutation lock. Increment a revision on navigation; ignore reads that finish for a previous task or before a newer push. Do not resume jobs from reads.
- [x] Verify out-of-order snapshots, unrelated progress, opening a paused job without resuming, duplicate mutations, and disposal while a read is in flight with mocked promises.
Run: `npm test -w app -- test/nursery.test.ts`.

### Task 2: Playable scene and HTML interaction layer
Files: `app/src/renderer/nursery/index.html`, `main.ts`, `scene.ts`, `style.css`.
- [x] Add exact Phaser 3.90.0 to app dependencies. Implement a 1120×720 scene with illustrated room geometry, windows, leaves, incubator, ledger and doorway using Phaser Graphics and input zones.
- [x] Present form, image preview, appearance selection, 8-action progress, errors/resume, birth and saved companions as contextual paper overlays. Use `textContent` for user/server text; never interpolate untrusted text into HTML.
- [x] Call existing `hatch.start`, `pickTurnaround`, `resume`, `characters.rename` and `characters.activate` from explicit controls. Before starting, show quota/upload disclosure and require an explicit start click. Query snapshots after mutations. Preserve draft while visiting home/ledger.
- [x] Reuse `Player` for completed character preview. Dispose decoders on hidden/unload; pause the Phaser loop while hidden and refresh the selected job on return. Persist selected task ID for reopening; missing/deleted tasks offer returning to the ledger.
- [x] Implement reduced motion, visible keyboard focus, Escape to return, accessible scene hotspot buttons, and error recovery if game boot fails.

### Task 3: Desktop integration
Files: `app/electron.vite.config.ts`, `app/src/main/windows.ts`, `ipc.ts`, `tray.ts`, `app/src/preload/index.ts`, `app/src/shared/ipc-types.ts`, `app/src/renderer/console/main.ts`, `app/src/renderer/room/main.ts`.
- [x] Add `nursery` renderer build entry and typed `ui.openNursery()` bridge.
- [x] Create a single reusable nursery window; restore minimized window on open, include it in dock visibility and shared broadcasts. Do not hide the existing desktop pet while nursery is open.
- [x] Expose nursery in desktop/tray menu and console navigation, route fresh creation to nursery, retain task-specific console deep links.
- [x] Add nursery entry to existing room context menu. Explicit desktop handoff closes a local room or switches a joined room's local display to desktop without disconnecting.

### Task 4: Validation and handoff
Files: `CLAUDE.md`, this plan.
- [x] Run `npm run check` and `npm run build -w app`; fix regressions attributable to the change.
- [x] Preview the actual renderer with a local mock bridge: home, form, approval, progress, paused/error, birth, ledger, small window and reduced motion. Exercise back-navigation and asynchronous completion. No remote generation or user account mutation.
- [x] Verify actual Electron preload/asset protocol with isolated temporary userData when feasible. Record what was mocked and any unverified platform behavior.
- [x] Update CLAUDE.md with entry points, state boundary and verification commands.


## Verification record

- Full `npm run check` passed before the final renderer refinements: pipeline 123, app 544, generation 2 tests.
- Added cloud appearance routing coverage and a local failure-event case; final app suite (548 passed), TypeScript check, production build and native UI smoke passed after changes.
- Mac Electron smoke uses a new temporary data directory, mocked generation IPC, real preload and shipped WebM assets. HTTP(S) is blocked in the fixture. No paid generation call was made.
- Inspection found and fixed scene input passing through HTML confirmation controls, native minimize not reliably represented by document.hidden alone, local retry holding the UI lock for an entire generation, and the existing missing cloud pick routing.
- Final native screenshots cover home, source draft, appearance, progress, birth, ledger, interruption and 840×570 layout.
- Remaining platform verification: actual provider generation, Windows, installation packaging, and long-duration resource measurements. These do not block shipping the first source implementation.

Final refinement: actionable error messages omit Electron transport prefixes. Thirteen focused controller/routing tests and the native UI smoke passed after this refinement; the preceding full app run passed 548 tests.
