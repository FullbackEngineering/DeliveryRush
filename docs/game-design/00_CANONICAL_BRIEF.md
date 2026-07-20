# Delivery Rush — Canonical Brief (source of truth)

This is the single source of truth for every filled `book-of-game` chapter in
`docs/game-design/`. When a chapter template asks a question, the answer must be
consistent with the decisions below. Doc writers: read this first, then the book
chapter's template, then write our filled answer. Be concrete; cite these numbers.

## Identity
- **Title:** Delivery Rush.
- **One-liner:** A one-thumb arcade courier game — floor the gas through a bright
  low-poly 3D city, tap to steer, and chain food deliveries before the clock runs
  out; each clean delivery raises your combo multiplier.
- **Genre:** casual arcade driving / hyper-casual, score-attack, "one more run."
- **Platform:** mobile-first web (portrait 9:16), touch; also playable with keyboard.
- **Session:** 45–90 seconds per run; instant restart.
- **Monetization:** free-to-play with mock services now (rewarded ad = 2× coins,
  cosmetic garage upgrades bought with soft currency). No pay-to-win.

## Comparable titles
- **Crazy Taxi** — timed fare delivery, arcade speed, combo/tip payouts.
- **Crossy Road** — friendly low-poly 3D, instant restart, one-thumb pick-up-and-play.
- **Cars: Fast as Lightning** — hold-to-accelerate / release-to-brake touch driving.

## Unique selling points
1. **Hold-to-go throttle courier**: the center button is a gas pedal (hold to
   accelerate, release to brake); left/right tap-steer buffers to the next
   intersection. Throttle timing for corners and traffic is the core skill.
2. **Procedural low-poly 3D city** regenerated each run (daily seed), readable at a
   glance.
3. **Delivery combo chains**: consecutive clean deliveries build a multiplier (cap
   8×); crashing or missing an order resets it. Risk/reward tension.
4. **Zero-friction sessions**: boot to first delivery in seconds; die, tap, retry.

## Core gameplay loop
Auto-forward car → player HOLDS gas to speed up / releases to slow → TAPS left/right
to pick a turn (commits at the next intersection; no tap = straight) → drive to the
pulsing pickup beacon, then to the dropoff beacon → deliver before the per-order
timer expires → each delivery adds run time + coins × combo multiplier → repeat until
the run clock hits 0 → results (score, coins, best combo) → retry/garage.

## Key mechanics & numbers (mirror `src/core/Balance.ts`)
- **Throttle model:** curved approach to target speed; hold → cruise (per-vehicle,
  starter 240 px/s), release → idle ≈ 0.32× cruise; braking snappier than accel.
- **Steering:** buffered turn commits within `turnCommitDist` of an intersection;
  `inputBufferTime` 2.0 s (must exceed one block of travel). Right-hand lanes.
- **Run economy:** start 45 s, +7 s per delivery, cap 60 s. Coins =
  base(100)+distance bonus, × combo(≤8) × VIP(2.2). Score = coins + 120/delivery.
- **Difficulty:** ramps over ~12 deliveries — order time limit shrinks 22→12 s,
  traffic density and VIP chance rise.
- **Vehicles:** 4 (Starter→Sport→Super→Hyper), coin-gated upgrades, data-driven.
- **Cards:** equippable modifiers (speed, coin bonus, traffic reduction, shield…).

## Controls
Three big touch buttons: **‹  ▲(GAS)  ›**. Hold ▲ = accelerate, release = brake;
tap ‹ / › = steer (buffered). Keyboard: ↑/W/Space = gas, ←/→/A/D = steer, Esc/P = pause.
One-thumb friendly; colorblind-distinct + directional glyphs (not color alone).

## Art direction
- **Lightly 3D, low-poly, bright and clean.** Chunky readable shapes, soft shadows,
  a warm palette. Think Crossy-Road/Kenney kit legibility over realism.
- Prefer a free CC0 asset kit (e.g. Kenney "Car Kit" / "City Kit" glTF) where it
  helps; otherwise simple procedural Three.js geometry (boxes, extrusions).
- UI: dark premium panels, rounded, big tap targets; emoji order glyphs.

## Technology (this is a REWRITE decision)
- **Renderer: Three.js** (WebGL) for a real 3D look — replaces the Phaser 2D
  renderer, whose per-frame vector city redraw tanked mobile FPS (the reason for the
  rewrite). TypeScript + Vite. Portrait, `resize`-aware, `devicePixelRatio`-capped.
- **Reuse (engine-agnostic):** run/economy/combo logic, balance data, content data
  (vehicles/cards/themes/orders), services/mocks, save/profile — port as-is.
- **Rebuild (was Phaser):** rendering, scenes/screens, input, camera, effects, audio.
- **Performance is a first-class requirement:** static city built ONCE as merged /
  instanced geometry (never rebuilt per frame); target 60 fps on mid phones;
  chunked/streamed world if needed. Budget: keep draw calls low, cap DPR at ~2.

## Target audience
Broad casual mobile players (all ages) who want quick, satisfying, skill-light-but-
masterable runs on a phone in spare moments; snackable, no tutorial needed.

## Pillars (design north stars)
1. **Readable in one glance, controllable with one thumb.**
2. **Speed feels good** — juice, camera, audio all sell velocity and impact.
3. **Chase the combo** — every run is a push-your-luck delivery streak.
4. **Respect the player's time** — instant in, instant retry, no friction.

## Status
Prototype exists (Phaser 2D, being replaced). Rewriting the renderer/screens in
Three.js while porting the game logic. Solo/AI-assisted. Next gate: playable 3D
core loop at 60 fps.

## Reconciliation (tiebreakers — this section wins over any chapter)
The design docs were drafted in parallel; where a chapter disagrees with the
below, THIS wins:
- **Camera / view:** a **3D low-angle chase camera** (perspective, slightly
  overhead, looking ahead of the car) — NOT a flat top-down 2D view. Any
  "top-down" phrasing in a chapter means this angled 3D chase view.
- **Two palettes, not one (not a contradiction):**
  - *World palette* = warm, bright low-poly (sand/beige buildings, orange/green/
    red accents) per `03_Art_And_UIUX_Bible/01_Art_Direction/03_Color_System.md`.
  - *UI / brand palette* = dark-premium panels with green (#37d67a), orange
    (#f5a524), blue accents on near-black (#0b1220), matching the existing
    `src/core/Palette.ts`. Reuse it for HUD/menus.
- **Draw-call budget:** target **≤ ~30** draw calls for the static city + active
  entities on a mid phone; hard cap ~50. (Supersedes any "<200".) The static city
  is built ONCE as merged/instanced geometry.
- **Frame budget:** 60 fps = **16.6 ms/frame** (ignore any "40 ms").
- **Reuse vs rebuild:** reuse engine-agnostic logic (RunState/economy/combo,
  Balance, content data, services/mocks, save/profile); rebuild rendering, scenes,
  input, camera, effects, audio in Three.js.
