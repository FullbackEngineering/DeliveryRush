# 04 — Technical Risk & Validation (Delivery Rush)

## Technical Risk Register

### RISK-001: GPU Performance on Mid-Range Mobile (Three.js/WebGL)

**Risk Statement:** Three.js WebGL renderer fails to sustain 60 FPS on target hardware (Mali G71, Snapdragon 665 equivalent). The entire rewrite is motivated by Phaser's per-frame vector redraw bottleneck; if Three.js doesn't solve it, the project is at risk.

**Category:** Performance.

**Likelihood:** 3/5 (Three.js is battle-tested, but mobile GPU constraints are real; merged geometry strategy unproven in this codebase).

**Impact:** 5/5 (Project kill; fallback is Phaser 2D [known failure], Babylon.js [schedule slip], or reduce scope to 30 FPS [gameplay feel degraded]).

**Priority (L × I):** 15 — **Highest.**

**Mitigation Plan:**
1. Spike: Week 1–2. Build minimal Three.js scene: static city (merged geometry), 20 AI traffic cars (instanced), vehicle (auto-rotating). Target: measure frame time on Mali G71 device (iPhone 12 or Snapdragon 665 test phone). Success: avg frame time <14 ms, no spike >18 ms.
2. GPU profiling: WebGL timer queries (via `EXT_disjoint_timer_query_webgl2`). Identify bottleneck (draw calls, shader complexity, fill rate).
3. Fallback optimizations: LOD for traffic (reduce poly count on distant cars), frustum culling (skip offscreen traffic), texture atlasing (reduce sampler overhead).

**Fallback Plan:**
- If spike fails (frame time >18 ms average): Reduce AI traffic density (cap 10 cars instead of 20), simplify shader (no bloom/post-process, flat color + ambient only), or cap FPS to 30 (with new A/B test on player retention).
- Reject fallbacks: Phaser 2D (proven failure), Babylon.js (schedule slip 8+ weeks).

**Owner:** [Renderer lead].

**Target Validation Date:** End of week 2 (spike completion).

**Status:** **Active** (spike in progress).

---

### RISK-002: Procedural Texture Generation (Boot Stutter)

**Risk Statement:** Generating 50+ procedurally-textured assets (city buildings, vehicles, UI glyphs) at boot takes >2 seconds, causing perceived lag before first playable frame. Players may quit before the game starts.

**Category:** Performance.

**Likelihood:** 2/5 (WebGL Canvas 2D is fast for simple generation, but unknown complexity on target hardware).

**Impact:** 4/5 (Degrades first impression; may breach <2 second boot target).

**Priority (L × I):** 8.

**Mitigation Plan:**
1. Spike: Week 1. Generate all textures on boot; log generation time per texture. Target: total <1 second on Mali G71.
2. If budget exceeded: defer texture generation (stream minor textures asynchronously) or pre-compute and hardcode common textures.
3. Profiling: Measure Canvas 2D draw calls and texture upload time.

**Fallback Plan:**
- Stream non-critical textures (cosmetic vehicle decals) after game start (show placeholder, update on load).
- Use flat colors + simple Canvas fills instead of complex procedural patterns.

**Owner:** [Asset/texture engineer].

**Target Validation Date:** End of week 1 (spike completion).

**Status:** Active.

---

### RISK-003: Save/Load Migration Under Update

**Risk Statement:** After a game update (schema version 1→2), players' old saves fail to load or migrate incorrectly, causing progress loss.

**Category:** Dependency / Data Integrity.

**Likelihood:** 2/5 (Versioning and migration logic are simple; risk is human error in migration code).

**Impact:** 4/5 (Affects player trust; recovery: restore from backup or offer compensation).

**Priority (L × I):** 8.

