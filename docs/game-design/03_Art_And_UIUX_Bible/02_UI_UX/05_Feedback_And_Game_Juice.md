# 05 — Feedback & Game Juice (Delivery Rush)

## Purpose

Delivery Rush is an arcade game where every action—accelerating, steering, delivering, crashing—must feel immediate and weighty. "Game juice" is the audiovisual feedback that makes a 60-second run feel snappy and satisfying, not hollow. Without juice, tapping the gas button feels like filing tax forms. With thoughtful juice, the same action feels like flooring a sports car. This chapter defines every feedback loop and how it layers visual, audio, and haptic cues to build responsiveness.

## Core Principles Applied

**Every action gets a reaction.** The player taps a button; the game responds within 50ms with a visual or audio cue. Silence is failure.

**Immediacy is paramount.** Latency between input and feedback must be ≤100ms (perception threshold). Anything slower feels laggy, even if the actual mechanic resolves correctly a frame later.

**Juice amplifies clarity, not obscures it.** A particle burst celebrates a delivery without hiding the next order. A screen flash confirms a crash without obscuring the timer. Feedback reinforces meaning.

**Layer feedback in three phases:** Anticipation (button brightens as hover), impact (flash + sound on press), follow-through (button returns to rest, result settles).

**Restraint beats excess.** One clear particle burst beats three obnoxious ones. A single chime beats a symphony. Overloading trains players to ignore all feedback.

## The Feedback Contract Applied

| Stage | What Happens | Player Perception | Delivery Rush Implementation |
|-------|--------------|-------------------|-----|
| **Input** | Player taps gas button or steer button | Player intends action | Button receives focus (hover glow, scale) within 0ms. |
| **Acknowledgement** | Game responds within ~100ms | "The game heard me" | Flash (white, 50ms) + audio cue (beep tone, 50ms) + haptic pulse (50ms) all fire at input frame +1. |
| **Result** | Mechanical outcome registers (car accelerates, turn commits at intersection) | "That worked" | Car speed ramps up (smooth curve, ~500ms to cruise speed). Turn executes visually. Nav arrow updates. |

The key insight: feedback fires immediately (frame 1), before the mechanical result is fully resolved. This creates the illusion of instant response, even if physics takes a few frames to settle.

## Juice Techniques Applied in Delivery Rush

