# Room Size And Action Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users resize the room scene safely, simplify the action model into clear product-facing groups, expand preset actions, and generate one turnaround image at a time.

**Architecture:** Keep the room window non-resizable and expose persisted small/medium/large presets through its existing custom context menu, so transparent-window bounds remain deterministic. Keep the existing manifest fields for backward compatibility, but present them as one action library with generated core actions, optional presets, and custom actions. Reduce the pipeline turnaround batch to one while preserving the existing approve-or-regenerate checkpoint.

**Tech Stack:** Electron 37, TypeScript, DOM APIs, Vitest.

---

### Task 1: Add persisted room sizing

**Files:**
- Modify: `app/src/shared/ipc-types.ts`
- Modify: `app/src/preload/index.ts`
- Modify: `app/src/main/ipc.ts`
- Modify: `app/src/main/windows.ts`
- Modify: `app/src/renderer/room/main.ts`
- Modify: `app/src/renderer/room/index.html`

- [x] Add a `RoomSizePreset` setting and typed room IPC methods.
- [x] Resize around the current window center and clamp to the active display.
- [x] Add small, medium, and large choices to the room context menu.
- [x] Relayout remote room pets after every size change.

### Task 2: Simplify the action library

**Files:**
- Modify: `pipeline/src/types.ts`
- Modify: `pipeline/src/prompts.ts`
- Modify: `app/src/renderer/console/panes/_studio-shared.ts`
- Modify: `app/src/renderer/console/panes/persona.ts`
- Modify: `app/src/main/pipeline-bridge.ts`

- [x] Rename product-facing M-tier language to optional preset actions.
- [x] Show generated preset actions in the same owned-action list.
- [x] Keep ungenerated presets in one clearly labeled add-actions section.
- [x] Add wave, nod, curious, dance, comfort, and related presets with all form variants.

### Task 3: Expand default generated actions

**Files:**
- Modify: `pipeline/src/types.ts`
- Modify: `pipeline/src/prompts.ts`
- Modify: `pipeline/src/job.ts`
- Modify: `app/src/renderer/console/panes/hatch.ts`
- Modify: `app/src/renderer/console/panes/_studio-shared.ts`
- Modify: `app/src/renderer/room/main.ts`

- [x] Add wave and stretch to the default generated action set.
- [x] Backfill missing action state when older unfinished jobs resume.
- [x] Update action labels, progress counts, and creation messaging.

### Task 4: Generate one turnaround option

**Files:**
- Modify: `pipeline/src/stages.ts`
- Modify: `app/src/renderer/console/panes/hatch.ts`
- Modify: `app/src/renderer/console/panes/prompts.ts`

- [x] Generate exactly one turnaround image per attempt.
- [x] Change selection copy to approve or regenerate that image.
- [x] Update time, cost, and regeneration explanations.

### Task 5: Verify behavior

**Files:**
- Modify: `pipeline/test/prompts.test.ts`
- Modify: `pipeline/test/e2e.test.ts`
- Modify: `app/test/console-ui.test.ts`
- Modify: `CLAUDE.md`

- [x] Add assertions for the expanded action catalogs.
- [x] Update pipeline call-count expectations for one turnaround image.
- [x] Test room sizing and simplified action-language invariants.
- [x] Run focused tests, full tests, build, and visual inspection.
