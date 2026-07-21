# Game Methods

Multiplayer room management, matchmaking, data persistence, ads, leaderboards, plus the low-level custom-call layer.

General response wrapper for all host-backed calls below (unless noted):

```json
{ "onClientSuccess": true, "onHostSuccess": true, "data": { "...": "..." }, "errorMessage": null }
```

⚠️ Check `errorMessage`/`onHostSuccess`, not just promise resolution — some calls resolve successfully with an error embedded in `data` (see `leaveRoom`, `getScore` below).

---

## captureScreenshot

```ts
gameTegra.captureScreenshot({ format?, quality? })
```
Captures the visible MiniApp/MiniGame WebView content — no camera/gallery opened. **Call `waitUntilReady()` first.** JS/Web only.

```js
await gameTegra.waitUntilReady()
const screenshot = await gameTegra.captureScreenshot({ format: 'png' })
```

| Param     | Type              | Required |
| ---------- | ------------------ | -------- |
| `format`     | `'png' \| 'jpeg'`     | No        |
| `quality`     | `number` (0–1, host may ignore for PNG) | No |

Response `data`: `{ dataUrl, mimeType, width, height }`.

---

## shareGameMoment

```ts
gameTegra.shareGameMoment()
```
Captures the visible game, opens the native confirmation screen, publishes the approved moment. The host **always** asks the user to confirm — the game cannot pick caption/visibility/identity/upload target. JS/Web only.

Response: `{ status: 'published' | 'cancelled' | 'failed', postId?, errorCode? }`.

---

## createRoom

```ts
gameTegra.createRoom({ maxPlayers })
```
Creates a multiplayer room. snake_case aliases (`max_players`, `room_name`, `game_mode`) are accepted and normalized.

```js
gameTegra.createRoom({ maxPlayers: 4 })
```
```csharp
var result = await gameTegra.createRoom(gameTegra.@params("maxPlayers", 4));
```
```gdscript
var result = await gameTegra.createRoom({ 'maxPlayers': 4 })
```

| Param        | Type   | Required |
| ------------- | ------ | -------- |
| `maxPlayers`   | number | No        |

Response `data`: `{ match_id, success }`.

---

## joinRoom

```ts
gameTegra.joinRoom({ matchId })
```
Joins a room by match ID. `match_id` alias accepted.

```js
gameTegra.joinRoom({ matchId: '7110b5d5-...supergamefy' })
```

| Param      | Type   | Required |
| ----------- | ------ | -------- |
| `matchId`     | string  | Yes       |

Response `data`: `{ match_id, success }`.

---

## leaveRoom

```ts
gameTegra.leaveRoom()
```
⚠️ **Not yet supported by the host app** — always returns `onHostSuccess: false`, `data: { error: "Function not found" }`. Don't build critical flows around it succeeding.

---

## quickMatch

```ts
gameTegra.quickMatch({ mode })
```
Automatic matchmaking. `max_players`/`game_mode` aliases accepted.

```js
gameTegra.quickMatch({ mode: 'ranked' })
```

| Param  | Type   | Required | Description                    |
| ------- | ------ | -------- | -------------------------------- |
| `mode`    | string  | No        | e.g. `'ranked'`, `'casual'`         |

Response `data`: `{ match_id, success }`.

---

## getScore

```ts
gameTegra.getScore()
```
⚠️ **Not yet supported by the host app** — always returns `onHostSuccess: false`, `data: { error: "Function not found" }`. Use leaderboards (`updateLeaderboard`/`getLeaderboard`) for real score tracking instead.

---

## saveData

```ts
gameTegra.saveData({ key, value })
```
Saves a key-value pair to the player's persistent storage.

```js
gameTegra.saveData({ key: 'login', value: { id: 1, credential: 'test' } })
```

| Param    | Type   | Required | Description                          |
| --------- | ------ | -------- | ---------------------------------------- |
| `key`       | string  | Yes       | Storage key                                |
| `value`      | any     | Yes       | Any JSON-serializable value                |

Response `data`: `{ success, ack: { collection, key, version, user_id, permission_read, permission_write } }`.

---

## loadData

```ts
gameTegra.loadData({ key, collection? })
```

```js
gameTegra.loadData({ key: 'save' })
```

