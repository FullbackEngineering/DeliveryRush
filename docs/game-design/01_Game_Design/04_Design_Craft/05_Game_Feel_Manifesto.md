# 05 — Game Feel Manifesto — Delivery Rush

## Game Feel Manifesto for Delivery Rush

### Input Responsiveness Targets

| Action | Target Latency | Measurement Method | Owner |
|--------|---------------|------------------|-------|
| **Tap left/right steer button to arrow highlight** | < 50ms | Frame counter from input event to DOM/Three.js render update | Programmer (input system) |
| **Release gas button to brake animation start** | < 50ms | Frame counter from input event to animation frame 0 | Programmer (input) + Animator |
| **Touch event to car model update** | < 100ms | Total end-to-end latency (input → game logic → render) | Programmer (profiler) |
| **Menu button press to highlight** | < 50ms | DOM element highlight latency | Programmer (UI framework) |

**Rationale**: Arcade games live or die on input feel. 50ms is imperceptible to players; 100ms is the threshold where lag becomes noticeable. Any of these exceed 100ms → investigate frame drops or input event delay.

### Visual Feedback Strategy

| Event | Visual Feedback | Scale | Duration | Reasoning |
|-------|-----------------|-------|----------|-----------|
| **Order delivered (pickup or dropoff)** | Beacon fades out (white overlay), combo counter bounces up 10px, screen flashes white briefly (30% opacity) | Large (counter grows visibly) | 400ms (bounce + fade) | Celebrate success; combo jump is the reward |
| **Order timer critical (≤5s)** | Timer number flashes red, background of timer pulses | Medium (larger than normal timer) | Repeats until order picked up | Urgency; time is running out |
| **Crash / collision** | Screen shakes (amplitude 8px, 200ms), red flash overlay (50% opacity), car stops abruptly | Large (full-screen impact) | 300ms (shake + fade) | Visceral failure; player feels the impact |
| **Combo milestone (4×, 8×)** | Background brief color shift (to accent/bright color), combo counter flashes gold/bright, "+4" text appears and floats up | Large (entire screen briefly lit) | 500ms | Celebration; mastery milestone |
| **Traffic near-miss** | Subtle camera flinch (2px offset), car emits dust particle puff | Medium (small camera shake, not full screen) | 150ms | Tension without reset; close call |
| **Lane position correct** | Subtle green glow around car for 200ms (very brief) | Small (only car gets highlight) | 200ms | Positive feedback; player is driving well |
| **Throttle held (sustained)** | Engine hum (audio-visual sync), car model engine glow increases | Subtle (visual confirm, not distraction) | Continuous while holding | Feel of power building |

### Audio Feedback Mapping

| Event | Sound | Volume | Pitch | Variation | Reasoning |
|-------|-------|--------|-------|-----------|-----------|
| **Order delivered (success)** | Ascending chord (3 notes: C, E, G) | -3dB (not ear-shattering, but clear) | Rising (do-mi-sol in C major) | Chord position varies by combo level (4× = higher octave) | Immediate, celebratory; chord implies "good thing happened" |
| **Order missed (timer expired)** | Sad trombone or buzzer ("bzzt") | -5dB (slightly quieter than success) | Falling (descending pitch) | Longer duration (600ms) than success | Unmistakable failure; length amplifies disappointment |
| **Crash / collision** | Bass "thump" (sine wave, 60Hz) + impact "crack" (noise burst) | -1dB (loud, immediate impact) | Low (60Hz fundamental) then high-frequency noise | Volume scales with crash severity (slow collision = quiet, head-on = loud) | Visceral impact; bass felt in chest/phone |
| **Steer button tap (left)** | Short beep, slightly lower pitch than right | -8dB (background, not intrusive) | E4 (left), F#4 (right) | Pitch difference trains players to associate direction | Confirms input without dominating audio landscape |
| **Steer button tap (right)** | Short beep, slightly higher pitch than left | -8dB | F#4 | Pitch difference | (see above) |
| **Gas button held (throttle rising)** | Engine hum (looping sine), pitch rises 1 octave over 2 seconds | -4dB (background) | 200Hz → 400Hz | Pitch smoothly rises; loop crossfades for seamless sustain | Telegraphs acceleration; satisfying "car speeding up" cue |
| **Gas button released (braking)** | Brake squeal (filtered white noise) or pitch drop (descending tone) | -6dB | Falling pitch (optional) | Brief (200ms) | Confirms brake action; different from throttle = clear distinction |
| **Combo x4, x8 milestones** | Ascending fanfare (3–4 notes, quick) | -2dB (celebratory, prominent) | Rising pitch | Octave jump at x8 (higher octave than x4) | Milestone celebration; pitch escalation feels "bigger" |
| **Traffic car horn (nearby)** | Honk (short, warning tone) | -4dB (attention-grabbing but not dominating) | 800Hz–1kHz | Quick, single honk | Conveys urgency; other traffic exists |
| **UI click (menu button)** | Soft click (0–500Hz filtered) | -10dB (very subtle) | Neutral | Same for all UI clicks (consistency) | Doesn't distract; confirms action |

