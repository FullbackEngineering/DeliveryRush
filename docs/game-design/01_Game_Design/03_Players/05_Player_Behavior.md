# 05 — Player Behavior (Delivery Rush)

## Overview

Delivery Rush has a single core loop (pickup → navigate → deliver) repeated within tightly-scoped 45–90 second runs, layered with a meta loop (combo building across deliveries). Understanding this loop's rhythm, failure points, and engagement hooks is essential for balancing difficulty, cosmetic unlocks, and retention mechanics.

---

## Core Loop Definition

**Name**: Delivery Courier Loop (repeats 2–5 times per run)

**Steps**:
1. **Receive order**: Pickup beacon appears on minimap (distance indicator shows "4 blocks away"); player sees order glyph (emoji icon: 🍔, 🍕, 📦, etc.)
2. **Navigate to pickup**: Hold gas pedal (accelerate); tap steering buttons to navigate city grid; avoid traffic collisions
3. **Collect pickup**: Drive into beacon glow; audio ding, "+100 coins" popup; delivery waypoint switches to dropoff beacon
4. **Navigate to dropoff**: Repeat navigation; traffic continues spawning based on distance/difficulty ramp
5. **Deliver**: Drive into dropoff beacon; order complete
6. **Combo check**: If no collisions occurred since last delivery, combo multiplier increases (1× → 2× → ... → 8×); if collision happened before this delivery, combo resets to 1×
7. **Run clock update**: +7 seconds added to run timer (reward for delivery completion); coins earned = base(100) + distance bonus × combo multiplier × VIP multiplier(if applicable)
8. **Loop repeats**: Steps 1–7 repeat until run clock hits 0 OR player quits voluntarily

**Loop Duration**: ~20–30 seconds per cycle (delivery pickup + navigation + delivery)

**Expected Reps per Session**: 
- Casual players (Alex): 2–5 loops per run
- Competitive players (Casey): 4–8 loops per run (45–60 sec total, with 7-sec bonuses extending timer)
- Relaxer players (Jordan): 2–4 loops per run

**Failure States**:
- **Collision with traffic**: -1 combo; run continues (car shakes, SFX ding, "COMBO BROKEN" flash)
- **Order timeout**: Order expires if not delivered within order timer (22 sec on run 1, shrinks to 12 sec by run 12); run continues, combo resets
- **Run clock expires**: Session ends; results screen shows final score, best combo, coins earned

---

## Meta Loop Definition

**Name**: Combo Multiplier Chain (evolves across full run)

**Steps**:
1. Start run: combo = 1×, run timer = 45 sec
2. Complete delivery #1 (no collisions): combo → 2×, run timer → 52 sec
3. Complete delivery #2 (no collisions): combo → 3×, run timer → 59 sec
4. [Collision or order timeout] → combo resets to 1×
5. Rebuild combo: Complete 2 more clean deliveries → combo climbs to 3× again
6. Reach delivery #4 with combo 3× active: combo → 4×
7. [Continue climbing] until combo reaches 8× (cap) OR collision occurs
8. Run timer hits 0 → session ends; score = total coins earned × combo bonus (capped at 8×)

**Duration to First High Combo (4×)**: ~90 seconds (average player, 2 deliveries clean, then 2 more to rebuild)
**Duration to 8× Combo**: ~3–4 minutes (experienced player, flawless navigation through 7–8 deliveries)
**Session Length Typical**: 1–3 minutes (45 sec → 60+ sec depending on delivery count)

---

## Designing the Core Loop: Playtest Validation

### Iteration 1: Baseline Playtest
Repeat core loop 50 times in internal playtest. Checklist:
- [ ] Steering feels responsive (input → visual turn within 100 ms)
- [ ] Beacon positions are readable on minimap and visible in world
- [ ] Traffic collision is clear (shakes, SFX, visual impact)
- [ ] Combo feedback is obvious (COMBO! popup + audio ding)
- [ ] Loop pace (20–30 sec) matches session length goal (45–90 sec total)
- [ ] Loop #20 feels as satisfying as loop #1 (no tedium by repetition)
- [ ] Loop #50 reveal any friction? (If yes, fix before launch)

### Iteration 2: Difficulty Tuning
Test core loop across difficulty ramps (runs 1–5, runs 6–12, runs 13+):
- [ ] Run 1 core loop: Traffic sparse (1 AI car), order timer generous (22 sec)
- [ ] Run 5 core loop: Traffic moderate (2–3 AI cars), order timer shrinking (20 sec)
- [ ] Run 12 core loop: Traffic dense (4–5 AI cars), order timer tight (12–14 sec)
- [ ] Failure rate curve: Run 1 ≈5% collision rate (feels easy); Run 5 ≈15% collision rate (fair challenge); Run 12 ≈30% collision rate (hard but learnable)

