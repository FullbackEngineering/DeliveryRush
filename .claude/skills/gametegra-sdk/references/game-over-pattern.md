# Standard "Game Over" Integration — apply to every game

This is the standard SDK behavior package verified end-to-end on a real game (2026-07-16) and meant to be applied **identically to every game** — only game-specific selectors/element names and text translations change; the logic stays the same.

## Scope (9 behaviors)

1. **Language** — `getLanguage()` → Turkish content if `tr`, otherwise (EN or anything else) leave the existing English content as-is.
2. **Vibration** — exactly **one** `vibrate()` call at game-over.
3. **Safe area** — `getSafeAreaInsets()` sets top/bottom insets automatically, prevents the notch/home-indicator from clipping content.
4. **High score** — persistent high score via `saveData`/`loadData`; shown at game-over if a previous record exists.
5. **Leaderboard read/write** — score submitted at game-over; top score shown, with "(you)" appended if the top entry is the current player.
6. **Ads** — an ad is shown on "retry", then the game/menu flow continues regardless of ad outcome.
7. **Architecture** — wire in via a separate `js/gametegra.js` (ES module) without touching the original game files, wherever possible (non-invasive layering).
8. **Analytics** — at least 3 standard `reportEvent` calls: `level_complete`, `new_high_score`, `retry`.
9. **No external requests** — nothing calls any origin besides the Gametegra SDK CDN.

## Standard constants (use identically across all games)

```js
const CALL_TIMEOUT_MS = 8000
const HIGHSCORE_KEY = 'highscore'      // saveData/loadData key
const LEADERBOARD_ID = 'highscore'     // createLeaderboard/updateLeaderboard/getLeaderboard id
```

`saveData`/leaderboards are already auto-scoped per mini-app (collection and leaderboard ID get a `{miniAppId}_` prefix), so there's no need to invent a per-game name — using the same literal `'highscore'` everywhere keeps things consistent.

## 1) Language — `getLanguage()`

```js
let isTurkish = false

async function applyLanguage() {
  try {
    const res = await withTimeout(gameTegra.getLanguage(), CALL_TIMEOUT_MS)
    const lang = (res?.data?.appLanguage || res?.data?.deviceLanguage || 'en').toLowerCase()
    isTurkish = lang.startsWith('tr')
  } catch {
    isTurkish = false // no host / error → safe default: English (existing text stays)
  }
  if (!isTurkish) return
  // ...translate game-specific static text here (querySelector, per page/element)
}
```

