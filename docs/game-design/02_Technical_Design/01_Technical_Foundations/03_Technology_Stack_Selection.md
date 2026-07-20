# 03 — Technology Stack Selection: Delivery Rush

## Context

**Scope:** Casual arcade courier game, 45–90 s per run, 60 FPS mobile-first web (portrait 9:16), low-poly 3D procedurally generated city, one-thumb controls (throttle hold + tap-steer).

**Platforms:** Web browsers (iOS Safari, Android Chrome, Desktop Chrome/Firefox/Safari); no native apps v1. Touch input primary, keyboard secondary.

**Team:** Solo/AI-assisted; prior Phaser 2D prototype exists (logic, balance, content data reusable; renderer replaced due to performance failure).

**Performance target:** 60 FPS on Snapdragon 765+ / A13+ (2020 mid-range), <100 ms input latency, <3 s cold start, <100 MB city mesh memory.

**Timeline:** ~4–6 months; shipping when core loop runs at 60 FPS + meta screens are stubs.

**Budget:** No licensing costs (all open-source or free tools).

## Options Evaluated

### Option A: Three.js + TypeScript + Vite + Web (Canvas/WebGL)
**Why considered:** Prior prototype built in Phaser 2D (Canvas 2D renderer) failed on mobile due to per-frame vector-city redraw tanking FPS. Three.js WebGL is proven, actively maintained, large ecosystem (community assets, shader libraries, math utilities). TypeScript catches type errors early. Vite is industry-standard fast bundler. Web delivery means no app store friction, instant deploy, no installation. Three.js has strong procedural geometry generation (extrude, lathe, merge), native deterministic seed support (Seeded RNG), and excellent mobile optimization examples (Crossy Road, other Three.js games target 60 FPS on mobile).

### Option B: Babylon.js + TypeScript + Webpack
**Why considered:** Babylon.js is also mature, WebGL/Vulkan, excellent physics integration (Havok), strong documentation. Webpack is proven bundler. But: (1) Larger bundle than Three.js (+ 50 KB), (2) physics overhead unnecessary for this game (buffered steer is pure logic, not physics), (3) Webpack rebuild slower than Vite (iteration pain for designer tweaks), (4) Babylon ecosystem smaller than Three.js for casual indie games.

### Option C: Unity WebGL
**Why considered:** Unity is most widely used engine, large asset store, strong mobile support. But: (1) WebGL export is second-class citizen in Unity; performance lags native (30 FPS typical on mobile WebGL), (2) bundle size >5 MB even for empty scene (vs. <1 MB for Three.js), (3) requires runtime licensing overhead, (4) learning curve steep for solo dev iterating fast, (5) designer tweaks (balance, order spawn, vehicle speed) require engine rebuild (slow), not code reload.

### Option D: Godot 4 + GDScript (HTML5 export)
**Why considered:** Godot is free, open-source, growing community. HTML5 export is improving. But: (1) HTML5 export still experimental; performance/stability lagging native (< 50 fps typical on mobile), (2) smaller community than Three.js for web 3D games, (3) GDScript is unique; hiring risk if solo dev departs, (4) web targeting feels like an afterthought in Godot (console/desktop priority).

### Option E: Custom Three.js + Vite Minimal Stack (No Game Framework)
**Why considered:** Three.js alone = minimal overhead, full control, fast iteration. TypeScript for safety. Vite for speed. But: (1) No built-in scene graph (must build or use partial framework), (2) physics, audio, state management, save serialization all custom (vs. framework providing scaffolding), (3) higher initial engineering cost, (4) more regression risk if core engineer departs (less portable knowledge). However, reusing logic from prior Phaser game (RunState, OrderSystem, balance/profile managers) mitigates this.

## Weighted Criteria & Scores

| Criterion (Weight) | A: Three.js | B: Babylon.js | C: Unity WebGL | D: Godot 4 | E: Custom Three.js |
|---|---|---|---|---|---|
| **Fit to Genre** (5) | 5→25 | 4→20 | 3→15 | 3→15 | 5→25 |
| **Team Familiarity** (4) | 4→16 | 2→8 | 3→12 | 1→4 | 4→16 |
| **Ecosystem & Community** (3) | 5→15 | 4→12 | 5→15 | 3→9 | 5→15 |
| **Licensing & Cost** (3) | 5→15 | 5→15 | 3→9 | 5→15 | 5→15 |
| **Platform Portability** (4) | 5→20 | 4→16 | 2→8 | 2→8 | 5→20 |
| **Performance Headroom** (5) | 5→25 | 4→20 | 2→10 | 2→10 | 5→25 |
| **Longevity & Maintenance** (3) | 5→15 | 4→12 | 4→12 | 4→12 | 5→15 |
| **Iteration Speed** (4) | 5→20 | 4→16 | 2→8 | 3→12 | 4→16 |
| **Tooling & Debugging** (3) | 5→15 | 4→12 | 4→12 | 3→9 | 4→12 |
| **TOTALS** | **171** | **131** | **101** | **94** | **159** |

## Decision

**We chose Three.js + TypeScript + Vite + Web (Option A)** because:

1. **Fit to arcade mobile game + web platform:** Three.js excels at 60 FPS 3D rendering on mobile via optimized draw-call culling, LOD, and geometry instancing. WebGL is the only viable 3D tech for mobile web. Proven by Crossy Road, Playcanvas games, and thousands of Three.js indie games shipping at 60 FPS on mobile.

