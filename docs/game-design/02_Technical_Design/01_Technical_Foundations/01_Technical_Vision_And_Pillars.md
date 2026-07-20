# 01 — Technical Vision & Pillars: Delivery Rush

## Technical Vision Statement

Our Three.js renderer must deliver a procedurally generated low-poly 3D city with static, merged/instanced geometry rebuilt only once per run, maintaining 60 FPS on mid-range mobile (2020+ ARM64 chipset) and consistent input-to-response latency under 100 ms, so players feel precise throttle control and tap-steer accuracy across all target platforms.

**Why this vision:** Delivery Rush is a one-thumb arcade game where moment-to-moment control (hold gas, tap steer) is the core interaction. The Phaser 2D prototype failed this because its per-frame vector city redraw tanked mobile FPS, destroying the feel. Three.js 3D rendering with baked city geometry solves this: static geometry renders at high FPS with low draw calls, freeing CPU budget for physics, input sampling, and AI. The vision directly enables the design pillar "readable in one glance, controllable with one thumb."

## Technical Pillars

### Pillar 1: Responsive Input Handling
- **Rationale:** Throttle timing and tap-steer buffering are core mechanics. Queuing input for >100 ms feels sluggish to players; sub-100 ms feels responsive. The design depends on this perceptual floor.
- **Measurable Target:** Input-to-visual-feedback latency <100 ms (keyboard/touch) on target hardware, measured at 60 FPS with no frame drops; 95th percentile across 1000-run trace log.
- **Serves Design Pillar:** "Speed feels good" and "controllable with one thumb."

### Pillar 2: 60 FPS Performance on Mid-Mobile Hardware
- **Rationale:** 60 FPS is the minimum acceptable frame rate for arcade driving games on mobile. A 45–90 second run with 30 FPS dips creates micro-stutters that telegraph upcoming collisions or missed turn cues. Mobile commerce data shows 30 FPS games see 15–25% lower retention than 60 FPS titles in this category.
- **Measurable Target:** 60 FPS minimum (frame time ≤16.6 ms 99th percentile) on Snapdragon 765+ (2020-era mid-range flagship), at 720×1280 (device pixel ratio capped at ~1.5). Worst-case scenario: 15 traffic entities + pick-up/drop-off effects + UI overlay.
- **Serves Design Pillar:** "Speed feels good" and "instant restart" (players retry runs frequently; stuttering kills that flow).

### Pillar 3: Procedural City Rendering Efficiency
- **Rationale:** Each run regenerates a new city (daily seed), built at boot. If city generation or first-frame render takes >3 seconds, players abandon the game ("too slow to retry"). Static city geometry (built once, never redrawn per frame) is the only way to hit 60 FPS budget on mobile while rendering a readable 3D scene.
- **Measurable Target:** City geometry streamed and merged into a single draw call (or <5 draw calls with instancing) within 2 seconds on target hardware. Peak city memory footprint <100 MB (geometry + textures). First playable frame within 3 seconds from scene start.
- **Serves Design Pillar:** "Respect the player's time" and "one more run" (instant restart loops).

### Pillar 4: Cross-Platform Web Delivery
- **Rationale:** Delivery Rush targets mobile-first web (no native app install friction). WebGL 2.0 is the only viable rendering option across iOS Safari, Android Chrome, and desktop browsers. The stack must support portrait 9:16 layout and safe-area insets (notches, dynamic island) without rewrite.
- **Measurable Target:** Runs on Chrome 90+, Safari 14+, Firefox 88+ (all current and prior-year versions); maintains 60 FPS on mid mobile. Responsive layout adjusts to 16:9, 20:9, notch/rounded corners without UI overflow. No WebGL workarounds for specific browsers.
- **Serves Design Pillar:** "Readable in one glance" (all platforms see the same readable low-poly style).

### Pillar 5: Deterministic Run Economy & Replayability
- **Rationale:** Players chase combo streaks and high scores; they retry runs dozens of times per session. Run-state (timer, combo, score, order spawn) must be deterministic and syncable to save files. Non-determinism in physics or RNG breaks replays and save integrity, killing engagement.
- **Measurable Target:** Identical seed deterministically regenerates identical city layout, order sequence, traffic spawn, and physics trajectory across all platforms and browser versions. Save file encodes run state; restore from save produces bit-identical replay within ±1 frame.
- **Serves Design Pillar:** "Chase the combo" and engagement loops (players trust the game is fair and consistent).

## Team Capability Audit

- **Team size and composition:** Solo/AI-assisted; some prior Phaser 2D prototype exists. Reusing game logic (economy, balance, services). Rebuilding renderer (Three.js) and scenes (web screens).
- **Relevant expertise:** Game designer/engineer with arcade game design experience; access to LLM for code generation and debugging; no dedicated graphics specialist.
- **Timeline:** Months (Q2–Q3 2026); shipping when core loop is playable at 60 FPS and meta screens are functional stubs.
- **Off-the-shelf tools:** Three.js (proven, active, large ecosystem). Vite for bundling (fast rebuild). TypeScript for safety. Reuse existing game logic from Phaser prototype.
- **Custom tech required?** Three.js city mesh generation is custom (procedural, not asset-based), but per-frame rendering is standard Three.js. No custom physics needed (buffered turn logic is pure logic, not PhysicsBody).
- **Confidence level:** Yes. Three.js is well-suited for this scale and complexity. Main risk is performance optimization on low-end mobile, mitigated by measuring early and cutting draw calls/geometry detail if needed.

## Validation Checklist

- [x] Technical vision is one sentence and directly tied to design pillars ("readable in one glance, controllable with one thumb").
- [x] Each pillar is concrete (Performance, Responsiveness, Rendering, Cross-Platform, Determinism), not aspirational.
- [x] Every pillar has a measurable target (FPS count, millisecond latency, memory footprint, scene load time, frame parity).
- [x] Every pillar maps back to a design pillar (speed feels good, playable with one thumb, instant restart, readable, fair/consistent).
- [x] Pillar count is 5 (within 3–5 range; no more, no less).
- [x] Team audit is honest: reusing logic, but Three.js rendering is proven tech; main risk is optimization, not viability.
- [x] No pillar contradicts another (60 FPS budget informed city mesh efficiency; responsive input supported by fixed timestep).
- [x] Technical decisions later (Three.js instance rendering, procedural mesh generation, fixed 60 Hz physics tick) defer to these pillars.
