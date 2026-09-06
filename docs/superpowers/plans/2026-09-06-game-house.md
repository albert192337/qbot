# Game House Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Execution remains inline in the current checkout because the approved nursery and unrelated P0 work are uncommitted here; neither execution sub-skill is installed.

**Goal:** Make every existing user function reachable and operable through the Phaser house, keeping desktop pet behavior intact.

**Architecture:** Phaser owns rooms, objects and feedback. Accessible DOM books contain Chinese text input and existing domain controllers. Main remains the authority for generation, inventory, assets and online connections. Native entry points converge on one house window.

**Tech Stack:** Electron, Phaser 3.90, TypeScript, existing IPC, Vitest, native Electron Playwright.

---

## Coverage and implementation

- [x] Add room navigation and distinct Phaser living room, practice room and porch art in `nursery/scene.ts`, `house.ts`, `index.html`, `style.css`. Each physical object has a keyboard-operable DOM equivalent. Nursery stays compatible with existing task snapshots.
- [x] Add `nursery/book.ts`: lazy cached pane hosts, serialized navigation, character dirty guard, scoped paper styles, explicit character context and in-house action preview. Reuse profile/persona/scene-actions/prompts/stickers/tasks/characters/market/claude/devtools controllers; never activate a pet to preview an editing character.
- [x] Extract lounge markup/styles/controller to reusable `lounge/view.*` with mount/unmount, scoped queries, Chinese IME guard and subscriptions cleanup. Forward the existing rooms connection to the house, including cache hydration after lazy mounting.
- [x] Add `nursery/rewards.ts`: authoritative inventory, explicit box cost and craft consumption, single-flight operations, persistent reveal using actual returned furniture.
- [x] Add `nursery/furnish.ts`: same default room coordinates/assets, select/place/move/scale/remove and explicit save, failure retains draft. Broadcast successful decor changes to live room.
- [x] Complete settings generation mode control and failure feedback. Keep technical controls in the tool drawer and developer-only controls gated.
- [x] Route tray, pet/room context menu and existing openConsole/openLounge calls to house objects. Keep desktop scene controls and actual pet renderer unchanged.

## Validation

- [x] `npx tsc -p app/tsconfig.json --noEmit`: no TypeScript errors.
- [x] `npm run build -w app`: all renderer chunks and shared modules bundle without Node imports in renderer.
- [x] Add `scripts/test-house.cjs` and extend the native fixture: visit every room/book; preserve character draft; reject accidental activation during preview; fixture-only reward mutation; placement save/reload; IME does not send; no network/paid generation during tests.
- [x] Run native fixture with `PLAYWRIGHT_MODULE=/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/test-nursery.cjs`; inspect room/book screenshots at full and minimum window sizes.
- [x] Run existing app tests; document exact remaining provider/platform limitations in CLAUDE.md. Do not commit unrelated P0 changes.

Completed inline. Validation uses production renderer/preload/Player with isolated mock main IPC; no external writes or paid generation. No commits were made because this checkout also contains the user’s P0 release work.
