# 01 — UX Principles (Delivery Rush)

## Purpose

Delivery Rush distills arcade driving into one thumb on a portrait phone. The UI must disappear—the player should never think about controls, only about racing the clock and chaining deliveries. Clarity, immediate feedback, and consistency are non-negotiable: every tap must register instantly, the HUD must stay out of the way during intense minutes, and the controls must feel automatic after the first 10 seconds of play.

## Core Principles Applied

**Clarity over cleverness.** The gas pedal is a big center button; left/right steer buttons are equally prominent and self-explanatory. No hidden mechanics, no tutorial gates. A fresh player should understand the three-button model within five seconds. The HUD shows only the essentials: run timer (top-center), coins/score (top-corners), active order card (center, pulsing), combo popup (bottom, fades), and a directional nav arrow (color-coded for next turn). Nothing else competes for attention.

**Immediate feedback for every action.** Tapping a steer button flashes the button and plays a directional beep; the car commits the turn at the next intersection. Delivering an order triggers a burst of particles, a coin-pop sound, a "+120" float-text, and a haptic pulse. Missing a delivery resets the combo and plays a dull buzz with a red screen-edge flash. Picking up an order pulses the order card and plays a "ready" chime. Silence never happens.

**Consistency builds intuition.** The three-button layout is always the same (left/straight/right), always centered, always with the same visual feedback. Button press = white flash + 50ms audio beep. Button hover = 5% scale-up (no audio). Positive events (delivery, combo bonus) all use the same particle burst and chime pitch. Negative events (crash, failed order) use red flash + buzz. After five runs, the player stops reading the interface and flows entirely on muscle memory.

**Keep the player in control.** Three control schemes: touch (three buttons), keyboard (↑/Space=gas, ←/→=steer, Esc=pause), gamepad (triggers=gas, D-pad=steer). All feel native. Pause is always one button away. Players can toggle motion blur, screen shake, and particle intensity in profile settings without restarting. No forced tutorial, no locked progression, no "you must beat this before accessing garage."

**Minimize cognitive load.** During the 60-second run, the HUD demands zero decision-making: the order card shows the reward and time remaining; the nav arrow points the direction; the combo counter is a glance. The combo mechanic (8× max, reset on crash) is one sentence of rules, learned via play, not tutorial text. All settings and cosmetics live in a pause menu and the Garage, not during runs.

## Usability Heuristics Applied

| Heuristic | Delivery Rush Implementation | Example |
|-----------|---|---|
| **Visibility** | Real-time countdown on the order timer; combo counter ticks up with each delivery; run timer flashes red at 10s remaining. | Player always knows how much time remains and what the next reward is. |
| **System & Real World** | Button labels: "← Steer Left", "Gas", "Steer Right →". Order icon + text (e.g., "🍔 Deliver to Downtown"). Speed = "px/s", not engine RPM. | Players think in familiar driving terms, not backend jargon. |
| **Control & Freedom** | Pause always available (except during delivery animation, <1s). Garage allows cosmetic changes without penalty. Settings are fully reversible. | No forced "you are locked into this vehicle" or "selling cards costs nothing to undo." |
| **Consistency & Standards** | Red always = crash/fail/reset; Green always = deliver/success/combo up; Yellow always = order/pickup. Directional glyphs (◀ ▶) match button labels. | After two runs, the player knows: green = good, red = bad. |
| **Error Prevention** | Crashing automatically brakes and replays the last 3 seconds (no restart needed); if you miss a delivery, a "try again" pop-up offers retry vs. next order, no progress loss. | Players recover from mistakes without rage-quitting. |
| **Recognition Over Recall** | The active order card is always centered and pulsing; the nav arrow color (red = right turn, blue = left, white = straight) is shown once in the Garage tutorial, then players see it live. | No need to remember "what does the blue arrow mean?"—it's visible every run. |
| **Flexibility & Efficiency** | Expert mode hides tutorial hints after first play. Keyboard hotkeys: Z/Space for gas, X/C for turns (remappable). Touch can be held (hold-to-accelerate) or toggle (tap-to-toggle-gas) per profile. | Casual players get hints; speedrunners get clean screen. |
| **Minimalist Design** | Main HUD shows only: timer, coins, score, active order, combo, nav arrow. Advanced stats (distance traveled, current speed, collision count) hide in a post-run summary or pause menu. | During gameplay, clutter is zero. Post-run, players dive into stats. |
| **Error Recovery** | Connection lost mid-run? "Retry" restores the last checkpoint; "Give up" returns to menu without penalty. Cosmetic purchase failed? "Retry" or "Cancel" both work without double-charging. | Failure never traps the player or costs them progress. |
| **Help & Documentation** | First-run only: brief one-page visual guide (button layout, order icon legend, nav arrow colors). Contextual hints appear once per session (first pickup: "hold to accelerate, tap arrows to steer"). | After boot, no mandatory tutorial. Learning happens through play. |

