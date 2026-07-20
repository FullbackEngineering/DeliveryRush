# Delivery Rush — Cognitive Load Design

## Load Audit

| Load Source | Type | Avoidable? | Action |
|---|---|---|---|
| **Vehicle position & beacon location** | Germane | No — core to gameplay | Keep visible always; compass arrow + beacon pulsing (redundant cues) |
| **Time budget (remaining seconds on order)** | Germane | No — creates tension | Show on beacon and HUD timer; clear number (not hidden) |
| **Throttle state (holding vs. released)** | Germane | No — core mechanic | Visual/audio feedback (engine pitch, speed trail) reinforces state |
| **Steer buffer (pending turn)** | Germane | No — core mechanic | Haptic feedback on input (player feels it registered); visual turn animation confirms |
| **Combo value (current ×)** | Germane | No — emotional weight | Displayed prominently; grows/glows as it climbs |
| **Traffic cars (position, heading)** | Germane | No — collision avoidance | All visible on-screen; no fog-of-war; distinct art (bright colors, readable silhouettes) |
| **Run timer (total time remaining)** | Germane | No — session pressure | Countdown displayed top-center; large, hard to miss |
| **Complex UI menus** | Extraneous | Yes | Minimize at runtime (Loadout is prep-time only; Play scene has minimal runtime UI) |
| **Hidden cooldown timers** | Extraneous | Yes | N/A — no cooldowns in core loop |
| **Hidden vehicle stats** | Extraneous | Yes | All stats displayed in Loadout (speed, coin bonus, handling); player can see numbers |
| **Card mechanics requiring memorization** | Extraneous | Partial | Cards show name + stat bonus; effects are visible (+speed card = visibly faster car) |
| **Map navigation / route planning** | Extraneous | Yes | Removed; beacons + compass eliminate route complexity |

**Goal:** Extraneous load → **minimized**. Intrinsic load → **intentional & taught**. Germane load → **high & earned**.

**Status:** ✓ Extraneous load is minimal (only Loadout menu, which is not runtime). All runtime information is on-screen. No hidden stats or memorization required.

## Difficulty Levers Chosen

| Lever | How We Use It | Progression |
|---|---|---|
| **Time pressure (order deadline)** | Order time limit shrinks per delivery | Delivery 1–2: 22s budget; Delivery 6: 16s; Delivery 11+: 12s |
| **Information density (traffic cars)** | Traffic spawn rate and car count increases | Delivery 1–3: 1–2 cars; Delivery 7: 4–5 cars; Delivery 12+: 6–8 cars |
| **Resource limits (VIP rarity, coin scaling)** | VIP order chance rises, making coin efficiency critical | Delivery 1–4: 5% VIP chance; Delivery 10+: 15% VIP chance; drives strategic play |

**Principle:** Each lever independently raises *one* difficulty source. Time pressure (Germane, time-based) is separate from traffic density (Germane, spatial/reaction-based). Combining levers happens gradually (time pressure starts at delivery 3; traffic adds at delivery 4; VIP rarity escalates at delivery 8).

## Working Memory Requirement

**For a typical delivery attempt (mid-run, 6–8 seconds):**
- **Items player must hold in working memory (ideally ~4):**
  1. Vehicle position / beacon direction
  2. Remaining time budget (seconds left on order)
  3. Throttle state (holding vs. released)
  4. Steer input buffered / turn timing
  5. (Traffic car positions — learned over repetition, becomes implicit after few deliveries)

**Items visible on-screen (all critical items shown, not memorized):**
- ✓ Vehicle position (3D world view, center-screen)
- ✓ Beacon location (pulsing white/blue at next intersection, visually obvious)
- ✓ Remaining time (number on beacon + HUD timer, top-center)
- ✓ Throttle state (engine sound pitch + visual speed trail)
- ✓ Steer input confirmation (haptic pulse at turn + smooth animation)
- ✓ Traffic cars (all visible; no fog-of-war; distinct art)
- ✓ Combo counter (persistent on-screen, top-left)
- ✓ Run timer (persistent on-screen, top-center)

**Items player must memorize:** **ZERO.** All critical information is persistent on-screen or implied by feedback.

**Result:** Working memory requirement stays below 4 chunks (vehicle position, time budget, throttle state, steer timing). Traffic awareness is reactive (not memorized) and builds implicitly. UI supports decision-making without forcing recall.

## Progression Map

**Phase 1 (Intro, Deliveries 1–2, 2–5 min):**
- **Load:** Very low intrinsic (hold gas, tap steer), zero extraneous, low germane (simple challenge).
- **Mechanics:** One straight-line path to beacon, no intersections, no traffic, time budget generous (22s).
- **Teaching:** "This is how you go fast" (throttle), "This is how you turn" (steer at intersection). One variable.
- **Goal:** Player masters the feel of the controls (no surprises, confidence-building).

