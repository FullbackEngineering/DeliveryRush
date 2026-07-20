# Delivery Rush — Difficulty Philosophy

## Difficulty Philosophy Statement
**Delivery Rush embraces fair, skill-based difficulty where player agency determines outcome.** Difficulty emerges from mastery-seeking (throttle timing, steer prediction, traffic avoidance), not randomness or punishment. Difficulty scales with play (early runs are approachable; mastery runs challenge competent players). The game respects player time: no grind gates, no artificial timers, no pay-to-win. Failure is always instructive, never exploitative.

## Failure Conditions Audit

| Failure Condition | Type | Rule | Visible? |
|---|---|---|---|
| **Order timeout (delivery time limit reached)** | Skill-based (time management) | Fail if delivery is not reached before order time limit expires. Limit shrinks per delivery (22s → 12s). | ✓ Yes (order timer on beacon; HUD timer visible) |
| **Collision with traffic car** | Skill-based (reaction + prediction) | Fail if vehicle physics detect collision. Collision detection is deterministic (player can always predict car paths visually). | ✓ Yes (traffic cars are visible; collision is immediate/obvious) |
| **Missed beacon (distance exceeded)** | Cognitive (navigation) | N/A — beacons always visible; player cannot "miss" beacon. Only timeout or collision fails delivery. | ✓ N/A |
| **Run timer expires (session ends)** | Time-based (marathon endurance) | Fail when run timer counts to zero. Timer adds +7s per successful delivery (max 60s total). | ✓ Yes (run timer persistent, top-center) |
| **Combo reset (crash or timeout)** | Skill-based + loss aversion | Combo resets to 0× on any delivery failure. Reset is immediate (not gradual fade). | ✓ Yes (combo counter shows change; sad audio cue) |

**Fairness check:** Every failure condition has a transparent rule the player can read or infer from feedback. No hidden mechanics, surprise stat penalties, or randomized arbitration.

## Fair Play Definition

**A player fails at a delivery if and only if:**
1. **Timeout:** Remaining order time reached zero before reaching dropoff beacon, AND
2. **Collision:** Vehicle collided with traffic car, AND
3. **Navigation impossibility:** NO — beacons always reachable within time window (Manhattan grid + sufficient time).

**Clear feedback on failure:**
- **Timeout:** Order timer = 0; beacon disappears; combo resets. Audio: descending sad tone. Feedback: immediate (< 100ms).
- **Collision:** Crash sound; haptic impact; vehicle stops; combo resets. Feedback: immediate (< 50ms).

**Can player predict failure before attempting?** YES.
- Player sees order time budget on beacon (22s, 16s, 12s, etc.).
- Player can calculate minimum time to reach beacon based on distance and current speed.
- Player can see traffic car positions and predict collision risk.

**Result:** Failure is never arbitrary. Player can always understand why they failed and attempt differently next time.

## Difficulty Sources

### Cognitive Difficulty
**Requires thinking: predict intersection timing, read traffic patterns, plan throttle usage.**

**Example mechanics:**
- Steer buffering (requires prediction: "when should I tap to catch this intersection?").
- Traffic prediction (requires reading car trajectories: "will I collide at this intersection?").
- Throttle optimization (requires timing: "should I brake before this intersection or hold gas?").

**Strength:** Engaging when understood. Rewards knowledge and foresight.  
**Risk in Delivery Rush:** Minimized by making all information visible (traffic cars always on-screen, no hidden patterns).

### Skill Difficulty (Execution)
**Requires performing reliably: react to traffic, time throttle input, execute steer input with precision.**

**Example mechanics:**
- Reaction time (dodge sudden traffic near intersection).
- Throttle timing (release-to-brake at right moment to avoid collision without overshooting dropoff).
- Steer precision (tap at right time to commit turn correctly; early tap wastes buffer, late tap causes turn miss).

**Strength:** Players know when they fail (they see the collision or timeout).  
**Strength in Delivery Rush:** Player always understands failure reason (can improve in next attempt).

### Randomness
**Outcomes partially determined by chance: traffic spawn timing, VIP order chance, delivery location (within grid).**

