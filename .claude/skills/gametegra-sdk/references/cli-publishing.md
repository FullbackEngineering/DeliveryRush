# CLI, Testing, and Publishing

Full path from an empty folder to a published mini-app version:

```
version create ──► edit miniapp.yaml ──► version build ──► version push ──► DevPortal
   (scaffold)         (configure)         (→ miniapp.zip)     (upload)        (review)
```

## Installing the CLI

```bash
# macOS (Homebrew)
brew install GameTegra/tap/gametegra

# Linux — Debian/Ubuntu
sudo dpkg -i gametegra_<version>_linux_amd64.deb
# Linux — any distro, from archive
tar -xzf gametegra_<version>_linux_amd64.tar.gz
sudo install -m 0755 gametegra /usr/local/bin/gametegra

# Windows: download the zip for your arch, extract gametegra.exe, add its folder to PATH
```

Verify:

```bash
gametegra about
```

**Environments (`prod`/`dev`/`uat`) are compile-time build tags — each is a separate binary.** There's no runtime flag to switch environments; install the binary built for the environment needed. `gametegra version` prints the environment that binary was built for.

## Command overview

| Command                                    | What it does                                          |
| -------------------------------------------- | -------------------------------------------------------- |
| `gametegra version create --blank <path>`     | Scaffold a new blank mini-app project                    |
| `gametegra version build`                     | Package the project into `build/miniapp.zip`              |
| `gametegra version push`                      | Create and upload a new version to DevPortal              |
| `gametegra serve`                              | Serve the local build to a device over ngrok (port 2222)  |
| `gametegra connect`                            | Pair/connect a mini-app                                    |
| `gametegra login` / `gametegra logout`         | Authenticate                                                |
| `gametegra whoami`                              | Show the active account                                     |
| `gametegra doctor`                              | Diagnose project & environment configuration                |
| `gametegra update`                              | Download and install the latest CLI release                 |
| `gametegra version`                             | Print CLI version/build info (script-friendly, one line)    |
| `gametegra about`                               | Version, build, environment, DevPortal endpoint             |

## ⚠️ Read this before running any command from an agent/CI shell

**`gametegra login`, `whoami`, `connect`, and `serve` all require a real controlling terminal (`/dev/tty`).** In any environment without one — CI, `ssh -T`, automation tools, **and AI-agent shells including Claude Code's Bash tool** — they crash with `Error running program: open /dev/tty: device not configured`.

**Practical consequence:** don't attempt these four commands from an agent's Bash tool — they will fail. Give the exact commands to the user to run in their own terminal instead. The one exception is `push`, which supports a non-interactive/CI mode via `--version`/`--comment`/`--yes` flags — but still generally needs `login`/`connect` to have already happened in a real terminal first.

**`gametegra version build` is the one command with no TTY requirement** — an agent can run it directly.

**A mini-game must be created on DevPortal (developer.gametegra.com) manually first — the CLI cannot create one.** `gametegra version create --blank` only scaffolds local files and never touches the backend. `gametegra connect` only *lists/links* existing mini-games ("There are no mini-games here!" with no further guidance on an empty account). `gametegra version push` fails immediately if `miniappid` is missing rather than creating a new registration.

**Correct flow:** create the mini-game in the DevPortal UI → `gametegra connect` from the local project (writes `miniappid` into `miniapp.yaml` automatically) → then `build`/`push`.

Also note: `gametegra version push --help` text says *"Create a new mini-game version..."*, which reads as if the first push will also create the mini-game — it won't. Without `miniappid` already set, `push` fails with `miniappid field not found on miniapp.yaml file. Run 'gametegra connect' first`.

## Step-by-step

### 1. Scaffold

```bash
gametegra version create --blank ./my-game
cd my-game
```

Creates:

```
my-game/
├── src/
│   └── index.html
├── build/
└── miniapp.yaml
```

Edit `src/` for the game, configure `miniapp.yaml` for runtime and packaging (see `references/miniapp-yaml.md`).

### 2. Configure `miniapp.yaml`

Set packaging keys and any payment packages:

```yaml
miniappid: "2037673912111730688"
build_path: "./build"
build_name: "miniapp.zip"
source_path: "./src"
offered_age_rating: 12

payment_packages:
  - code: "premium_pack"
    amount: 100
    display_name: "Premium Pack"
    description: "Unlocks all levels"
```

