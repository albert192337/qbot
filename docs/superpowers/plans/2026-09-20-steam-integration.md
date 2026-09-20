# Steam client integration implementation plan

> Execute inline in this task as requested by the user. Preserve the existing uncommitted product documentation. No additional account, payment, bank, tax or agreement operations are needed for this development milestone.

**Goal:** Run real Steam identity/friends APIs and connect Steam invitations to the existing QBot rooms, using SpaceWar 480 explicitly in development.

**Architecture:** A narrow adapter in an isolated Electron utility process calls Valve's flat API through Koffi; a testable service owns lifecycle, state, invitations and cleanup. A main-process bridge contains native fatal exits, rejects in-flight requests and supports explicit restart. Native redistributables come from an explicit official SDK directory or the pinned steamworks.js distribution; its JavaScript wrapper is not initialized, so there is exactly one callback pump. Renderer uses typed IPC only. Existing room identity and transport remain unchanged and are not presented as Steam-authenticated.

**Tech Stack:** Electron 37, TypeScript, Koffi, Steamworks flat API/manual callbacks, Vitest.

## 1. Configuration and invitation contract
- [x] Add `app/src/shared/steam.ts` (serializable snapshots, friends, pending join and typed renderer API).
- [x] Add `app/src/main/steam/rules.ts`. Configuration defaults off; `QBOT_STEAM_APP_ID=480` requires `QBOT_STEAM_DEMO=1` and an unpackaged build. Invalid configuration fails closed.
- [x] Join tokens encode only version, current AppID, a hash of the configured room-service realm and the eight-character room ID. No URL, auth ticket, executable, or owner token is accepted from a Steam invitation.
- [x] Tests in `app/test/steam.test.ts` reject foreign app/realm, malformed payload, duplicate and expired invites. Example assertion: `expect(parseJoin('https://example.com', 480, 'realm')).toBeNull()`.

## 2. Real SDK adapter
- [x] Add `app/src/main/steam/native.ts` with `SteamAPI_InitFlat`, versioned user/friends/utils/apps interfaces, SteamID as decimal strings, friend count/name/state/avatar, `InviteUserToGame`, rich presence and manual callback dispatch. Ensure callback buffers are freed in `finally`, initialization failures shut down, and shutdown is idempotent.
- [x] Keep native library and Koffi external to the main bundle. Unpack native files in electron-builder. Resolve SDK libraries for macOS, Windows x64 and Linux x64/arm64, with explicit missing-library errors.
- [x] No overlay GPU/security switches or renderer Node integration changes.

## 3. Lifecycle and rooms bridge
- [x] Add `app/src/main/steam/service.ts` with injectable adapter, clock and room state. Poll callbacks, refresh friends, clear stale identity on disconnect/account switch, deduplicate pending invites, allow refresh/retry, enforce invite cooldown and validate recipients against current real friends.
- [x] Add `app/src/main/steam/runtime.ts` to wire Electron windows and current rooms. Share only the current real room; local rehearsals and disconnected rooms never publish a join token.
- [x] Handle initial command line, `second-instance` and SDK launch command line. Receiving a join request opens the social UI with an expiring invitation; an explicit Join action uses existing room consent and never runs shell commands.
- [x] Stop native callbacks and clear rich presence on quit. Do not put SteamIDs into the legacy room authentication fields.

## 4. Visible social UI
- [x] Add Steam methods to `SocialApi`/preload, register handlers, replace the static unavailable card with actual connection status, self profile, friend list, refresh/retry and per-friend invitation buttons.
- [x] Keep SpaceWar visibly labeled as test mode, with no claim of verified QBot identity. Render remote names using textContent/escaping; avatars are local data URLs.
- [x] Show incoming join requests and preserve them across window reopen; consume only after successful room join or explicit dismissal.

## 5. Validation and handoff
- [x] Add deterministic adapter-fake tests covering no Steam, failure/retry, online/offline, account change, callback errors, invite validation/cooldown, private room token cleanup, cold/warm join and quit cleanup.
- [x] Run `npm test -w app -- test/steam.test.ts test/social-client.test.ts`, `npx tsc --noEmit -p app`, `npm run build -w app`, then repository required `npm run check`.
- [x] Add `scripts/steam-smoke.cjs` to initialize/read identity and friend count using a temporary Electron fixture, without sending invitations, changing achievements or touching real QBot saves.
- [x] Add an isolated UI fixture/regression with fake Steam friends and loopback rooms to validate invite/accept UX and narrow layouts. Keep tests of real recipients separate.
- [x] Document commands, dependency/native-library provenance and exact verification limits in `docs/steam-development.md`; update CLAUDE.md. Real two-account delivery and publisher-ticket validation require the user's test recipient/AppID credentials later.

## Evidence and remaining external validation

- Real AppID 480 SDK read succeeded in Electron, including the utility-process version: online with four friends. No real invitations sent.
- A Steam client pipe disconnect triggered a native fatal assert during initial main-process testing; implementation was changed to utility-process isolation. Forced child-exit smoke now confirms the host survives and a replacement child responds, including when Steam is offline.
- 940 repository tests passed (135 pipeline, 803 app, 2 generation); 7 existing skipped. App build/type checks passed. Native macOS ARM64 package built; other operating systems are not runtime-tested.
- Actual isolated UI verified fake invite/accept through a loopback room, leave cleanup, real friend data, and 640px offline layout.
- Full official SDK ZIP download did not complete. Pinned npm-distributed Valve redistributable was used successfully.
- Two-account delivery, Steam cold-launch installation routing, publisher-ticket verification and distribution remain explicit follow-ups; this milestone implements the identity/friends/invite bridge only.
