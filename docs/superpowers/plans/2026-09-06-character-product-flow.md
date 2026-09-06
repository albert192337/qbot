# Character Product Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Separate character creation, editing and generation task management without removing capabilities.

**Architecture:** A renderer-local route carries the edited character or viewed job. Editing context is independent of the active desktop pet. Existing generation IPC is retained; explicit task navigation replaces implicit progress-event navigation. Pane drafts survive navigation and background updates.

**Tech Stack:** Electron, TypeScript, vanilla DOM, existing CSS tokens and semantic SVG icons, Vitest.

- [x] Introduce character selection and route helpers; serialize shell navigation; preserve drafts between pages and guard only when changing edited characters.
- [x] Add profile and task panes. Library cards open the chosen character without activating it. Top bar identifies editing context; activation is explicit.
- [x] Make hatch exclusively a guided creation/task-detail flow, isolate job events, replace historical task controls with a task-center link, and provide completion handoff.
- [x] Rework actions into a browsable library with previews, precise regeneration, source/status filters, preset/custom expansion and GIF import. Move description editing to advanced generation settings.
- [x] Fix background-refresh draft loss, imported-action visibility, preview asset paths, partial-save behavior and error handling.
- [x] Add focused tests, run all app tests and build/type checks, and inspect populated/empty desktop UI states using a local mock preview without paid generation.

Design: retain black/white and lime emphasis, use labeled navigation and compact media cards, avoid repeated headings and competing primary actions. No new icon family or functional emoji.


## Validation

- App regression suite: 29 files, 521 tests passed, including editing-context isolation, imported action precedence, task deduplication and explicit hatch task routing.
- Production Electron build passed. `git diff --check` passed.
- Typecheck still reports only the existing `QBotApi.error` references in `renderer/error-handler.ts:51,52` and the exhaustive branch in `renderer/pet/state-machine.ts:291`.
- Browser review used a localhost-only mock bridge with bundled mascot assets, including the 880×640 console size. Checked: library → edit another character, profile draft → actions → profile, character-change discard dialog, tasks → selected job confirmation → fresh creation, empty workspace → library, action-add menu → custom form, media-card layout.
- Live paid generation, OS file picking and desktop activation were not executed. Existing IPC remains the integration boundary; no production user assets or running QBot process were modified by browser verification.
- Creation name persistence covers submitted jobs; unsaved workspace drafts persist across pane navigation in the current window, not across application restart.