## Clarity & Signal vs. Noise

**Progressive disclosure.** The HUD during gameplay shows only: timer (top), coins/score (corners), order card (center), combo (bottom), nav arrow (center-bottom). Settings, vehicle stats, card details, and leaderboards hide in pause/Garage menus. A fresh player never sees them during the run.

**Visual hierarchy through contrast.** The three control buttons are the largest elements on screen (each 90px tall, 80px wide on a 360px-wide phone). The run timer is bold white at top-center. The active order card is centered with a glowing border. The nav arrow is color-coded and animated. Secondary info (current combo count, speed) are small, muted in color, and fade when unneeded.

**Consistent iconography.** Order glyphs are emoji (🍔 📦 🌮 🍕) and identical across all runs. Turn arrows are simple directional glyphs (◀ ▲ ▶) matching button labels. Positive delivery = green flash + "+ coins" text. Negative (crash/miss) = red flash + "- combo" text. After one run, the visual language is learned.

## Feedback Loops

Every action fires within 50ms:
- **Tap steer button:** button flash (white, 50ms) + directional beep (50ms tone).
- **Hold gas:** button glow (100ms scale-up) + engine-throttle sound (continuous, volume rises).
- **Release gas:** button returns to rest (200ms ease-out) + engine-pitch drops (100ms).
- **Pickup order:** order card pulses (150ms glow), chime sound (200ms), haptic pulse (50ms).
- **Deliver order:** particle burst (200ms lifetime), coin-pop sound (100ms), float text "+ coins" (1.5s fade), screen flash (100ms white), haptic double-pulse (50ms each).
- **Miss order:** order card shrinks and flashes red (150ms), buzzer sound (200ms), "- combo" text (1s fade).
- **Crash into traffic:** screen-edge flash red (150ms), collision crunch sound (100ms), car jerks backward (100ms), "- combo" text.

Latency is critical: if feedback delays >100ms, the control feels broken. All feedback is decoupled from network I/O (profile syncing happens in the background).

## Cognitive Load & Attention

**During the run:** The HUD is minimal and passive. The player's attention is on the road, the order card, and the timer. Combo count updates automatically; no decision needed. The nav arrow is always visible and color-coded; no mental translation required.

**Between runs:** The pause menu and Garage have unlimited space for cosmetics, settings, and stats. Players can read detailed vehicle specs, card descriptions, and leaderboards without time pressure.

**Separate action from decision:** Steering and gas are instant real-time actions (no menus). Choosing a vehicle, equipping cards, or adjusting settings happens in the Garage (safe space, no timer).

**Limit visible options to 3–7:** The main menu has 4 options (Play, Garage, Settings, Quit). The Garage has 3 tabs (Vehicles, Cards, Profile). Pause has 3 buttons (Resume, Settings, Quit). No submenu exceeds 5 visible options.

## Onboarding & Discoverability

