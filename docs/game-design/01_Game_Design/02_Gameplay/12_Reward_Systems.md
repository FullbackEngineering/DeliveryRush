# 12 — Reward Systems: Delivery Rush

## Overview
Delivery Rush rewards are **frequent, transparent, and earned**—not luck-based or time-gated. Every reward acknowledges player skill (clean delivery, efficient routing, combo building). The reward mix shifts from *extrinsic* (new vehicles/cards early) to *intrinsic* (high scores, combo chasing, speedrunning late game).

---

## Reward Types

### Immediate Feedback
**Examples:** Score pop-ups (+230 coins), chime sounds, combo counter increments, confetti bursts.

**Purpose:** Confirm every action. Dopamine tick per delivery.

**Pacing:** Every delivery (~every 30–45s in a single run). Micro-feedback (rumble, beep) happens every 2–5s.

**Quantity:** Generous. By end of a run, player has seen 2–3 score pop-ups (per delivery) + constant audio/visual cues.

**Risk management:** Feedback is distinct by type—combo increment is a specific chime; crash is a dull thud. Never ambiguous.

---

### Resource / Currency
**Examples:** Coins (earned per delivery).

**Earning formula:**
- Base: 100 coins per delivery (always)
- Distance bonus: 0–80 (route efficiency)
- Clean delivery bonus: +100 (only if no crash or near-miss)
- Multiplier: ×1 to ×8 (combo streak)

**Example:** 3rd clean delivery with 2× combo, decent routing = (100 + 40 + 100) × 2 = 480 coins.

**Purpose:** Player agency in spending (which vehicle/card to unlock next). Economic progression.

**Pacing:** Frequent (every 30–45s). A player earns 500–1500 coins per 60-second run (depending on combo + route quality).

**Spending:** 500 coins unlocks Starter vehicle (free at start). Sport = 1500 coins. Super = 3500 coins. Hyper = 8000 coins. Cards cost 200–1000 coins each.

**Risk:** Over-earning breaks progression. Mitigation: Hyper vehicle costs 8000 coins (takes 5–10 runs to unlock at casual play); cards have meaningful cost.

---

### Progression / Unlock
**Examples:** New vehicle, new card, personal best tracker.

**Vehicle tiers:**
- Starter (free): 240 px/s cruise speed, balanced handling.
- Sport (1500 coins): 280 px/s, sharper turns, feels snappier.
- Super (3500 coins): 320 px/s, drifty handling, more challenging.
- Hyper (8000 coins): 360 px/s, aggressive drifting, high skill ceiling.

**Cards (modifiers):**
- Speed Boost: +20 px/s cruise.
- Coin Magnifier: +50% coin earnings.
- Traffic Reduction: 1 fewer AI car on-map.
- Shield: One free crash before combo resets (once per run).

**Pacing:** Vehicle unlocks every 3–5 casual runs. Card unlocks every 1–2 runs. Feel meaningful without grinding.

**Risk:** Too fast unlock = content exhaustion. Hyper vehicle's high cost ensures dedicated players have a long-term goal.

---

### Cosmetic / Vanity
**Examples:** Car color, wheels, decals, engine paint.

**Unlock method:** 
- Free cosmetics: Earn by completing 5 deliveries in one run (shows dedication).
- Seasonal cosmetics: Available for 500 coins (optional cosmetic shop).

**Purpose:** Identity and self-expression. Zero mechanical advantage.

**Pacing:** Generous. A player sees a new cosmetic every 2–3 runs just through normal play. Optional shop cosmetics let players customize immediately.

