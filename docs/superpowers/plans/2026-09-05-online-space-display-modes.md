# Online Space Display Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository run does not create commits unless the user explicitly requests them.

**Goal:** Replace the separate “小房间” and “公共房间” entry points with one online space whose connected members can be displayed either together in the room scene or directly on the transparent desktop.

**Architecture:** Keep `rooms.ts` as the only network and membership source of truth. Add a persisted local display-mode preference, let `room-pet-display.ts` route the same member windows into either desktop slots or positions anchored over the room window, and expose the mode as a segmented control in the lounge UI.

**Tech Stack:** Electron 37, electron-vite, TypeScript, DOM APIs, Vitest.

---

### Task 1: Define display mode contract

**Files:**
- Modify: `app/src/shared/ipc-types.ts`
- Modify: `app/src/preload/index.ts`
- Modify: `app/src/main/ipc.ts`

- [x] Add the `RoomsDisplayMode` setting and renderer API.
- [x] Add get, set, and changed-event IPC channels.
- [x] Keep the existing rooms connection API unchanged.

### Task 2: Route members by display mode

**Files:**
- Modify: `app/src/main/windows.ts`
- Modify: `app/src/main/rooms/room-pet-display.ts`
- Modify: `app/src/main/index.ts`

- [x] Position remote member windows on the desktop in desktop mode.
- [x] Parent and position the same member windows over the room scene in room mode.
- [x] Open or close the room scene without leaving the online room.
- [x] Reapply the selected mode after reconnecting or reopening windows.

### Task 3: Merge product entry points

**Files:**
- Modify: `app/src/main/tray.ts`
- Modify: `app/src/main/ipc.ts`
- Modify: `app/src/renderer/console/main.ts`
- Modify: `app/src/renderer/console/panes/home.ts`
- Modify: `app/src/renderer/console/panes/market.ts`

- [x] Replace separate room actions with one “联机空间” action.
- [x] Route legacy local-room opens to the unified lounge.
- [x] Update visible labels and accessibility names consistently.

### Task 4: Add in-room mode switching

**Files:**
- Modify: `app/src/renderer/lounge/index.html`
- Modify: `app/src/renderer/lounge/main.ts`

- [x] Add room-scene and transparent-desktop segmented controls.
- [x] Explain that mode changes presentation only and does not leave the room.
- [x] Keep the selected state synchronized with main-process changes.

### Task 5: Verify unified online space

**Files:**
- Test: `app/test/rooms-rules.test.ts`
- Test: `app/test/console-ui.test.ts`

- [x] Add layout tests for room-scene member placement.
- [x] Run focused room and console tests.
- [x] Run the complete app test suite and build.
- [x] Inspect the unified menu and lounge mode control.
