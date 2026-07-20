# Delivery Rush — High Concept

## The Core Hook (One Sentence)

*You chase a delivery combo multiplier (capping at 8×) that boosts coin rewards, but one crash or missed order resets it to 1—creating a risk/reward tension that defines every run.*

The hook is not the throttle mechanic (many games have that). The hook is the specific pressure: knowing the next delivery is worth more coins because your combo is rising, but missing it erases all progress. That tension drives urgency and replayability.

## The Core Fantasy

The player imagines themselves as a skilled, focused courier threading through traffic under time pressure. They feel in control and exhilarated—not by reflexes alone, but by throttle timing decisions (brake here, accelerate through this corner) that *look* skillful and *feel* necessary. Success means completing a delivery, hearing the chime, and watching the multiplier tick up. The fantasy is not defeated by casual controls; it thrives *because* the player makes quick, high-stakes decisions about gas and steering, not complex combos. Missing a delivery after chaining 5 deliveries hurts—the loss of potential coins, the reset to 1×, the "one more run" to reclaim it.

## What Sets This Apart

- **Mechanical hook:** Throttle timing (hold to accelerate, release to brake) forces planning at intersections, not reflexive tapping. Combined with buffered steering (commits at next intersection, not real-time), the loop rewards prediction over reaction time. This is deliberately different from tap-steer racers; it's closer to turn-based cadence despite running in real-time.
- **Combo economy hook:** Every delivery completed raises a multiplier; crash or miss and it resets. No "redo" or forgiving second chances mid-run. This forces a push-your-luck dynamic unique to arcade courier games. (Crazy Taxi has tips; Delivery Rush has an ever-growing multiplier that can be lost.)
- **Aesthetic hook:** Bright, low-poly 3D (Crossy Road–inspired). Procedurally generated city, daily seed. Readable at a glance, zero-friction touch UI. Emoji order glyphs. No story clutter, no narrative weight—just the core loop.
- **Loop hook:** 45–90 second runs with instant restart. Players come back to "play one more" because the loop is tight, resets are quick, and the next run feels like an independent puzzle (new city, new traffic, new combo potential).

Each element reinforces the core fantasy: *I am a skilled courier, throttling through pressure, chasing a higher multiplier.*

## Why This Game Now

**Market gap:** The hyper-casual arcade space is proven (Crossy Road 80M+, Cars: Fast as Lightning 20M+). Combo mechanics are proven (Crazy Taxi, roguelikes like Hades). But the specific combination—throttle controls + procedural low-poly city + combo economy + mobile-first one-thumb play + zero friction—is not yet saturated. Casual players want snackable skill-light runs; this game delivers.

**Design moment:** Post-Hades and Into the Breach, indie game players embrace "loss resets progress" (combo resets) as a core mechanic, not a punishment. Delivery Rush borrows this: the reset is not unfair; it's the price of failure and the reason to retry.

**Tech enabler:** Three.js allows static, instanced geometry (no per-frame vector redraw), enabling 60 fps on mobile where Phaser 2D faltered. This is necessary for the casual market, where 30 fps feels sluggish to players accustomed to 60 fps mobile apps.

## The "Not This" Clarification

- **This is not a story-driven game.** Narrative is functional (why you deliver orders), not the draw. Minimal context; player attention stays on throttle timing and combo.
- **This is not a progression/collection game.** Vehicles and cards are cosmetics, not progression gates. Every run resets; retention comes from "one more run," not grinding or FOMO.
- **This is not hardcore or punishing in the Dark Souls sense.** Difficulty is fair, immediate, and transparent. Players always see why they crashed. Casual players can finish a run; speedrunners can chain 8× combos. No permadeath.

## Proof Points

- **Throttle timing reinforces fantasy:** Vehicle speed tuning (starter 240 px/s cruise, brake to ~77 px/s) creates moments where throttle decisions matter. Tighter turns at higher speeds risk crashes; slower speeds waste time. Every run is a series of throttle dilemmas.
- **Combo reset reinforces loop:** Losing a combo after building it stings. Players restart. The procedural city ensures the next run feels fresh, not repetitive.
- **Bright low-poly aesthetic reinforces tone:** Chunky, legible shapes. Warm palette (inspired by Kenney kits). Clean, playful, not grim. Matches casual all-ages target.
- **45–90 second sessions reinforce mobile use case:** No progression walls, no wait timers, no "come back in 8 hours." Respects player time; enables snackable play.

---

## Validation Checklist

- [x] Core hook is one sentence and describes what makes the game unique (combo reset tension), not what it does.
- [x] Core fantasy is emotional and sensory ("skilled courier throttling under pressure, watching multiplier rise").
- [x] Every major mechanic (throttle, buffered steer, combo, order timer, vehicle speed) can be justified by tying it to the hook or fantasy.
- [x] Differentiation is specific (throttle-based prediction, combo resets, procedural city). No superlatives; all are constraints/systems.
- [x] "Why this, why now" is grounded in market, design, and tech reality (hyper-casual space, combo acceptance, Three.js FPS fix).
- [x] Core loop (hold gas, tap steer, complete order, watch combo rise) reinforces core fantasy.
- [x] Anti-concept is defined (not narrative-driven, not progression-based, not hardcore-punishing).
- [x] High concept could be described to an unfamiliar designer and they'd understand why the game exists.