### 3. Test before shipping

Real device (most faithful — real bridge behavior for payments, camera, streams, consent prompts):

```bash
gametegra doctor          # confirm environment first
gametegra serve           # starts local server on port 2222 + ngrok tunnel + prints a QR code
```

Scan the QR from the host app on the device. Every local change is picked up on next reload — no rebuild/re-push needed. Can also pair explicitly with `gametegra connect`.

For fast UI iteration without a device, use the **VS Code Emulator** (see below) instead — it's faster to iterate with but mocks the bridge rather than using the real host.

### 4. Build the package

```bash
gametegra version build
# → build/miniapp.zip
```

By default packages `source_path` → `build_path`/`build_name` from `miniapp.yaml`. Override explicitly:

```bash
gametegra version build -i ./src -o ./build/miniapp.zip
```

### 5. Push the version

```bash
gametegra login          # if not already signed in
gametegra version push
```

| Flag                      | Description                                       |
| --------------------------- | ---------------------------------------------------- |
| `-i, --input`                | ZIP to upload (default `build/miniapp.zip`)          |
| `--age-rating`                | Requested age rating (4, 9, 12, 17)                  |
| `--copy-packages-from`        | Copy payment packages from another version ID        |
| `--payment-overwrite`         | Overwrite existing payment packages                  |

### 6. Review on DevPortal

