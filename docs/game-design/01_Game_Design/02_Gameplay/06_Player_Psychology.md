# Delivery Rush — Player Psychology

## Flow Calibration

**Intended flow zone:** Easy delivery 1–2 → Manageable 3–6 → Challenging 7–10 → Expert/Mastery 11+

| Phase | Duration | Challenge Level | Player Skill State | Difficulty Tuning |
|-------|----------|---|---|---|
| Intro (Deliveries 1–2) | 2–5 min | Very Low | Learning hold-gas + tap-steer | Order time 22s, no traffic, clear straight paths |
| Ramp (Deliveries 3–6) | 5–15 min | Low→Medium | Applying learning, building confidence | Order time 20s → 16s, light traffic, some intersections |
| Mid (Deliveries 7–10) | 10–20 min | Medium→High | Mastery building, combo stakes rising | Order time 14s → 12s, moderate traffic density, risk/reward increasing |
| Peak (Deliveries 11–15) | 5–10 min | High | Optimal challenge, execution-focused | Order time cap 12s, heavy traffic, VIP rare (high coin/combo stakes) |

**Difficulty scaling method:** 
- **Intrinsic (learnable):** Steer buffering prediction (player learns over runs 1–5).
- **Extraneous (minimized):** UI is always clear (combo, timer, beacon visible; no hidden stats).
- **Germane (maximized):** Time pressure ramps smoothly; collision avoidance is skill-testable; throttle timing matters.

**Target:** 60%+ of session in flow zone (green/manageable). Intro too easy (intentional, confidence-building) and Peak may be hard (intentional, for mastery players). Both phases are short.

## Competence Loop Design

**Core challenge:** "Can I complete a delivery before the order times out while maintaining my combo and dodging traffic?"

**Feedback mechanism:**
- **Real-time:** Remaining order time displayed on beacon (countdown visible).
- **Per-delivery:** Chime sound + visual glow = success; sad tone + haptic = failure/timeout.
- **Per-run:** Combo counter (1×, 2×, 4×, 8×) shows progression; reset if crash/timeout.
- **Session-end:** Final score = coins + 120×deliveries; vehicle unlock if threshold reached.

**Mastery reward:**
- **Per-delivery success:** Order completion unlocks next delivery (positive loop).
- **Combo milestones:** Reaching 4×, 6×, 8× combo show distinct audio/visual celebration.
- **Vehicle unlock:** Every ~10 deliveries of successful runs unlock a faster vehicle (cosmetic power progression).
- **Card rewards:** Completing runs earns card drops (modifiers like +speed, +coins, shield).

**Flow principle:** Feedback is *immediate* (chime within 100ms of delivery success) and *clear* (player always knows if they succeeded and why they failed).

## Motivation Audit

| System | Intrinsic Hook | Extrinsic Hook | Primary Driver |
|--------|---|---|---|
| Core loop (throttle+steer+deliver) | "Can I master this throttle timing?" (Mastery) | N/A (no point reward for input) | **Intrinsic: Mastery** |
| Combo chaining | "I want to keep this streak alive!" (Loss aversion) | Visual/audio celebration per combo level | **Intrinsic: Loss aversion + autonomy** |
| Delivery completions | "I want to see the score grow" (Progress) | Coins earned (visible scaling) | **Intrinsic: Progress; Extrinsic: coins** |
| Vehicle unlocks | "I want to try the faster car" (Curiosity) | Cosmetic upgrade (speed, appearance) | **Intrinsic: Curiosity** |
| Card equipping | "What build will help me?" (Autonomy) | Stat bonuses (+speed, +coins, shield) | **Intrinsic: Autonomy; Extrinsic: stats** |
| Leaderboard | "Can I beat my best combo?" (Competence/Mastery) | Social status (rank visible) | **Intrinsic: Mastery + social relatedness** |

**Goal:** Intrinsic motivation drives 80%+ of play-time. Core loop feels good *without* rewards. Extrinsic rewards (coins, vehicles, cards) enhance but don't carry engagement.

**Validation:** Remove coins and vehicles temporarily in a test. Core loop should still feel satisfying (hold gas, steer, hit beacons). It does. Coins/vehicles are cherry-on-top.

## Loss Aversion Design

