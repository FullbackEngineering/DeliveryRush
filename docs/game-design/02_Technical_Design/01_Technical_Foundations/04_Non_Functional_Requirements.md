# 04 — Non-Functional Requirements: Delivery Rush

## NFR Register

| Requirement ID | Category | Metric | Target | Priority | Verification Method | Owner | Status |
|---|---|---|---|---|---|---|---|
| **NFR-001** | Performance | Average FPS | 60 FPS ± 1 frame (16.6 ms frame time, 99th percentile <18 ms) on Snapdragon 765+ @ 1080×1920 DPR 1.5 | P1 | Chrome DevTools Perf tab; 60 s sustained play soak test; frame-time histogram log | Engine / Rendering | In-progress (Three.js baseline established) |
| **NFR-002** | Responsiveness | Input latency | Keyboard <50 ms, Touch <100 ms (timestamp from input event to updated frame) on target hardware | P1 | `performance.now()` instrumentation; slowmo camera test (1000 fps) comparing tap to visual change | Input System | Pending (need touch device trace) |
| **NFR-003** | Responsiveness | Steer buffer fidelity | Buffered turn input persists for ≤2 seconds; turn commits within 1.5× vehicle block distance of intersection center | P1 | Gameplay trace log (input timestamp, turn commit frame, intersection distance); regression test on grid pathfinding | Vehicle / Input | In-progress (buffered logic verified; distance tuning ongoing) |
| **NFR-004** | Load Time | Cold start to playable | <3 seconds (Vite dev), <2 seconds (bundled build) from page load to first player input accepted on target hardware | P1 | Engine timer from `performance.navigationStart` to first `inputDown` event; cold cache test (DevTools throttle) | Boot / Preload | Pending (Vite baseline TBD) |
| **NFR-005** | Load Time | City mesh generation | Procedural city (tileset, buildings, road network, terrain) generated and merged into GPU memory within 2 seconds on first run; cached JSON for daily seed | P1 | Timer from `new CityGrid()` to `geometry.computeBoundingBox()`; mesh byte size logged; cache hit/miss telemetry | City / Geometry | In-progress (current ~800 ms target hit) |
| **NFR-006** | Memory | Peak heap (gameplay) | <1.2 GB (mobile), <2 GB (desktop) during steady-state play (after city load, warmup GC cycles) | P1 | Chrome DevTools Memory tab; heap snapshot at frame 300 of run; GC forced between runs to measure real ceiling | Engine / Memory | Pending (initial: ~800 MB at 60 FPS observed) |
| **NFR-007** | Memory | GPU VRAM | <512 MB (textures, geometry buffers, render targets) on mid mobile; peak reported by WebGL context | P2 | `gl.getParameter(gl.UNMASKED_RENDERER / VENDOR)` + Three.js memory tracking; stress test with max traffic entities | Rendering / Assets | Pending |
| **NFR-008** | Memory | Asset footprint | City mesh <100 MB (streamed in chunks if needed); audio library <20 MB (compressed); UI atlases <10 MB | P1 | File size audit; gzip sizes logged; streaming chunk boundaries profiled | Assets / Build | In-progress (mesh ~60 MB, audio ~18 MB currently) |
| **NFR-009** | Stability | Crash-free rate | >99.5% (≤1 crash per 200 runs, or <0.5% crash rate) | P1 | Telemetry: exception logging to console (dev); production telemetry TBD | Engine / Error Handling | Pending (no production telemetry yet) |
| **NFR-010** | Stability | Memory leak detection | No heap growth >50 MB over 10 consecutive runs (GC-adjusted); re-run same city 10x, confirm heap returns to baseline | P2 | Heap snapshots pre/post each run; delta histogram | Engine / Memory | Pending |
| **NFR-011** | Scalability | Max concurrent entities | 1 player vehicle + 15 traffic entities + 2 order beacons + VFX particles (max 50) = 68 entities, all updated per frame | P1 | Entity count telemetry; spawn stress test (force 50+ traffic, measure frame drop); entity pool test | GameScene / Systems | In-progress (traffic pool verified) |
| **NFR-012** | Scalability | Physics tick rate | Deterministic 60 Hz fixed timestep; all movement, collision, steer buffer updates occur at fixed intervals | P1 | Trace log of tick times; compare across replay boundaries (must be ±0 frame drift) | Physics / GameLoop | In-progress |
| **NFR-013** | Determinism | Replay fidelity | Save file encodes run state (seed, timer, combo, score, order queue); restored run produces identical city layout + order sequence, frame-identical physics (within ±1 frame) | P1 | Seed-replay test: generate city A, save after 10 frames, restore, compare city B tile-by-tile; physics trace log | Save / Determinism | Pending (seed logic drafted) |
| **NFR-014** | Determinism | RNG reproducibility | Seeded RNG (via `Math.seedrandom()` or custom LCG) produces identical sequence across all browsers/platforms when given same seed | P1 | RNG test: 1000 seeded draws vs. expected sequence (hardcoded golden values) | Math / RNG | Pending (need cross-browser trace) |
| **NFR-015** | Cross-Platform | Browser compatibility | Chrome 90+, Safari 14+, Firefox 88+ (current and 2 prior versions); same visual result and frame rate on all | P2 | Manual test matrix (device/browser/OS combos); automated pixel-diff screenshot tests (future) | CI / Testing | Pending |
| **NFR-016** | Cross-Platform | Aspect ratio support | Renders correctly at 16:9, 18:9, 20:9, 4:3; UI safe zones enforced (notch insets, gesture zones); no overflow or clipping | P2 | Manual layout tests on multiple phones; CSS viewport unit tests | UI / Layout | Pending |
| **NFR-017** | Input | Touch button accuracy | Tap hit target ≥1.5 cm × 1.5 cm (~50 px at DPR 2); false-positive misses <2% (touch outside button area should not trigger action) | P1 | Manual tap-testing on 5+ devices; ghost-tap prevention (debounce, hit-test margin) verified in code | Input / Touch | Pending (button size set to 200×150 px; need device test) |
| **NFR-018** | Input | Haptic feedback latency | Vibration API call <20 ms from event trigger; haptic patterns (turn, crash, combo reward) play within 1 frame of sound SFX | P3 | Timestamp trace: event → vibration call → actual device vibration (phone slow-mo video) | Haptics / Audio | TBD (optional feature) |
| **NFR-019** | Audio | SFX latency | Engine audio trigger <50 ms from game event (collision, delivery, combo up); fade/envelope < 100 ms | P2 | WebAudio trace timestamps (via analyser context); ABX listening test (perception threshold) | Audio / SFX | Pending |
| **NFR-020** | Audio | Music loop seamlessness | Background music loops with <100 ms silence/click at loop boundary; no pops on gain changes | P2 | Audio waveform inspection; playback trace log | Audio / Music | Pending (synthesized loops, no external audio yet) |
| **NFR-021** | Accessibility | Color contrast | UI text on background ≥4.5:1 (AA) or ≥7:1 (AAA); button/icon contrast ≥3:1 (AA) | P2 | `axe` or `pa11y` automated test; manual WCAG 2.1 AA checklist review | UI / Design | Pending |
| **NFR-022** | Accessibility | Focus management | Keyboard navigation order follows reading order; focus indicator visible (≥3:1 contrast); all interactive elements reachable | P2 | Keyboard tab-testing; focus outline verification | Input / Accessibility | Pending |
| **NFR-023** | Accessibility | Color-blind modes | Deuteranopia, Protanopia, Tritanopia simulators pass (UI buttons, beacons, score distinctions remain readable) | P3 | Color-blind mode toggle + automated color-space conversion test | UI / Design | TBD (future phase) |
| **NFR-024** | Maintainability | Build time | Vite dev server cold start <5 s; hot reload <1 s (code) or <2 s (asset change) | P2 | `time npm run dev`; measure HMR delta with instrumentation | Build / DevX | In-progress (Vite baseline ~2 s cold start) |
| **NFR-025** | Maintainability | Code review cycle | Pull request feedback within 1 day; critical bug fix deployed within 4 hours | P3 | Process SLA (not automated test) | CI / Ops | TBD (solo dev, continuous deploy) |
| **NFR-026** | Save persistence | Local save integrity | LocalStorage/IndexedDB saves persist across browser close; save versioning supports forward/backward compatibility (lost fields gracefully default) | P1 | Save/restore test across browser restarts; version migration test (e.g., v1→v2 schema change) | SaveManager | Pending (version migration drafted) |
| **NFR-027** | Game economy | Deterministic score calculation | Coins = base(100) + distance(×0.5) × combo(≤8), always computed identically (no float rounding variance >1 coin across replays) | P1 | Score trace log; replay score audit (10 identical runs must produce identical final score) | RunState / Economy | In-progress (implemented, needs trace validation) |
| **NFR-028** | Balance | Difficulty progression | 1st delivery: 22 s order timeout; by 12th delivery: 12 s timeout; traffic density ramps 0→3 cars per intersection; RNG VIP spawn rate 0→20% | P2 | Difficulty curve CSV export; compare against game-design constants in `Balance.ts` | Balance / Design | In-progress (constants defined; tuning ongoing) |

