---
name: gametegra-sdk
description: Use whenever building, editing, debugging, or publishing a Gametegra mini-app/mini-game (runs inside the Gametegra SuperApp via @gametegra/sdk JS, com.gametegra.sdk Unity, or gametegra_sdk Godot). Trigger on "Gametegra", "gameTegra", "mini-app", "miniapp.yaml", "SuperApp", the `gametegra` CLI, or requests to add rooms/matchmaking, leaderboards, room chat, streams, ads, payments, save/load data, safe-area/notch handling, virtual gamepad controls, or dev console. Also trigger on "SDK ekle"/"add SDK integration" or a new game folder needing Gametegra integration. Use even for small tasks like "add a leaderboard" — this SDK has non-obvious API shapes, response schemas that differ from its own official docs, and CLI commands that fail silently in agent/CI shells, so generic JS knowledge or the docs alone will get things wrong.
---

# Gametegra SDK

Gametegra SDK lets a game run as a **mini-app** inside the Gametegra SuperApp (a host mobile app). The game talks to the platform (user info, rooms/matchmaking, leaderboards, chat, ads, payments, device features, safe-area insets) through a global `gameTegra` object — available for JavaScript/Web, Unity (WebGL only), and Godot (Web export only).

This skill combines the **official API reference** with **field-verified gotchas** found while integrating a real game end-to-end and publishing it to DevPortal (2026-07-16). Where the official docs and real host behavior disagree, this skill follows real behavior and flags the discrepancy — treat docs.gametegra.com as a starting point, not ground truth, for response shapes.

## How to use this skill

1. Jump straight to the relevant reference file below — don't read everything for a small task.
2. **Always call `await gameTegra.waitUntilReady()`** (or `onReady`) before any host method, and wrap every SDK call in a timeout (host bridge missing → promise hangs forever, page looks "stuck" with no error). See "Init pattern" below.
3. Prefer built-in SDK methods over `custom()` — see `references/game-methods.md` → "Which method should I use?".
4. Apply the safe-area / lifecycle rules in `references/best-practices.md` for any UI work.
5. **Read `references/known-issues.md` before running any CLI command or trusting a response shape** — it documents verified bugs, TTY restrictions, and a docs/reality mismatch (`loadData`) that silently corrupts data if ignored.
6. If this is a "integrate SDK into this new game" task, follow the **Full integration checklist** below top to bottom — it's the sequence that was verified end-to-end on a real game and published successfully.

## Quick reference map

| Need                                                              | File                                |
| -------------------------------------------------------------------- | -------------------------------------- |
| Install the SDK / pick JS vs Unity vs Godot                          | `references/installation.md`           |
| `miniapp.yaml` fields (menu button, orientation, env, payment packages, packaging keys) | `references/miniapp-yaml.md` |
| Safe-area/notch handling, background/foreground lifecycle, audio     | `references/best-practices.md`         |
| CLI commands, scaffolding, building, publishing, device testing, VS Code emulator | `references/cli-publishing.md` |
| Rooms, matchmaking, save/load data, leaderboards, ads, match chat, custom methods | `references/game-methods.md` |
| Real-time streams, gyroscope/accelerometer, reconnect handling       | `references/stream-methods.md`         |
| Standalone scriptable room chat                                       | `references/room-chat.md`              |
| User info, device features, purchases, lifecycle events, env vars     | `references/app-methods.md`            |
| Virtual joystick / gamepad buttons                                     | `references/controls.md`               |
| In-WebView debug console                                                | `references/dev-console.md`            |
| **The standard "Game Over" integration package** (language, vibration, safe area, highscore, leaderboard, ads, analytics, non-invasive architecture) — apply this to every game | `references/game-over-pattern.md` |
| **Verified bugs, docs/reality mismatches, TTY restrictions, build quirks** — check before trusting any CLI behavior or response shape | `references/known-issues.md` |

## SDK selection

| Platform           | Package                | Language   | Notes                                              |
| -------------------- | ------------------------ | ------------ | ----------------------------------------------------- |
| Web / HTML5           | `@gametegra/sdk`            | JavaScript  | Full API surface, incl. web-only methods                |
| Unity (WebGL)           | `com.gametegra.sdk`           | C#            | Only works in WebGL builds; Editor returns simulated responses |
| Godot (Web export)       | `gametegra_sdk` plugin          | GDScript        | Only works in Web exports; register as autoload |

