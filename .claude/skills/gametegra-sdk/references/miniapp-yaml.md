# miniapp.yaml Configuration

Every mini-app has exactly one `miniapp.yaml` at the **root** of the project (and of the packaged ZIP). It has two kinds of keys:

- **Runtime keys** — read by the Engine at load time (menu button, orientation, external runtime, env values). If the file is missing, the Engine falls back to defaults.
- **Packaging & publishing keys** — read by the `gametegra` CLI on `version build` / `version push` (build paths, mini-app ID, payment packages).

```
your-miniapp/
├── miniapp.yaml      ← here, at project root
├── src/
│   ├── index.html
│   ├── game.js
│   └── assets/
└── build/
    └── miniapp.zip
```

## Runtime keys (read by the Engine)

```yaml
name: "My Puzzle Game"

menuButton:
  enabled: true
  opacity: 1.0
  color: "#6200EE"
  position: "top-right"

externalRuntime:
  name: "godot"
  version: "4.2"
  fileName: "index.wasm"

orientation: "portrait"

env:
  apiBaseUrl: "https://api.example.com"
  buildMode: "production"

skipExternalRuntimeInject: false
```

### `name` / `title`
Display name. Engine reads `name`, falling back to `title` if absent.

### `menuButton`
Floating menu button on top of the mini-app (lets users return to the main app).

| Field      | Type    | Default          | Description                     |
| ---------- | ------- | ---------------- | -------------------------------- |
| `enabled`  | boolean | `true`           | Show/hide the button             |
| `opacity`  | number  | `1.0`             | 0.0–1.0                          |
| `color`    | string  | platform default | Hex color, e.g. `"#6200EE"`      |
| `position` | string  | `"top-right"`     | `top-right` / `top-left` / `bottom-right` / `bottom-left` |

**If `enabled: false`, the mini-app MUST provide its own exit path** (e.g. an in-game back/menu button) or users can get stuck.

### `externalRuntime`
Declare a shared external engine runtime so the platform injects it from a shared cache instead of bundling it (much smaller download).

| Field      | Type   | Required | Default        |
| ---------- | ------ | -------- | --------------- |
| `name`     | string | yes      | —                |
| `version`  | string | no       | engine default   |
| `fileName` | string | no       | engine default   |

Supported: `godot` (default version `4.2`, file `index.wasm`), `threejs` (default version `r158`, file `three.min.js`).

⚠️ `version`/`fileName` must match the actual runtime files the mini-app was built with, or you get runtime errors.

### `orientation`
`"portrait"` | `"landscape"` | `"auto"` (default). Locks/unlocks the device screen while the mini-app is open, restores default on close. Only applies to ZIP-mode apps with a `miniapp.yaml`; can also be set at runtime via `gameTegra.requestOrientation()` (JS/Web only, see `references/app-methods.md`).

### `env`
String map exposed at runtime via `gameTegra.getEnv()`. All values are strings; reads are consent-free.

```yaml
env:
  apiBaseUrl: "https://api.example.com"
  buildMode: "production"
```

```js
const apiUrl = await gameTegra.getEnv('apiBaseUrl')
const all = await gameTegra.getEnv()   // { apiBaseUrl, buildMode }
```

### `skipExternalRuntimeInject`
Boolean, default `false`. If `true`, the Engine skips shared-runtime injection and uses the bundled runtime instead.

## Packaging & publishing keys (managed by the CLI)

Consumed by `gametegra version build` / `gametegra version push`. Usually created by `gametegra version create --blank` and then edited.

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

payment_package_import:
  mode: "copy"
  source_miniapp_version_id: 123
  overwrite: false
```

| Key                       | Type   | Description                                                     |
| -------------------------- | ------ | ------------------------------------------------------------------ |
| `miniappid`                | string | Mini-app's unique ID on DevPortal                                  |
| `build_path`                | string | Output directory for the built ZIP (default `build/`)              |
| `build_name`                | string | Built ZIP file name (default `miniapp.zip`)                        |
| `source_path`               | string | Directory packaged into the ZIP                                    |
| `offered_age_rating`        | number | Requested age rating: `4`, `9`, `12`, or `17`                       |
| `payment_packages`          | list   | Payment packages for this version                                  |
| `payment_package_import`    | object | Import payment packages from another version instead of defining them |

⚠️ **`source_path` has no default — if unset, the CLI looks for a `src/` folder and fails hard** (`failed to read files under src: lstat src: no such file or directory`) if the game's files sit flat at the project root instead. Always set `source_path` explicitly for games that weren't created by `gametegra version create --blank`.

⚠️ **Never set `source_path` to the whole project root (`"."`) while `build_path` also lives under the project root** (e.g. `./dist`) — the CLI writes the output ZIP first, then scans `source_path`, and ends up packaging the ZIP into itself (a 0-byte self-inclusion), plus sweeping in `.git`, `.gitignore`, `.DS_Store`, `LICENSE`, etc. (the CLI doesn't respect `.gitignore`). **Correct layout:** `miniapp.yaml` at the project root, game assets moved into a `src/` subfolder, `source_path: "./src"` and `build_path: "./dist"` as sibling folders (neither nested in the other) — this both avoids self-inclusion and keeps project-metadata files out automatically, since they live outside `src/`.

⚠️ **The contents of `source_path` are flattened to the ZIP root** — `src/index.html` becomes `index.html` at the top of the zip, not `src/index.html`. Root-relative paths in `index.html` (e.g. `/favicons/...`) keep working correctly because of this.

⚠️ **`miniapp.yaml` itself is *not* included in the built ZIP**, despite the "must be placed at the root of your project (and the packaged ZIP)" wording above — observed directly from real `version build` output. Runtime config (`menuButton`, `orientation`, `env`) is likely uploaded to DevPortal through a separate metadata channel on `version push` rather than read from the ZIP contents by the Engine, but this isn't confirmed — just observed.

### `payment_packages[]`

| Field          | Type   | Description                                          |
| --------------- | ------ | ------------------------------------------------------ |
| `code`           | string | Passed to `gameTegra.startPurchase(code)`               |
| `amount`         | number | Price amount                                             |
| `display_name`   | string | Human-readable package name                              |
| `description`    | string | Package description                                      |

The `code` set here is **exactly** the string passed to `gameTegra.startPurchase(code)` — amounts are configured here, never passed at call time (`startPurchase` only takes a code, and passing a number instead of a code string always fails).

### `payment_package_import`

| Field                       | Type    | Description                              |
| ---------------------------- | ------- | ------------------------------------------ |
| `mode`                        | string  | Import mode                                |
| `source_miniapp_version_id`   | number  | Version ID to copy payment packages from   |
| `overwrite`                   | boolean | Whether to overwrite existing packages     |
