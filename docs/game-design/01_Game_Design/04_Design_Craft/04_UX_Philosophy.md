# 04 — UX Philosophy — Delivery Rush

## UX Philosophy for Delivery Rush

### Core Principles

1. **Visible Control, Not Hidden Complexity**: Three big touch buttons (L / Gas / R) is the entire control surface. The player sees the buttons, taps them, and the car responds predictably. No hidden stats, no ambiguous inputs.
   - Applied to: Input, HUD, menu navigation
   - Example: Gas button is large (160×160px), filled state changes color on hold, release is instant brake. No need to teach; see → tap → car slows.

2. **Clarity Over Atmosphere**: If a beacon is hard to see, add a glow. If a timer is small, make it huge. Aesthetic ambiguity is fun in narrative games; it's hostile in arcade games.
   - Applied to: Beacons, order timer, traffic cars, UI text
   - Example: Order timer is the largest number on screen (48px), always centered. Pickup beacon pulses with high-contrast emoji. Dropoff beacon is different (color + shape variation).

3. **One Tap = One Action**: Primary actions (Play, Retry, Tap Order) are always one tap. No double-tap, no hold-to-confirm, no swipes (except future swipe-to-skip tutorials).
   - Applied to: Menu navigation, game over → retry flow, card selection
   - Example: Results screen shows score + "Tap to Retry" button (entire bottom half is tap target). One tap, back to throttle + steer.

4. **Respect Player Attention**: The screen is crowded: city + car + beacon + timer + combo + UI. Hierarchy matters. Most important: combo (top-left), timer (center), beacon (world). Least important: framerate counter (debug only).
   - Applied to: HUD layering, font sizes, color contrast
   - Example: Combo number is 32px bold (eye-catching); coin count is 16px secondary; frame counter is 10px gray (not distracting).

5. **Feedback Is Honest**: Every player action produces feedback. Miss an order → sad sound + red flash. Land a delivery → satisfying "ding" + combo counter bounces. Players trust games that respond truthfully.
   - Applied to: Audio, VFX, UI animation, screen shake
   - Example: Crash → screen shake + red flash + bass "thump" + "CRASH" sound. Delivery → ascending tone + counter bounce + "DELIVERED" text. No silent failures.

### Clarity Targets

**Most critical info**: Order location (pickup then dropoff), timer counting down, combo multiplier
- Visual indicator: 
  - Pickup: Large pulsing emoji beacon (e.g., 🍔 for food) on the block
  - Dropoff: Same emoji but visually different (different color/glow)
  - Timer: Huge number (48px) in center-top of screen; color shifts green → yellow → red as time runs low
  - Combo: Bold number (32px) in top-left, incremented with bounce animation on each delivery
- Location on screen: 
  - Timer: Safe area, center-top (80px down)
  - Combo: Safe area, top-left corner
  - Beacons: World space, overlaid on city blocks (center of block)

