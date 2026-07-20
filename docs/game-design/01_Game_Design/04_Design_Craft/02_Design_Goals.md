# 02 — Design Goals — Delivery Rush

## Design Goals for Delivery Rush

### Engagement

**Goal 1: Average session length 60–90 seconds per run** — By Alpha (playable core loop)
- How measured: Playtesting with 10+ casual players; avg timer at game-over screen
- Current status: Unknown (prototype timing not yet verified)
- Owner: Designer (balances order timers and delivery rewards)

**Goal 2: Players complete 3–5 deliveries per average run** — By Alpha
- How measured: Telemetry; average `DeliveriesCompleted` counter at end-of-run
- Current status: Unknown
- Owner: Designer (tuned via `src/core/Balance.ts` delivery time/coin values)

**Goal 3: 70% of players return for a second run within same session** — By Beta
- How measured: Telemetry; "Retry" button clicks vs. "Menu" exits
- Current status: Unknown
- Owner: Designer + Producer (tuned via results screen appeal and retry friction)

---

### Clarity

**Goal 1: 90% of new players understand core loop (throttle + steer) in first 30 seconds** — By Alpha
- How measured: Playtesting observation; ask testers "What do the three buttons do?" after 30s
- Current status: Unknown
- Owner: Designer (UI/HUD must make controls crystal clear before first delivery)

**Goal 2: Zero confusion about order locations (pickup/dropoff beacons)** — By Alpha
- How measured: Playtesting; if tester misses a beacon, that's a fail
- Current status: Unknown
- Owner: UI/Visual Designer (beacons must be high-contrast, pulsing, unambiguous)

**Goal 3: Combo multiplier is understood by 80% of players after one run** — By Beta
- How measured: Playtesting exit interview: "What was the combo? Did it help your score?"
- Current status: Unknown
- Owner: Designer + Audio/VFX (visual and audio feedback on combo buildup)

**Goal 4: Order timer is always legible; no one misses a deadline due to not seeing the timer** — By Alpha
- How measured: Playtesting; if someone says "I didn't see the timer running out," that's a fail
- Current status: Unknown
- Owner: UI Designer (timer must be largest number on screen, always centered in safe area)

---

### Skill & Challenge

**Goal 1: Order time limits scale difficulty—22 seconds early run → 12 seconds by delivery 12** — By Alpha
- How measured: Telemetry; log `OrderTimeLimit` per delivery index; graph curve
- Current status: Unknown (Balance.ts constants define this)
- Owner: Game Designer (tuned via difficulty ramp data)

**Goal 2: Average player dies 4–6 times before landing a 3-delivery combo** — By Playtest
- How measured: Playtesting; count crashes per run, avg combo achieved
- Current status: Unknown
- Owner: Game Designer (tuned via traffic density, intersection spacing, starting time)

**Goal 3: Expert players can sustain 6–8× combos regularly (mastery ceiling)** — By Launch
- How measured: Telemetry; leaderboard top 10% combos; also manual playtest
- Current status: Unknown
- Owner: Game Designer (ensures skill curve has ceiling; rewards mastery without breaking game)

**Goal 4: Difficulty ramp is perceived as fair; players don't report "sudden spike"** — By Beta
- How measured: Post-playtest survey; "Did difficulty feel gradual or sudden?"
- Current status: Unknown
- Owner: Designer + Producer (tuned via traffic density curve, order time curve)

---

### Feedback & Responsiveness

**Goal 1: Input latency (throttle release to brake animation) ≤ 50ms** — By Alpha
- How measured: Frame profiling; count frames from input to first animation frame
- Current status: Unknown (depends on Three.js render loop setup)
- Owner: Programmer (input buffering, Three.js animation timing)

**Goal 2: Steering direction (left/right tap) highlighted within 50ms** — By Alpha
- How measured: Frame profiler; input-to-UI feedback latency
- Current status: Unknown
- Owner: Programmer + UI Designer (ensure UI state updates synchronously with input)