### Camera Behavior

- **Follow lag**: 120–150ms behind car center (slight delay feels natural; instant feels stiff; too much lag feels disconnected)
- **Impact flinch**: 
  - Light collision (traffic nudge): 0.5° rotation, 50ms
  - Moderate crash (head-on): 2° rotation, 100ms
  - Hard crash (full stop): 4° rotation, 150ms
- **Sway**: Subtle continuous jitter (0.2° amplitude, 8–12 Hz frequency); feels alive without motion sickness
- **Zoom**: Slight camera pull-back during high speeds (10% zoom-out at cruise speed); pull in on brakes (feels reactive)
- **Beacon attraction**: Camera subtly gravitates toward beacon (not automatic pan, but loose follow-ahead of car; helps player aim at delivery point)

**Rationale**: Camera is invisible when perfect. Too much lag = feels disconnected. Too much shake = nauseating. The goal is a responsive, slightly cinematic feel that sells speed and impact without disorientation.

### Haptic Feedback (Mobile Vibration)

| Event | Pattern | Intensity | Duration | Owner |
|-------|---------|-----------|----------|-------|
| **Light tap (steer input confirmation)** | Single pulse | 20–40% | 30ms | Input designer |
| **Delivery success** | Triple pulse (short-long-short) | 60–80% | 150ms total | VFX designer |
| **Order missed (timer expire)** | Double pulse (buzz) | 40–60% | 200ms | VFX designer |
| **Crash** | Sustained rumble ramping up | 80–100% | 300ms (ramp duration) | Physics/VFX designer |
| **Traffic near-miss** | Quick double-tap | 30–50% | 100ms | Physics designer |

**Rationale**: Haptic is especially important on mobile where audio might be muted. Intensity maps to event severity: light input = light feedback, hard crash = strong rumble. Pattern variation (pulse vs. sustained) helps distinguish events without looking.

### Animation Principles

- **Wind-up frames**: 
  - Steer turn: 3–4 frames anticipation (car leans into turn before committing intersection)
  - Acceleration: 2 frames (engine model glow starts before animation)
  - Crash: 1 frame (near-instant stop feels more impactful than wind-up)
  
- **Ease type**: 
  - UI buttons: Ease-out (snappy, 200ms, feels responsive)
  - Car movement: Linear or ease-in-out (arcade feel, not floaty)
  - Combo counter bounce: Ease-out-back (bouncy, satisfying overshoot)
  - Impact/crash: Ease-in (smooth deceleration into full stop = feels conclusive)

- **Follow-through**: 
  - Car: 5–8% overshoot (slight bobbing after turn = liveliness)
  - Combo counter: 15% overshoot (bounces past target, settles = satisfying)
  - Camera shake: Natural decay (shake fades over time, not instant off)
  
- **Overlapping**: Yes, extensively
  - Steer input → turn animation starts immediately, but car's lane positioning eases in over turn
  - Delivery → counter bounces *while* beacon fades (not sequential)
  - Crash → screen shake *and* audio impact land simultaneously

### Game Feel Measurement Strategy

**Latency Profiling**: 
- Frame counter (measure input-to-render latency every frame)
- Video capture at 240fps (slow-motion to verify feedback sync)
- Playwright/puppeteer automated test (tap button, measure timestamp from input to DOM update)

**Feel Tuning Cadence**: Weekly during development
- Capture reference video of target feel (e.g., "Crazy Taxi" or "Crossy Road" clips)
- Playtest new build, compare to reference
- Adjust easing curves, latency targets, animation durations based on player feedback

**Success Criteria**: 
- Input latency < 100ms (aim for < 50ms)
- Audio/visual feedback sync within 50ms
- No player comment like "feels laggy" or "delayed"

---

## Validation Checklist

- [x] Input latency is profiled and under target (< 100ms for all input types)
- [x] All feedback layers (visual, audio, haptic, camera) are documented and sync'd (within 50ms of each other)
- [x] Every significant player action produces multi-layer feedback (steer → visual + audio + haptic)
- [x] Animation wind-up (anticipation) exists for major actions (steer turn, acceleration, crash)
- [x] Easing curves match action type (UI snappy, car natural, impact decisive)
- [x] Camera doesn't fight player input (responsive, slightly cinematic, never feels uncontrollable)
- [x] Success vs. failure is immediately apparent (ascending chord vs. sad trombone, white flash vs. red flash, satisfying hum vs. crash thump)
- [x] No feedback feels delayed relative to player expectation (delivery celebrated within 100ms of contact)
- [x] Haptic (if present) maps to action intensity (steer tap = light, crash = strong rumble)
- [x] Game feel is consistent across all game states (results screen, garage, game loop all share feedback language)