| Param       | Type   | Required | Description                                       |
| ------------ | ------ | -------- | ----------------------------------------------------- |
| `key`          | string  | Yes       | Storage key to load                                     |
| `collection`    | string  | No        | Defaults to the mini-app's own collection                |

**Documented response** `data`: `{ success, data: [{ collection, key, user_id, version, create_time, update_time, value }] }` — `data.data` is documented as an **array**.

⚠️ **VERIFIED DISCREPANCY (real host, 2026-07-16):** the real host returns `data.data` as a **single object**, not an array:

```json
{ "data": { "success": true, "data": { "key": "demo_save", "value": { "...": "..." }, "...": "..." } } }
```

If code indexes `res.data.data[0]` (trusting the documented shape), `entry` is **always `undefined`** — silently, no thrown error, looking exactly like "no saved data exists". This is the most common silent bug in Gametegra integrations. **Always** use a helper that handles both shapes — never index `res.data.data[0]` directly:

```js
function extractLoadDataEntry(res) {
  const d = res?.data?.data
  if (Array.isArray(d)) return d[0]        // documented shape
  if (d && typeof d === 'object') return d // real host shape
  return undefined
}
```

See `references/known-issues.md` #0 and the full `handleHighScore` usage in `references/game-over-pattern.md` #4.

---

## showAd

```ts
gameTegra.showAd({ placement, adType, adKey, metadata?, showLoading?, userId? })
```
Displays an ad. **Do not pass a mini-app ID** — the host resolves it from the active session.

```js
gameTegra.showAd({ placement: 'miniapp_open', adType: 'rewarded', adKey: 'level_end' })
```

| Param      | Type                             | Required | Description                                                        |
| ----------- | ---------------------------------- | -------- | ------------------------------------------------------------------- |
| `placement`   | string                              | Yes       | e.g. `'miniapp_open'`                                                 |
| `adType`       | `'interstitial' \| 'rewarded'`         | Yes       |                                                                       |
| `adKey`         | string                               | Yes       | Developer-defined slot key. Missing/empty → fails `invalid_ad_key`     |
| `metadata`       | object                                 | No        | Schemaless context passed to the ad request                            |
| `showLoading`     | boolean                                | No        | Show host's ad-loading overlay. Default `false`                        |
| `userId`           | string                                  | No        | Defaults to `'anon'`                                                     |

Response `data`: `{ status, adRequestId, eventId?, reward?, viewDurationSeconds?, errorCode?, debugInfo? }`.

---

## createLeaderboard

```ts
gameTegra.createLeaderboard({ id, authoritative, sortOrder, operator, resetSchedule, metadata })
```
IDs are automatically prefixed with `{miniAppId}_`.

```js
gameTegra.createLeaderboard({
  id: 'global_wins', authoritative: false, sortOrder: 'desc',
  operator: 'best', resetSchedule: '0 0 * * 1', metadata: { title: 'Weekly Scores' }
})
```

| Param            | Type                                | Required | Description                              |
| ------------------ | -------------------------------------- | -------- | -------------------------------------------- |
| `id`                  | string                                    | Yes       | Unique leaderboard ID                          |
| `authoritative`        | boolean                                   | No        | Require server-side score validation             |
| `sortOrder`             | `'asc' \| 'desc'`                            | No        |                                                    |
| `operator`               | `'best' \| 'set' \| 'increment'`               | No        |                                                    |
| `resetSchedule`           | string (cron)                                | No        | Reset schedule                                     |
| `metadata`                 | object                                        | No        | e.g. display title                                 |

Response `data`: `{ success, message }`.

⚠️ **Don't build "check if it exists, create if not" logic around `getLeaderboard` failing** — an earlier assumption that `getLeaderboard` rejects/errors when the leaderboard doesn't exist yet turned out to be wrong and caused bad control flow. The safe pattern is simpler: just call `createLeaderboard` unconditionally before the first `updateLeaderboard`/`getLeaderboard` — it's effectively idempotent for this purpose (re-creating an existing leaderboard by the same ID doesn't break anything downstream). See the full flow in `references/game-over-pattern.md` #5.