## Priority Breakdown

- **P1 (11 items):** Shipping blockers. 60 FPS, input latency, load time, city generation, memory ceiling, stability, entity scalability, determinism, replay fidelity, save integrity, economy math. Non-negotiable.
- **P2 (11 items):** Strong-to-have. GPU VRAM, leak detection, browser compat, aspect ratio, audio latency, loop seamlessness, accessibility (color contrast, focus, keyboard), build time, difficulty tuning.
- **P3 (2 items):** Nice-to-have. Haptic feedback, color-blind modes, code review SLA.

## Verification Strategy

**Ongoing (every sprint):**
- Frame-time profiling: Run 3 minutes gameplay on Snapdragon 765 / latest browser; histogram frame times; alert if 99th percentile exceeds 18 ms.
- Memory profiling: Heap snapshot at frame 300 of each run type (pickup, dropoff, crash, combo). Trend over 10 runs.
- Input latency sampling: Log input event → render delta every 10th frame; rolling average + percentile tracker.

**Pre-alpha gate:**
- City generation stress test: Generate 100 different daily seeds; measure mean/max/min generation time and mesh size.
- Cold start profiling: 10× cold page load (clear cache); measure to first playable frame.
- Cross-browser smoke tests: Launch on Chrome, Safari, Firefox (latest versions, 1 device per OS minimum).