### Iteration 3: Engagement & Juice
Repeat core loop with cosmetics/cards active:
- [ ] Card effects feel impactful (Speed card actually makes steering more forgiving; Coin card visibly increases coin payout)
- [ ] Visual variety in cosmetics (vehicle skin changes feel good; card animation is snappy)
- [ ] Audio feedback is non-fatiguing (SFX loop 50 times without annoyance; can be muted without breaking feel)

---

## Analytics Strategy: What to Measure

### Session-Level Metrics (Macro)

| Metric | Target | Why Measure |
|---|---|---|
| **D1 Retention** | ≥75% | Did onboarding work? Can players play run 2 comfortably? |
| **D7 Retention** | ≥50% | Did engagement keep players coming back? |
| **D30 Retention** | ≥25% | Did retention hooks (cosmetics, leaderboards) sustain engagement? |
| **Session Length (Median)** | 3–10 minutes | How much time do players invest per session? |
| **Session Count (Avg per Session)** | 2–5 runs | Are players doing 1 run and quitting, or multi-run sessions? |
| **DAU/MAU Ratio** | ≥25% | What % of monthly actives return daily? (healthy = players returning every 2–3 days) |
| **Churn Velocity** | Track weekly cohorts | Do cohorts drop off steeply (bad sign) or gradually (healthy)? |

### Loop-Level Metrics (Micro)

| Metric | Target | Why Measure | Action If Miss |
|---|---|---|---|
| **Core Loop Reps / Session** | 2–5 (casual), 5–8 (competitive) | Engagement depth: Are players delivering multiple orders per run, or 1 and quitting? | If <2: loop too hard or no reward. If >8: run timers too generous (trivializes difficulty). |
| **Collision Rate / Loop** | <15% (run 1–5), <30% (run 12+) | Difficulty balance: Does traffic feel fair or unfair? | If >35% early: traffic too dense. If <5% late: game too easy. |
| **Order Timeout Rate** | <10% | Player skill gap: Are players missing order deliveries due to time pressure? | If >15%: order timers too short; reduce by 2 sec. |
| **Time to Complete Core Loop** | 20–30 seconds | Loop pacing: Is one delivery cycle tedious or quick? | If >35 sec: loop feels slow; optimize navigation distance. If <15 sec: too easy; increase distance. |
| **Combo Reps Before Reset** | 2–3 (early), 4–6 (late) | Combo sustainability: How many clean deliveries before collision? | If <2: traffic or collision detection too punishing. If >8: loops too long; cosmetics feel too easy. |
| **Cosmetic Unlock Rate** | 1 cosmetic per 5–10 runs | Progression feel: Do players feel rewarded frequently enough? | If <1 per 15 runs: too grindy; increase unlock frequency. |

### Behavioral Cohorts (Monitor Monthly)

| Cohort | Play Pattern | Typical Retention | Design Implication |
|---|---|---|---|
| **Grinders** | 100+ core loops/month; 4+ runs per session; high difficulty engagement | 60%+ D7 | Keep card synergies deep; add seasonal challenges for optimization. |
| **Casual Explorers** | 20–50 loops/month; 2–3 runs per session; procedural novelty focused | 40% D7 | Ensure city generation feels fresh; rotate card types; avoid difficulty creep. |
| **Cosmetic Chasers** | 30–70 loops/month; cosmetic engagement high (check catalog frequently) | 50% D7 | Refresh cosmetics bi-weekly; track which skins are popular (skew future cosmetics toward player taste). |
| **One-Time Players** | 1–5 loops total; never return | 0% D7 | **Red flag**. Exit survey needed: why did they quit after 1–2 runs? (Onboarding issue? Steering unresponsive? Tutorial boring?) |

### Churn Predictors (Early Warning Signs)

| Signal | Interpretation | Intervention |
|---|---|---|
| **60%+ drop after run 1** | Onboarding failure (steering unresponsive, unclear goal, too slow) | Video replay playtest; check steering input latency; test on low-end devices. |
| **40%+ drop after run 3–5** | Engagement failure (difficulty spike, combo system confusing, no reward feeling) | Run difficulty analysis; ensure first cosmetic unlocks by run 4; simplify combo feedback. |
| **70%+ drop after first 8× combo** | Mastery peak followed by void (no post-mastery goal) | Add leaderboard rank chase; introduce new card types; design seasonal challenges. |
| **50%+ drop after 1 week** | Cosmetic/content drought (no new skins, leaderboard feels stale) | Ensure bi-weekly cosmetic drops; weekly leaderboard resets; announce content roadmap. |
| **D7 retention <50%** | Systemic issue (likely combo churn predictors above) | Run cohort analysis; identify which run (5, 8, 12) loses most players; fix that difficulty band. |