**What can player lose?**
- **Combo (most salient loss):** Resets to 0× on crash or timeout (immediate, felt sharply).
- **Run time:** Doesn't tick down during deliveries (deliveries add time back), but final timer counts down (player can't "pause" to think).
- **Coin efficiency:** Missing deliveries costs opportunity (would have earned coins with that delivery). Not a resource loss per se, but loss-aversion-triggering (foregone gain = felt loss).
- **Vehicle integrity:** Cosmetic damage on crashes (car looks dinged, but gameplay unchanged).

**Is loss recoverable?**
- **Combo loss:** Recoverable immediately (next delivery starts combo counter at 1×; player can rebuild to 8× within one run).
- **Run end:** Recoverable (Retry button → new run in < 1s; no permanent consequence).
- **Vehicle damage:** Recoverable (Garage screen resets appearance; cosmetic only, no gameplay penalty).

**Emotional weight intended?**
- **High:** Combo reset feels significant (user audible sad-tone SFX, haptic pulse). This is intentional (leverages loss aversion to drive "one more delivery" motivation).
- **Low:** Run-end loss feels okay (sessions are short; results screen quickly shows next opportunity). Emotional weight matches run length.

**Ethical principle:** Losses are *recoverable within seconds/one retry*. No permanent progress loss. No real-money mechanics tied to loss (no "spend gems to save run").

## Autonomy / Competence / Relatedness Audit

| Dimension | Implementation | Strength (1–5) | Feedback |
|-----------|---|---|---|
| **Autonomy** (player feels in control) | Multiple playstyles supported: safe slow (3× combo) vs. aggressive fast (8× combo); card loadout choices enable builds (speed-focused, coin-focused, survival-focused) | **5** | Player can choose steer input timing (early/late), throttle aggression (risk-taking on traffic), card loadout. No forced mechanics. |
| **Competence** (player feels skilled) | Immediate feedback on skill: steer-commit haptic confirms prediction; collision detection is deterministic (player knows exactly why they crashed). Difficulty scales so players spend 60%+ in flow zone. Vehicle/card unlocks happen at predictable milestones. | **5** | Player improves visibly across runs (higher combos reached, faster deliveries, less crashes). Skill = better results. |
| **Relatedness** (player feels connection) | Leaderboard shows top combos (social comparison). No multiplayer yet, but asynchronous leaderboard creates mild social connection. Character in game is implied (player as courier) but minimal narrative. | **3** | Leaderboard + social aspect present but minimal. Opportunity for future social features (ghost replays, friend leaderboards). |

**Goal:** All three score 4+ → Relatedness is 3 (acceptable for now; not critical for arcade game). Plan future update with friend/weekly leaderboards to boost to 4+.

## Dark Pattern Audit

**Explicitly list systems:**
- [x] Loot boxes? **NO.** Cards are deterministic earned (100% drop after run completion; no RNG, no odds to disclose).
- [x] FOMO mechanics? **NO.** No time-limited offers, no seasonal battle pass, no "event ends in 24 hours." Players play at own pace.
- [x] Paywall progression? **NO.** All vehicles and cards unlock via coins earned in-game; no real-money pay-to-progress.
- [x] Forced spending? **NO.** No mechanics that require payment to continue playing.
- [x] Deceptive metrics? **NO.** Leaderboard shows real data (top combos by player, verified).
- [x] Ads for progression? **NO (future: rewarded ads give 2× coins, opt-in).** Ads are monetization only, not progression gate.

**Decision:** **All systems are ethical.** Game is free-to-play without dark patterns. Monetization (future: rewarded ads for cosmetics) is opt-in and cosmetic-only.

## Validation Checklist
- [x] Flow zone calibration: Intro is easy (confidence), Mid is manageable (60%+ in flow), Peak is hard (mastery players only).
- [x] Competence loop: Player shows measurable improvement (higher combos, fewer crashes, faster deliveries across sessions 1–5).
- [x] Intrinsic motivation documented: Core loop is engaging without coins/vehicles (verified by design: hold-gas + steer + hit beacon feels good).
- [x] Loss aversion design intentional: Combo reset is *felt* (sad SFX, haptic) but *recoverable* (next delivery resets counter). Losses drive "one more run," not rage-quit.
- [x] Autonomy/Competence/Relatedness: A & C score 5, R scores 3 (acceptable for now; planned improvement).
- [x] No dark patterns present or disclosed. All systems are ethical.
- [x] Reward scheduling is ethical: Cards are deterministic (100% earned per run), not variable ratio (no gambling-like mechanics).
- [x] Social systems are opt-in, not forced: Leaderboard visible but optional; no mandatory social features.
