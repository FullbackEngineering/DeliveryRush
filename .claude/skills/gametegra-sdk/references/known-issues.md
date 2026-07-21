# Known Issues — Gametegra CLI/Docs Gaps

Found while setting up a real game project, integrating the VS Code Emulator, and doing a first real publish with the CLI (2026-07-13, plus follow-up verification on 2026-07-16 against a real host). Individual warnings from this file are also cross-linked inline into the relevant reference file (`references/game-methods.md`, `references/cli-publishing.md`, `references/miniapp-yaml.md`, `references/installation.md`) so they surface right where the method/command is documented — this file is the consolidated version for a full pre-flight read.

## 0. `loadData` response shape differs from the docs — `data.data` is NOT an array

**Verified 2026-07-16 against a real host.** The official docs (`references/game-methods.md`, mirroring `api/game-methods.md`) show `loadData`'s response as:
```json
{ "data": { "success": true, "data": [ { "key": "...", "value": {...}, "...": "..." } ] } }
```
i.e. `data.data` is an **array**. The real response captured live from a real host is:
```json
{ "data": { "success": true, "data": { "key": "demo_save", "value": {...}, "...": "..." } } }
```
`data.data` here is a **single object**, not an array. Code that indexes `res.data.data[0]` (trusting the docs) always gets `undefined` — silently, with no exception anywhere, indistinguishable from "no data has ever been saved". This is the single sneakiest bug category possible here, because nothing errors.

**Rule:** always handle both possible shapes when reading `loadData`'s result:
```js
function extractLoadDataEntry(res) {
  const d = res?.data?.data
  if (Array.isArray(d)) return d[0]
  if (d && typeof d === 'object') return d
  return undefined
}
```
This is already baked into the `handleHighScore` template in `references/game-over-pattern.md` #4 — copy from there for a new game, don't re-derive.

**Verification method (reliable even without real host access):** intercept the SDK module the game imports via `page.route()` (Playwright) and swap in a mock module that mirrors real captured responses exactly, then test the full flow end-to-end. Testing only "does it time out gracefully without a host" isn't enough — the *shape* of a real response can only be confirmed against real data (or a mock that faithfully mirrors it).

## 0.5. Manual ngrok tunnel + plain static server risks aggressive caching

**Verified 2026-07-16.** When `gametegra serve` can't be used because it needs a TTY (see #3), the fallback — `python3 -m http.server` + manual `ngrok http <port>` — has a trap: **the SuperApp's WebView can cache old JS/HTML even after a fix and a server restart**, so a user can report "still broken" after being told it's fixed. Python's `http.server` sends no `Cache-Control` header by default (only `Last-Modified`), which some WebViews treat as cacheable via heuristics. The official `gametegra serve` flow ("every change is picked up on the next reload") almost certainly handles cache-busting internally — a manual tunnel does not give that guarantee.

**Fix:** always run the manual test server with explicit cache-forbidding headers:
```python
import http.server, functools

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

Handler = functools.partial(NoCacheHandler, directory="<game-folder>")
http.server.test(HandlerClass=Handler, port=<port>)
```
Use this instead of `python3 -m http.server <port>` — especially check this (not the code) first if a user reports the same bug *after* saying "fixed it, try again". Also suggest fully closing and reopening the mini-app inside the SuperApp (not just an in-page reload), which clears a native-level cache too.

## 0.6. For "the game got slower" reports, check which SDK calls run when, first

After adding Gametegra integration, a user might report general slowdown. Check in this order:
1. **Which SDK calls run during ACTIVE GAMEPLAY (every frame/every tap)?** The standard game-over pattern (`references/game-over-pattern.md`) only fires at game-over — it should never touch the active gameplay loop. Verify that the functions `hookGameEngine()` wraps (`gameLost`, `updateLevel`, `levelPassed`, etc.) are really only called at level/game transitions, not on a per-frame/per-tap function.
2. **If the safe-area CSS change (`top`/`bottom` + `var(--sa-*)`) is suspected**, compare forced-reflow cost between the old (`height:100%`) and new CSS with a micro-benchmark (loop reading `offsetWidth`/`offsetHeight` while toggling styles, timed with `performance.now()`). In one real test, 2000 forced-reflow iterations showed no measurable difference between the two CSS approaches (~24–25ms either way) — so this change is unlikely to be the cause; look elsewhere.
3. **What's left is likely outside the code**: background work inside the obfuscated SDK bundle (WebSocket/bridge/sensor activity — can't be inspected, source is obfuscated), the real device's thermal/performance state, or general SuperApp weight. Fastest isolation: **reproduce the same slowdown in the VS Code Emulator** (mock bridge, none of the real host's background activity) — if it's fine there, that's strong evidence the cause is the real host/device, not the game's code.