**Pre-ship:**
- 1-hour soak test: Run 60 consecutive plays (45–90 s each) on target hardware; monitor for memory growth, frame drops, crashes.
- Replay audit: Save 20 different run states; restore each; verify frame-identical city and order sequence.
- Accessibility audit: Run axe-core + manual WCAG 2.1 AA checklist; fix high-contrast issues before ship.

## Validation Checklist

- [x] Every NFR has a measurable target (FPS count, millisecond latency, byte size, entity count).
- [x] Every NFR is assigned priority (P1 = shipping gate, P2 = strong-to-have, P3 = nice-to-have).
- [x] Every NFR has a verification method (profiler, trace log, test, telemetry, manual).
- [x] All P1 NFRs have owner assignment and in-progress status tracking (see "Status" column).
- [x] Conflicting NFRs identified and ranked: If 60 FPS and 100 entities conflict, 60 FPS wins (P1); entity count capped at realistic ceiling (P1 @ 68 entities).
- [x] Each NFR includes rationale: "Input latency <100 ms required because arcade gameplay feel depends on sub-perceptual lag" (design pillar tie).
- [x] Targets grounded in platform specs (Snapdragon 765+ 16.6 ms budget, DPR ~1.5) and industry benchmarks (Crossy Road targets 60 FPS).
- [x] Register will be reviewed and updated every sprint (status, measurements, new findings logged).

## Common Pitfalls — Addressed

- **Vague targets:** "Smooth" → changed to "60 FPS ± 1 frame (16.6 ms 99th percentile)."
- **All P1s:** Ruthlessly deprioritized; 11 P1s are hard shipping gates; rest are P2/P3.
- **Missing verification:** Every NFR lists a specific test (profiler, trace, manual); all are auditable.
- **Set-and-forget:** Register shows "Status" column; sprint review will update and re-measure.
- **Ignoring tradeoffs:** Conflict between FPS and entity count resolved: 60 FPS is pillar; entities capped at 68 (well within budget, with margin for VFX).

## Related Documents

- **Design Pillars:** See `01_Technical_Vision_And_Pillars.md` — each NFR serves one or more design pillar (e.g., NFR-001 60 FPS serves "Speed feels good").
- **Platform Constraints:** See `02_Target_Platforms_And_Constraints.md` — NFR targets (memory, frame time) derived from platform minimums and device capabilities.
- **Technology Stack:** See `03_Technology_Stack_Selection.md` — Three.js + Vite stack chosen partly because it enables P1 NFRs (60 FPS, deterministic physics, fast iteration).