A number of methods are **JavaScript/Web only** — each reference file flags these. Full setup details, including the CDN-ESM path for bundler-less games, are in `references/installation.md`.

## Full integration checklist (verified end-to-end on a real game)

Use this when the task is "add Gametegra SDK to this game":

1. **Inspect the game's structure** — `ls <game-folder>`. Plain HTML5/JS, Unity WebGL export, Godot Web export, or a bundler? This decides the install method (`references/installation.md`). Rename the folder if it's a meaningless placeholder (`1`, `2`) to something descriptive.
2. **Set up the build layout FIRST, not later.** If the game is flat/bundler-less (the common case), move runtime files (`index.html`, `style.css`, `js/`, `images/`, `sounds/`, `favicons/`, etc.) into a `src/` subfolder; keep `miniapp.yaml`, `LICENSE`, `logo.png` at the project root — this mirrors the official `gametegra version create --blank` scaffold. Doing this *after* wiring things up breaks live test links and forces a re-shuffle later — see `references/known-issues.md` #0.7 for the exact failure mode (self-inclusion zip bug) if this step is skipped or done wrong.
3. **Create/verify `miniapp.yaml`** — `source_path: "./src"`, `build_path: "./dist"` (siblings, neither nested in the other). **The mini-game must be created on DevPortal (developer.gametegra.com) manually first** — the CLI cannot create one; `gametegra connect` only links to an existing one and writes `miniappid` automatically. See `references/miniapp-yaml.md` and `references/known-issues.md` #1.
4. **Install the SDK** — see `references/installation.md` for the method matching step 1. Pin the CDN version if using ESM-from-CDN (don't use `@latest`).
5. **Add the init + readiness pattern** — see "Init pattern" below (timeout-safe, leak-free version).
6. **Wire the standard Game Over integration + any game-specific methods** — see `references/game-over-pattern.md` and the "Which method when" table in `references/game-methods.md`.
7. **Apply safe-area / lifecycle best practices** — `references/best-practices.md`.
8. **Clean up external requests** — the game must not call any origin besides the Gametegra SDK CDN. Remove Google Fonts, third-party analytics, dead/commented-out external calls. See `references/game-over-pattern.md` #9.
9. **Add a 256×256 `logo.png`** at the project root (next to `miniapp.yaml`, not inside `src/`). See "Logo" below.
10. **Set up local testing** — see `references/cli-publishing.md` "Testing" section. `gametegra serve`/`login`/`connect` cannot run from an agent shell (no TTY) — use the no-cache static server + manual `ngrok` alternative, or hand those commands to the user for their own terminal.
11. **Debug against real results, not doc assumptions** — especially `loadData`/leaderboard response shapes. See `references/known-issues.md` #0.
12. **`gametegra version build`** → `dist/miniapp.zip`. This command needs no TTY and can be run directly.
13. **Publish** — `gametegra login` → `connect` → `version push`, in the **user's own terminal** (TTY restriction, see `references/known-issues.md` #3). Give the exact commands; don't attempt to run them yourself.

## Logo — 256×256 `logo.png`

Every game gets a 256×256 `logo.png` at its root. There's no AI image generation tool in this environment, so use one of:

1. **Preferred: reuse the game's own existing icon.** Most web games already ship an app icon under `favicons/`, `icons/`, or `assets/` (`android-chrome-512x512.png`, `apple-touch-icon.png`, etc.). Find the largest square PNG and downscale it:
   ```bash
   sips -g pixelWidth -g pixelHeight <file>          # check dimensions
   sips -z 256 256 <largest-square-icon> --out logo.png
   ```
2. **Fallback if no icon exists**: extract the game's dominant color from its CSS, build a simple geometric placeholder (a colored shape + the game's first letter) as a small HTML/SVG file, screenshot it at a 256×256 viewport with a headless browser, save as `logo.png`. This is a geometric/typographic placeholder, not photorealistic art — say so explicitly to the user.

## Init pattern

