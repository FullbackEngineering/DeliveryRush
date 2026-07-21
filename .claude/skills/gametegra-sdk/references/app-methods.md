# App Methods (Native Features)

Host SuperApp interactions: user info, device features, navigation, lifecycle.

## getUserInfo

```ts
gameTegra.getUserInfo()
```
Response `data`: `{ name, surname, email, age }`.

## getLanguage

```ts
gameTegra.getLanguage()
```
Response `data`: `{ appLanguage, deviceLanguage }`.

## requestLocation

```ts
gameTegra.requestLocation()
```
Device GPS location. Response `data`: `{ latitude, longitude }`.

## capturePhoto

```ts
gameTegra.capturePhoto()
```
Opens the camera, returns a base64 JPEG. Response `data`: `{ base64 }` (`data:image/jpeg;base64,...`).

## pickImage

```ts
gameTegra.pickImage()
```
Opens the gallery for image selection. Response `data`: `{ base64 }`.

## startPurchase

```ts
gameTegra.startPurchase(code)
```
Initiates payment for a configured package. `pay()` is a **deprecated alias**.

⚠️ **`code` must be a string.** The Engine requires the package's string code (defined in `miniapp.yaml` → `payment_packages[].code`, see `references/miniapp-yaml.md`); passing a number always fails with `invalid_payment_code`.

```js
gameTegra.startPurchase('premium_pack')
```

| Param  | Type   | Required | Description                                             |
| ------- | ------ | -------- | ----------------------------------------------------------- |
| `code`     | string  | Yes       | Payment package code configured on the MiniApp version on DevPortal |

Response `data`: `{ status, success, error?, error_code?, details? }`.

## getParams

```ts
gameTegra.getParams(key)
```
Retrieves a launch parameter by key. The response key **mirrors the requested key** — there's no fixed `value` field. A missing key resolves with `{ error: 'Parameter not found' }`, `status: false`.

```js
gameTegra.getParams('gameId')
// data: { gameId: "abc123" }
```

## reportEvent

```ts
gameTegra.reportEvent({ eventType, data })
```
Custom analytics event.

⚠️ Host-side failures land inside `data.error` while the promise still **resolves** — always check `data.error`, don't assume resolution means success.

```js
gameTegra.reportEvent({ eventType: 'level_complete', data: { level: 5, score: 1200 } })
```

| Param       | Type   | Required |
| ------------ | ------ | -------- |
| `eventType`     | string  | Yes       |
| `data`            | object  | No        |

## reportMiniApp

```ts
gameTegra.reportMiniApp({ type, message, meta })
```
Submits a report/feedback about a user or the mini-app itself. Same caveat as `reportEvent` — check `data.error`.

```js
gameTegra.reportMiniApp({
  type: 'report', message: 'Cheating',
  meta: { target_type: 'user', target_user_id: 'user_abc' }
})
```

| Param     | Type                    | Required |
| ---------- | -------------------------- | -------- |
| `type`        | `'report' \| 'feedback'`      | Yes       |
| `message`       | string                          | Yes       |
| `meta`            | object                            | No        |

## callMethod

```ts
gameTegra.callMethod(name, params)
```
Calls a custom method exposed by the host app by name. Same double-consent rule as `custom()` (see `references/game-methods.md`). JS/Web only.

```js
gameTegra.callMethod('getInventory', { userId: '123' })
```

## getEnv

```ts
gameTegra.getEnv(key?)
```
Reads values from `miniapp.yaml`'s `env` map (see `references/miniapp-yaml.md`). **Consent-free** — `Env` is a system module, never prompts.

⚠️ **Different response shape from everything else**: resolves to the **plain value** directly — the full env map (no key) or a single string (with key) — **not** the `{ onClientSuccess, data, ... }` wrapper. A missing key rejects with the standard wrapper, `errorMessage: 'Environment value not found'`.

```js
const apiUrl = await gameTegra.getEnv('apiBaseUrl')   // "https://api.example.com"
const all = await gameTegra.getEnv()                    // { apiBaseUrl, buildMode }
```

## showLoading / hideLoading

```ts
gameTegra.showLoading()
gameTegra.hideLoading()
```
Shows/hides the host app's loading spinner. Synchronous, no params.

## vibrate

```ts
gameTegra.vibrate()
```
Triggers haptic feedback. Synchronous, no params.

## getSafeAreaInsets

```ts
gameTegra.getSafeAreaInsets()
```
⚠️ **Synchronous** — reads from `window.__superappSafeArea` directly, no bridge round-trip, no `await` needed.

```js
const insets = gameTegra.getSafeAreaInsets()
// { top: 47, bottom: 34, left: 0, right: 0 }
```

See `references/best-practices.md` for the full safe-area usage pattern (critical for notch/Dynamic Island handling).

## close

```ts
gameTegra.close()
```
Completely closes and unmounts the mini-app. JS/Web only.

## sendToBackground

```ts
gameTegra.sendToBackground()
```
Minimizes the mini-app without closing it. JS/Web only.

## showMenu

```ts
gameTegra.showMenu()
```
Shows the mini-app's native menu overlay. JS/Web only.

## requestOrientation

```ts
gameTegra.requestOrientation({ mode })
```
Sets screen orientation at runtime. JS/Web only.

```js
gameTegra.requestOrientation({ mode: 'landscape' })
```

| Param   | Type                                    | Required |
| -------- | ------------------------------------------ | -------- |
| `mode`      | `'portrait' \| 'landscape' \| 'auto'`          | —          |

Also settable statically via `miniapp.yaml` → `orientation` (see `references/miniapp-yaml.md`).

## onBackground / onForeground

```ts
gameTegra.onBackground(callback)  // fires when sent to background
gameTegra.onForeground(callback)  // fires when returning to foreground
```
Both return `Promise<unsubscribe function>`. **Critical for correct lifecycle handling** — see `references/best-practices.md` for the full pattern (game loop pause/resume, music restart, multiplayer sync).

## onReady

```ts
gameTegra.onReady(callback, options?)
```
Fires when the SDK is ready (host `superapp` bridge available). Returns an unsubscribe function. JS/Web only.

```js
gameTegra.onReady((detail) => console.log('SDK ready', detail.ready), { once: true })
```

| Param        | Type      | Required | Description                                              |
| ------------- | --------- | -------- | -------------------------------------------------------------- |
| `callback`       | function   | Yes       | Called with `{ ready, superapp, gameTegra }`                       |
| `once`             | boolean    | No        | Remove listener after first call. Default `true`                     |
| `immediate`          | boolean     | No        | Invoke immediately if already ready. Default `true`                     |

## waitUntilReady

```ts
gameTegra.waitUntilReady()
```
Promise resolving once the SDK is ready (resolves immediately if already ready). **Always call/await this — or use `onReady` — before any other host method.** JS/Web only.

## refresh

```ts
gameTegra.refresh(superappInstance?)
```
Re-detects the host bridge and re-runs readiness. Useful if the bridge is (re)injected after SDK load. JS/Web only. Returns the resolved bridge instance or `null`.

## destroy

```ts
gameTegra.destroy()
```
Tears down the SDK — disposes active streams, destroys on-screen controls. Call on mini-app shutdown. Returns `Promise<void>`. JS/Web only.
