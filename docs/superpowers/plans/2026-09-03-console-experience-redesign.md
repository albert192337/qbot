# Console Experience Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository run does not create commits unless the user explicitly requests them.

**Goal:** Turn the unified console from a collection of migrated tools into a coherent character-centered workspace with safe context switching, persistent task visibility, consistent visual language, and clearer user-facing workflows.

**Architecture:** Keep the existing plain TypeScript renderer and lazy pane modules. Add a shared shell context bar, semantic SVG icon registry, overview pane, and pane lifecycle hooks for role refresh and dirty-state protection. Consolidate visual primitives in the console stylesheet and remove the hatch pane's legacy global CSS.

**Tech Stack:** Electron 37, electron-vite, TypeScript, DOM APIs, Vitest.

---

### Task 1: Add console shell primitives

**Files:**
- Create: `app/src/renderer/console/icons.ts`
- Modify: `app/src/renderer/console/main.ts`
- Modify: `app/src/renderer/console/index.html`

- [x] Replace emoji navigation icons with a semantic inline-SVG icon registry.
- [x] Add a workspace header containing current character, background task count, and quick actions.
- [x] Add a `home` pane and make it the default console entry.
- [x] Preserve deep links and lazy mounting.
- [x] Add visible keyboard focus, reduced-motion behavior, selectable diagnostic text, and shared button/input states.

### Task 2: Fix character context correctness

**Files:**
- Modify: `app/src/renderer/console/main.ts`
- Modify: `app/src/renderer/console/panes/persona.ts`
- Modify: `app/src/renderer/console/panes/scene-actions.ts`
- Modify: `app/src/renderer/console/panes/prompts.ts`
- Modify: `app/src/renderer/console/panes/stickers.ts`

- [x] Refresh all character-scoped panes whenever they become visible.
- [x] Refresh the shell character selector on `characters:activated`.
- [x] Add dirty-state hooks for editable character panes.
- [x] Confirm before leaving a dirty pane or changing character.
- [x] Reset dirty state after successful saves and refreshes.

### Task 3: Add overview and task visibility

**Files:**
- Create: `app/src/renderer/console/panes/home.ts`
- Modify: `app/src/renderer/console/index.html`

- [x] Show the active character and action health.
- [x] Show unfinished and failed generation tasks with repair links.
- [x] Show Claude Code connection and current activity.
- [x] Show points, boxes, furniture, and activity totals.
- [x] Add quick actions for creating a character, managing actions, settings, and opening public rooms.

### Task 4: Repair hatch workflow semantics

**Files:**
- Modify: `app/src/renderer/console/panes/hatch.ts`
- Modify: `app/src/renderer/console/index.html`

- [x] Remove the legacy embedded global stylesheet and reuse console primitives.
- [x] Remove the pane-local close button that closes the entire console.
- [x] Rename cancellation actions to state that generation continues in the background.
- [x] Add a preflight summary for provider, outputs, time, cost, and key readiness.
- [x] Keep resume, candidate selection, progress, failure repair, certificate saving, and activation behavior intact.

### Task 5: Improve action and scene workflows

**Files:**
- Modify: `app/src/renderer/console/panes/persona.ts`
- Modify: `app/src/renderer/console/panes/scene-actions.ts`
- Modify: `app/src/renderer/console/panes/prompts.ts`
- Modify: `app/src/renderer/console/panes/stickers.ts`

- [x] Present the character name and source/status consistently.
- [x] Add action type/status filtering to the action list.
- [x] Add scene test buttons that play the selected action through the pet command path where available.
- [x] Clarify simple descriptions versus advanced full prompts.
- [x] Show a replacement summary before applying sticker mappings.
- [x] Standardize cost and destructive confirmations.

### Task 6: Improve connections and settings

**Files:**
- Modify: `app/src/shared/ipc-types.ts`
- Modify: `app/src/renderer/console/panes/claude.ts`
- Modify: `app/src/renderer/console/panes/market.ts`
- Modify: `app/src/renderer/console/panes/settings.ts`
- Modify: `app/src/renderer/console/main.ts`

- [x] Add developer mode to settings and hide developer tools by default.
- [x] Add API key configured states, reveal controls, clear actions, and dependency explanations.
- [x] Unify market identity copy with the shared room/market nickname model.
- [x] Replace native confirmation dialogs with the shared non-blocking dialog.
- [x] Add Claude connection diagnostics and a direct scene-mapping shortcut.

### Task 7: Validate the redesign

**Files:**
- Test: `app/src/renderer/console/*.test.ts` where pure helpers are introduced
- Verify: existing app test and build suites

- [x] Run console-focused unit tests.
- [x] Run `npm test -w app`.
- [x] Run `npm run build -w app`.
- [x] Inspect the overview empty state and the dense action/prompt views.
- [x] Confirm navigation, deep links, role switching, hatch resume, and settings persistence.