- Prefer `appLanguage` (the SuperApp's language setting), fall back to `deviceLanguage`.
- If not Turkish, **change nothing** — the game's default English text is already the correct state.
- Translate static text (menus, tutorial, button labels) once inside `applyLanguage()`. For text the game's own JS **regenerates dynamically** (e.g. `"Level " + num` rebuilt via `innerHTML` every time), wrap that generator function and check the `isTurkish` flag on every call — a one-time translation won't stick.

**Standard bilingual message templates** (for the high-score + leaderboard line, use identical text across all games):

| Key | TR | EN |
|---|---|---|
| Best score label | `En Yüksek Skorun` | `Best Score` |
| Leaderboard line | `Diğer oyuncular en yüksek {score} puan yaptı` | `Other players scored {score} at best` |
| "It's you" suffix | ` (sen)` | ` (you)` |

## 2) Vibration — once, at game-over

Find the game's **single** central "game over" function (usually named `gameOver`, `gameLost`, `onDeath`, etc. — the one common function that both "lost" and "time ran out" paths call into). Wrap that function, run the original, then call `onGameOver()` after it — `vibrate()` fires from there exactly once. **Don't wrap two separate end conditions (e.g. "touched red" and "time's up") independently** — find the shared central function and hook it in exactly one place, or vibration/leaderboard/highscore logic can fire twice by accident.

## 3) Safe area — top/bottom insets

Works synchronously even without a host (returns `{0,0,0,0}`) — call it **immediately when the script loads, before any `waitUntilReady()`**:

```js
function applySafeArea() {
  let insets = { top: 0, bottom: 0, left: 0, right: 0 }
  try { insets = gameTegra.getSafeAreaInsets() || insets } catch {}
  const root = document.documentElement.style
  root.setProperty('--sa-top', insets.top + 'px')
  root.setProperty('--sa-bottom', insets.bottom + 'px')
  root.setProperty('--sa-left', insets.left + 'px')
  root.setProperty('--sa-right', insets.right + 'px')
}
applySafeArea() // top of the module, immediately
```

**CSS side — background bleeds, only the content container is inset** (see `references/best-practices.md`): the outer layer wrapping the whole game/HUD (background/pattern) stays full-screen; the inner content layer (usually a shared class on all "page"/"screen" divs) binds its top/bottom to the safe-area variables:

```css
.your-page-container-class {
  position: absolute;
  width: 100%;
  top: var(--sa-top, 0px);
  bottom: var(--sa-bottom, 0px);
  /* delete height — top+bottom with position:absolute computes it automatically */
}
```

This keeps the background (one level up) full-screen while only the game's actual content (score, buttons, play area) stays clear of the notch/home-indicator. **Don't put padding on `body` or the outermost wrapper** — that clips the background and leaves a blank gap.

## 4) High score — `saveData` / `loadData`

⚠️ **`loadData`'s `res.data.data` is documented as an array but the real host returns a single object** (verified 2026-07-16). Indexing `res.data.data[0]` directly means `entry` is silently always `undefined` — no thrown error, behaves exactly like "no data ever saved". See `references/known-issues.md` #0 and `references/game-methods.md`. **Always** use the shape-agnostic helper, never index directly:

```js
function extractLoadDataEntry(res) {
  const d = res?.data?.data
  if (Array.isArray(d)) return d[0]        // documented shape
  if (d && typeof d === 'object') return d // real host shape
  return undefined
}

async function handleHighScore(finalScore) {
  let previousBest = null
  try {
    const res = await withTimeout(gameTegra.loadData({ key: HIGHSCORE_KEY }), CALL_TIMEOUT_MS)
    const entry = extractLoadDataEntry(res)
    if (entry && typeof entry.value?.score === 'number') previousBest = entry.value.score
  } catch {}

  const newBest = previousBest === null ? finalScore : Math.max(previousBest, finalScore)
  if (previousBest === null || finalScore > previousBest) {
    try {
      await withTimeout(gameTegra.saveData({
        key: HIGHSCORE_KEY,
        value: { score: finalScore, savedAt: new Date().toISOString() },
      }), CALL_TIMEOUT_MS)
    } catch {}
  }

  // Only show if a previous record actually existed — don't show it on the player's first-ever game.
  if (previousBest !== null) {
    showBestScoreUI(newBest, isTurkish ? 'En Yüksek Skorun' : 'Best Score')
  }
}
```

`newBest` (not the old value) is what gets displayed — so the "your best score" message is always current, whether or not a new record was just set.

## 5) Leaderboard — create (idempotent), submit, show the top entry

```js
async function handleLeaderboard(finalScore) {
  let myOwnerId = null

  // a) make sure the leaderboard exists — safe to call unconditionally, don't gate this
  //    on "does getLeaderboard fail" (that assumption turned out to be wrong, see
  //    references/known-issues.md and references/game-methods.md)
  try {
    await withTimeout(gameTegra.createLeaderboard({
      id: LEADERBOARD_ID, sortOrder: 'desc', operator: 'best',
    }), CALL_TIMEOUT_MS)
  } catch {}

  // b) submit this game's score, capture our own owner_id from the response
  try {
    const updateRes = await withTimeout(
      gameTegra.updateLeaderboard({ id: LEADERBOARD_ID, score: finalScore }), CALL_TIMEOUT_MS
    )
    myOwnerId = updateRes?.data?.owner_id ?? null
  } catch { return }

  // c) read the current table, show the top entry
  try {
    const lbRes = await withTimeout(
      gameTegra.getLeaderboard({ id: LEADERBOARD_ID, limit: 10 }), CALL_TIMEOUT_MS
    )
    const top = lbRes?.data?.records?.[0]
    if (!top) return
    // owner_id types can vary by host (string/number) — compare with String()
    const isMe = myOwnerId != null && String(top.owner_id) === String(myOwnerId)
    const text = isTurkish
      ? `Diğer oyuncular en yüksek ${top.score} puan yaptı${isMe ? ' (sen)' : ''}`
      : `Other players scored ${top.score} at best${isMe ? ' (you)' : ''}`
    showLeaderboardUI(text)
  } catch {}
}
```

**Field names verified against a real host** (`createLeaderboard`/`updateLeaderboard`/`getLeaderboard` — `owner_id`, `records[].score` as a string, `records[].owner_id`) match the documented shapes; only the "check if the leaderboard exists" assumption above was wrong, not the field shapes themselves.

The only way to get your own `owner_id` is from the response of your **own `updateLeaderboard` call** — `getUserInfo()` doesn't return a user ID (only name/surname/email/age). Compare it against `records[].owner_id` from `getLeaderboard` to determine "is this score mine."

Run `vibrate`, `handleHighScore`, `handleLeaderboard` **in parallel** (`Promise.all`) inside `onGameOver` — running them sequentially means each one's own 8s timeout stacks on top of the others when there's no host (e.g. a plain-browser test), multiplying total delay:

```js
async function onGameOver(finalScore) {
  await Promise.all([
    withTimeout(gameTegra.vibrate(), CALL_TIMEOUT_MS).catch(() => {}),
    handleHighScore(finalScore),
    handleLeaderboard(finalScore),
  ])
}
```

## 6) Ads — the "retry" flow

Find the game's "play again / restart" button. If the original handler is defined inline in the game's own script with no accessible reference, the cleanest way to insert an ad **without modifying the original** is to **clone the node** (clears all old listeners), then attach one new handler:

```js
function hookRetryButton() {
  const oldBtn = document.getElementById('yourRetryButtonId')
  if (!oldBtn) return
  const newBtn = oldBtn.cloneNode(true)
  oldBtn.parentNode.replaceChild(newBtn, oldBtn)
  newBtn.addEventListener('click', () => showRetryAdThenContinue())
}

async function showRetryAdThenContinue() {
  try {
    await withTimeout(
      gameTegra.showAd({ placement: 'game_over_retry', adType: 'interstitial', adKey: 'retry' }),
      CALL_TIMEOUT_MS
    )
  } catch {} // ad failure never blocks the player
  // repeat the original "retry" behavior here (page transition, engine reset, etc.)
}
```

`adType: 'interstitial'` is the standard default (a gate before continuing, not a reward). If a client wants "watch an ad for a bonus", switch to `adType: 'rewarded'` + check `data.reward`. If the ad fails or times out, **never lock the player out** — swallow the error and continue the original navigation regardless.

## 7) Architecture — non-invasive layering

Where possible, don't modify the game's original source files (e.g. `js/game.js`) at all. Instead add a separate `js/gametegra.js` (`<script type="module">`) and attach "from above" using:

- **Wrap** the game's global functions (`window.xxx`) — call the original, then add your own logic — for the game-over hook and dynamic text translation.
- **Clone existing buttons** with `cloneNode(true)` to strip old listeners, then reattach — for the ad-then-continue flow.
- `type="module"` scripts always run deferred (after DOM parsing), so wherever the script tag sits in `index.html`, the game's own (non-module, synchronous) script has already run and defined its globals — don't worry about ordering.

⚠️ **Guard against re-wrapping on live reload.** The SuperApp/emulator's live-reload can re-run a script without a full page refresh — if a function like `hookGameEngine()` runs a second time, it wraps an already-wrapped function again, and every future game-over fires layered/duplicated calls. Guard with a flag on the wrapped object:

```js
function hookGameEngine() {
  const engine = window.gameEngine
  if (!engine || engine.__gametegraHooked) return
  engine.__gametegraHooked = true
  // ...wrapping happens here...
}
```

If non-invasive wrapping isn't possible (a modular/bundler-based game with no accessible globals), add SDK calls directly into the game's source at the relevant points (the game-over function, the retry button handler) — same principles, just "call directly" instead of "wrap".

## 8) Analytics — at least 3 `reportEvent` calls

At least 3 `reportEvent` calls per game, using these 3 standard events (keep naming identical across every game for consistent aggregation on a reporting dashboard):

| `eventType` | When | `data` |
|---|---|---|
| `level_complete` | Player completes a level/stage/round (the game's "progress" moment — use an equivalent milestone if the game has no levels) | `{ level, score }` |
| `new_high_score` | Player's score beats their own previous record (or it's their first game) — report even if `saveData` failed, since the player genuinely achieved the score | `{ score, previousBest }` |
| `retry` | Player taps "play again / retry" | `{ previousScore }` |

```js
// Fire-and-forget — never blocks the game, no need to await the result.
function report(eventType, data) {
  withTimeout(gameTegra.reportEvent({ eventType, data }), CALL_TIMEOUT_MS).catch(() => {})
}
```

Integration points:
- `level_complete`: while wrapping the game's "level passed" function, capture the level/score **before** calling the original (the original usually advances the level number already) — call `report()` after the original runs, using the captured old values.
- `new_high_score`: inside `handleHighScore()`, when `finalScore > previousBest` (or `previousBest === null`) — call it **outside** the `saveData` try/catch, unconditionally (the player earned that score regardless of whether persisting it succeeded).
- `retry`: at the very top of the retry handler, before `showAd` — stash the last score in a module-level variable (`lastFinalScore`) inside `onGameOver`, have the retry handler read from it.

Additional meaningful game-specific milestones (combos, achievements, first purchase) can be reported with the same `report()` helper beyond these 3 — 3 is the minimum, not a ceiling.

## 9) No external requests — only the Gametegra CDN is allowed

For every game, verify it makes **no request to any origin besides the Gametegra SDK's own CDN load** (`cdn.jsdelivr.net/npm/@gametegra/sdk@...`). Common patterns to remove:

- Google Fonts `<link href="https://fonts.googleapis.com/...">` — remove; the CSS `font-family` fallback (`sans-serif`, etc.) takes over. Self-hosting fonts is a separate ask, not the default.
- Google Analytics / gtag.js / any third-party analytics script — remove. Analytics needs are already covered by `gameTegra.reportEvent()`.
- Dead/unused external-call code (even commented-out `ga('send', ...)`-style calls) — clean it up even though it's inert.
- Web font CDNs, third-party script CDNs (jQuery, analytics, etc.) — don't add these if the game already ships its own JS/CSS.

**Exception — leave these alone:** passive `<meta property="og:*">` tags (for social-share crawlers; not fetched by the browser while the page runs) are out of scope.

**Verification method:** open the game locally, check the DevTools Network tab (or `page.on('request', ...)` in Playwright) and confirm no request goes to any origin other than `cdn.jsdelivr.net`.