After a successful push the new version appears on DevPortal (https://developer.gametegra.com) for review/release. Run `gametegra whoami` to confirm the account pushed under.

## Diagnostics — `gametegra doctor`

Run this first whenever something is misbehaving:

```bash
gametegra doctor
# ✓ token       user@example.com
# ✓ ngrok       found
# ✓ miniapp.yaml loaded
```

| Failed check    | Fix                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| `token`             | Run `gametegra login` — session may have expired                            |
| `ngrok`              | Install ngrok, make sure it's on `PATH`                                     |
| `miniapp.yaml`       | Run `gametegra version create --blank <path>` or add a valid `miniapp.yaml` |

`gametegra doctor --skip-network` runs checks offline (skips token validation).

## Testing on a real device — details

Prerequisites: CLI installed + logged in (`gametegra login`), `ngrok` installed and on `PATH`, host app installed and signed into the same account.

1. `gametegra serve` — local server on port 2222, ngrok tunnel, prints QR code. **Requires a real TTY — cannot be run from an agent/CI shell**, see the warning at the top of this file.
2. Scan QR from host app (or `gametegra connect` to pair explicitly).
3. Iterate: edit source → reload on device → observe real bridge behavior (payments, camera, streams, consent prompts) — this is the only faithful way to test device-only features the emulator can only mock.

⚠️ **Verified CLI bug: `serve` can fail with `ERR_NGROK_3004`** (`The server returned an invalid or incomplete HTTP response`) even with a completely healthy project, account, and network — confirmed by: (1) ruling out a missing `miniappid` (still failed after one was set and a version was pushed), (2) ruling out project content (a totally empty `version create --blank` scaffold reproduced it too), (3) confirming the machine/ngrok setup itself is fine (`python3 -m http.server` + plain manual `ngrok http <port>` worked flawlessly with the exact same ngrok install). The bug lives inside `gametegra serve`'s own implementation (`lsof -i:2222` shows nothing listening — the response never reaches an OS-level TCP port). If a user hits this, don't spend time debugging the project — run `gametegra doctor` to rule out the basics, then treat it as a known platform bug to report, and fall back to the manual alternative below.

### Agent-shell alternative: no-cache static server + manual ngrok

Since `gametegra serve` needs a TTY an agent doesn't have, and can independently hit `ERR_NGROK_3004`, this is the verified working alternative an agent *can* set up (only the final "open this link and tap around" step needs the user):

```python
# no-cache-server.py
import http.server, functools

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

Handler = functools.partial(NoCacheHandler, directory="<game-folder>/src")
http.server.test(HandlerClass=Handler, port=8931)
```

```bash
nohup python3 no-cache-server.py > /tmp/<game>-server.log 2>&1 & disown
nohup ngrok http 8931 --log=stdout > /tmp/<game>-ngrok.log 2>&1 & disown
curl -s http://127.0.0.1:4040/api/tunnels   # read the public_url from here (try 4041 if 4040 is taken)
```

⚠️ **Don't use plain `python3 -m http.server`** for this — it sends no `Cache-Control` header (only `Last-Modified`), and the SuperApp's WebView can aggressively cache on that alone. Symptom: the user reports "still seeing the old bug" *after* a real fix and server restart, purely because the WebView served a stale cached copy. The explicit `no-store` handler above avoids this entirely. If a user reports a fix "not working" right after you tell them it's fixed, suspect this cache before suspecting the code — also worth suggesting they fully close and reopen the mini-app inside the SuperApp (not just an in-page reload), which clears a native-level cache layer too.

The ngrok public URL stays stable across server restarts — after a code change, just restart the local server; no need to give the user a new link, only "refresh" or "close and reopen the mini-app."

## VS Code Emulator

A VS Code extension rendering a mobile-device preview with a **mocked SDK bridge** — the fastest way to iterate on UI/SDK calls without a device or host app. For device-faithful behavior, use real-device testing instead.

Install:

```bash
code --install-extension gametegra-emulator.vsix
```

Then open the mini-app project folder in VS Code and launch the device preview from the command palette or the extension view. Command: **`GameTegra: Open Emulator`**; also available from the **"GameTegra"** icon in the Activity Bar.

⚠️ **Undocumented but required:** the extension needs the user to **log in**, then **connect** to a mini-app from its own sidebar/panel UI before the preview works — this flow isn't in the official docs.

⚠️ **Port auto-detection is limited to specific ranges** — if the local dev server isn't on one of `2222`, `3000-3003`, `4000-4200`, `5000/5001/5173/5174`, `8000/8001/8080/8081/8888`, `9000/9001`, `10000`, the emulator's "Detect Port" feature won't find it. Use a port in one of these ranges for the local test server.

The preview loads the mini-app in an iframe styled as a mobile device. `window.gameTegra` is present, backed by a mock bridge — `getUserInfo()`, `createRoom()`, `saveData()`, streams, room chat all resolve with realistic responses, no host app required. Lifecycle events (background/foreground) can be triggered from preview controls. Under the hood, native methods (`getUserInfo`, `vibrate`, `getSafeAreaInsets`, etc.) and Game Methods (`saveData`, leaderboard, `showAd`, `createRoom`, etc.) go through **two different mock layers** — an injected bridge object and a `CustomMethod` namespace — which is why per-method overrides in `mocks.json` sometimes need the `methods` key rather than a top-level key.

This is also a useful isolation tool for performance debugging: if a game reports slowdown after adding the SDK, and the same slowdown does **not** reproduce in the emulator (mock bridge, none of the real host's background activity), that strongly points to the real host/device rather than the game's code — the obfuscated SDK bundle's own background activity (WebSocket/bridge/sensor work) can't be inspected directly since the source is obfuscated, so this comparison is the fastest way to rule code in or out.

### Overriding mock responses

Create `.gametegra/mocks.json` at the **workspace root**. The emulator watches it live — saving updates the preview instantly, no reload. Point elsewhere with the `gameTegraEmulator.mockConfigPath` setting.

```json
{
  "latencyMs": 200,
  "userInfo": { "name": "Test Player", "age": 30 },
  "params": { "gameId": "local-123" },
  "env": { "apiBaseUrl": "http://localhost:8080" },
  "streams": { "gyroscope": { "intervalMs": 100 } }
}
```

| Key           | Type   | Effect                                                         |
| --------------- | ------ | ------------------------------------------------------------------ |
| `latencyMs`       | number | Simulated bridge latency for every call                             |
| `userInfo`         | object | Merged over the default `getUserInfo` response                      |
| `params`            | object | Key → value map returned by `getParams`                             |
| `env`                | object | Key → value map returned by `getEnv`                                |
| `streams`             | object | Per-stream tuning, e.g. `{ "gyroscope": { "intervalMs": 100 } }`   |
| `methods`              | object | Per-method overrides (e.g. custom latency or response)              |

Anything not overridden falls back to generated defaults.

## Troubleshooting publishing

Run `gametegra doctor` — catches the most common blockers: expired token, missing `miniapp.yaml`, invalid mini-app ID/source path.