**Randomness *used carefully*:**
- ✓ Traffic spawn timing (keeps replays fresh, prevents memorization cheese).
- ✓ Delivery location (daily seed procedural city, but not truly random within run).
- ✓ VIP order chance (rare, high-reward orders add excitement; ~5–15% chance depending on delivery number).

**Randomness *avoided*:**
- ✗ Collision detection (always deterministic; player can see and predict).
- ✗ Order time limit variance (always fixed per delivery; no randomization).
- ✗ Vehicle stats (always fixed; no variance in acceleration curve).

**Principle:** Randomness adds *variety*, not *arbitration*. Core failure conditions (collision, timeout) are 100% skill-based.

## Philosophy vs. Genre Alignment

**Delivery Rush is Arcade/Casual + Score-Attack + Speedrun-friendly.**

**Expected difficulty philosophy:** Skill-based, approachable intro, mastery-endgame, instant restart.

**Our implementation:**
- ✓ Skill-based: Throttle mastery, steer prediction, traffic avoidance are learnable.
- ✓ Approachable intro: Difficulty ramps gradually (deliveries 1–3 are easy, confidence-building).
- ✓ Mastery endgame: Deliveries 11+ require tight execution (8× combo is aspirational, not guaranteed).
- ✓ Instant restart: Retry button < 1s; no loading screen; no penalty for death (restart immediately).

**NOT a narrative game** (so no difficulty toggle for story preservation).  
**NOT a roguelike** (so randomness is cosmetic, not core).  
**NOT a competitive PvP game** (so balance is solo-centric).

## Difficulty Knobs & Tuning

| Knob | Range | Impact | Tuning Method |
|---|---|---|---|
| **Order time limit** | 22s (delivery 1) → 12s (delivery 11+) | Time pressure escalates smoothly | Decrease ~1s every 2–3 deliveries |
| **Traffic density** | 0–2 cars (early) → 6–8 cars (late) | Spatial complexity escalates | Spawn 1 additional car every 2–3 deliveries |
| **VIP rarity** | 5% (early) → 15% (late) | High-stake moments become more common | Increase by ~2% every 3 deliveries |
| **Vehicle speed** | Fixed per vehicle (not tuned per run) | Intrinsic difficulty (player chooses vehicle) | Tuned at Loadout time, not runtime |

**Philosophy:** Adjust difficulty via time pressure + traffic density. Do not adjust via RNG (collision chance, timeout randomness) or hidden mechanics (secret speed reduction, surprise stat penalties).

## Tuning & Playtesting Protocol

**If > 10% of players report frustration (quit early, complain about difficulty):**
1. Increase order time limit (+2s to current phase).
2. Decrease traffic spawn rate (-1 car per delivery).
3. Verify: Do players now report "challenging but fair"?

**If > 10% of players report boredom (play one run, leave, give low ratings):**
1. Decrease order time limit (-1s to current phase).
2. Increase traffic spawn rate (+1 car per delivery).
3. Verify: Do players now report "engaging and tense"?

**Never adjust via:**
- ✗ Hidden stat changes (invisible speed reduction).
- ✗ Randomized collision arbitration (sometimes collide even though visibly clear).
- ✗ Paywall difficulty (real-money "difficulty toggle").

## Validation Checklist
- [x] Difficulty philosophy is stated ("Skill-based, fair, approachable intro, mastery endgame").
- [x] Each failure condition has a transparent rule (timeout, collision, no ambiguity).
- [x] Feedback on failure is clear (order timeout = timer = 0 + audio cue; collision = crash sound + haptic).
- [x] Randomness does not override skill/cognition tests (randomness is spawn timing/location, not collision outcome).
- [x] At least one difficulty "mode" accommodates players prioritizing casual play (entire early game, deliveries 1–6, is approachable).
- [x] No death spirals (single mistake does not cascade to guaranteed failure; recover via next delivery).
- [x] Hardest content is optional (8× combo is aspirational, not required; can finish runs at 3× combo comfortably).
- [x] Difficulty philosophy matches genre (arcade/casual + score-attack = skill-based, instant-restart, no grind).
