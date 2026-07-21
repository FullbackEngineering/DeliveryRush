# Best Practices & Design Constraints

Critical patterns to follow when building the UI and lifecycle of a mini-app. **Read this before writing any layout/CSS or lifecycle code** — these are the most common sources of bugs and rejected submissions.

## Screen Cutout (Notch / Dynamic Island) — the safe area rule

Many devices have a front-camera cutout at the top (notch, Dynamic Island, punch-hole) and a home indicator at the bottom. A full-screen mini-app can overlap these with game UI.

### The Golden Rule

> **Let the background bleed full-screen. Keep interactive UI inside the safe zone.**

```
┌─────────────────────────────┐
│   [ Dynamic Island ]        │  ← Background extends here (full-screen feel)
│─────────────────────────────│
│  ❤️❤️❤️        SCORE: 500  │  ← UI elements start below the safe area
│                             │
│      GAME AREA              │
│                             │
│─────────────────────────────│
│        ▬ (swipe bar)        │  ← Background extends here too
└─────────────────────────────┘
```

### Device reference values (top / bottom insets)

| Device                                | top     | bottom  |
| --------------------------------------- | ------- | ------- |
| iPhone 16 / 15 Pro (Dynamic Island)      | 59dp    | 34dp    |
| iPhone 13 / 14 (notch)                   | 47dp    | 34dp    |
| iPhone SE / 8 (physical home button)     | 20dp    | 0dp     |
| Android gesture nav + cutout             | 27–40dp | 24–48dp |
| Android gesture nav, no cutout           | 0dp     | 24–48dp |

### CSS — do it this way

The platform auto-injects CSS custom properties into the WebView:

```css
/* Background is full-screen — extends behind the notch */
body {
  background: #1a1a2e;
  /* Do NOT add padding here — let the background bleed */
}

/* Apply safe area only to UI containers */
.game-hud {
  padding-top: var(--sa-top, 0px);
  padding-bottom: var(--sa-bottom, 0px);
  padding-left: var(--sa-left, 0px);
  padding-right: var(--sa-right, 0px);
}

.score-panel { margin-top: var(--sa-top, 0px); }
.bottom-bar  { padding-bottom: calc(var(--sa-bottom, 0px) + 8px); }
```

**Wrong ❌** — padding on `body` clips the background and leaves a white gap:

```css
body {
  padding-top: var(--sa-top, 0px); /* ❌ never do this */
}
```

**Correct ✅** — `body` stays full-screen; only the content container gets insets:

```css
body { background: #1a1a2e; }        /* bleeds to edges */
.hud { padding-top: var(--sa-top, 0px); } /* ✅ content shifts down */
```

### JS — canvas-based games

```js
const insets = gameTegra.getSafeAreaInsets()
// { top: 59, bottom: 34, left: 0, right: 0 } — synchronous, no await needed

if (insets.top > 0)    uiCamera.y = insets.top
if (insets.bottom > 0) bottomBar.y = screenHeight - insets.bottom - bottomBar.height

const hasNotch = insets.top > 20
```

## Lifecycle: Background / Foreground

When the mini-app scrolls off-screen in the Discovery feed, or is sent to background via the overlay menu, the platform **automatically**:
- Pauses all `<audio>`/`<video>` elements in the WebView
- Stops gyroscope/accelerometer streams
- Keeps multiplayer (WebSocket) connections **alive**

The platform does **NOT** automatically:
- Pause/resume your game loop
- Restart background music after resume

### Music / game-loop handling

```js
const bgMusic = new Audio('music.mp3')
bgMusic.loop = true
bgMusic.play()

gameTegra.onBackground(() => {
  // Platform already paused the audio element.
  gameLoop.stop()
})

gameTegra.onForeground(() => {
  // Platform does NOT resume audio — you must call play() yourself.
  bgMusic.play().catch(() => {})
  gameLoop.start()
})
```

Unity:
```csharp
gameTegra.onBackground(() => {
    bgMusicSource.Pause();
    Time.timeScale = 0f;
});
gameTegra.onForeground(() => {
    bgMusicSource.Play();
    Time.timeScale = 1f;
});
```

Godot:
```gdscript
gameTegra.onBackground(func():
    get_tree().paused = true
    $BGMusic.stream_paused = true
)
gameTegra.onForeground(func():
    get_tree().paused = false
    $BGMusic.stream_paused = false
)
```

### Multiplayer stays alive — sync on resume

Sensor streams pause, but multiplayer connections remain active. Sync any missed events when the player returns:

```js
gameTegra.onForeground(() => {
  gameLoop.start()
  bgMusic.play().catch(() => {})
  syncMissedEvents()   // fetch events that happened while backgrounded
})
```

### Unsubscribe to avoid leaks

```js
const unsubBg = await gameTegra.onBackground(() => { /* ... */ })
const unsubFg = await gameTegra.onForeground(() => { /* ... */ })

// on scene change / cleanup:
unsubBg()
unsubFg()
```

## Pre-publish checklist

- [ ] Game HUD does not sit behind the notch / Dynamic Island
- [ ] `body` has a full-screen background color — no `--sa-top`/`--sa-bottom` padding on `body`
- [ ] `onBackground` stops the game loop
- [ ] `onForeground` restarts music
- [ ] Multiplayer connection stays open in background (platform guarantees this — verify nothing on your side tears it down)
- [ ] Unsubscribe functions are called during scene cleanup