The only way to get **your own `owner_id`** is from the response of **your own `updateLeaderboard` call** — `getUserInfo()` does not return a user ID (only name/surname/email/age). Compare it against `records[].owner_id` from `getLeaderboard` (cast both sides with `String(...)` — the type can vary) to detect "is this score mine".

---

## updateLeaderboard

```ts
gameTegra.updateLeaderboard({ id, score, subscore, metadata })
```

```js
gameTegra.updateLeaderboard({ id: 'global_wins', score: 50, subscore: 1, metadata: { map: 'desert2' } })
```

| Param    | Type   | Required | Description             |
| ---------- | ------ | -------- | -------------------------- |
| `id`          | string  | Yes       | Leaderboard ID to update      |
| `score`        | number  | Yes       | Player's score                  |
| `subscore`      | number  | No        | Optional tiebreaker               |
| `metadata`       | object  | No        | e.g. `{ map: 'desert' }`            |

Response `data`: `{ leaderboard_id, owner_id, score, subscore, rank, metadata, create_time, update_time, expiry_time, success }`.

---

## getLeaderboard

```ts
gameTegra.getLeaderboard({ id, limit })
```

```js
gameTegra.getLeaderboard({ id: 'global_wins', limit: 10 })
```

| Param   | Type   | Required | Description              |
| -------- | ------ | -------- | ----------------------------- |
| `id`        | string  | Yes       | Leaderboard ID to fetch          |
| `limit`      | number  | No        | Max records to return               |

Response `data`: `{ records: [{ leaderboard_id, owner_id, username, score, subscore, num_score, metadata, create_time, update_time, expiry_time, rank, max_num_score }], owner_records, next_cursor, prev_cursor, success }`.

---

## openMatchChat

```ts
gameTegra.openMatchChat(params?)
```
Opens the native match chat UI. If `roomName` omitted, opens chat for the active match. JS/Web only.

```js
gameTegra.openMatchChat({ roomName: 'lobby' })
```

| Param       | Type   | Required |
| ------------ | ------ | -------- |
| `roomName`     | string  | No        |

Response `data`: `{ success, room_name, player_count }`.

For a fully scriptable in-game chat (not the native UI), see `references/room-chat.md`.

---

# Game Method (Custom API)

Low-level call layer for backend functions the built-in SDK methods don't cover.

## custom

```ts
gameTegra.custom(functionName, params?)
```
Calls a custom backend game function by name. **Consent is checked twice**: once for the `CustomMethod` module, once for the specific `functionName` — both must be granted.

```js
gameTegra.custom('getInventory', { userId: 'd2f2e862-...' })
```
```csharp
var result = await gameTegra.custom<object>("getInventory", gameTegra.@params("userId","d2f2e862-..."));
```

Common use cases: inventory (`getInventory`, `useItem`, `buyItem`), in-game economy (`claimReward`, `upgradeItem`), custom tournament/match flow (`joinTournament`, `submitRoundResult`).

| Param             | Type   | Required |
| ------------------- | ------ | -------- |
| `functionName`         | string  | Yes       |
| `params`                | object  | No        |

Response `data`: `any` (whatever the backend function returns).

## callGameMethod

```ts
gameTegra.callGameMethod(methodKeyOrName, params?)
```
Calls a method by key or a name mapped via `setMethodMap`. JS/Web only.

```js
gameTegra.callGameMethod('createRoom', { maxPlayers: 2 })
```

## setMethodMap

```ts
gameTegra.setMethodMap(map)
```
Overrides default backend method names with custom ones. Synchronous, returns the merged map. JS/Web only. A legacy `sentData` alias exists for backward compat — use `sendData` in new code.

```js
gameTegra.setMethodMap({ createRoom: 'MyCreateRoom' })
```

Default map keys: `createRoom, joinRoom, leaveRoom, getScore, sendData, listenData, loadData, saveData, showAd, createLeaderboard, getLeaderboard, updateLeaderboard`.

## Which method should I use?

| Scenario                    | Recommended                                                |
| ------------------------------ | -------------------------------------------------------------- |
| SDK has a built-in method         | `gameTegra.createRoom()`, `gameTegra.saveData()`, etc.            |
| Custom backend function             | `gameTegra.custom('myFunction', params)`                           |
| Alias-based dispatch                  | `gameTegra.setMethodMap()` + `gameTegra.callGameMethod()`             |
