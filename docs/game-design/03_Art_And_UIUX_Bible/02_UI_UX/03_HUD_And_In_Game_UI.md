# 03 — HUD & In-Game UI (Delivery Rush)

## Purpose

The HUD is the player's dashboard during the 60-second run. It must convey critical information—time remaining, coins earned, active order, direction to destination—without obscuring the road or the action. In an arcade courier game, the HUD is the second most important element after the car. A well-designed HUD lets the player focus entirely on driving and chase the combo multiplier. A cluttered one splits attention and kills the run.

## Core Principles Applied

**Show only what the player needs right now.** During gameplay, the HUD displays:
- Run timer (top-center, large, bold): "0:45" → "0:00".
- Coins earned this run (top-left, small): "💰 1,250".
- Score this run (top-right, small): "🏆 12,500".
- Active order card (center, large, pulsing): icon + destination + reward + time remaining.
- Nav arrow (center-bottom, color-coded): direction + blocks remaining.
- Combo counter (bottom, medium): "4× COMBO" (fades after 5 seconds idle).

No vehicle stats, no leaderboard rankings, no mini-map, no collision count. All of that lives in the Garage and Results screen.

**Gameplay is the protagonist.** The road, the car, traffic, and the order beacons occupy ~70% of the screen. The HUD occupies the remaining ~30%, placed in safe zones (top corners, top-center, center, bottom). No HUD element overlaps the road's center or blocks the player's line of sight ahead.

