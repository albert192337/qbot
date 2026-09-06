# Pet Visibility Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Prevent failed action transitions from leaving an invisible pet and recover the desktop window after renderer failure or display changes.

**Architecture:** Player owns atomic video visibility, generation-scoped callbacks, bounded media recovery and a source-image fallback. A window lifecycle helper restores only the desktop presentation, preserving intentional room-mode hiding. Existing uncommitted changes remain in place; implementation proceeds inline.

**Tech Stack:** TypeScript, Electron, HTML media, Vitest fake timers and DOM/media doubles.

### Task 1: Player recovery
- [x] Add `app/test/player.test.ts`: delay/reject play(), emit late ended/error events, omit idle, stall looping playback, override duplicate action IDs and reload the character while play is pending.
- [x] Update `app/src/renderer/pet/player.ts`: retain visible video until playback succeeds; catch errors; give every attempt a generation; retry once then select another asset; show source image when no video works; release old decoders and timers.
- [x] Run `npm test -w app -- test/player.test.ts test/state-machine.test.ts`.

### Task 2: Window recovery
- [x] Create `app/src/main/pet-window-recovery.ts` and `app/test/pet-window-recovery.test.ts`: mock lifecycle events, verify crash reload backoff, wake/display restoration and listener cleanup; preserve room-mode hiding.
- [x] Attach helper in `app/src/main/windows.ts`; disable background throttling for the local pet.
- [x] Run `npm test -w app` and `npx tsc --noEmit -p app`; build via `npm run build -w app`.
- [x] Document outcomes and remaining real-machine checks (meeting transitions, long idle, sleep/wake, external display removal). No API calls, process restarts or commits are required for this repair.

## Verification outcome

- 27 app test files / 512 tests pass, including 22 new media/window regression tests. The idle test advances a fake clock through one hour of playback progress; it is not a real-machine soak test.
- Production Electron build passes. `git diff --check` passes.
- Type checking was run and remains blocked by three pre-existing diagnostics: `app/src/renderer/error-handler.ts:51,52` (`QBotApi.error` missing) and `app/src/renderer/pet/state-machine.ts:291` (exhaustive branch accesses `never.type`). No new diagnostics remain.
- Deliberate room-mode hiding is preserved. Failed media retries once, then is excluded until character reload; healthy alternatives take precedence over source art. Source art requires a readable source image in the character package.
- Runtime processes were not restarted. Real meeting transitions, macOS sleep/wake, external monitor removal and a long-running desktop session still need real-machine verification with the new build.