## 0.7. `gametegra version build` — verified source/zip packaging behavior

**Verified 2026-07-16 against the real CLI.**

- If `source_path` isn't set in `miniapp.yaml`, the CLI **defaults to looking for `src/`** and fails with `failed to read files under src: lstat src: no such file or directory` if it's missing. If the game's files sit flat at the project root (no bundler/scaffold used), `source_path` must be set explicitly.
- **Never set `source_path` to the entire project root (`"."`)** — if `build_path` also lives under the project root (e.g. `./dist`), the zip **packages itself into itself** (as a 0-byte copy, because the CLI creates the output file before scanning `source_path`, then finds that same file while scanning). Project-metadata files like `.git`, `.gitignore`, `.DS_Store`, `LICENSE` also leak into the package (the CLI doesn't read/respect `.gitignore`).
- **Correct fix: mirror the official `gametegra version create --blank` scaffold** — keep `miniapp.yaml` at the project **root**, move game assets (`index.html`, `style.css`, `js/`, `images/`, `sounds/`, `favicons/`) into a separate `src/` subfolder, use `source_path: "./src"` + `build_path: "./dist"` (both at root level, sibling folders, neither nested in the other). This both eliminates self-inclusion and automatically excludes project-metadata files (since they live outside `src/`).
- **The CONTENTS of `source_path` get flattened to the zip's ROOT** — `src/index.html` ends up as `index.html` in the zip, not `src/index.html`. Root-relative paths in `index.html` (like `/favicons/...`) keep working fine because of this.
- **`miniapp.yaml` is NOT included in the zip** — despite the docs saying it "must be placed at the root of your project (and the packaged ZIP)", the real `version build` output doesn't include it. Runtime config (menuButton, orientation, env) is probably uploaded through a separate metadata channel during `version push`, with the Engine reading it from the platform's own database rather than the zip — unconfirmed, just observed from the build output.
- `.DS_Store` files can still end up under folders like `favicons/`/`sounds/` (harmless but not clean) — clean up before building if desired: `find <src> -name ".DS_Store" -delete`.

## 1. The mini-game must be created manually on DevPortal — the CLI can't create one

`gametegra version create --blank` only scaffolds **local files**, it never touches the backend. `gametegra connect` only **lists existing** mini-games ("There are no mini-games here!" — no further guidance on an empty account). `gametegra version push` fails immediately if `miniappid` is missing, it never creates a new registration.

**Correct flow:** create the mini-game via developer.gametegra.com (DevPortal) → `gametegra connect` to link the local project (`miniappid` gets written into `miniapp.yaml` automatically).

## 2. `gametegra version push --help` text is misleading

The help text says *"Create a new mini-game version..."*, which reads as if the first push will also create the mini-game. In reality `miniappid` is a hard prerequisite — without it, `push` fails directly with `miniappid field not found on miniapp.yaml file. Run 'gametegra connect' first`.

## 3. CLI commands need a real TTY — won't run in CI/automation/agent shells

`gametegra login`, `whoami`, `connect`, `serve` all require a real controlling terminal (`/dev/tty`). In any environment without one (CI, `ssh -T`, automation tools, **AI agent shells — including this Claude Code session**), they crash with `Error running program: open /dev/tty: device not configured`.

**Practical consequence:** don't attempt these from Claude Code's Bash tool — they'll crash. They need to run in the user's own terminal. Exception: `push` supports a non-interactive/CI mode via `--version`/`--comment`/`--yes` flags; no other command has an equivalent.

## 4. `gametegra serve` — verified CLI bug: `ERR_NGROK_3004`

`serve` appears to run normally (ngrok tunnel opens) but the connection drops with `ERR_NGROK_3004: The server returned an invalid or incomplete HTTP response`.

**Root cause narrowed down (2026-07-13, confirmed not a project/user error):**
1. A missing `miniappid` was ruled out — the same failure persisted after adding one and pushing a version.
2. Project content was ruled out — a completely empty `gametegra version create --blank` scaffold reproduced the same error.
3. Control test: on the same machine, `python3 -m http.server 8080` + manual `ngrok http 8080` with **no `gametegra` involvement at all** worked flawlessly — ngrok install/authtoken/account/network/machine are all completely healthy.
4. Conclusion: the bug is inside `gametegra serve`'s own implementation (likely using ngrok's Go SDK embedded/in-process and mishandling the tunnel-to-local-handler binding — `lsof -i:2222` is consistently empty, meaning the response never reaches an OS-level TCP port at all).

