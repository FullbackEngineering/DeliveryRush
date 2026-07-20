# CLAUDE.md — Delivery Rush

Guidance for Claude Code when working in this repo. Read `DEVELOPMENT_STATUS.md`
for the live progress log and the prioritized next steps.

## What this is
**Delivery Rush** — a polished casual arcade courier game. The player **holds the
big center Gas button (▲) to accelerate and releases it to coast/brake** (curved
throttle model, `Vehicle.setThrottle`), and **taps Left / Right** to steer — turns
buffer and commit at the next intersection; not steering = go straight. The goal
is delivering orders around a procedurally generated top-down city before a
countdown clock runs out. Chaining deliveries builds a combo multiplier. Throttle
management (slow for corners / to dodge traffic) is the core skill.

- **Stack:** Phaser 3.90 · TypeScript 5.9 · Vite 6 · mobile-first, portrait
  (design canvas 720×1280, `Scale.FIT`).
- **No art/audio asset files.** Every texture is generated procedurally at boot
  (`src/core/TextureFactory.ts`); every sound is synthesized with WebAudio
  (`src/audio/AudioManager.ts`). Order/UI glyphs use emoji.

## Commands
```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # tsc --noEmit && vite build   (both currently PASS)
npm run typecheck  # tsc --noEmit
```

## Repo layout (top level)
- `src/` … the game (see below).
- `docs/DESIGN_BIBLE.md` … the engineer-facing design/tech bible distilled from
  the Book of Game framework, applied to Delivery Rush. **Primary spec.**
- `game-promt/game-promt.md` … the original one-page brief.
- `game-example-foto/` … two reference mockups (landing page + 14-screen flow).
  These define the visual target and the full screen list.
- `book-of-game/` … the game-agnostic documentation framework (reference only;
  it has its own nested `.git`). Use as a knowledge base, don't edit.

## Source architecture (`src/`)
Event-driven, data-driven, single-owner systems. Layers:
- `core/` — `Balance.ts` (ALL tuning numbers — change gameplay here, not in
  logic), `Palette.ts` (color system + `mix`/`hex`), `EventBus.ts` (global
  `bus` + `GameEvent` names), `SceneKeys.ts`, `TextureFactory.ts`.
- `types/` — shared enums/interfaces (`Direction`, `Steer`, `Order`,
  `VehicleDef`, `CardDef`, `PlayerProfile`…). No Phaser imports.
- `data/` — content as data: `vehicles.ts`, `cards.ts`, `themes.ts`,
  `orderKinds.ts`.
- `services/` — `interfaces.ts` + `mock/MockServices.ts` + `ServiceLocator.ts`.
  Networking is NEVER hard-coded; gameplay depends only on interfaces. Swap
  mocks → real backends with zero gameplay changes.
- `managers/` — `SaveManager.ts` (localStorage, versioned+migrated),
  `ProfileStore.ts` (`Profile` singleton — the ONLY place profile is mutated;
  emits `ProfileChanged`).
- `gameplay/` — `CityGrid.ts` (Manhattan grid, coord math, static scenery),
  `Vehicle.ts` (auto-drive + buffered turn at intersections + lane keeping),
  `TrafficSystem.ts` (pooled AI cars, collision/near-miss).
- `systems/` — `RunState.ts` (pure score/combo/timer economy),
  `OrderSystem.ts` (pickup→dropoff, beacons, nav arrow).
- `ui/` — `UiKit.ts` (`Button`, panels, pills), `ControlPad.ts` (the 3 buttons).
- `input/` — `Haptics.ts`. `audio/` — `AudioManager.ts` (`Audio`, `sfx()`).
- `effects/` — `Effects.ts` (burst, confetti, floatText, shake, flash).
- `scenes/` — `Boot → Preload → MainMenu → Game (+HUD overlay) → Results`,
  plus `Garage`. `GameScene.ts` is the orchestrator.

## Conventions & gotchas
- **Tune via `core/Balance.ts`.** Don't sprinkle magic numbers in systems.
- **Communicate via the bus.** Systems emit facts (`GameEvent.*`); HUD/audio/fx
  subscribe. `GameScene` is the single authority that turns order events into
  RunState changes + juice. Always `bus.off(...)` handlers on scene `SHUTDOWN`
  (see existing scenes) to avoid duplicate listeners across restarts.
- **`Profile`** is the single mutation point for saved data; read via getters.
- **TS strictness:** `noUnusedLocals/Params` are OFF (rapid dev). `strict` is
  ON. Two recurring traps already handled: (1) fields initialized from
  `as const` Balance values need an explicit `: number` annotation, else TS
  infers a literal type; (2) don't name `Container` subclass fields `w`/`h`
  (collides) — see `UiKit.Button` using `bw`/`bh`. `import.meta.env` needs
  `src/vite-env.d.ts`.
- **Coordinate model:** intersections at `(col*block, row*block)`; right-hand
  lane offset depends on heading (`CityGrid.laneCoord`). Vehicle buffers a steer
  and commits it at the next intersection center; edges auto-turn to stay in the
  (fixed 16×16) grid.

## Status
Core 60-second loop is code-complete and **builds green**, but has NOT yet been
visually playtested in a browser. Meta screens beyond Garage are stubs. See
`DEVELOPMENT_STATUS.md` for the exact next steps.