**Phase 2 (Ramp, Deliveries 3–6, 5–15 min):**
- **Load:** Low-medium intrinsic, zero extraneous, medium germane.
- **Mechanics:** Intersections appear, light traffic (1–2 cars), time budget starts shrinking (22s → 16s per delivery).
- **Teaching:** "Predict the turn" (introduce steer buffering), "Dodge traffic" (collision avoidance introduced).
- **Change:** +1 new variable (intersections, then light traffic). Player adapts to each before adding the next.

**Phase 3 (Mastery, Deliveries 7–10, 10–20 min):**
- **Load:** Medium intrinsic, zero extraneous, high germane.
- **Mechanics:** Multiple intersections per delivery, moderate traffic (4–5 cars), time budget is tight (12–14s).
- **Teaching:** "Chain your predictions" (multiple steer inputs buffered), "Optimize throttle timing near traffic" (skip-gas-release patterns).
- **Change:** Combinations of variables; player is now combining learned skills (not learning new mechanics).

**Phase 4 (Expert, Deliveries 11+, 5–10 min):**
- **Load:** Medium-high intrinsic, zero extraneous, very high germane.
- **Mechanics:** Complex path (many intersections), heavy traffic (6–8 cars), minimal time (12s), VIP rare (high stakes).
- **Teaching:** None; player is executing and refining.
- **Goal:** For mastery players chasing 8× combo, this is peak challenge.

**Key principle:** Variable #1 (intersections) taught in phase 2; Variable #2 (traffic) taught after player masters intersections; Combination (intersections + traffic) taught in phase 3. Never introduce all variables at once.

## Attention & Visual Design

**Primary focus (highest visual weight):** Beacon (pulsing white or blue, largest moving element, center of composition)
- Size: Large (150×150px at typical play distance)
- Animation: Pulsing brightness every 0.8s (hypnotic, draws attention)
- Color: Bright white (pickup) or cyan blue (dropoff), high contrast against city
- Position: Always toward player's vehicle heading (reachable)

**Secondary info (medium weight):**
- Combo counter (top-left, white text on dark panel, easy to glance)
- Run timer (top-center, large red countdown when < 20s remaining; amps visual urgency)
- Order time budget (on beacon itself, small white text; reinforces urgency when close)

**Context (low weight):**
- Traffic cars (distinct art, readable but not distracting)
- Building geometry (low-poly, soft shadows; scenery, not interactive)
- Compass/arrow (small corner indicator; backup navigation cue)

**Result:** Player's eye naturally lands on beacon first. Combo and timer are glanceable. Traffic is noticeable but doesn't demand attention until near-collision. Cognitive load is distributed; primary objective (reach beacon) is unavoidable.

## Progression Map (Summary)

```
Phase 1 — Foundation (Deliveries 1–2)
  Challenge: Straight path, no intersections, no traffic
  Load: Very low overall
  Duration: Until throttle feels natural (2–3 deliveries)

Phase 2 — Layering (Deliveries 3–6)
  Challenge: Intersections + light traffic (1–2 cars)
  Load: Medium (steer buffering now requires prediction)
  Duration: Until intersections feel reliable (4–5 deliveries)

Phase 3 — Constraint (Deliveries 7–10)
  Challenge: Multiple intersections + moderate traffic (4–5 cars) + shrinking time (12–14s)
  Load: High (all three variables active, player optimizing)
  Duration: Until player either breaks combo or reaches mastery (4–6 deliveries)

Phase 4 — Complexity (Deliveries 11+)
  Challenge: Complex paths + heavy traffic (6–8 cars) + minimal time (12s) + VIP stakes
  Load: Very high (mastery-level execution required)
  Duration: Until run timer expires (5–10 minutes total run time)
```

## Validation Checklist
- [x] Extraneous cognitive load is minimal (all critical info is on-screen; no hidden stats or memorization required).
- [x] Working memory requirement does not exceed ~4 items (vehicle position, time budget, throttle state, steer timing; traffic learned implicitly).
- [x] All critical information is visible (beacons, timers, traffic cars, combo counter all persistent or obvious).
- [x] Difficulty progression introduces one variable at a time (Phase 1: throttle; Phase 2: steering + light traffic; Phase 3: all combined).
- [x] Visual hierarchy is clear (beacon is primary focus, largest and most animated).
- [x] Difficulty stems from thinking + reacting (predicting intersection timing, dodging traffic) not from confusion.
- [x] Intrinsic load matches genre (arcade/casual; simpler than strategy games, more than action-reflex games).
- [x] Feedback on performance is immediate (haptic on steer, chime on delivery, collision audio on crash).