**Practical consequence:** if `serve` throws this, run `gametegra doctor` for basic sanity first, then tell the user this is a known platform bug that should be reported to the Gametegra/Approom team with repro steps — there's nothing to fix on the project side.

## 5. VS Code Emulator — undocumented internal mechanics

- Command: **`GameTegra: Open Emulator`** (command palette), Activity Bar icon: **"GameTegra"**.
- Ports the local server auto-detection scans: `2222`, `3000-3003`, `4000-4200`, `5000/5001/5173/5174`, `8000/8001/8080/8081/8888`, `9000/9001`, `10000`. A dev server outside these ranges won't be found by "Detect Port".
- Native methods (`getUserInfo`, `getLanguage`, `vibrate`, `getSafeAreaInsets`, etc.) and Game Methods (`saveData`, `loadData`, leaderboard, `showAd`, `createRoom`, etc.) go through **two different mock layers**: one is an injected bridge object, the other is the `CustomMethod` → `custom-methods/supergame.js` namespace.
- The extension requires the user to **log in**, then **connect** to a mini-app from the extension's own sidebar/panel UI before it works — this step lives entirely in the extension's own flow and isn't covered in the official docs at all.

## 6. The CDN/npm package is obfuscated — this is expected

`@gametegra/sdk`'s `dist/index.js` is heavily obfuscated (string-array + decoder function, hex variable names) — almost certainly client-side tamper protection for payments/leaderboards. This can look like a supply-chain risk at first glance, but it checks out as benign (verified via Playwright in a sandbox: inspected network/localStorage/cookie/WebSocket access, nothing malicious).

## Pre-integration quick checklist

Verified end-to-end on a real game (2026-07-16):

- [ ] Is the game folder meaningfully named (not `1`, `2`, etc.)? If not, rename it first.
- [ ] Is the game flat/bundler-less? If so, move it into a `src/` subfolder **at the very start**, keep `miniapp.yaml` at the root — doing this later (after deferring to the build step) breaks the live test link and forces a re-shuffle (#0.7).
- [ ] Does the mini-game exist on DevPortal yet? If not, create it there first — `gametegra connect` only works after that.
- [ ] Point TTY-requiring commands (`login`/`connect`/`serve`) at the user's own terminal — don't try them from Claude Code's Bash tool. `gametegra version build` is the exception — no TTY needed, an agent can run it directly.
- [ ] If `serve` throws `ERR_NGROK_3004`, don't spend time debugging the project — it's a known bug; inform the user. Fall back to a no-cache static server + manual `ngrok http <port>` (#0.5).
- [ ] Any manual ngrok/static-server test setup **must** send `Cache-Control: no-store` — otherwise a user can keep seeing old behavior even after being told "fixed" (#0.5).
- [ ] When reading `loadData`/leaderboard responses, don't blindly trust the docs' array/object assumptions — the real host can differ (#0). Where possible, ask the user to capture a real log from their own test panel and validate against it.
- [ ] A local static server (`python3 -m http.server`) is only good for UI/layout testing — SDK responses need the VS Code Emulator or `gametegra serve`.
- [ ] Before `gametegra version build`, confirm `source_path`/`build_path` are set in `miniapp.yaml`. If unset, the CLI looks for `src/` and fails; never set `source_path` to the whole project root (`"."`) — that causes self-inclusion (#0.7).
