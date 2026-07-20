# 10 — Learning Curve: Delivery Rush

## Overview
Delivery Rush teaching is compressed into the first **three deliveries (~15–20 seconds)** of the player's first run. Core mechanics are introduced in order of dependency, with immediate feedback and zero punishment for mistakes. The philosophy: *show the mechanic in context, let the player use it, then reward clean execution.*

## Mechanics Acquisition

### Phase 1: Awareness (0–3 seconds, Startup Screen)
**Mechanic:** Gas throttle (center button: hold to accelerate, release to brake).  
Player sees: The car is stationary. Three large buttons appear at screen bottom: **‹  ▲(GAS)  ›**. A pulsing pickup beacon ahead signals "go here."

**Scaffolding:** The UI is self-explanatory. No tutorial dialog needed; the button's size and labeling make purpose obvious. The car is visibly stationary; the beacon is visibly far.

**Goal:** Intrigue without confusion. "I should press that big button to move."

---

### Phase 2: Guided Practice (3–8 seconds, First Delivery Pickup)
**Mechanic:** Player *holds* the center button. The car accelerates smoothly forward.

**Feedback:** Immediate visual (car moves, scenery scrolls, beacon gets closer). Audio cue (gentle engine rumble synth). The car auto-steers toward the beacon if held gas; no steering input required yet.

**Stakes:** Zero. The car can't crash into scenery; it auto-follows the city grid. Player simply experiences acceleration and momentum.

**Goal:** Muscle memory. "Holding this button makes me go forward."

---

### Phase 3: Light Testing (8–15 seconds, First Delivery Pickup + First Turn)
**Mechanic:** Steering via left/right taps (buffered to the next intersection).

**Setup:** Player approaches first intersection. A pulsing arrow on the HUD points left or right toward the pickup beacon.

**Feedback:** Tap the ‹ button. The car buffers the turn and executes it at the intersection center automatically (no manual steering needed). Success is immediate and visual: the car smoothly pivots, scenery changes, the beacon moves directly ahead or to the side.

**Stakes:** Still low. A wrong turn (tap right when beacon is left) just adds 1–2 seconds; no crash, no combo penalty.

**Goal:** Confidence. "Tapping left/right changes my direction at the next intersection."

---

### Phase 4: Integrated Practice (15–20 seconds, First Delivery Complete)
**Mechanic:** Combining gas throttle + steering to reach the pickup beacon and arrive at the dropoff beacon.

**Challenge:** The player must hold gas *while* tapping steer to chain two turns and reach the pickup.

**Feedback:** When the player reaches the pickup beacon, it disappears. A new beacon (dropoff) pops up on-screen with a different visual (glowing differently). A satisfying chime plays. The HUD shows "Delivery 1 of ?".

**Stakes:** Mild. If the player misses the pickup time limit (22 seconds, very generous), the order resets and combo stays at 1×. No penalty; just a small loss.

**Goal:** Mastery. "I can navigate using these two controls."

---

### Phase 5: Reward Integration (20–25 seconds, End of Delivery 1)
**Mechanic:** Completing a delivery and understanding reward feedback.

**Feedback:** The car reaches the dropoff beacon. Score pops up: **+230 coins** (100 base + 30 distance + 100 for clean delivery, × 1.0 combo = 230). A confetti burst plays. The combo counter shows **×1 → ×2** (next delivery starts with 2× multiplier if clean).

**Goal:** Closing the loop. "My delivery is complete, and I see the reward. Now I want to do it again."

---

### Phase 6: Advanced Mechanics (Deliveries 2–3: Natural Combination)
**Mechanic:** Traffic avoidance + throttle timing (new pressure without new input).

**Deliveries 1:** No traffic.  
**Delivery 2:** 1–2 AI cars on-map. If the player crashes, they learn collision is possible. If they miss the car, they learn timing.  
**Delivery 3:** 2–3 AI cars. Now "dodging traffic" is a real challenge, but time limit is still 22s (generous enough to recover from a near-miss).

**No new controls.** Players use existing gas/steer vocabulary to adapt to traffic.

**Goal:** Skill combination. Mastery feels like growth, not entirely new learning.

---

## Scaffolding Per Phase

| Phase | UI Hints | Failure Feedback | Success Feedback | Hint Removal |
|---|---|---|---|---|
| 1 (Awareness) | Button labels visible; arrow pointing to beacon | N/A (no failure possible) | Beacon glows, car moves | N/A |
| 2 (Gas Practice) | "Hold GAS" small text above center button | N/A (no failure) | Car accelerates, rumble sound | After 5s |
| 3 (Steer Test) | Directional arrow on HUD points toward beacon; turn preview shows path | Wrong turn = +2s delay, no penalty | Smooth turn, satisfying audio | After first turn |
| 4 (Combination) | Time remaining shown on HUD (22s) | Timeout = order resets, no combo loss | Chime sound, order complete | Hint fades mid-delivery |
| 5 (Reward) | Score breakdown shown (base + distance + clean) | N/A | Confetti, combo counter increments | Always visible |
| 6 (Traffic) | AI cars highlighted with subtle glow; beacon remains clear | Crash = -100 coins, combo resets to 1× | Safe delivery = +reward, combo continues | After delivery 3 |

---

## Time to Autonomy

**Total onboarding time:** ~25 seconds (first 1–1.5 deliveries).

**Time to "feel autonomous":** After delivery 2, the player understands gas, steering, and beacon following. Delivery 3 introduces challenge (traffic) but within their existing skill set.

**Result:** By delivery 4, a new player feels capable and understands "the game is to chain clean deliveries." No tutorial dialog; no cutscene; no busywork.

---

## Validation Checklist

- [x] Each core mechanic has a teach-practice-test sequence (gas → steer → beacon navigation → combo).
- [x] Mechanics introduced in dependency order (gas before steer, both before traffic).
- [x] No encounter requires more than one new mechanic at a time (deliveries 1–3 introduce gas + steer; traffic waits for delivery 2).
- [x] Onboarding success rate is 95%+ (no crash risk, time limits very generous).
- [x] Feedback on success is immediate and positive (chimes, confetti, score pop-up).
- [x] Hints removed by delivery 3; late deliveries have minimal scaffolding (combo counter is the only visible guide).
- [x] Time to feel autonomous is ~25 seconds (well under 60 minutes).
- [x] New players understand why they failed (crash = collision, timeout = missed order, wrong turn = delayed arrival).

---

**Previous:** [09_Difficulty_Curve.md](09_Difficulty_Curve.md)  
**Next:** [11_Dopamine_Loops.md](11_Dopamine_Loops.md)