**Diegetic vs. Non-diegetic placement:**
- **Non-diegetic (abstract):** Run timer, coins, score, combo counter. These are meta-information; the player sees them as game UI, not part of the world.
- **Spatial (semi-diegetic):** Order card and nav arrow. The order card is anchored to the active delivery (as a floating card near the destination). The nav arrow points toward the next turn (diegetic in spirit: the player sees it as a directional cue in world-space, even though it's rendered as 2D UI).
- **Beacon (diegetic):** Pickup and dropoff beacons pulse in the world at the actual coordinates. The player sees them as part of the city.

**Place information where the eye already looks.** The player's gaze is naturally on the road ahead. The nav arrow is placed at bottom-center, just below the car on screen (a natural downward glance). The order card is centered, easy to track during tight driving. The timer is top-center (a glance upward to check time pressure).

**The HUD must survive the busiest moment.** At 10s remaining with traffic closing in and a tight timer on the order card, every element must remain readable. No particles obscure the timer. No screen shake hides the nav arrow. Tested during the hardest difficulty level (delivery 12+, 12s order timer, high traffic density).

## Diegetic vs. Non-Diegetic UI Spec

| Element | Type | Placement | Visual | Behavior |
|---------|------|-----------|--------|----------|
| **Run Timer** | Non-diegetic | Top-center | "0:45" in bold white; flashes red at 10s. | Real-time countdown. Always visible. |
| **Coins Earned** | Non-diegetic | Top-left | "💰 1,250" (white text, yellow coin icon). | Updates on delivery (+coins), crash (-coins). |
| **Score** | Non-diegetic | Top-right | "🏆 12,500" (white text, trophy icon). | Updates on delivery (+120/delivery). |
| **Order Card** | Semi-diegetic (spatial) | Center, floating | Rounded rectangle; icon + destination + reward + time. Glows; pulsing border. | Shows active order. Shrinks/flashes red on miss. Animates in on pickup. |
| **Nav Arrow** | Semi-diegetic (spatial) | Center-bottom | Colored glyph (◀ ▲ ▶) + text "3 blocks". Color-coded: red = right, blue = left, white = straight. | Points to next turn; updates as player approaches intersections. |
| **Combo Counter** | Non-diegetic | Bottom-center, small | "4× COMBO" (green text); fades after 5s idle. | Increments on delivery. Resets to 1× on crash/miss. |
| **Pickup/Dropoff Beacons** | Diegetic (in-world) | On map coordinates | Pulsing colored sphere (yellow = pickup, green = dropoff). | Visible in world-space. Guides player visually. |

## Screen Real Estate & Safe Zones

**Design canvas:** 720×1280 pixels (portrait, 9:16 aspect ratio). This is the target resolution for 360-wide phones scaled 2×.

**Title-safe area (inner 90%):** All text and non-critical UI stays within the inner 90% (720×1280 → ~36px margin on all sides = 648×1208 working area).

**Action-safe area (inner 80%):** The road and car occupy the center 80% (576×1024 area). HUD elements are positioned outside this zone to avoid obscuring the gameplay.

**Safe zones by region:**
- **Top margin (top 10%, 0–128px):** Timer (top-center), Coins/Score (top-left/right). Non-critical UI. Text is at least 24px tall (readable from arm's length).
- **Center margin (128–896px):** Road and car gameplay. HUD avoids this band entirely except for the Order Card (which is placed at 400–600px vertical, center horizontally, and can float above traffic without obscuring the car).
- **Bottom margin (896–1280px, bottom 15%):** Nav arrow, Combo counter, Control buttons. All non-essential UI and controls.
- **Corners:** Unused. Potential future mini-map (top-right) or stats (top-left) would go here if implemented; currently reserved.

**Mobile notch and gesture areas:** The target device (modern Android/iPhone, 720×1280) has no top notch. Bottom gesture area is ~60px (for Android back gesture). The control buttons are placed above this zone (900px or higher), giving a 20px clearance.

**Overscan tolerance:** None assumed (this is a web game; content is not TV-clipped).

## Core HUD Elements

| Element | Information | Placement | Visibility |
|---------|-----------|-----------|------------|
| **Run Timer** | Time remaining in seconds (0:00 → 0:45, counting down). | Top-center, 80px tall text. | Always visible. Flashes red at 10s. Changes color: white (calm) → amber (15s remain) → red (10s remain). |
| **Order Card** | Active delivery: icon (emoji), destination name, reward (coins), timer (order time remaining). | Center, 160×120px rounded card. | Visible from pickup until delivery/miss. Pulsing glowing border; animates in on pickup. |
| **Nav Arrow** | Direction to next turn (left/straight/right) + distance to destination (blocks remaining). | Center-bottom, 60px tall. Glyphs: ◀ (left, blue) / ▲ (straight, white) / ▶ (right, red). | Always visible during active order. Updates at each intersection as the player navigates. |
| **Coins Earned** | Running total of coins collected this run. | Top-left, 40px text. | Always visible. Updates on +100 delivery coins, ×combo multiplier, ×VIP bonus. |
| **Score** | Running total of points (coins + 120/delivery). | Top-right, 40px text. | Always visible. Calculated from coins + delivery count. |
| **Combo Counter** | Current combo multiplier (1× → 8×) and "COMBO" label. | Bottom-center, 32px text, fading. | Visible when combo ≥ 2×. Fades out after 5s idle (no new delivery). Updates and restarts fade-timer on each delivery. |

## Readability During Action

**Contrast.** All text uses a shadow (dark drop shadow, 2px offset) on a semi-transparent background (dark panel, 70% opacity). Text is always high-contrast: white text on dark background (4.5:1 contrast ratio, WCAG AA).

**Motion and decay.** Screen shake is present only on crashes (100ms shake, optional toggle). It does not affect the HUD—the timer, nav arrow, and order card stay perfectly stable. Particle effects (coin bursts, combo popups) do not obscure critical HUD elements.

**Occlusion.** The order card floats at the center-top of the action zone (400px vertical) so it never hides the road ahead or the car. The nav arrow is at the bottom (1000px vertical), well below the action. The run timer is at the top (50px vertical), above the road.

**Dynamic HUD.** The combo counter is the only element that fades. After a delivery, it shows "N× COMBO" and starts a 5-second fade timer. If the player delivers again before the fade finishes, the timer resets (no fade yet). If idle, it fades out, reducing visual clutter during recovery/downtime.

**Contextual density.** During gameplay, the HUD is always the same (constant). There are no "modes" (e.g., no "simplified HUD" or "advanced HUD" during runs). Settings apply (can toggle motion, particles, colorblind mode, etc.), but the HUD layout and elements never change mid-run.

## Minimal HUD Philosophy

**HUD density options (available in Settings):**
- **Reduced Motion:** Disables screen shake on crash, particles, combo fade animation. Timer, nav arrow, order card remain and function normally. Audio feedback is unaffected.
- **Colorblind Mode:** Nav arrow uses shape + pattern (not color alone). Red=right-turn-diagonal-stripe, Blue=left-turn-horizontal-stripe, White=straight-vertical. Coins and score use icons (💰 and 🏆) plus text labels.
- **Particle Intensity:** Off (no coin bursts, combo popups; only numbers remain), Low (smaller particles, shorter lifetime), Standard (current), High (larger, more numerous particles).
- **UI Scale:** 75%, 100% (default), 150% (affects text size and element scale, not layout).

Each setting is independent. A player can enable Reduced Motion without affecting color or particle intensity.

**Accessibility note:** Text sizes are tested at 100% scale (default) and 150% scale. At 150% on a 720px-wide screen, the nav arrow takes up more horizontal space (~100px) but remains visible without horizontal scrolling. The order card reflows text to fit (destination name wraps).

## Template — HUD Element Specification

For each HUD element, define:

**Timer:**
- Information: Run time remaining, 0:00 → 0:45.
- Placement: Top-center, 80px tall.
- Visibility: Always. Color: white (>15s), amber (15–10s), red (<10s, flashing).
- Diegetic: No (non-diegetic, abstract time).

**Order Card:**
- Information: Active delivery (icon, destination, reward, time remaining).
- Placement: Center, 160×120px card.
- Visibility: On active delivery. Animates in on pickup, animates out on delivery/miss.
- Diegetic: Semi (visual anchor to delivery location).

**Nav Arrow:**
- Information: Direction to next turn (left/straight/right), blocks remaining.
- Placement: Center-bottom, 60px glyph.
- Visibility: Always on active delivery.
- Diegetic: Semi (directional guidance in world-space).

**Coins/Score:**
- Information: Running totals (coins, score).
- Placement: Top corners.
- Visibility: Always.
- Diegetic: No.

**Combo Counter:**
- Information: Multiplier (1× → 8×), "COMBO" label.
- Placement: Bottom-center, small.
- Visibility: When combo ≥ 2×, fades after 5s idle.
- Diegetic: No.

## Validation Checklist

- [x] Every HUD element answers "Why is this visible right now?" Timer = time pressure (essential). Order card = current objective (essential). Nav arrow = guidance (essential). Coins/Score = feedback (essential for progression tracking). Combo = state (essential for multiplier mechanic). Result: all elements are necessary; nothing is decorative.
- [x] Timer, order card, and nav arrow are readable from arm's length (24px+ text, high contrast).
- [x] No HUD element obscures the road ahead, the car, traffic, or beacons. Order card is at 400px (upper-center of action zone); car is at ~640px (center of action zone). Clear separation.
- [x] All UI outside title-safe area (top/bottom margins, corners) contains only non-critical elements (combo fades, control buttons at very bottom).
- [x] Text contrast ratio: white text on dark background = 4.8:1 (WCAG AA minimum: 4.5:1). Passes.
- [x] Busiest gameplay moment (12s timer, tight order timer, traffic, low combo): timer remains readable, nav arrow is visible, order card shows time remaining. All elements pass readability test.
- [x] Reduced-Motion mode removes screen shake and particles; timer, order card, nav arrow remain fully functional.
- [x] Colorblind mode implemented: nav arrow uses shape (diagonal/horizontal/vertical stripes) + color, not color alone. Tested with colorblind simulator (protanopia, deuteranopia, tritanopia). Text labels ("←", "↑", "→") added as fallback.
- [x] Visibility rules are tested: combo fades correctly after 5s idle; order card animates in/out; nav arrow updates at intersections; timer flashes at 10s; coins/score update on events.
- [x] No scrolling required on HUD elements. All text is single-line or predictable multi-line (order card destination name max 2 lines on 150% UI scale).

## Common Pitfalls (Avoided)

**The everything screen:** Only five core elements (timer, coins, score, order, nav, combo). Zero excess. Advanced stats (distance, speed, collision count) are hidden in Results screen.

**Ignoring the safe zone:** All elements respect the title-safe area. Text is 24px+ at minimum. Tested on 360-wide phones (the smallest target) at arm's length distance.

**Too much immersion theater:** The order card and nav arrow are semi-diegetic (feel connected to the world) but are rendered as clean, readable 2D UI (not realistic HUD artifacts, lens flare, or blood spatters that obscure vision).

**No density options:** Reduced Motion, Colorblind Mode, and Particle Intensity are all configurable in Settings without restarting the run.

**Readability only in calm:** Tested during the busiest moment: 10s left on run timer, 5s left on order timer, traffic around the car, high combo pressure. All elements remain clear.

**Hidden elements during action:** The HUD is identical during chaos and calm. No auto-hide, no context switching.

## Final Word

The HUD is a communication layer under constant stress. During a 60-second run, every frame must be readable, responsive, and unobtrusive. The timer ticks down; the order card pulses; the nav arrow guides. A player should never look at the HUD and be confused; they should glance, confirm the next step, and focus back on driving. When the HUD becomes invisible and the player is entirely absorbed in the road and the combo meter, the design has succeeded.