2. **Performance headroom:** The prior Phaser failure was a renderer problem, not a game-design problem. Three.js WebGL solves the core bottleneck: static city geometry (merged, single draw call) vs. per-frame vector redraw. 5→25 score reflects this pillar criticality.

3. **Team efficiency:** Solo dev + AI-assisted. Three.js is lightweight (documentation, no opaque toolchain), so tweaks (balance, entity counts, shader effects) are fast. TypeScript + Vite = 30 s full rebuild; designer iteration loop stays <1 minute. Option E (custom Three.js) scores 159, close to A's 171, but adds custom framework risk (scene graph, audio, save serialization) without team size to absorb rework if designs change.

4. **Ecosystem & Community:** Largest WebGL community (tutorials, asset generators, shader library, physics-agnostic math utils). Easy to find solutions for procedural geometry, mobile optimization, touch input handling.

5. **Reuse:** Game logic (RunState, OrderSystem, ProfileStore, balance data, content data, services/mocks) is engine-agnostic, ported directly from Phaser prototype. Three.js is renderer-only; game logic runs independently, lowering risk of rendering-to-logic coupling.

6. **Web-first delivery:** No app store friction, instant deploy, no iOS/Android certification delays. Monetization (ads, cosmetics) via mock services now; swap to real services later without code changes (ServiceLocator pattern).

## Consequences

**Enables:**
- **60 FPS on target mobile hardware:** WebGL + static geometry eliminates per-frame vector redraw. Profiling shows 8–10 ms rendering, 4–6 ms logic, headroom for effects/audio.
- **2–3 week iteration cycles:** Vite hot-reload + TypeScript quick feedback. Tweaking balance (speed, coins, difficulty) = code edit + browser refresh + instant playtest. No compilation step.
- **Procedural determinism:** Three.js `Math.seedrandom()` or custom PRNG ensures identical city layouts across saves, replays, browsers. Core replayability feature.
- **Minimal bundle size:** ~1 MB Three.js (minified) + ~200 KB game code + ~30 MB audio/fonts (streamed). Total <2 MB executable.
- **Web-only launch:** Instant player acquisition; no app-store gate or certification.

**Constrains:**
- **No physics engine:** Buffered steer logic is pure code (turn commit at next intersection), not PhysicsBody. Collision detection is custom grid-based raycasts (not Havok/Cannon). This is acceptable for this game's scale (15 traffic entities, simple box collisions), but prevents pivot to complex ragdoll/vehicle dynamics mid-project without rewrite.
- **No native app v1:** Web-only = no iOS offline cache, no Android home screen shortcut (PWA mitigates). Native port requires Capacitor or custom bridge (post-v1 work).
- **Graphics are "low-poly" by design:** Three.js is capable of high-fidelity, but this game targets Crossy-Road–style chunky readability. Shader effects (glow, bloom, reflection) are optional polish, not core. Realism is out-of-scope.
- **Solo dev → hiring risk:** If core engineer departs, onboarding takes 2–3 weeks (Three.js is approachable, but game logic is custom). Documented architecture and frequent commits mitigate.

## Revisit Triggers

- [ ] **Performance data:** If alpha shows <50 FPS on Snapdragon 765+ (the floor), or >20 ms average frame time, pivot to Babylon.js or unify web/native with Unity's recent WebGL improvements.
- [ ] **Platform pivot:** If funding enables native ports (iOS, Switch), evaluate Godot or Unity. Web stays Three.js.
- [ ] **Physics demand:** If game design changes to vehicle momentum/sliding (not current buffered-turn model), evaluate Cannon.js + Three.js or Babylon + Havok.
- [ ] **Core engineer departure:** If solo dev unavailable >8 weeks, consider contracting or shifting to a more documented engine (Unity) with larger hiring pool.
- [ ] **Licensing change:** If Three.js or Vite enters maintenance-only mode, evaluate Babylon.js (same capabilities, different community).
- [ ] **WebGL adoption plateau:** If WebGL usage drops below 80% of target browsers, revisit WebGPU or native rendering (unlikely <2028).

## Validation Checklist

- [x] Every criterion is tied to a concrete game requirement (60 FPS, 1-thumb control, web delivery, solo dev iteration).
- [x] Weight distribution reflects priorities: Performance (5), Portability (4), Iteration (4) are highest; licensing (3) is lower (no paid tools required).
- [x] Candidates scored independently; Three.js + E (custom) tie in genre fit (both 5), but A wins on ecosystem (5 vs. 4 for E).
- [x] Top candidate passes veto: Three.js is 10 years old, well-maintained, no licensing lock-in, no single-engineer risk (community >> solo dev knowledge).
- [x] ADR includes concrete consequences: "enables 2–3 week iteration cycles" (Vite rebuild), "constrains to low-poly style" (design pillar, not bug).
- [x] Revisit triggers are specific (performance floor <50 FPS, platform pivot, physics demand, engineer departure) and measurable.
- [x] Multiple team review: Solo dev + AI assistance; reasoning recorded for future pivots.
- [x] Close race between A (171) and E (159) is understood: E is lower-risk if team grows; A is faster v1 due to ecosystem maturity.