**Teaching through play, not manuals.** On first boot, a 3-second visual shows the button layout: < Gas >. That's it. The first delivery is in easy territory (straight path, 20s timer); the player learns gas/steer by doing. By delivery three, they understand the model.

**Obvious affordances.** The three buttons are impossible to miss: huge, centered, labeled, and visually distinct (gas is slightly larger, a different shade). A 6-year-old can tap them. No tutorial required.

**Discoverable depth.** The Garage menu icon (car emoji) sits subtly in the top-left corner of the main menu. Settings (gear icon) is in the top-right. Both are visible but not intrusive. Tapping them opens full menus; a new player who misses them still plays fine. Complexity is hidden but not secret.

## Validation Checklist

- [x] Every screen has one primary action: Main Menu = Play; Game HUD = focus on driving and deliveries; Pause = Resume/Settings/Quit; Garage = choose vehicle/cards.
- [x] Non-critical information (vehicle stats, leaderboard) is hidden in tabs or post-run summaries, not on active gameplay screens.
- [x] Three buttons, HUD with timer/coins/order/combo/arrow. Everything else is hidden. **Total removable elements: 0.**
- [x] Every button press produces visible feedback within 50ms: steer buttons flash + beep; gas button glows + engine sound.
- [x] Loading states are shown (spinner during garage load, "saving..." text during profile sync).
- [x] Success (delivery) = green flash + chime + particles + "+coins" text. Failure (miss/crash) = red flash + buzz + "- combo" text.
- [x] UI language is consistent: "Gas" not "Accelerate"; "Steer Left/Right" not "Turn A/B"; "Order" not "Mission" or "Task".
- [x] Color palette mapped: Red = crash/fail; Green = delivery/success; Yellow = order/pickup; Blue = UI/HUD; White = gas/primary action.
- [x] Button placement identical across all screens: steer buttons at bottom-left/right, gas at bottom-center (always in reach of thumb on portrait phone).
- [x] Player can cancel or exit any modal: Pause → Resume or Quit; Garage → back to Menu; Settings → Apply or Cancel.
- [x] No forced choices: vehicles are cosmetic (all perform the same), cards have no exclusive content, skipping a run has no penalty.
- [x] On intense action (dodging traffic, tight timer), the HUD does not blink, shake, or obscure the road. All juice (particles, shake) is optional and toggleable.
- [x] No silent failures: every action produces audio or visual confirmation.
- [x] Tutorials teach via play: first run is easy, first order is on a straight road, combo mechanic emerges by delivery three.
- [x] Hidden UI features (advanced stats, leaderboard filters) are accessible but not intrusive.
- [x] Reduced-motion toggle disables screenshake and particle bursts; audio feedback remains.
- [x] Colorblind mode: nav arrow uses shape + color (red=right-turn-diagonal, blue=left-turn-diagonal, white=straight-vertical), not color alone.

## Common Pitfalls (Avoidance)

**Confusing visual hierarchy:** The three buttons are the focal point; HUD elements (timer, coins) are secondary and smaller. The screen is not "everything shouts equally."

**Delayed feedback:** Every action (button tap, delivery, crash) produces a response within 50ms. No action is ever silent.

**Inconsistent terminology:** Steer is always "Steer Left/Right" or "← →". Gas is always "Gas" (not "Accelerate" or "Go"). This consistency applies across all screens.

**Trapping the player:** Pause menu has a Resume button; Garage has a back button; Settings has Cancel and Apply. No dead-end dialogs.

**Overloading the action screen:** During the run, only the essentials are visible. Stats, leaderboards, and cosmetics are in safe menus.

**Wrong feedback delay:** If the player taps the steer button and the car turns a frame later (>100ms), the control feels laggy. All feedback fires on input frame, not on result frame.

## Final Word

The Delivery Rush HUD is the player's dashboard. It must be readable at a glance, responsive to every input, and invisible during flow. A player should never think "how do I do this?"—only "let's do this." Clarity, consistency, and sub-100ms feedback loops build that invisibility.
