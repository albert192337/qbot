# Room Signboard Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public-room peers see the same status mode and signboard text currently visible on the local desktop pet.

**Architecture:** Extend the backward-compatible presence frame with an optional `sign` field and add `meeting` to the shared mode union. The local pet renderer publishes its final rendered sign text to the main process; the room client deduplicates and transmits it, the server keeps it only on the live socket, and each remote-pet window renders it below higher-priority transfer/chat notices.

**Tech Stack:** TypeScript, Electron IPC, WebSocket JSON protocol, Node.js, Vitest

---

### Task 1: Define presence contract

**Files:**
- Modify: `app/src/main/rooms/rooms-rules.ts`
- Modify: `app/src/shared/ipc-types.ts`
- Test: `app/test/rooms-rules.test.ts`

- [x] Add optional `sign` to the presence whitelist and clamp it to 60 characters.
- [x] Add `meeting` to `LinkMode` and carry `sign` through room-member and room-pet state types.
- [x] Verify unrelated local-only fields remain excluded.

### Task 2: Publish local visible sign

**Files:**
- Modify: `app/src/renderer/pet/local-main.ts`
- Modify: `app/src/preload/index.ts`
- Modify: `app/src/main/ipc.ts`
- Modify: `app/src/main/rooms/rooms.ts`
- Modify: `app/src/main/meeting-monitor.ts`

- [x] Publish the final sign text selected by `refreshSignboard()` through a dedicated IPC channel.
- [x] Merge room mode as agent, then meeting, then music, then idle.
- [x] Deduplicate sign and mode updates through the existing presence snapshot.

### Task 3: Relay and render remote sign

**Files:**
- Modify: `rooms/server.mjs`
- Modify: `rooms/smoke.mjs`
- Modify: `app/src/main/rooms/room-pets.ts`
- Modify: `app/src/main/rooms/room-pet-display.ts`
- Modify: `app/src/renderer/pet/room-pet-main.ts`
- Create: `app/src/renderer/pet/room-pet-sign.ts`
- Test: `app/test/room-pet-sign.test.ts`

- [x] Keep sign text ephemeral on the live socket and include it in presence broadcasts and join snapshots.
- [x] Render sign priority as disconnect, transfer, chat, synchronized sign, then nickname.
- [x] Verify clearing a sign restores the nickname and existing chat behavior remains intact.

### Task 4: Update documentation and verify

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-08-21-public-rooms-design.md`
- Modify: `docs/superpowers/specs/2026-08-24-rooms-pets-on-screen-design.md`

- [x] Document that visible sign text, including song information and explicit manual text, is shared with room members.
- [x] Run app tests, pipeline tests, room smoke tests, and the production build.
