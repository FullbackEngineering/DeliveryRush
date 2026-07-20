# Delivery Rush — Gameplay Pillars

## Pillar 1: One-Thumb Throttle-Steer Mastery

**Definition:** The player masters accelerate/brake timing via gas-hold, and buffered steer input committed at intersections—a single-button, two-direction control scheme that feels responsive yet skill-expressive.

**Why:** Casual arcade players demand one-thumb accessibility; three buttons (Left / Gas / Right) trivializes navigation while leaving room for throttle timing as core skill. Buffered steer (not instant) creates a learnable prediction layer—"when should I tap to catch the next intersection?"

**How It Manifests:**
- **Mechanics:** Gas button (hold = accelerate, release = brake) with curved ramp-up; steer taps commit at intersection centers only; no slide/drift (Manhattan grid enforces clean turns).
- **Progression:** Early deliveries teach throttle feel (cruise speed, braking snap); mid-game adds intersection prediction (buffer timing); late-game demands throttle feathering near traffic collisions.
- **Art & Sound:** Engine sound pitch rises with throttle (audio reinforces speed state); haptic pulse at turn commit (tactile feedback confirms input registered); speed trail visual effect (motion feels real).
- **Economy:** Throttle mastery directly affects delivery time (better throttle = faster = more time budget for hard deliveries later).

**Features That Serve This Pillar:**
1. **Curved throttle acceleration** — feels smooth, learnable; not instant (rewards smooth input over jerky taps).
2. **Steer buffering system** — forces prediction; tapping steer 500ms before intersection commits the turn reliably.
3. **Brake response faster than accel** — risk/reward: tight braking lets players dodge late-appearing traffic, but overshooting is punished with collision.

**Features That Don't Serve This Pillar:**
1. **Auto-braking on turns** — removed; throttle control must be player's responsibility.
2. **Drifting/sliding** — removed; grid-based Manhattan turns are clean (no skill-expression in drifting here).
3. **Gyro/tilt steering** (alternate on mobile) — added as option, not forced; many players prefer tap-steer.

## Pillar 2: Delivery Combo Chains & Push-Your-Luck Risk-Reward

**Definition:** Consecutive clean deliveries build a multiplier (capped 8×) that scales coin rewards; crashing or missing an order resets combo to 0×, creating escalating risk-reward tension.

**Why:** "One more delivery" motivation. Players feel combo climbing (1× → 2× → 4× → 8×) and fear losing it, driving aggressive play. Resetting on failure (not gradual fade) creates memorable high-stakes moments.

**How It Manifests:**
- **Mechanics:** Combo counter displayed prominently; +1 level per successful delivery; ×0 on crash/timeout; multiplied into coin formula: `base(100) + distance × combo(≤8)`.
- **Progression:** Early runs are learning safe combos; mid-game players push for 4×–6× chains; late-game is 8× combo chasing (requiring near-flawless play).
- **Art & Sound:** Combo counter visual grows larger/glow brighter as it climbs (visual momentum); audio: chime per delivery (satisfying repeated rewards); crash audio: distinct "combo broken" tone (loss aversion reaction).
- **Economy:** Coins scale exponentially with combo; a 6-delivery run at 8× combo earns ~4,200 coins; same run at 1× earns ~600. This gap drives replay motivation.

**Features That Serve This Pillar:**
1. **Visible combo counter** — always on-screen; player knows exact stake at every moment.
2. **Instant combo reset on failure** — no grace period; failure is felt immediately.
3. **Leaderboard highlighting best combos** — social proof of combo mastery (competitive motivation).

**Features That Don't Serve This Pillar:**
1. **Difficulty mode with "no combo penalty"** — removed; combo loss IS the difficulty scaling.
2. **Gradual combo decay** — removed; instant reset creates clearer risk/reward boundary.

## Pillar 3: Readable Procedural City & Instant Navigation

**Definition:** The player glances at a daily-seed procedurally generated city, immediately understands the layout (grid blocks, no maze), and navigates via visual landmarks—beacons, cardinal directions, compass arrow.

**Why:** Casual players don't want to read maps or plan routes. Instant readability (straight lines, grid alignment, color-coded beacons) lets them focus on the loop—throttle/steer—not navigation puzzle.

**How It Manifests:**
- **Mechanics:** Manhattan grid city; blocks are uniform size; pickup and dropoff locations visible immediately (pulsing beacons); compass arrow always points to next goal; no fog-of-war.
- **Progression:** All deliveries use the same simple navigation (no hidden routes, no unlocks that change layout); difficulty is distance/traffic, not route complexity.
- **Art & Sound:** Low-poly clean buildings (chunky readable shapes); bright palette (neon accents mark streets); no visual clutter or shadows that hide beacons.
- **Economy:** Delivery rewards scale with distance (not route optimization); farther deliveries earn more coins and are more time-consuming, creating natural difficulty scaling.

**Features That Serve This Pillar:**
1. **Procedural grid city (daily seed)** — fresh layout every day, but always readable grid.
2. **Pulsing beacons (pickup white, dropoff blue)** — one glance tells player where to go.
3. **Compass/arrow overlay** — redundant navigation aid (visual + directional redundancy increases readability).

