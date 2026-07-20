# Delivery Rush — Core Gameplay Loop

## Micro Loop (Primary Interaction)
**Duration:** 4–7 seconds per delivery
**Frequency:** 7–15 times per 45–90 second run

**Loop Structure:**
1. **Initial State:** Player sees pulsing pickup beacon, gas button ready, run timer counting down, current combo displayed.
2. **Player Action:** HOLD ▲ (gas) to accelerate toward beacon; TAP ‹/› (steer) to buffer left/right turn at next intersection; release gas to brake.
3. **System Processing:** Vehicle accelerates smoothly toward target speed (~240 px/s per vehicle), steering input commits within `turnCommitDist` of intersection center, collision detection, lane-keeping on right-hand side.
4. **Feedback:** Engine sound rises with throttle, soft haptic pulse on acceleration, visual speed trail, steer confirmation haptic at intersection turn.
5. **New State:** Vehicle at pickup beacon or en route; pickup collected OR miss time-limit penalty (combo reset).

**ASCII Diagram:**
```
[See Beacon] → [Hold Gas + Tap Steer] → [Approach] → [Steering Commits] → [Collision/Time Check]
    ↑                                                                            ↓
    └────────────────────── Loop repeats (buffered steer queued) ──────────────┘
```

**Feedback Timings:**
- Decision-to-response (tap steer): 0–50ms (instantaneous visual/haptic)
- Throttle ramp-up: 300–500ms (curved acceleration to cruise speed)
- Intersection turn commit: 200–400ms (steering animation + lane snap)
- Pickup success/fail: 100–200ms (haptic pulse + audio)
- Total micro-loop execution: 4–7 seconds

## Macro Loop (Session Structure)
**Duration:** 45–90 seconds per run
**Recommended micro loops per session:** 7–15 deliveries (average 6–8 seconds each)

**Phases:**
1. **Boot Phase** (0–2s): Preload assets, show "TAP TO START," player ready.
2. **Delivery Loop** (2–88s): 
   - Each delivery: Pickup beacon appears → drive to pickup → dropoff beacon appears → drive to dropoff → deliver → check combo.
   - +7 seconds added to run timer per successful delivery (max 60s cap).
   - Difficulty rises every 2–3 deliveries (order time limit shrinks 22→12s, traffic density ↑, VIP chance ↑).
3. **Resolution Phase** (88–90s): 
   - Run timer hits 0 → game ends.
   - Score calculated: `coins + (120 × deliveries)`.
   - Coins: `base(100) + distance_bonus × combo(≤8) × VIP(2.2×)`.
4. **Reward Phase** (3–5s): Results screen shows final score, coins earned, best combo, vehicle damage (cosmetic), unlock progress.

**Session Flow:**
```
[Preload] → [First Delivery] → [Combo Loop] → [Difficulty Ramps] → [Timer Pressure] → [Results]
```

**Run time economy:**
- Start: 45 seconds
- Per delivery: +7 seconds (cumulatively)
- Cap: 60 seconds max (achieved at delivery 3+)
- Combo cap: 8× multiplier (reset on crash or missed delivery)

## Meta Loop (Progression)
**Intended play span:** 10–50 runs per player (20 minutes to 2 hours)
**Core progression metric:** Vehicle unlock tier (Starter → Sport → Super → Hyper); Card collection; Best Combo record

**Progression Milestones:**
| Checkpoint | Approx. Runs | Unlock / Change | Loop Motivation |
|-----------|---------|----------|-----------|
| First 5 runs | 1–5 | Learn throttle + steer; chase first 4× combo | Mastery of core mechanic |
| Runs 6–15 | 6–15 | Unlock Sport vehicle (faster); first card equipped | Power progression (speed ↑) |
| Runs 16–30 | 16–30 | Unlock Super vehicle; 2–3 cards mix (speed, coins, shield) | Build variety + combo pushing |
| Runs 30–50+ | 30+ | Unlock Hyper vehicle (top tier); card deck optimization | Competitive leaderboard chase |

**Loop Return Incentive:**
- "One more run" driven by two factors:
  1. **Intrinsic:** Chasing personal best combo (8× is visible win condition).
  2. **Extrinsic:** New vehicle unlock every 5–10 runs (cosmetic progression); card rewards per session.
- No daily login bonus (avoids obligation); rewards tied only to actual play.
- Leaderboard visibility (top 10 weekly combos shown) drives social motivation.

## State Diagram
```
┌──────────────┐
│    Boot      │ (Preload assets)
└──────┬───────┘
       │ (player tap)
       ▼
┌──────────────┐
│ Delivery #1  │◄──────────────────┐
└──────┬───────┘                   │ (combo active)
       │ (pickup reached)          │
       ▼                           │
┌──────────────────┐               │
│ Dropoff Beacon   │               │
└──────┬───────────┘               │
       │ (delivery complete)       │
       ▼                           │
┌──────────────────┐               │
│ Score Update     │ (check crash, │
│ Combo Check      │  time, combo) │
└──────┬───────────┘               │
       │ (success)                 │
       │ (run timer > 0)           │
       └───────────────────────────┘
       │ (run timer = 0 OR crash)
       ▼
┌──────────────────┐
│  Results Screen  │ (final score, coins, combo)
└──────┬───────────┘
       │ (player: restart / menu)
       ▼
    [Menu or Retry]
```

## Validation Checklist
- [x] Micro loop is definable in one sentence: "Player holds gas to accelerate toward a pulsing delivery beacon, taps steer to buffered turn at intersections, reaches beacon before time limit expires."
- [x] Micro loop duration is 2–10 seconds (4–7s average per delivery cycle).
- [x] Feedback happens within 100–300ms of player input (tap steer: 0–50ms, throttle response: 300–500ms).
- [x] Macro loop contains 20–100 micro loops (7–15 deliveries per run).
- [x] Macro loop has a clear win/loss condition (run timer = 0; loss on crash resets combo).
- [x] Meta loop has explicit progression metrics: Vehicle unlock tier after every 5–10 runs; Card rewards per session.
- [x] Three loops connect: micro loops (throttle+steer) populate macro (delivery sequence), macros feed meta (coin earnings → vehicle unlock).
- [x] No loop step is vague: every state is observable (beacon pulsing, timer visible, combo counter shown).
- [x] Feedback is described (audio: engine ramp, haptic: steer confirmation; visual: speed trail, pickup glow).
- [x] Core loop exists and works without progression systems—pure throttle+steer+delivery is satisfying alone.