**Second-tier info**: Run progress (deliveries completed), current order type, upcoming difficulty hint
- Visual indicator: 
  - "Delivery 3/5" text (smaller, 16px)
  - Order glyph (emoji; tells player what's being delivered)
  - Next difficulty hint: "Orders getting harder!" (text, optional)
- Availability: 
  - Delivery count: Always visible (top-right)
  - Order type: Displayed when order given, stays in HUD until picked up
  - Difficulty hint: Shown after delivery, fades after 2 seconds (not intrusive)

### Guidance Strategy

| Player Type | Level of Direction Needed | How We Provide It |
|-------------|--------------------------|------------------|
| **New (first 30s)** | High | Tap-to-start prompt → "Hold Gas to Speed Up" visual hint → First beacon pulsing + "Go Here!" hint → Order timer clearly visible |
| **Learner (first run)** | Medium | Beacons are self-explanatory (emoji = destination); timing feedback (timer visual/audio hints) guides throttle release; one crash teaches braking |
| **Experienced (2+ runs)** | Low | No text hints; UI is intuitive; focus on mastery (timings, traffic patterns, high combos) |

### Menu & Navigation

- **Primary actions** (Play, Retry, Garage): 1 tap to reach, centered on screen, 160×160px+ tap targets
- **Secondary actions** (Settings, Help): 2 taps max (e.g., tap Settings in menu → see options)
- **Tertiary actions** (Credits, about): 3 taps, in Settings submenu (not main flow)
- **Escape hatch**: Esc/P pauses anywhere in game; any menu has clear back button

### Feedback Strategy

| Player Action | Visual Feedback | Audio Feedback | Timing |
|---------------|-----------------|----------------|--------|
| **Button press (UI)** | Highlight color shift, instant scale-down (button "press" animation) | Soft click tone | 0–50ms |
| **Gas button held** | Button fill animates, car accelerates in background | Low humming tone rises in pitch | 0–100ms |
| **Gas button released** | Button returns to normal, car brakes in background | Brake squeal (optional), pitch drops | 0–50ms |
| **Steer tap (left/right)** | Directional arrow highlights, next turn at intersection glows | Directional "beep" (left vs. right pitch difference) | 0–50ms |
| **Order delivered** | Beacon disappears, combo counter bounces up, screen brief white flash | Ascending chord (1–3 notes), satisfying "ding" | 0–100ms |
| **Order missed (timer expired)** | Beacon fades, warning screen flash (red), combo resets to 1 | Sad trombone or "bzzt" failure sound | 0–100ms |
| **Crash** | Screen shake, red flash, car stops, "CRASH" overlay text fades | Bass "thump" + crash sound (impacts vary by severity) | 0–150ms |
| **Combo milestone (4x, 8x)** | Counter glows/flashes, background briefly brightens | Ascending pitch swell, celebration tone | 0–200ms |

### Localization & Accessibility

- **Text scaling**: Minimum 12px (hint text) to 48px (timer) supported; test with 150% system text scale
- **UI scaling**: All buttons scale 1.2× on high-DPI devices (e.g., iPhone 14 Pro); tap targets never shrink below 44×44px
- **Colorblind modes**: 
  - Deuteranopia (red/green blind): Traffic cars use shape + brightness (red car = bright square, green car = dark circle); UI uses blue/yellow hierarchy (not red/green)
  - Protanopia (red/green blind, different severity): Same mitigation
  - Supported: Settings → Colorblind Mode toggle
- **Audio descriptions**: 
  - Game is heavily audio-dependent; deaf players can play with visual-only feedback (screen flashes, text, animations)
  - Closed captions: Not implemented (audio is synthesized SFX, not dialogue)
  - Haptic feedback (vibration): Primary on crash/delivery for deaf + hard-of-hearing; mapped to action intensity
- **Subtitle support**: N/A (no dialogue)

### Common Patterns

- **"Are you sure?" prompts**: Never (destructive actions are rare; Retry is instant, Garage changes are cosmetic)
- **Confirmation dialogs**: Only for high-cost actions (e.g., "Use 500 coins to unlock Sport car?" → Yes/No). Keep it one line + two buttons.
- **Loading screens**: 
  - On boot: Show logo + loading bar (progress as assets stream in); no tips (just get to menu fast)
  - In-game: Never (no level loads; city is generated at boot, reused for all runs of the day)
  - Results → Retry: Instant (preload city at boot)

### Review Process

- **Design owner**: Designer reviews all UI changes against this philosophy
- **Before shipping**: Usability playtest with 3–5 fresh players; observe if they get stuck on menus or miss critical info
- **Escalation**: If philosophy is violated (e.g., "gas button is now 80×80px"), designer + dev discuss trade-off. Philosophy wins unless trade-off is documented.

---

## Validation Checklist

- [x] Philosophy is understood and can be restated by all team members (Designer + Programmer)
- [x] Every major UI screen was designed with philosophy in mind (Game scene, Results, Garage, Menu)
- [x] No critical information is hidden deeper than 2 clicks (Timer is visible always; Retry is 1 tap from Results)
- [x] Same actions are always performed the same way (Tap left button = always steer left; Retry button always restarts game instantly)
- [x] New players can get started in first 30 seconds without being stuck (Tap Play → hint on controls → tap Gas → car goes; intuitive)
- [x] Experienced players can skip tutorials/intros without punishment (Settings toggle "Skip Hints"; no story to miss)
- [x] Color is never the only way to convey info (Traffic cars: shape + color; Buttons: glyph + color; Status: icon + text)
- [x] All UI scales to different text lengths (UI built for English; localization buffer: 30% extra space for French/German)
- [x] Feedback is provided for every meaningful action (Tap → highlight, sound; Delivery → counter bounce, ding; Crash → shake, flash, sound)
- [x] No player action goes unacknowledged (Steer input highlights arrow; Gas shows fill state; every outcome has audio + visual)