---

## Qualitative Telemetry: Depth Behind Data

Metrics alone don't tell the story. Pair quantitative data with:

### Exit Surveys (After Churn)
**Trigger**: Player hasn't launched in 7 days.  
**Question 1 (Multiple Choice)**:
- "What stopped you from playing? (Select all that apply)"
  - [ ] Game feels too hard
  - [ ] Game feels too easy
  - [ ] Steering unresponsive / laggy
  - [ ] Cosmetics felt grindy
  - [ ] Lost interest / got bored
  - [ ] Played for too long, needed a break
  - [ ] Other

**Question 2 (Open-Ended)**:
- "Any other feedback?" (5–50 word limit)

### Player Interviews (5–10 players monthly)
**Duration**: 30 min each; record with consent

**Script**:
- "Walk me through your last 3 runs. Which felt best? Why?"
- "Did you notice the combo system? Explain it in your own words."
- "What cosmetics have you unlocked? Do they feel attainable or grindy?"
- "Would you recommend Delivery Rush to a friend? Why or why not?"
- "What would make you play more often?"

### Community Sentiment Monitoring
- Monitor optional Discord for repeated pain points (e.g., "collision detection broken," "traffic too hard at run 10")
- Flag and respond to player feedback within 48 hours
- Quarterly: Summarize sentiment (positive/neutral/negative split); identify if perception matches metrics

### Session Recordings (Watch & Listen)
**Protocol**: Record 5–10 player sessions (full runs from start to results screen) with audio commentary.

**Observations**:
- Where do hands pause? (Intersection where player is confused about turn timing)
- What does player say? ("Traffic is unfair" vs. "I messed up that turn")
- Do they retry runs? (Yes = engaged; No = frustrated or tired)
- Do they open Garage/Cosmetics between runs? (Yes = interested in cosmetics; No = unaware they exist)

---

## Ethical Telemetry: The Boundaries

### Green Zone (Ethical, Necessary)

- [x] Session length, core-loop reps, collision rate (per-run aggregate)
- [x] A/B testing onboarding difficulty (test group A sees run 1 with sparse traffic; group B sees moderate traffic; measure D1 retention diff)
- [x] Churn cohort analysis (% who drop after run 5; identify difficulty spike)
- [x] Cosmetic engagement (anonymized: "What % of players view cosmetic catalog per session?")
- [x] Device performance metrics (frame rate, input latency); used only to optimize for target devices
- [x] Anonymized player sessions (never linked to identity; only analyzed in aggregate)

### Gray Zone (Need Explicit Player Consent)

- [ ] Behavioral targeting for ads (sharing play patterns with ad network; needs opt-in)
- [ ] Predictive churn models (ML model trained on player behavior; could enable targeted retention) — requires privacy policy + opt-in
- [ ] Video session recording (even anonymized; needs explicit consent before recording)
- [ ] Spending prediction (modeling which players are likely whales; can enable targeted cosmetic pricing) — risky; avoid

### Red Zone (Avoid Entirely)

- [ ] Dark patterns: Deceptive notifications ("Your combo is waiting!" at 3 AM), artificial FOMO ("Only 1 hour left to buy cosmetic!"), manipulative ads
- [ ] Predatory cosmetics: Pay-to-win gameplay cosmetics, loot boxes with RNG cosmetics, cosmetics locked behind $20+ prices
- [ ] Behavioral addiction loops: Engineered slot-machine mechanics (spinning wheels, randomized rewards), mandatory daily streaks, escalating engagement quotas
- [ ] Player profiling for exploitation: "This player spent $100, show them $50 cosmetic as 'discount'" (price discrimination)

**The Line**: Does the measurement or feature treat players as *humans with agency*, or as *resources to extract value from*?

---

## Template — Retention & Churn Monitoring

