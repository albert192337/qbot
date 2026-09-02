# Foreground App Observation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the current foreground application's locally observable metadata on macOS and Windows and expose the recent records in the developer console.

**Architecture:** Add platform-specific collectors that return a shared, sanitized foreground snapshot without reading document contents. The existing perception service owns polling, deduplication, persistence, and renderer notifications; the developer-tools pane renders current collector health and recent `app_focus` records. Raw foreground records remain local in `perception.json`, follow the existing seven-day retention policy, and are not added to public-room presence or model context.

**Tech Stack:** TypeScript, Electron main/preload/renderer IPC, macOS JXA via `osascript`, Windows PowerShell + User32, Vitest

---

### Task 1: Define foreground snapshot contract

**Files:**
- Modify: `app/src/shared/perception.ts`
- Create: `app/src/main/foreground-app.ts`
- Test: `app/test/foreground-app.test.ts`

- [x] Add a shared foreground snapshot with app name, window title, process metadata, capture source, detail level, and timestamp.
- [x] Normalize untrusted command output by folding whitespace, bounding text fields, validating process IDs, and dropping unknown fields.
- [x] Add pure tests for full, partial, malformed, and oversized captures.

### Task 2: Add platform-specific collectors

**Files:**
- Create: `app/src/main/foreground-app-macos.ts`
- Create: `app/src/main/foreground-app-windows.ts`
- Modify: `app/src/main/foreground-app.ts`

- [x] On macOS, read the frontmost app through NSWorkspace and attempt window title lookup through System Events.
- [x] On Windows, read the foreground HWND through User32 and resolve process name, product name, title, PID, and executable path through PowerShell.
- [x] Return partial captures when optional metadata is unavailable and bounded errors when collection fails.

### Task 3: Persist changed foreground states

**Files:**
- Modify: `app/src/main/perception.ts`
- Modify: `app/src/main/index.ts`
- Modify: `app/src/main/ipc.ts`

- [x] Replace the Electron-window fallback with native polling on macOS and Windows.
- [x] Record `app_focus` only when the application changes and `foreground_change` for title/process changes inside the same application.
- [x] Expose current capture and monitor health through the existing perception snapshot while keeping existing app-level rule context compatible.

### Task 4: Display records in the console

**Files:**
- Modify: `app/src/renderer/console/panes/devtools.ts`
- Modify: `app/src/renderer/console/index.html`

- [x] Add a foreground-observation card showing platform, source, health, current app, title, process metadata, and access level.
- [x] Show recent foreground changes separately from the general perception stream.
- [x] Escape all captured strings before inserting them into HTML.

### Task 5: Document and verify

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-08-21-desktop-behavior-and-rule-engine-design.md`

- [x] Document platform behavior, local retention, permission limitations, and the explicit non-goal of reading document contents.
- [x] Run focused tests, full app tests, typecheck, production build, and `git diff --check`.