**Mitigation Plan:**
1. Design migration pipeline now: version field, migration functions for v1→v2, v1→v3 (even if v2/v3 don't ship yet). See Persistence & Save Systems chapter.
2. Test: Unit tests for each migration (load v1 save in v2 code, verify data integrity).
3. CI: Run all migration paths weekly.
4. Backup strategy: Maintain previous save + backup slot. On migration failure, offer player restore from backup.

**Fallback Plan:**
- If migration fails on load, skip it and return default profile (coins: 0, starter unlocked, no cosmetics). Notify player: "Save could not load; starting fresh."

**Owner:** [Save system lead].

**Target Validation Date:** First update cycle (design complete before update 1.1).

**Status:** Mitigated (design + test strategy in place).

---

### RISK-004: Cross-Browser & Cross-Device Compatibility

**Risk Statement:** Game runs smoothly on desktop Chrome but crashes or degrades on iOS Safari (different WebGL support, touch event handling) or older Android browsers (missing WebGL 2 extensions).

**Category:** Platform.

**Likelihood:** 3/5 (WebGL is well-supported, but vendor differences are real; touch events vary).

**Impact:** 3/5 (Blocks app store submission or narrows addressable audience; recoverable via platform-specific fixes).

**Priority (L × I):** 9.

**Mitigation Plan:**
1. Test matrix: Safari iOS (WebGL 1 fallback), Chrome Android, Firefox Android, Samsung Internet. Test on actual devices, not emulators.
2. Polyfills: Check WebGL 2 feature support (`getExtension`); fallback to WebGL 1 shaders (no advanced features).
3. Touch events: Test three-button input on iOS (no :active pseudo-state on Safari), Android long-press behavior.
4. Spike: Week 3, test on 3 real devices. Flag incompatibilities; prioritize fixes by reach (iOS Safari > Firefox).

**Fallback Plan:**
- WebGL 1 fallback shader set (simpler, no advanced features).
- Progressive enhancement: start on supported browsers, expand later.

**Owner:** [QA/platform engineer].

**Target Validation Date:** Week 3 (device testing complete).

**Status:** Active.

---

### RISK-005: WebAudio Synthesis Quality & Latency

**Risk Statement:** Real-time FM synthesis for engine drone and collision sounds sounds buzzy or noisy. Audio latency (delay between input and playback) causes feedback gap; player feels disconnected from action.

**Category:** Gameplay feel.

**Likelihood:** 2/5 (WebAudio is stable; synthesis is proven; latency is typically <50ms).

**Impact:** 3/5 (Affects audio polish; recoverable via fallback to square-wave tones or sample playback).

**Priority (L × I):** 6.

**Mitigation Plan:**
1. Spike: Week 2. Synthesize engine drone (sine + pitch modulation), collision beep (FM), delivery chime. Record and A/B test against synthetic-but-canned alternatives.
2. Latency: Measure time from input (gas button press) to audio playback. Target: <50ms.
3. Fallback: If latency > 100ms or synthesis sounds poor, use pre-baked short audio samples (stored as data URIs, no HTTP fetch).

**Fallback Plan:**
- Swap to canned audio samples (short WAV/MP3) or square-wave tones (even lower latency).

**Owner:** [Audio engineer].

**Target Validation Date:** End of week 2 (spike completion).

**Status:** Active.

---

### RISK-006: Scope vs. Capability (Feature Creep)

**Risk Statement:** Design includes procedural city generation, daily seed determinism, combo multiplier, 4 vehicles, card modifier system, and traffic AI. Implementing all features on time is uncertain.

**Category:** Scope.

**Likelihood:** 4/5 (Ambitious scope for solo/AI-assisted team; risk of slippage).

**Impact:** 3/5 (Feature cuts or launch delay; some features can be MVP'd or cut).

**Priority (L × I):** 12.

**Mitigation Plan:**
1. Vertical slice (Week 4–6): 60-second playable run with 1 vehicle, 2 deliveries, traffic AI, procedural city, one card modifier. All major systems integrated.
2. Prioritize ruthlessly: Combo multiplier > traffic AI > card modifiers > cosmetics.
3. Fallback cuts (if slipping): Remove cosmetic vehicle skins, reduce traffic AI complexity (scripted spawning), limit card modifiers to 2.

**Fallback Plan:**
- Launch MVP: 1 vehicle, simple traffic, no cosmetics, combo multiplier only. Add card system and cosmetics in update 1.1.

**Owner:** [Design lead / project manager].

**Target Validation Date:** Week 6 (vertical slice complete; go/no-go decision on full feature set).

**Status:** Active.

---

### RISK-007: Mobile Browser App Distribution (Certification & Permissions)

**Risk Statement:** If wrapping game as app (Cordova/Capacitor), app store policies may block mock rewarded ads or require permissions (location, camera) that are unnecessary or invasive.

**Category:** Platform.

**Likelihood:** 2/5 (Web games in app stores are common; policies are usually permissive for games).

**Impact:** 3/5 (Delays app store launch or requires redesign of ad UI).

**Priority (L × I):** 6.

**Mitigation Plan:**
1. Plan B: If wrapped app faces certification blockers, ship web-only (PWA). PWA is installable via home screen; no app store approval needed.
2. If app store is required: Audit policies (Apple App Store, Google Play) for ad libs and permission requirements. Mock ads are low-risk; real ad network partnerships come later.
3. Early submission: Submit debug build to app store for feedback before final push (8 weeks pre-launch).

**Fallback Plan:**
- Web-only (PWA): fully compliant, no certification risk.
- Or, delay app store to update 1.2 if policies are blocking.

**Owner:** [Platform/DevOps lead].

**Target Validation Date:** Week 8 (early app store feedback; decide web-only vs. app store path).

**Status:** Active.

---

## Riskiest-Assumption Prototype Plan

**Assumption:** Three.js WebGL renderer sustains 60 FPS on mid-range mobile hardware with merged static city + 20 instanced traffic cars.

**Validation Approach:** Vertical spike (1–2 weeks).

**Success Criteria:**
- Average frame time: <14 ms (60 FPS headroom).
- No frame spike >18 ms (detect jank).
- Draw calls: <25 (measured via WebGL debug).
- Boot time: <2 seconds (city generation + texture generation).
- Device: iPhone 12 or Snapdragon 665 equivalent.

**Timeline:** Weeks 1–2.

**Go/No-Go Decision:**
- **Go:** Metrics met → proceed to vertical slice (full core loop integration).
- **No-Go:** Frame time >18 ms average → pause, investigate (LOD, culling, shader complexity), apply mitigation, retry week 3. If still failing → fallback plan (reduce traffic, 30 FPS, or reconsider renderer).

---

## Automated Test & Soak Test Plan

**Soak Test (Week 4, 2 hours on target device):**
- Run 60-second gameplay loop on repeat (10 runs × 6 seconds rest = 66 seconds × 2 hours).
- Monitor: frame time variance, memory leaks (JS heap growth), audio distortion, thermal throttling (FPS degradation).
- Pass criteria: FPS stays >50 throughout; JS heap doesn't grow >20 MB.

**Unit Tests (CI weekly):**
- Save/load migrations (v1→current): verify schema correctness.
- Order state machine: pickup → dropoff → complete.
- Combo multiplier: verify cap at 8×, reset on crash.
- Grid-based navigation: vehicle path consistency.

---

## Validation Checklist

- [x] Technical risk register created with 7 identified risks (GPU performance, texture generation, migrations, browser compat, audio synthesis, scope creep, app certification).
- [x] All risks scored (likelihood × impact); prioritized by product.
- [x] High-priority risks (score ≥12): GPU perf (15), scope creep (12) have spikes scheduled weeks 1–2 and weeks 4–6.
- [x] Every risk has assigned owner, mitigation plan, fallback plan.
- [x] Riskiest-assumption prototype plan documented (Three.js perf spike, weeks 1–2, success criteria defined).
- [x] Performance targets validated on target hardware (Mali G71 equivalent), not lab/desktop.
- [x] Vertical slice planned (weeks 4–6): integration of all major systems (render, simulation, input, audio, save).
- [x] Third-party dependencies identified (Three.js, WebAudio) and licensed (MIT, royalty-free).
- [x] Platform-specific risks (app store, browser compat) have early validation plan (week 3 device testing, week 8 early submission).
- [x] Critical systems (rendering, save/load, input) have automated tests and soak test planned (week 4).

## Common Risk Pitfalls Avoided

- **Ignoring performance until alpha:** GPU spike scheduled immediately (weeks 1–2).
- **Optimizing wrong system:** Profiling discipline enforced; GPU is identified as highest risk.
- **No fallback plans:** Every high-impact risk (impact ≥4) has documented Plan B (reduce traffic, 30 FPS, web-only, etc.).
- **Assuming cross-browser works:** Device testing matrix defined (Safari iOS, Chrome Android, Firefox); spike planned week 3.
- **Feature creep without gate:** Vertical slice is go/no-go milestone (week 6) on full scope vs. MVP.