```
# Delivery Rush — Retention Targets & Owners

## Cohort: D1 Players (Launched Game)

| Retention | Target | Current | Status | Owner |
|---|---|---|---|---|
| D1 (24h) | ≥75% | TBD | TBD | Core game designer (feel/steering) |
| D3 (72h) | ≥60% | TBD | TBD | Level designer (difficulty tuning) |
| D7 (1 wk) | ≥50% | TBD | TBD | Systems designer (progression clarity) |
| D14 (2 wk) | ≥35% | TBD | TBD | Content/live ops (cosmetic cadence) |
| D30 (1 mo) | ≥25% | TBD | TBD | Game director (retention strategy) |

## Churn Intervention Playbook

### If D1 Retention < 70%
**Problem**: Players quit after trying game, before run 2.
**Action**: 
- Step 1: Play session recording analysis (watch 5 players; focus on first 30 sec)
- Step 2: Measure steering input latency (target ≤100 ms; if >150 ms, reduce)
- Step 3: A/B test onboarding difficulty (sparse vs. moderate traffic on run 1)
- Step 4: Retest within 1 week; measure impact
- Step 5: If still <70%, escalate to senior game designer

### If D7 Retention < 50%
**Problem**: Players make it past run 1 but quit by day 7.
**Action**:
- Step 1: Identify churn cliff (which run do most players quit after? 3? 5? 8?)
- Step 2: Run exit survey on lapsed players (n=50+); identify pattern
- Step 3: Hypothesis: [e.g., "Difficulty spike at run 8 traffic density is too high"]
- Step 4: A/B test fix (reduce traffic density by 1 car for test group)
- Step 5: Measure D7 retention change; if improvement >5%, roll out
- Step 6: Retest cohorts weekly

### If Post-Mastery Retention < 30% (Week 4+)
**Problem**: Players reach high combos (5×+) but stop playing.
**Action**:
- Step 1: Interview completionists (n=5) and achievers (n=5): "Why did you stop?"
- Step 2: Audit post-mastery content (leaderboards, cosmetics, seasonal challenges)
- Step 3: Hypothesis: [e.g., "Leaderboards feel static; same top-50 for 3 weeks"]
- Step 4: Implement weekly leaderboard resets + themed leaderboards (highest coin, longest chain)
- Step 5: Increase cosmetic cadence to bi-weekly
- Step 6: Retest D30 retention next month; target lift >5%
```

---

## Loop Friction Analysis: Where Do Players Get Stuck?

### Micro-Friction Points (Within Core Loop)

| Friction Point | Symptom | Root Cause | Fix |
|---|---|---|---|
| **Steering unresponsive** | Player taps left; car doesn't turn | Input latency >100 ms OR buffered-turn commit distance miscalibrated | Cap DPR at 1.0; test on low-end devices; tune turn-commit distance (currently `turnCommitDist` in Balance.ts) |
| **Beacon unclear** | Player drives past pickup/dropoff, doesn't know why | Beacon glow too dim OR position on minimap unclear | Increase beacon brightness; add minimap arrow pointing toward current objective |
| **Collision feels unfair** | Player clips edge of AI car; combo resets; frustration | Collision box too large OR traffic spawning too close | Audit collision geometry; reduce AI car spawn distance from player by 0.5 blocks |
| **Order timer unclear** | Player doesn't know order is expiring | Timer visual too small OR no audio warning | Add prominent on-screen timer countdown; play audio alert at 3 sec remaining |
| **Combo system opaque** | Player achieves 2× combo but doesn't know why | No feedback when combo increases | Add "COMBO ×2" text popup + audio ding every time combo rank up occurs |

### Macro-Friction Points (Between Sessions)

| Friction Point | Symptom | Root Cause | Fix |
|---|---|---|---|
| **Cosmetics feel grindy** | Players avoid cosmetic catalog; feel unmotivated | Cosmetics unlock every 20+ runs | Cap unlock frequency at 10 runs per cosmetic; front-load cosmetics (first unlock by run 3–4) |
| **Leaderboards feel stale** | Top-50 same players every week; new players don't bother | Leaderboard never resets; only tracking all-time | Implement weekly + monthly + all-time + themed leaderboards (highest coin, longest chain) |
| **No progression after mastery** | Achievers hit 8× combos, feel done | No new challenges, no new cards, no seasonal events | Deploy new card every 4–6 weeks; seasonal challenges every 2 weeks; announced roadmap |
| **Community silence** | Socializers feel isolated; no one to share with | No Discord, no community manager, no social features | Create optional Discord + assign community manager (0.5 FTE); implement one-tap screenshot share |

---

## Validation Checklist

- [x] Core loop defined in concrete 8 steps (not vague; repeatable)
- [x] Core loop tested in playtest ≥50 reps (feels good, not tedious)
- [x] Meta loop defined (combo building across 2–5 deliveries per run)
- [x] D1/D7/D30 retention targets set (75%/50%/25%)
- [x] Loop-level metrics identified (reps, collision rate, combo reps, timeout rate)
- [x] Behavioral cohorts defined (grinders, explorers, cosmetic chasers, one-time players)
- [x] Churn predictors identified (60%+ D1 drop, 40%+ D5 drop, 70%+ post-mastery drop)
- [x] Telemetry strategy vetted against ethics (green zone: session length, collision rate; red zone: dark patterns, price discrimination)
- [x] Qualitative research planned (exit surveys, interviews, community monitoring)
- [x] Friction analysis completed (steering latency, beacon clarity, cosmetic grind, leaderboard staleness)
- [x] Churn intervention playbook drafted (specific response if D1 <70%, D7 <50%, etc.)
- [x] Loop polish prioritized (feel > content > cosmetics)

