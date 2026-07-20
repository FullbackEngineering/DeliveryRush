---
name: playtest
description: Playtest Delivery Rush in a real browser (headless Chrome) — boot, drive the delivery loop, profile driving feel, check touch alignment, capture screenshots + console errors. Use whenever you change gameplay, driving/feel, the map, HUD, or input and want to verify it actually works in the running game (not just typecheck). Triggers on "playtest", "test the game", "does it run", "check the driving feel", "verify in browser".
---

# Playtest Delivery Rush

Delivery Rush is a Phaser 3 game — typecheck/build passing does NOT prove it runs
or feels right. This skill drives the **running dev server** in headless Chrome via
`tools/playtest/` (puppeteer-core) so you can verify behavior and feel with evidence.

## Prerequisites
1. Dev server must be running: `npm run dev` (serves http://localhost:5173).
   Start it in the background if it isn't up.
2. Chrome/Edge installed (auto-detected; override with `PUPPETEER_EXECUTABLE_PATH`).

## Commands
```bash
npm run playtest        # smoke: boot→menu→run→pickup→deliver→combo→results + screenshots
npm run playtest:feel   # driving feel: throttle curve (idle/accel/top/brake) + turns/bounds/crashes
npm run playtest:touch  # touch-input alignment + canvas centering across phone viewports
```
Screenshots land in `tools/playtest/shots/`. **Read them** with the Read tool — the
visual check (does the city/car/HUD render, is anything off-center or clipped) is
half the value; the console log is the other half.

## How it works (and headless gotchas — see tools/playtest/lib.mjs)
- `window.game` and `window.bus` are exposed in DEV (`src/main.ts`) — the harness
  drives the game through them.
- Headless throttles `requestAnimationFrame`, so Phaser's scene clock runs slow.
  The launch flags + focus/visibility spoofing keep it usable. **Do not** override
  `requestAnimationFrame` (it freezes Phaser's loop).
- The 3-2-1 countdown won't finish reliably headless — `startRun()` **forces**
  `beginRun()`. So don't measure countdown duration here (it's set in `Balance.Run`).
- Trust **steady-state** values (idle/top speed, deliveries, listener counts,
  bounds, touch offsets); wall-clock **millisecond timings are distorted**.
- Drive deliveries by moving the order's target node onto the car
  (`driveDeliveries`), not by teleporting the car (lane-keeping fights that).

## Interpreting results
- **Smoke**: expect `deliveries: 4`, `RESULTS reached = true`, and `(none)` errors.
- **Feel**: `idleFraction` ≈ `Balance.Vehicle.idleSpeedFactor`; `topFraction` ≈ 1.0;
  `accelSeries` rises with a curve; `decelSeries` falls (and should settle faster
  than accel). `outOfBounds` must be 0; `turns` > 0 (steering commits); `crashes`
  gives a traffic-fairness signal.
- **Touch**: every button `offset` should be ~0 (±1px) and `centered: true`. A
  non-centered canvas or nonzero offset = an input-alignment bug.

## Extending
Write new scripts against `tools/playtest/lib.mjs` (`withGame`, `startRun`,
`driveDeliveries`, `endRun`, `gameState`, `DEVICES`). Keep tuning targets in
`src/core/Balance.ts`, then re-run `playtest:feel` to confirm the change.