| Technique | Usage | Parameters | Caution |
|-----------|-------|-----------|---------|
| **Squash & Stretch** | Car compresses slightly on hard brakes (10% scale-down, vertical), then expands (105% scale, quick return). | 100ms compress/150ms release. | Never used on UI (buttons don't squash). Only on car model for visual weight. |
| **Tweening/Easing** | All motion (button presses, car acceleration, particle decay) uses easing (ease-out for impact, ease-in for recovery). | Durations 50–500ms depending on action. | Avoid tweens >200ms (feels sluggish). Prefer ease-out for impact (quick start, slow settle). |
| **Screen Shake** | On crash into traffic, screen shakes briefly (±3px offset, ±2° rotation, 100ms duration). Optional toggle for accessibility. | 100ms shake on crash. Off by default if "Reduced Motion" enabled. | Overuse causes nausea. Offer accessibility toggle. Never triggers on every collision—only major crashes or high-impact events. |
| **Particles** | Coin burst on delivery (8 coins fly from order card to top-left coin counter, 200ms lifetime), combo popup ("+4× COMBO" text, 300ms rise + fade). | Particle lifetime 200–500ms; speed 100–300 px/s. | Don't obscure timer, nav arrow, or order card. Budget: max 12 particles on screen at once. |
| **Flash/Bloom** | Delivery = white flash (100ms, full screen, 50% opacity). Crash = red edge-flash (100ms, edges only, fading). | Flash duration 100ms; opacity 50%. Frequency never >10 Hz. | Avoid flashing UI elements repeatedly (seizure risk). Single flash per event is safe. |
| **Sound Design** | Gas button press = beep tone (50ms, pitch rises with throttle). Delivery = chime (200ms, happy major-third interval). Crash = buzz (100ms, low frequency). | Audio cues fire at input +0ms. Duration 50–200ms each. | Mute/duck music slightly when UI audio plays (prevent overlap). Test on speakers and headphones. |
| **Haptics** | Gas press = short pulse (50ms). Delivery = double-pulse (50ms each, 100ms gap). Crash = single long pulse (150ms). | Intensity: light (50%), normal (75%), strong (100%). Only on supported devices (most phones). | Fallback gracefully if unsupported (no error, just silence). Never make feedback depend on haptics. |

## Layering Feedback (Complete Workflow)

### Example 1: Tap the Gas Button

**Anticipation (0ms):** Pointer hovers over gas button.
- Visual: Button glows (yellow aura, 2px spread) + scales to 105%.
- Audio: None (only on press).
- Haptic: None.

**Impact (0ms on press):** Player releases finger (button confirmed).
- Visual: White flash (50ms, 40% opacity, full screen) + button inverts colors (dark on light).
- Audio: Beep tone (50ms, rising pitch matching throttle level).
- Haptic: Light pulse (50ms).
- Timing: All fire at input frame +1.

**Follow-Through (50–400ms):** Button and action settle.
- Visual: Button returns to hover state (ease-out, 150ms). Car throttle ramps up (smooth curve, 500ms to target speed). Engine sound pitch rises.
- Audio: Engine sound continues, volume and pitch increasing.
- Haptic: None (already pulsed).
- Result: Player perceives gas pedal as responsive and weighty.

### Example 2: Deliver an Order (Successful)

**Anticipation (0ms):** Order timer reaches 0s, player arrives at dropoff, car is at correct position.
- Visual: Order card border glows brighter (anticipatory pulse, 100ms).
- Audio: None.
- Haptic: None.

**Impact (delivery frame):** Delivery resolves.
- Visual:
  - White full-screen flash (100ms, 50% opacity).
  - Order card animates out (scale down + fade, 150ms).
  - 8 coin particles spawn at order card center, fly to top-left coin counter (200ms trajectory, ease-out).
  - Coin counter increments (+coins text, 300ms).
  - Combo counter updates (+1×) and pulsates (100ms grow/shrink).
- Audio:
  - Chime (200ms, happy major-third, pitch increases with combo level).
  - Coin-pop sounds (50ms per coin, slightly staggered).
- Haptic:
  - Double pulse (50ms each, 100ms gap between pulses).
- Timing: All fire at delivery frame +0ms.

**Follow-Through (200–1000ms):** Feedback settles, next order begins.
- Visual: Coins disappear off-screen. Coin counter text returns to normal size. Combo counter starts 5s fade-out timer (if no new delivery within 5s).
- Audio: None (silence is part of the feedback rhythm; brevity matters).
- Haptic: None.
- Result: Player feels rewarded; combo multiplier is celebrated.

### Example 3: Crash into Traffic (Failure)

**Anticipation (1–2 frames before impact):** Car is about to hit traffic (collision is detected).
- Visual: Traffic car flashes (50% brightness pulse, 100ms).
- Audio: Warning beep (rising pitch, 100ms, plays early to warn).
- Haptic: None yet.

**Impact (collision frame):** Impact occurs.
- Visual:
  - Red edge-flash (100ms, edges of screen only, fading from center outward).
  - Screen shake (±3px offset, ±2° rotation, 100ms, ease-in then ease-out).
  - Car jerks backward (50px backward velocity, 100ms deceleration, ease-in).
  - Order card shrinks and flashes red (150ms pulse).
  - Combo counter flashes red (150ms) and animates down (-1 combo level, if combo > 1).
  - "-1 COMBO" text appears below combo counter (300ms fade-out).
- Audio:
  - Collision crunch (100ms, low-mid frequency, emphasizes impact).
  - Error buzz (100ms, low frequency, continuing crash state).
- Haptic:
  - Single strong pulse (150ms, emphasizing impact).
- Timing: Red flash, shake, and feedback fire at collision +0ms. Backward jerk resolves over 100ms.

**Follow-Through (100–500ms):** Car recovers, player regains control.
- Visual: Car returns to normal (scale, rotation, position) over 200ms (ease-out). Shake stops. Red edges fade.
- Audio: None (crash feedback is brief, then silence).
- Haptic: None (pulse has resolved).
- Result: Player feels the impact, understands the failure, and immediately regains control.

## UI Micro-interactions (All Button States)

| State | Visual | Audio | Haptic | Duration |
|-------|--------|-------|--------|----------|
| **Idle** | Default color (e.g., dark blue for gas). No glow. Normal scale (100%). | None | None | Persistent |
| **Hover** | Glow (yellow aura, 2px, 50% opacity). Scale +5% (105%). Slightly brighter. | None | None | 0ms (instant) |
| **Focus (keyboard/gamepad)** | Same as hover (glowing border, scale). | None | None | 0ms (instant) |
| **Press (button held)** | Colors invert (white on dark → dark on white). Scale returns to 100% (depress effect). | Beep (50ms tone). | Light pulse (50ms). | 50–100ms hold. |
| **Release (after press)** | Color returns to idle over 150ms (ease-out). Scale returns to idle over 150ms. | None. | None. | 150ms recovery. |
| **Disabled** | Desaturated (grayscale, -50% saturation). Dimmed (50% opacity). No glow, no scale. | None. | None. | Persistent |
| **Loading** | Spinner animation (1 rotation per 2 seconds) at button's right edge. Color unchanged. | None (optional gentle ambient tone). | None. | Continues until done. |
| **Success** | Green flash (50ms, 40% opacity) + check-mark animation (tick, 200ms draw). Text "OK" or icon appears briefly. | Chime (200ms, major-third). | Light double-pulse (50ms each). | 200–500ms total. |
| **Error** | Red flash (100ms, 50% opacity) + shake (50ms ±2px). Text "Error" appears. | Buzz (200ms, low frequency). | Strong single pulse (150ms). | 200–500ms total. |

## Restraint, Readability & Performance

**Accessibility.** "Reduced Motion" toggle disables all screenshake (crash shake, impact shake), particle squash/stretch, and rapid-fire animations. Audio feedback is unaffected (chimes, beeps, buzzes all remain). This accommodates players with vestibular disorders.

**Never obscure gameplay.** Particles spawn and arc away from critical zones. Coin bursts fly from center to top-left; they never linger over the timer, nav arrow, or road. Screen flashes are brief (50–100ms) and never prevent the player from seeing the next action.

**Respect frame budget.** Delivery Rush targets 60 fps on mid-tier phones. Juice budget:
- Particles: max 12 on screen at once, 200px bounding box per particle.
- Shaders: none (simple colors, no bloom or blur).
- Animations: all use lightweight tweens (no physics simulation).
- Audio: all synthesized (no sample playback; small file size).
Result: juice runs within budget; no frame drops from feedback.

**Consistency.** Every successful delivery uses the same chime (same pitch, duration, timbre). Every crash uses the same buzz. Every button press uses the same beep. This consistency trains player intuition: after 5 runs, the player hears a chime and knows a delivery succeeded without looking at the screen.

## Template — Feedback Spec

For each action, define:

**Action: Deliver Order (Success)**
- **Visual Feedback:**
  - Primary: White full-screen flash (100ms, 50% opacity) + coin particles (8 coins, 200ms lifetime).
  - Secondary: Order card animates out (scale-down + fade, 150ms). Combo counter pulses (+1×, 100ms).
  - Fallback for Reduced Motion: Color change only (card border turns green, 150ms), particles disabled. Flash remains (not motion).
- **Audio Feedback:**
  - Cue: Chime (200ms, major-third interval, pitch scales with combo level).
  - Alternate: Coin-pop sounds (50ms each, 8 quick pops).
  - Volume: 80% of SFX mix (duck music slightly).
- **Haptic Feedback:**
  - Pattern: Double pulse (50ms each, 100ms gap). Intensity: light (50%).
- **Timing:**
  - Delay from delivery event: 0ms (immediate).
  - Follow-through decay: 200–1000ms (particles settle, combo fades).
- **Validation:** Does it feel like a reward without overshadowing the next order? Yes—chime is brief, particles don't obscure timer, and control returns immediately.

**Action: Crash into Traffic**
- **Visual Feedback:**
  - Primary: Red edge-flash (100ms, fading) + screen shake (±3px, ±2°, 100ms).
  - Secondary: Order card flashes red (150ms). Combo counter animates down.
  - Fallback for Reduced Motion: Red flash remains (not a motion effect, but a color change). Shake disabled. Scale change disabled.
- **Audio Feedback:**
  - Cue: Collision crunch (100ms, low frequency) + error buzz (100ms continuation).
  - Volume: 90% of SFX mix.
- **Haptic Feedback:**
  - Pattern: Single strong pulse (150ms).
- **Timing:**
  - Delay from collision: 0ms.
  - Follow-through decay: 100–200ms.
- **Validation:** Does it feel like an impact without being nauseating? Yes (shake is 100ms, brief, and toggleable).

## Validation Checklist

- [x] Every player action (gas, steer, delivery, crash, menu button) has immediate feedback within 100ms: visual, audio, or haptic.
- [x] Feedback reinforces clarity: white flash confirms good actions, red flash confirms bad. Chime = success, buzz = failure. No ambiguity.
- [x] Reduced Motion toggle disables screenshake, particles, and squash/stretch; audio remains unchanged.
- [x] No flashing at >10 Hz (single flash per event; no strobe effects). Tested for seizure safety.
- [x] Audio tested on speakers and headphones; music is ducked during UI audio to prevent overlap (never both at 100% volume simultaneously).
- [x] Performance: particle count capped at 12, animation tweens are lightweight, no frame drops measured during peak juice (delivery + crash simultaneously).
- [x] Button states (hover, press, disabled, loading, success, error) all signaled visually without audio overload. Hover = silent (visual only). Press = beep (brief, 50ms). Error = buzz (100ms, distinct pitch).
- [x] Haptics fallback gracefully: if device doesn't support, game continues without error; feedback is audio + visual instead.
- [x] Consistency: all successful deliveries use the same chime pitch and duration; all crashes use the same buzz pitch. No variations that would confuse the player.
- [x] Particles don't obscure: coin bursts fly to counter (not across timer). Combo text fades below the counter (not over the road). No feedback blocks critical UI.

## Common Pitfalls (Avoided)

**Delayed feedback.** All feedback fires within 50ms of input. No "wait until animation completes to show result" – result and feedback are simultaneous.

**Feedback that hides gameplay.** Particles are small and short-lived. Screen shake is 100ms and toggleable. Flashes are 50–100ms and transparent. Nothing obscures the timer, nav arrow, road, or next order.

**Overloading every action.** Button press = single beep + glow + light pulse. No explosion of particles, no 5-second animation. Simplicity is readability.

**Ignoring accessibility.** Reduced Motion is a full toggle (not a slider), and it disables motion effects while keeping audio. Seizure-safe (no >10 Hz flashing).

**Inconsistent feedback timing.** Hover always takes 0ms (instant). Press always takes 50ms. Delivery always chimes with the same pitch progression. Consistency trains intuition.

**Silent failures.** Every action produces a cue. Even menu button presses beep. Silence is never the default response.

## Final Word

Juice is the craft of responsiveness. It lives in the milliseconds between input and perception. A tight feedback loop—fast, clear, layered with visual/audio/haptic—transforms a 60-second run from "okay, I'm moving" to "wow, that felt good." Every animation, every sound, every vibration should answer: "Does this make the action feel more immediate and satisfying?" If yes, include it. If no, cut it and spend that frame budget where it matters.
