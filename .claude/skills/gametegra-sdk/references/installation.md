# Installation

## JavaScript (Web)

```bash
npm install @gametegra/sdk
```

```js
import { gameTegra } from '@gametegra/sdk'
// default export is the same shared singleton
import gameTegra from '@gametegra/sdk'

const userInfo = await gameTegra.getUserInfo()
```

Other named exports:

```js
import { GameTegraSDK, createGameTegraSDK } from '@gametegra/sdk'

// Create your own unshared instance if needed
const sdk = createGameTegraSDK()
```

Importing the module attaches the shared singleton to `window.gameTegra` as a side effect.

### Without a bundler (ESM)

The package ships an ES-module build at `dist/index.js`. Import it directly from a module script — no bundler required:

```html
<script type="module">
  import { gameTegra } from '/vendor/gametegra-sdk/index.js'
  gameTegra.onReady(() => {
    gameTegra.getUserInfo().then(console.log)
  })
</script>
```

**Fastest path for a plain HTML5/JS game with no build step:** import straight from a CDN (verified working in production):

```html
<script type="module">
  import { gameTegra } from 'https://cdn.jsdelivr.net/npm/@gametegra/sdk@0.3.8/dist/index.js'
</script>
```

⚠️ **Pin the version explicitly** (e.g. `@0.3.8`) — never use `@latest` in a shipped game; an unannounced SDK update could silently break behavior between test and publish.

The production bundle (CDN or npm) is heavily obfuscated (string-array + decoder, hex variable names) — this is expected/normal (almost certainly client-side tamper protection for payments/leaderboards), not a supply-chain red flag.

### SDK readiness check (always do this first)

```js
// Method 1: onReady callback
gameTegra.onReady((detail) => { console.log('SDK ready') })

// Method 2: await a Promise
const detail = await gameTegra.waitUntilReady()

// Method 3: check the flag
if (gameTegra.ready) { /* already ready */ }
```

## Unity

1. Create `Packages/com.gametegra.sdk` in the Unity project.
2. Copy the SDK files into that folder — Unity auto-detects the package.

```csharp
using GametegraSDK;

var userInfo = await gameTegra.getUserInfo();
```

**Only works in WebGL builds.** In the Editor it returns simulated responses — don't rely on Editor output to validate real behavior; test WebGL builds via the CLI (`references/cli-publishing.md`).

## Godot

1. Copy `addons/gametegra_sdk/` into the project.
2. Project → Project Settings → Plugins → enable **Gametegra SDK**.
3. The plugin auto-registers a `gameTegra` autoload singleton.

```gdscript
# gameTegra is available as an autoload, no import needed
var user_info = await gameTegra.getUserInfo()
```

**Only works in Web exports.**

## Which one to pick

- Plain HTML5/Canvas/WebGL game not using a big engine → JavaScript SDK.
- Unity project targeting WebGL → Unity SDK (must build WebGL to test for real).
- Godot project targeting Web → Godot SDK (must export Web to test for real).

Whichever is used, the `externalRuntime` key in `miniapp.yaml` (see `references/miniapp-yaml.md`) should match: `godot` or `threejs` if applicable, so the platform can inject a shared runtime cache instead of bundling it.
