# Character Workspace Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository run does not create commits unless the user explicitly requests them.

**Goal:** Reduce the character area from six competing sidebar tools to three product-level destinations, and turn character generation into a guided “create a desktop companion” journey.

**Architecture:** Keep the existing lazy pane modules and deep-link IDs. Mark supporting character panes as children of one `persona` workspace entry, render their navigation in a shared secondary bar, and redesign the hatch pane’s first screen without changing pipeline APIs or resume behavior.

**Tech Stack:** Electron 37, electron-vite, TypeScript, DOM APIs, Vitest.

---

### Task 1: Consolidate character navigation

**Files:**
- Modify: `app/src/renderer/console/main.ts`
- Modify: `app/src/renderer/console/index.html`
- Test: `app/test/console-ui.test.ts`

- [x] Add sidebar visibility and parent-navigation metadata to pane definitions.
- [x] Keep only 角色库、创建角色、角色工作台 in the character sidebar group.
- [x] Render 人设与动作、场景联动、导入动作、生成设置 in a shared secondary navigation bar.
- [x] Preserve direct routes to all existing pane IDs and map their active sidebar state to 角色工作台.

### Task 2: Productize character creation

**Files:**
- Modify: `app/src/renderer/console/panes/hatch.ts`

- [x] Rename the journey from technical “孵化” language to “创建桌宠”.
- [x] Reword steps around user outcomes: choose image, confirm appearance, generate actions, name and use.
- [x] Introduce a focused upload-and-preferences layout with an explicit output summary.
- [x] Collect a draft name before generation and carry it into the completion form.
- [x] Demote provider selection to advanced generation settings.
- [x] Show unfinished and failed work only when actionable tasks exist.

### Task 3: Validate hierarchy and states

**Files:**
- Modify: `app/test/console-ui.test.ts`
- Verify: `app/src/renderer/console/`

- [x] Add structural tests for consolidated sidebar and workspace tabs.
- [x] Build the Electron application.
- [x] Run the complete app test suite.
- [x] Inspect the character sidebar, creation empty state, and narrow-window layout.