```js
import { gameTegra } from 'https://cdn.jsdelivr.net/npm/@gametegra/sdk@<pinned-version>/dist/index.js'
// or, with a bundler: import { gameTegra } from '@gametegra/sdk'

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer))
}

try {
  await withTimeout(gameTegra.waitUntilReady(), 8000)
  // SDK ready — window.gameTegra is bound to a real host bridge
} catch {
  // No host bridge (plain browser) — test via `gametegra serve`, the VS Code Emulator,
  // or inside the SuperApp itself.
}
```

Wrap **every** SDK call with `withTimeout(...)`, not just `waitUntilReady` — without a host bridge, calls hang forever with no error. The one exception is `getSafeAreaInsets()`, which is synchronous and returns `{top:0,bottom:0,left:0,right:0}` immediately even with no host.

⚠️ Use the `clearTimeout`-cleaning version above, not a naive `Promise.race` — a version that doesn't clear the timer leaks a dangling timer per call (found in production after every SDK call accumulated one). See `references/known-issues.md`.

## Which method should I use, and when

- Score/progress persistence → `saveData({key, value})` / `loadData({key})` — **read the response-shape warning in `references/game-methods.md` before parsing `loadData`'s result.**
- Leaderboard → `createLeaderboard(...)` once → `updateLeaderboard({id, score})` / `getLeaderboard({id, limit})` — IDs are auto-prefixed with `{miniAppId}_`.
- Ads → `showAd({placement, adType, adKey})` — empty `adKey` always fails `invalid_ad_key`.
- Payments/IAP → `startPurchase(code)` — `code` must be a string matching `miniapp.yaml`'s `payment_packages[].code`; a numeric code always fails `invalid_payment_code`.
- User info/language → `getUserInfo()`, `getLanguage()`.
- Vibration → `vibrate()`.
- Notch/safe-area → `getSafeAreaInsets()` (sync) + CSS `--sa-*` custom properties — see `references/best-practices.md`.
- Multiplayer room → `createRoom`/`joinRoom`/`quickMatch`; in-room chat → `roomChat.join(roomName?)` — **`leaveRoom()` and `getScore()` are not yet supported by the host**, they always resolve with `{error: "Function not found"}`.
- Real-time custom data → `sendData`/`listenData`/`connectGame`; sensors → `readGyroscope`/`readAccelerometer` — stop the send side with `stopStream()`, the listen side with `stopListeningStream()` (not interchangeable).
- Virtual joystick/buttons (**JS/Web only**) → `controls.show(config)` or `<gametegra-joystick>`/`<gametegra-buttons>`.
- Custom backend function with no built-in SDK method → `custom(functionName, params)`, or define aliases with `setMethodMap()` + `callGameMethod()`.
- In-WebView debugging on mobile → `devConsole.show({interceptConsole: true})`.

Full parameter/response schemas: `references/game-methods.md`, `references/app-methods.md`, `references/stream-methods.md`, `references/room-chat.md`, `references/controls.md`, `references/dev-console.md`.

## Naming migration note

The SDK was previously named **SuperGame**. Legacy aliases still work but are deprecated:

| Old (deprecated)       | New                    |
| ------------------------ | ------------------------ |
| `window.supergame`         | `window.gameTegra`         |
| `SuperGameSDK`               | `GameTegraSDK`               |
| `createSuperGameSDK()`         | `createGameTegraSDK()`         |
| `supergameReady` event           | `gameTegraReady` event (or `onReady()`/`waitUntilReady()`) |

## Response shape convention (and where it lies)

Most host-backed methods resolve to:

```json
{ "onClientSuccess": true, "onHostSuccess": true, "data": { "...": "..." }, "errorMessage": null }
```

⚠️ Some calls resolve successfully even when the host fails — check `data.error`/`errorMessage`, not just promise resolution (`leaveRoom`, `getScore`, `reportEvent`, `reportMiniApp`). `getEnv()` breaks the wrapper convention entirely (resolves to the plain value). `getSafeAreaInsets()` is synchronous, not a Promise. And **`loadData`'s documented shape doesn't match the real host response** — see `references/known-issues.md` #0 before writing any code that reads it.