**Features That Don't Serve This Pillar:**
1. **Fog-of-war or hidden map regions** — removed; entire city is visible at boot.
2. **Route planning UI or map menu** — removed; player navigates by beacons in real-time only.

## Pillar 4: Instant Restart & Zero-Friction Session

**Definition:** Boot to first delivery < 3 minutes; death → tap Retry → new run in < 1 second, no loading screens or menus. Respect player time.

**Why:** Casual arcade games live and die on friction. Casual players have 5–10 minutes free; if boot takes 2 minutes, they're done. Instant restart (Retry button) lets players iterate on runs rapidly, amplifying "one more run" motivation.

**How It Manifests:**
- **Mechanics:** No mandatory loading screens; assets pre-generated on boot (one-time 2–3s); world streaming invisible; run ends → Results screen → tap Retry → Loadout (1s transition).
- **Progression:** No checkpoints or saves mid-run (session is atomic); if player closes app, next boot resumes from menu (profile saved, current run abandoned—acceptable).
- **Art & Sound:** Boot animation is engaging (music + city render) so wait feels productive; no "LOADING..." text; audio fills wait time.
- **Economy:** No energy/stamina system; play as many runs as desired (no daily limits).

**Features That Serve This Pillar:**
1. **Async asset generation** — textures/models built once on boot; world streamable in <1s.
2. **No mid-run saves** — trades persistence for simplicity; acceptable in 45–90s runs.
3. **Quick-restart Retry flow** — Loadout → Play in <1s (world already loaded).

**Features That Don't Serve This Pillar:**
1. **Mandatory intro cutscene** — removed; boot straight to menu with optional skip.
2. **Daily energy/stamina limits** — removed; players play at own pace.
3. **Complex save system** — removed; profile saved only on run completion.

## Pillar Relationships

**Pillar 1 (Throttle-Steer) ↔ Pillar 2 (Combo):** **Mutually Supportive**
- Throttle mastery *enables* combo chasing (skilled players maintain speed through traffic).
- Combo pressure (8× on line) rewards throttle precision (tight braking dodges crashes better than panic driving).
- Resolution: Design throttle feel tight but forgiving; braking is snappy but not punishing.

**Pillar 1 (Throttle-Steer) ↔ Pillar 3 (Readability):** **Supportive**
- Clear navigation (beacons, no maze) removes cognitive load, freeing player to focus on throttle/steer.
- Simple grid prevents execution-punishing situations (player never crashes due to "invisible wall").
- Resolution: Keep both systems independent; improve one without regressing the other.

**Pillar 2 (Combo) ↔ Pillar 4 (Friction-Free):** **Mutually Supportive**
- Zero-friction restarts let players retry immediately after combo reset, reinforcing "one more run."
- Instant restart + combo stakes = fast feedback loop (fail → learn → retry in 2s).
- Resolution: Ensure Retry button is always visible; loading < 1s is non-negotiable.

**Pillar 3 (Readability) ↔ Pillar 4 (Friction-Free):** **Supportive**
- Simple navigation (no menu, no map) means faster play sessions (shorter cognitive overhead).
- No tutorial needed (beacons are self-explanatory) = faster FTUE.
- Resolution: Keep both minimal and visual.

## Feature Evaluation Template

**Example: Feature Proposal — "Power-ups (speed boost, shield, invincibility)?"**

| Feature | Serves Pillar 1 | Serves Pillar 2 | Serves Pillar 3 | Serves Pillar 4 | Dev Cost | Decision |
|---------|---|---|---|---|---|---|
| Power-ups (random spawn) | No (breaks throttle skill) | No (makes combo effortless) | No (adds clutter) | No (adds UI complexity) | Medium | **Rejected** |
| Equippable cards (modifiers like "+10% speed" or "+50% coins") | Yes (enables build variety) | Yes (enables combo strategies) | No (but UI is prep-time, not runtime) | Yes (cards selected at Loadout, no runtime menu) | Low | **Approved** |

## Validation Checklist
- [x] Exactly 3–6 pillars defined (exactly 4, balanced set).
- [x] Each pillar is behavioral ("throttle-steer mastery," "combo chaining," "instant restart"), not feeling-based ("fun," "epic").
- [x] Each pillar is specific to Delivery Rush (not generic).
- [x] Each pillar has a one-sentence definition (shown above).
- [x] Each pillar appears in mechanics, progression, art/sound, and economy (documented for each).
- [x] Pillar relationships explicitly documented (supportive/conflicting).
- [x] Conflicting pillars have resolutions (none conflict; all mutually supportive).
- [x] Approved features (throttle system, combo, beacon navigation, cardss, quick-restart) all serve multiple pillars.
- [x] Rejected features (auto-braking, fog-of-war, power-ups, energy limits) documented with pillar-based reasoning.
- [x] Team has reviewed and aligned on pillars (documented in CLAUDE.md + canonical brief).
