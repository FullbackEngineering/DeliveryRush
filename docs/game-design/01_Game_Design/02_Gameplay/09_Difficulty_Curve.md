# 09 — Difficulty Curve: Delivery Rush

## Overview
Delivery Rush is a 45–90 second arcade loop where difficulty escalates within a *single run*, not across multiple playthroughs. The curve compresses all progression into ~12 deliveries, with two primary pressure variables: **order time limit** (shrinking) and **traffic density** (increasing). Each delivery is a discrete progression step; the run ends when the countdown hits zero, resetting the player to delivery 1.

## Difficulty Variables

**Primary Variable 1: Order Time Limit**  
- Delivery 1–3: 22 seconds per order (generous)
- Delivery 4–6: 19 seconds (mild tightening)
- Delivery 7–9: 15 seconds (moderate pressure)
- Delivery 10–12: 12 seconds (high pressure)

**Primary Variable 2: Traffic Density & AI Car Speed**  
- Delivery 1–3: 2–3 AI cars on map (sparse)
- Delivery 4–6: 4–5 AI cars (moderate)
- Delivery 7–9: 6–7 AI cars (dense)
- Delivery 10–12: 7–8 AI cars, slightly faster (peak)

**Secondary Variable: VIP Order Chance**  
- Delivery 1–4: 0% VIP (learning phase)
- Delivery 5–8: 15% chance per delivery (introduces 2.2× coin multiplier)
- Delivery 9–12: 25% chance (high-stakes risk/reward)

## Progression & Success Targets

| Delivery Step | Run Time Elapsed | Order Time | Traffic Cars | Mechanic Focus | Target Success |
|---|---|---|---|---|---|
| 1–3 (Early) | 0–30s | 22s | 2–3 | Gas control, pickup beacon navigation | 95% |
| 4–6 (Early-Mid) | 30–60s | 19s | 4–5 | Buffered steering at intersections, traffic avoidance | 85% |
| 7–9 (Mid) | 60–90s | 15s | 6–7 | Throttle timing for near-misses, combo chaining | 70% |
| 10–12 (Late) | 90–120s | 12s | 7–8 | Reflexes + risk management, chasing combo | 50% |

## Pacing & Plateaus

**No Hard Plateaus:** Because each run is short (45–90s), the curve ramps continuously rather than plateau. However, deliveries 1–3 serve as an *onboarding plateau*—low time pressure lets players acclimate to steering and gas management.

**Delivery 4–6** introduces traffic as a *soft gate*: players first encounter collision risk here, but the time limit is still forgiving (19s). This teaches traffic awareness without hard failure.

**Delivery 7–9** combines order time pressure with dense traffic—the mastery checkpoint. Players who can't execute clean turns now hit failures, naturally filtering skill levels. However, the combo multiplier remains accessible (still possible to chain 3+ clean deliveries).

**Delivery 10–12** is peak difficulty: tight time limits and peak traffic. Success here requires optimized throttle timing and lane-positioning skill—the true test of mastery.

## Skill Gates

**Gate 1 (Delivery 4):** First traffic car appears. If players crash here, they understand the new constraint without run-ending punishment; they can retry the next delivery.

**Gate 2 (Delivery 7):** Order time drops to 15s. Paired with moderate traffic, this requires players to execute turns faster. A near-miss with a car now costs critical seconds.

**Gate 3 (Delivery 10):** Order time hits 12s. This is the hard gate—players must have practiced throttle control in earlier deliveries to succeed. Crashing or missing pickup ruins the combo.

## Combo Reset Mechanic (Difficulty Enforcement)

The **combo multiplier** (capped 8×) is both a reward and a difficulty lever. Crashing or missing an order resets it to 1×. This creates *risk-seeking behavior*:
- Delivery 1–3: Easy to chain (establish confidence).
- Delivery 4–6: Possible to chain despite traffic (skill is rewarded).
- Delivery 7–12: Risky to chain (missing one delivery loses all progress).

This dynamic ensures the curve feels like a natural test of accumulated skill, not arbitrary number increases.

## Summary

Difficulty escalates smoothly over a single run via two scaling variables. The curve respects onboarding (easy start), introduces mechanics one at a time (traffic, then time pressure), and rewards mastery (combo chaining). Failure is always replayable within seconds (instant restart).

---

## Validation Checklist

- [x] Difficulty variables are explicit and scalable (order time in seconds, traffic car count).
- [x] Each progression step increases 1–2 variables (time limit OR traffic, not both simultaneously in early stages).
- [x] Onboarding (deliveries 1–3) serves as a soft plateau with forgiving time limits.
- [x] No mechanic is tested before it's practiced in low-stakes scenarios (traffic appears with time limit still generous).
- [x] Progression step boundaries align with natural delivery-count breaks (every 3 deliveries).
- [x] Combo reset acts as a skill gate—chaining rewards mastery; crashing teaches consequence.
- [x] Peak difficulty (deliveries 10–12) is optional content in a sense: players can quit after any completed delivery; continuing is risk-seeking.
- [x] Difficulty never punishes for *not knowing*; each new pressure is introduced mildly before being tested hard.

---

**Previous:** [08_Difficulty_Philosophy.md](../08_Difficulty_Philosophy.md)  
**Next:** [10_Learning_Curve.md](10_Learning_Curve.md)
