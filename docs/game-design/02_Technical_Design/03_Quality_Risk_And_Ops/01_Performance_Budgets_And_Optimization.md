# 01 — Performance Budgets & Optimization (Delivery Rush)

## Target Hardware & Frame Budget

Delivery Rush targets 60 FPS on mid-range mobile devices (e.g., iPhone 12, Samsung Galaxy A50). At 60 FPS, the budget is 16.6 ms per frame. Target devices have:
- GPU: Mali G71 or equivalent (not flagship).
- RAM: 4 GB (typical constraint).
- Viewport: 720×1280 (portrait), `devicePixelRatio` capped at 2.0 (max logical pixels: 1440×2560).

The following budget allocation reflects Three.js/WebGL rendering burden + game loop simplicity (single-player, no multiplayer networking):

| System | Budget (ms) | Justification |
|--------|-------------|-------|
| Input (touch/keyboard) | 0.3 | Three buttons (left/gas/right) + pause key; no complex input logic. Trivial overhead. |
| Simulation (run state, orders, timer) | 1.5 | Delivery timer countdown, order pickup/dropoff logic, combo multiplier, run economy (score/coins). Pure event-driven; no per-frame iteration over large lists. |
| Physics/Collision (vehicle, traffic, grid-based nav) | 1.2 | Vehicle auto-drive on Manhattan grid; AI traffic collision detection (pooled cars, spatial grid lookup). No constraint solver. |
| AI Traffic (pathfinding, spawning, despawn) | 0.8 | Pooled AI cars; coarse grid-based steering (no pathfinding per frame). Despawn culling at grid edges. Lazy initialization. |
| Rendering (CPU): Scene/geometry culling, draw-call batching, camera update | 2.5 | Static city built once; dynamic: vehicle meshes (instanced), traffic cars (pooled instances). Frustum culling, LOD for distant traffic. ~20–30 draw calls target. |
| Rendering (GPU): Shaders, texture sampling, rasterization | 3.2 | Simple procedurally-textured (or flat-shaded) low-poly models. Soft shadows (baked into textures or simple shadow pass). Bloom/post-process: 1–2 passes only. Mobile-friendly. |
| Audio (WebAudio synthesis, spatialization, mixing) | 0.6 | Real-time synthesis of engine drone, collision thud, delivery beep. 4–6 voices max. No complex effects chains. Synthesis is cheaper than playback on target hardware. |
| UI/HUD (score, timer, combo display) | 0.4 | Text rendering via canvas or pre-baked texture atlas. No layout recalculation per frame. Simple alpha blends. |
| Effects (particles, screen shake, flash) | 0.5 | Pooled particle emitters (burst on crash, confetti on delivery). Cheap GPU instancing or billboard quads. |
| **Headroom** | **−0.4** | Reserve for variance, garbage collection, thermal throttling. |
| **Total** | **16.6** | Tight but achievable on target hardware with disciplined optimization. |

## Per-System Optimization Strategy

**Rendering (GPU) — Highest Risk, Largest Budget:**
- **Static city:** Built once in Boot scene as merged geometry (single draw call) or instanced quads (few draw calls). Never rebuilt per frame.
- **Dynamic entities (vehicle, traffic, delivery markers):** Instanced meshes (one draw call per unique model × instances). Use frustum culling to skip offscreen traffic.
- **LOD fallback:** If traffic density is high (>20 AI cars), reduce distant traffic mesh complexity (lower poly count for cars >200 px away).
- **Texture budget:** Procedural textures (checkerboard grid, flat color fills) baked at boot; no sampler overhead per pixel. Bloom as 2-pass downscale + blur.
- **Profiling target:** Maintain <20 draw calls at baseline; <25 with traffic spike. GPU frame time should stay under 3.2 ms on Mali G71.

**Rendering (CPU) — Culling & Batching:**
- Update camera once per frame (not per entity).
- Frustum cull traffic; only update visible entities.
- Batch draw calls: separate pass for city, vehicle, traffic, UI (4–5 calls, not 1 per entity).
- No per-frame geometry recomputation; all matrices are updated, then batched.

**Simulation — Lightweight Event Loop:**
- Run order state machine (pickup → dropoff → complete) as pure state, no per-frame iteration.
- Countdown timer and combo multiplier as single numeric state.
- No garbage per frame (pool score floatText objects).

**Physics/Collision & AI — Grid-Based Lookup:**
- CityGrid is static 16×16 cell graph; vehicle position quantized to grid intersection.
- Traffic spawn/despawn culled at edges; no AI pathfinding per update (coarse steering only).
- Collision checks: player car vs. static scenery (baked into nav mesh) + traffic AI cars (simple bounding-box AABB tests, ~10 cars max in view).

**Audio — Synthesis, Not Playback:**
- Engine drone: continuous sine wave modulated by throttle (1 voice).
- Collision/delivery sounds: short FM synthesis bursts (2–3 voices, pooled).
- No audio file loading; all synthesis is deterministic and lightweight.

## Profiling & Validation Cadence

- **Weekly:** Measure frame time on slow device (iPhone 12 mini, or Snapdragon 665 equivalent) in landscape mode (worst-case viewport).
- **Metrics:** 60 FPS frame time, GPU time (via WebGL timer queries), draw calls, memory footprint.
- **Tools:** Chrome DevTools Performance tab, Babylon.js Inspector (if using Babylon) or custom Three.js frame-time logger.
- **Gate criteria:** If avg frame time > 14 ms or any spike >18 ms, investigate and mitigate within 1 sprint.
- **Load time:** Boot to first playable frame: target <2 seconds on 4G mobile.

## Validation Checklist

- [x] 60 FPS budget (16.6 ms) divided into per-system slices; headroom reserved (~0.4 ms).
- [x] Static city geometry built once (one or few draw calls); no per-frame rebuild.
- [x] Draw calls budgeted: <20 baseline, <25 with traffic spike.
- [x] Frustum culling and LOD strategy defined for traffic entities.
- [x] Pooling strategy for particles, audio voices, floating text.
- [x] GPU profiling target (Mali G71 or equivalent) and measurement tool identified.
- [x] CPU and GPU frame times tracked separately; spikes flagged immediately.
- [x] Audio synthesis overhead estimated and prioritized (cheap vs. file playback).
- [x] Load time target: boot to first run <2 seconds on 4G.
- [x] Profiling cadence: weekly on slow device; regressions trigger 1-sprint mitigation.
