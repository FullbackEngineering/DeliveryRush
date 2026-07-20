# 01 — Design Principles — Delivery Rush

## Design Principles for Delivery Rush

### Principle 1: Input Must Always Win Immediately
**Statement:** Player input always produces visible feedback within 50ms, and buffered steering commits predictably at intersections.

**Why it matters:** Mobile players hold phones in one hand and expect snappy response. Steering is buffered (not immediate) to work within our intersection-based grid, so we must telegraph that clearly. A delayed input response or unclear steering commit breaks the delicate throttle–steer skill curve. This principle ensures expert players can trust their reflexes.

**How it shows up:**
- Throttle: release button → immediate brake animation (no delay)
- Steering: tap left/right → highlight next turn direction within 50ms
- Intersection commit: buffered turn executes the moment car's center crosses intersection
- Menu navigation: every button press highlights or activates within frame 1

**When it might conflict:** We could queue complex animations (e.g., drift skids), but those land *after* the steering input is acknowledged. Principle 1 (acknowledgment) always wins; complex animation lands as follow-through.

---

### Principle 2: Clarity Never Sacrifices to Spectacle
**Statement:** Every UI element, beacon, traffic car, and map indicator must be instantly readable at arm's length on a phone screen.

**Why it matters:** At portrait 720×1280 on a 5" screen, a 2px-wide icon is invisible. We're competing with other distractions. If a player misses a beacon or crashes because they couldn't see the traffic, spectacle has failed design. Casual players tolerate lower visual complexity; they will not tolerate confusion.

**How it shows up:**
- Pickup/dropoff beacons: large pulsing glyphs (emoji or glow) centered on destination block
- Traffic cars: solid contrasting colors, never blended into background or city
- Order timer: huge countdown number, centered in screen safe area
- Combo meter: large counter, always in top-left safe zone
- Road lanes: slightly lighter than blocks; right-hand lane offset is visible at a glance

**When it might conflict:** We want moody atmosphere (dark nights, fog). Principle 2 wins: if atmosphere hides gameplay, remove it. (We can add atmosphere *after* clarity is proven, or use it as a cosmetic theme with no mechanical impact.)

---

### Principle 3: Skill Is Rewarded, Not Luck
**Statement:** Difficulty comes from timing throttle release at intersections and chaining clean deliveries, not from random events or unfair enemy behavior.

**Why it matters:** Casual arcade games fail when players feel *cheated*. If a crash is due to unpredictable traffic AI or a bad random spawn, players leave. If a crash is their fault (tapped turn too late, didn't brake for intersection), they retry. Delivery Rush is a rhythm game hiding in a taxi game—the beat is throttle timing and turn commits.

**How it shows up:**
- Traffic AI: deterministic, visible (moves in readable patterns), telegraphs turns in advance
- Orders: spawned at fixed intervals, not surprise-spawned during chaos
- Combo reset: only from crashes or missed timers, never from random events
- Ramp difficulty: order time limits shrink predictably over ~12 deliveries, not sudden spikes
- Cards/upgrades: cosmetic or small (traffic reduction, coin bonus)—no hidden randomness

**When it might conflict:** Procedural generation can feel chaotic. Principle 3 wins: the city is procedural but *playable*—intersections are always usable, no impossible geometry.

---

### Principle 4: Sessions Are Atomic and Instant
**Statement:** Boot → first order in <3 seconds. Die → retry in 1 tap. No menus between runs unless explicitly chosen.

**Why it matters:** Casual mobile players play in spare moments (30 seconds to 2 minutes). The smaller the friction between attempts, the more players iterate and engage. Each run is a self-contained push-your-luck streak; loading times or menu crawl feels like punishment.

**How it shows up:**
- Boot sequence: load assets in parallel; show main menu while city generates
- Game over: Results screen shows score, high score, best combo, then "Tap to Retry" or menu
- Retry flow: one tap restarts at main game loop; no confirm dialogs
- Garage (cosmetics): optional, not forced between runs
- Settings: pausable, doesn't interrupt the core 45–90 second session

**When it might conflict:** Reward dialogs or achievement popups might delay retry. Principle 4 wins: show them on results screen or after player has committed to garage/menu, never between sessions.

---

### Principle 5: Combo Is Everything
**Statement:** Every design choice ladders toward encouraging clean delivery chains and punishing resets.

**Why it matters:** Combo is Delivery Rush's unique hook (vs. pure taxi simulators). It's the emotional engine: success breeds success, failure is reset. The game is more engaging because each run is a push-your-luck streak, not just a score counter. All systems should reinforce the combo loop.

**How it shows up:**
- Rewards: coins × combo multiplier (8×  max). Clean deliveries reward multiplicatively, not additively.
- Combo meter: prominent visual, celebrated on screen (number grows, color brightens)
- Combo reset: only crash or miss order; traffic near-miss does *not* reset
- Order timers: lenient early, tight late (difficulty ramps with combo, rewarding expert chains)
- Audio/juice: chord progression or rising pitch as combo climbs; satisfying "crash" sound on reset

**When it might conflict:** An easy mode might remove combo to reduce stress. Principle 5 loses: new players can still reach high combos through practice, so we don't nerf the mechanic—we just offer more forgiving order timers early.

---

## Validation Checklist

- [x] Each principle is singular and clear (one concept per principle)
- [x] Each principle is actionable (changes real decisions: input latency targets, UI sizing, traffic behavior, session flow, combo reward)
- [x] Each principle is bounded to Delivery Rush's scope (arcade, mobile, throttle–steer, combo-focused)
- [x] Each principle is testable (can ask: "Does this feature obey the principle?")
- [x] No principle is vague ("Make it fun" → "Input must win immediately," "Clarity never sacrifices")
- [x] No two principles directly contradict (Clarity vs. Spectacle resolved by Principle 2; Combo vs. Difficulty resolved by Principle 3)
- [x] Conflict resolution is documented (Principle 2 > Spectacle, Principle 4 > Reward delays, Principle 3 > Randomness)
- [x] These principles have driven day-to-day decisions (input buffering, UI scaling, traffic patterns, retry flow)
- [x] New team members can restate all five principles without the doc
- [x] Features are approved/rejected by referencing principles (e.g., "Does this card add randomness?" → Violates Principle 3 → Cut or redesign)