**Risk:** If too expensive, resentment. Mitigation: All cosmetics are 500–1000 coins (one good run's earnings) or earned free.

---

### Narrative / Milestone
**Examples:** Personal best records, leaderboard entry, achievement badges.

**Examples:**
- "Personal Best: 3850 coins (×5 combo)."
- "Achievement: 'Delivery Master' (reach ×8 combo)."
- "Speedrun: Completed 8 deliveries in 60 seconds."

**Purpose:** Context and meaning. "You've mastered throttle timing."

**Pacing:** Rare (once every 3–5 runs) for significant milestones; common for personal-best tracking.

**Risk:** Meaningless if divorced from accomplishment. Mitigation: Achievements tie to clear, measurable skill (×8 combo requires consecutive clean deliveries under tightening time limits).

---

## Reward Pacing by Play Phase

| Phase | Feedback Freq. | Coin Freq. | Progression Freq. | Cosmetic Freq. | Narrative Freq. |
|---|---|---|---|---|---|
| First Run (0–2 min) | Every 30s | Every delivery (~×3 per run) | N/A (Starter free) | Rare | "Welcome to Delivery Rush" |
| Early Runs (2–10 min) | Every 30s | Every delivery (~×3 per run) | Every 3–4 runs (Sport unlock) | Every 2–3 runs | Personal best tracking starts |
| Mid Runs (10–30 min) | Every 30s | Every delivery (~×3 per run) | Every 5–7 runs (Super unlock) | Regular (cosmetic shop) | Achievements unlock ("Master x5" then "Master ×8") |
| Late Runs (30+ min) | Every 30s | Every delivery (~×3 per run) | Rare (Hyper = 8000 coins goal) | Frequent (cosmetic variety) | Speedrun records, leaderboard climbing |

---

## Extrinsic → Intrinsic Transition

### Early Game (First 5–10 runs)
**Dominant motivation:** "Unlock the Sport car" (extrinsic).

Player chases coin goals. New vehicles feel like huge upgrades (they're noticeably faster). Cosmetics are occasional surprises.

### Mid Game (Runs 10–30)
**Shift toward:** Skill-based goals. 

Player has Sport/Super vehicles. Further unlocks take more runs. Motivation shifts toward "beat my personal best" or "reach ×8 combo once." Vehicles no longer feel like huge upgrades.

### Late Game (Runs 30+)
**Dominant motivation:** Mastery and exploration (intrinsic).

All vehicles unlocked. Player experiments with card combos. Chasing ×8 combo consistently. Speedrunning for fast times. Cosmetics are identity/collection.

**Result:** Early extrinsic rewards (vehicles) naturally transition to intrinsic rewards (personal challenge, mastery). No forced grind.

---

## Balance Audit: 1-Hour Play Session

If a player plays for 60 minutes, earning ~40 runs × 800 coins/run (casual average) = 32,000 coins.

**Progression achieved:**
- Starter (free) → Sport (1500) → Super (3500) → Hyper (8000) + 4 cards (3000) + cosmetics (2000) = ~18,000 coins spent.
- Remaining: 14,000 coins banked for future cards/cosmetics.

**Interpretation:** In 1 hour, a casual player unlocks all vehicles and several cards. This feels like meaningful progression without mandatory grinding.

---

## Validation Checklist

- [x] Reward types are distinct (feedback, coins, progression, cosmetics, narrative).
- [x] Reward frequencies match intended pacing (coins every delivery; progression every 3–5 runs).
- [x] Progression is smooth (no extreme power gaps; vehicles improve speed incrementally).
- [x] Currency earning is predictable (formula is transparent: base + distance + clean + combo).
- [x] Cosmetics are generous (free + affordable; no paywall on essential vanity).
- [x] Early game is extrinsic-heavy (vehicle unlocks); late game is intrinsic-heavy (mastery, cosmetics).
- [x] Feedback for rewards is immediate and satisfying (score pop-ups, chimes, confetti).
- [x] Narrative rewards tie to genuine accomplishment (×8 combo requires consecutive clean deliveries; personal best is real skill).

---

**Previous:** [11_Dopamine_Loops.md](11_Dopamine_Loops.md)  
**Next:** [13_Retention_Strategy.md](13_Retention_Strategy.md)