**Goal 3: Every collision produces audio AND visual feedback within 100ms** — By Alpha
- How measured: Slow-motion video of crash; verify audio and shake/flash sync
- Current status: Unknown
- Owner: Audio + VFX Designer (screen shake, flash, crash sound must sync)

**Goal 4: Combo counter visibly increments on every delivery (within 100ms of dropoff)** — By Alpha
- How measured: Manual test; deliver order, watch combo number animate up
- Current status: Unknown
- Owner: UI + VFX Designer (satisfy player's itch for reward acknowledgment)

**Goal 5: Menu navigation is frame-perfect (no perceptible lag)** — By Alpha
- How measured: Button press → highlight appears instantly; no stutter
- Current status: Unknown (depends on UI framework performance)
- Owner: Programmer

---

### Scope & Progression

**Goal 1: Unlockable vehicles are cosmetic/attainable** — Players unlock 4 vehicles (Starter→Sport→Super→Hyper) via coin accumulation over sessions — By Launch
- How measured: Calculate total coins needed to unlock all 4; ensure achievable in 5–10 runs
- Current status: Unknown (tuned via coin economy)
- Owner: Designer (Balance.ts: vehicle costs vs. coin rewards)

**Goal 2: Equippable cards add optional variety without power creep** — Players can choose 2–3 cards per run; cards provide small bonuses (speed, coin, traffic reduction) — By Beta
- How measured: Telemetry; card usage rates; verify no card breaks balance
- Current status: Unknown
- Owner: Designer (card power levels must be <15% impact each)

**Goal 3: Run-to-run sense of progression** — Player unlocks new content (vehicles, cards, themes) every 5–10 runs — By Beta
- How measured: Telemetry; unlock event timestamps; player retention
- Current status: Unknown
- Owner: Designer + Producer (content unlock pacing)

**Goal 4: Cosmetics (city themes, vehicle skins) feel aspirational but not pay-to-win** — By Launch
- How measured: Survey post-playtest: "Do any cosmetics feel unfair to players without them?"
- Current status: Unknown (mock services = future work)
- Owner: Designer + Monetization

---

## Measurement Plan

1. **Playtesting**: 10+ players per phase (Alpha, Beta); observe sessions, ask exit interviews
2. **Telemetry**: Log key metrics (session length, deliveries completed, combo max, crashes, input latency)
3. **Profiling**: Use Frame Counter and Three.js stats for input latency; record video at 240fps for feedback sync
4. **Post-playtest Survey**: Structured questions on difficulty, clarity, fun (1–5 scale)

## Check-in Cadence

- **Weekly**: Input latency and critical bug review
- **Bi-weekly**: Playtesting data (new 3–5 players)
- **Monthly**: Full goal review; adjust Balance.ts tuning

## Escalation

- **Goal at risk** (e.g., session length < 40s): Add 5s to starting timer, increase coin rewards
- **Goal impossible** (e.g., players want longer sessions): Remove goal, shift focus to multiple short runs
- **Trade-off conflict** (e.g., "hard difficulty" vs. "new players confused"): Difficulty ramps over deliveries; new players get easier orders

---

## Validation Checklist

- [x] Each goal is expressed in measurable units (seconds, percentage, count, rating)
- [x] Each goal has a clear owner (Designer, Programmer, UI Designer, Audio Designer, Producer)
- [x] Each goal has a measurement method (telemetry, playtesting, profiling, manual test, survey)
- [x] Each goal aligns with at least one design principle (Principle 1: Input, Principle 2: Clarity, Principle 3: Skill, Principle 4: Atomic, Principle 5: Combo)
- [x] Goals do not contradict (skill ladder ramp aligns with "return rate" engagement goal)
- [x] Goals are achievable within scope (solo/AI-assisted, Three.js rewrite, 45–90s runs)
- [x] Will know at launch whether each goal passes (telemetry + manual verification)
- [x] Playtesting will test each goal category (engagement, clarity, skill, feedback, scope)
- [x] Goals are visible to team (this doc is in project repo, referenced in weekly syncs)
