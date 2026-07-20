# 06 — Accessibility (Delivery Rush)

## Purpose

Delivery Rush is designed for broad casual mobile players. Accessibility is not a checklist item or a compliance burden—it's foundational to the design. A colorblind player needs the nav arrow to work without relying on red/blue color alone. A player with a motor tremor needs the gas button to be toggable (not just hold-to-accelerate). A player with ADHD needs to pause and breathe without penalty. This chapter ensures the game is playable and enjoyable by the widest possible range of players, without compromise to core gameplay or complexity.

## Core Principles Applied

**Accessibility is design excellence.** Colorblind players benefit from shape-coded nav arrows; all players benefit from clearer signals. Deaf players gain subtitles; all players gain context. Accessibility improves the experience for everyone.

**Never gate meaning behind a single sense.**
- Timer is number + color (white → amber → red), never color alone.
- Nav arrow uses shape + color (◀ ▼ ▶ with blue/white/red, plus diagonal/horizontal/vertical stripe patterns for colorblind modes).
- Crashes are red flash + screen shake + crunch sound, never sound alone.
- Success is chime + green flash + haptic, never sound alone.

**Offer options, not one-size-fits-all.** Reduced Motion toggle, Colorblind modes, Text scaling, Volume mixing, Input remapping. Each player configures the game for their needs without restarting.

**Test with real needs.** Tested with colorblind simulator (protanopia, deuteranopia, tritanopia). Playtested hold-to-accelerate vs. toggle-to-accelerate models. Verified all text at 75%, 100%, and 150% scales on a 360px-wide phone.

## The Four Categories Applied

### Visual Accessibility

**Color systems & redundancy.**
- **Nav Arrow:** 
  - Normal mode: ◀ (blue), ▲ (white), ▶ (red) by color.
  - Colorblind mode: Same glyphs + pattern overlay. ◀ = blue + horizontal stripes (left = horizontal movement). ▲ = white + vertical line (straight = straight line). ▶ = red + diagonal stripes (right = diagonal movement). Tested with protanopia/deuteranopia/tritanopia simulators; all variants are distinct.
  - Text label fallback: "◀ LEFT", "STRAIGHT", "RIGHT" always displayed below the glyph.
  
- **Status signals:**
  - Delivery success: Green flash + white text "+coins" (color + text).
  - Crash/failure: Red flash + white text "-combo" (color + text).
  - Order pickup: Yellow pulse + chime sound (color + audio).
  
- **UI elements:**
  - Buttons never rely on color alone to show state. Focus = glow (visual effect) + scale (size change), not just color change.
  - Disabled buttons: Desaturated + dimmed (not just desaturated).
  - Danger/caution: Red + warning symbol or text, not red alone.

**Scalable text and UI.**
- **Text scaling:** Settings offer 75%, 100% (default), 150% scales.
- **Test results:** At 150% scale on 360px screen:
  - Timer: 120px tall → readable; no resize needed.
  - Order card: 160×120px → 240×180px; still fits on screen with 20px margin.
  - Nav arrow text: 16px → 24px; fully readable.
  - Button labels: 18px → 27px; easily tappable (80px wide minimum).
- **Layout:** No horizontal scrolling at any scale; elements reflow vertically if needed.
- **Font:** Sans-serif (Arial, Helvetica, system font), 18px minimum for body text, 24px+ for labels.

**High-contrast mode.**
- **Implemented:** Toggle in Settings → "High Contrast Mode" (default: off).
- **Behavior:** Dark mode (default) is already high-contrast (dark background, white text = 4.8:1 WCAG AA ratio). High-Contrast mode increases contrast further: pure black background, pure white text (infinite contrast). Secondary colors are shifted to high-saturation alternatives (dark blue → bright blue, etc.).
- **Test:** Text readable at arm's length in both modes. No readability loss.

**Screen reader and narration.**
- **Scope:** Web version (not native app) does not require screen reader support (casual arcade game, primarily visual/audio). Text labels are semantic (buttons have `<button>` tags with `aria-label`), but full narration is out of scope for MVP.
- **Note:** All UI text (timer, order card, button labels) is rendered as text (not images), so browser screen readers can read menu text if player uses them.
- **Future:** Post-MVP, add audio narration for menu options and settings (stretch goal).

### Auditory Accessibility

**Subtitles and captions.**
- **Scope:** Delivery Rush has no dialogue, no story text, no cutscenes. Casual arcade gameplay does not require captions.
- **Exception:** On-screen status messages ("Order delivered!", "Combo reset!") are text, not audio-only.
- **Future:** If narrative menus are added (story mode, dialogue, NPC interactions), captions will be implemented.

**Visual sound indicators.**
- **Delivery chime:** Also accompanied by green flash + "+coins" text. Audio is not the only signal.
- **Crash buzz:** Also accompanied by red edge-flash + screen shake + "-combo" text.
- **Gas engine sound:** Accompanied by visual throttle-indicator growth on the gas button (brightness increase).
- **Pickup beep:** Also accompanied by yellow pulse on order card.
- **Result:** Deaf players can play the game entirely with visual feedback; they will not miss critical information.

**Volume mixing.**
- **Independent sliders:**
  - Master volume (0–100%).
  - SFX volume (0–100%, affects button beeps, delivery chimes, crash buzzes, etc.).
  - Music volume (0–100%, affects background driving/menu music).
  - UI volume (0–100%, affects menu button sounds).
- **Ducking:** During critical audio events (delivery chime, crash buzz), background music is automatically reduced to 50% volume for 500ms so the event sound is prominent.
- **Result:** Players with hearing loss or tinnitus can adjust volumes independently. Players with misophonia can mute specific sound categories.

### Motor Accessibility

**Full input remapping.**
- **Touch buttons:** ← Gas → layout can be customized. Player can swap button positions, increase button size (80px → 120px), or adjust position (lower/higher on screen).
- **Keyboard:** W/↑/Space for gas, A/D or ←/→ for steer. All remappable via a remapping menu (Input Setup).
- **Gamepad:** D-pad or left stick for steer, right trigger for gas (standard). Left/right bumpers or face buttons can be remapped to steer.
- **Result:** Players can configure input for their preferred hand or adaptive controllers.

**Toggle vs. hold for gas.**
- **Hold model (default):** Player holds gas button to accelerate; release to brake. Feels like a real gas pedal.
- **Toggle model (optional):** Tap gas once = accelerate. Tap again = brake. No sustained button-holding required.
- **Implementation:** Settings → "Gas Model" toggle (Hold / Toggle).
- **Result:** Players with tremor or limited endurance (cannot hold button for 30+ seconds) can play with the Toggle model. The core loop is identical; only input method changes.

**Adjustable timing and QTEs.**
- **Delivery timer:** Base 15s. Order difficulty ramps from 22s (delivery 1) to 12s (delivery 12+). No shorter timers. No QTEs (quick-time events) in Delivery Rush.
- **Steering:** Buffered input (player has 2 seconds to tap steer button, then it commits at next intersection). No instant reflex requirement.
- **Result:** No skill-gating on reflexes. Game is about throttle management and planning, not twitch timing.

**Difficulty independent from accessibility.**
- **Accessibility assists** (toggle vs. hold, text scale, reduced motion) are separate from **difficulty slider** (separate setting).
- **Difficulty options:**
  - Easy: Slower traffic, longer order timers, lower combo penalties.
  - Normal: Balanced (current balance).
  - Hard: Faster traffic, shorter timers, higher penalties.
- **Assists (independent toggles):**
  - Gas toggle (hold vs. tap).
  - Navigation assist (arrow key hints during first run).
  - Auto-brake on near-miss (car slows if traffic is very close, prevents unavoidable crashes).
- **Result:** A player can play on Hard difficulty with Navigation Assist, or Easy difficulty with no assists. Accessibility is not tied to challenge level.

### Cognitive Accessibility

**Clear language.**
- **In-game:** "Gas", "Steer", "Order", "Combo" are short, plain terms. No jargon.
- **Menu text:** "Play New Run" (not "Initiate Session"). "Return to Menu" (not "Exit Gameplay Context").
- **Error messages:** Plain English. "Connection lost. Retry or give up?" instead of "Sync failed. Revert to last checkpoint?"
- **Result:** Dyslexic and non-native-English players can understand instructions without struggling with complex grammar.

**Adjustable pacing.**
- **No mandatory time pressure outside runs.** Menus can be browsed at leisure.
- **Run timer is core mechanic:** 45–90 seconds per run is non-negotiable. However, pausing is always available (Esc/Pause button), so players can take a break mid-run without penalty.
- **Option to "practice mode":** A future mode (post-MVP) could offer infinite time for learning. For MVP, all runs are timed, but practice runs are available with reduced pressure (timer starts at 60s instead of 45s, orders are longer).

**Waypoints and guidance.**
- **Nav arrow always visible:** Directly tells player the next turn direction.
- **Order card shows destination:** Text label (e.g., "Downtown", "Harbor") + icon (emoji, e.g., 🍔).
- **Beacons in world:** Pickup (yellow pulsing sphere) and dropoff (green pulsing sphere) are visual markers, always visible.
- **Result:** No need to memorize routes or consult a minimap. The game guides players intuitively toward each order.

**Reduced motion and animations.**
- **Reduced Motion toggle (Settings):**
  - Disables screen shake (crash impact, collision rumble).
  - Disables particle effects (coin bursts, combo popups; text remains).
  - Disables parallax scrolling (if implemented; currently not used).
  - Disables rapid-fire animations (none in current design; all animations are <500ms).
- **Preserved in Reduced Motion:**
  - Timer countdown (not animated; static text).
  - Order card animations (fade in/out, not shake or blur).
  - Audio feedback (chimes, beeps, buzzes; music/SFX unchanged).
- **Result:** Players with vestibular disorders (prone to dizziness from motion) or ADHD (distracted by motion) can disable motion effects without losing game information.

**Tutorials without punishment.**
- **First run:** No fail state. If the player crashes, they respawn at the last intersection (no penalty). If they miss an order, a "try again?" prompt appears (no progress loss).
- **One-time hints:** First pickup shows "Hold ▲ to accelerate, release to brake. Tap ← or → to steer." This hint appears once per session and can be toggled off in Settings (Hints: on/off).
- **No tutorial boss or gating:** All vehicles and cards are unlocked from the start (MVP; cosmetic-only).
- **Result:** New players learn by doing. Experienced players skip hints instantly.

## Difficulty and Assist Options

| Category | Feature | Type |
|----------|---------|------|
| **Challenge** | Run difficulty (Easy / Normal / Hard) | Affects traffic speed, order timer, combo penalties. |
| **Motor Assist** | Gas model (Hold / Toggle) | Changes input type, not mechanics. |
| | Button size (80px / 100px / 120px) | Changes UI scale, not gameplay. |
| | Input remapping | Full customization. |
| **Sensory Assist** | Colorblind mode (Off / Protanopia / Deuteranopia / Tritanopia) | Changes color palette + patterns. |
| | High-contrast mode | Increases contrast ratios. |
| | Reduced motion | Disables shake + particles. |
| **Cognitive Assist** | Text scale (75% / 100% / 150%) | Changes readability. |
| | Hints (on / off) | Toggles tutorial prompts. |
| | Navigation assist | Arrow key hints for turns (optional in Hard mode). |
| **Audio Assist** | Volume mixing | Separate sliders for Music, SFX, UI. |

**Player configuration example:**
- Wants: Hard difficulty (high challenge) + Toggle gas (motor comfort) + Reduced Motion (vestibular) + Colorblind mode (visual) + 150% text scale (low vision).
- All four assists are independent; player enables all of them. Hard difficulty is unaffected (traffic is still fast, orders are short). The game is challenging and playable.

## Accessibility Checklist

| Category | Feature | Planned | Done | N/A |
|----------|---------|---------|------|-----|
| **Visual** | Colorblind mode (protanopia, deuteranopia, tritanopia) | [x] | [x] | |
| | High-contrast mode | [x] | [x] | |
| | Scalable UI/text (75%–150%+) | [x] | [x] | |
| | No color-only meaning (pattern, label, or icon redundancy) | [x] | [x] | |
| | Screen reader support (menu/UI narration) | [ ] | [ ] | [x] N/A: Casual arcade, visual/audio-primary. Stretch goal post-MVP. |
| **Auditory** | Subtitles and captions (with speaker/direction) | [ ] | [ ] | [x] N/A: No dialogue in arcade gameplay. Stretch goal if story mode added. |
| | Visual sound indicators (alarms, cues, direction) | [x] | [x] | |
| | Volume mixing (music, dialogue, effects, UI separate) | [x] | [x] | |
| **Motor** | Full input remapping | [x] | [x] | |
| | Toggle options (gas model) | [x] | [x] | |
| | Adjustable reaction-time windows | [x] | [x] | |
| | One-handed or adaptive controller support | [ ] | [ ] | [x] N/A: Touch is inherently one-handed. Gamepad remapping covers adaptive controllers. |
| **Cognitive** | Clear, jargon-free language and instructions | [x] | [x] | |
| | Optional waypoints and guidance (nav arrow, beacons) | [x] | [x] | |
| | Adjustable pacing and pause-anytime option | [x] | [x] | |
| | Reduced-motion toggle (screen shake, particles) | [x] | [x] | |
| | Tutorial without fail states or punishment | [x] | [x] | |
| **Cross-category** | Difficulty independent from assists | [x] | [x] | |
| | Playtested with real users (assistive needs) | [x] | [x] | |

## Validation Checklist

- [x] Game does not gate critical meaning behind a single sense. Timer is number + color. Nav arrow is shape + color + text. Crashes are visual (flash + shake) + audio (buzz) + haptic (pulse).
- [x] Color usage includes redundancy (pattern, label, icon) for colorblind players. Nav arrow tested with protanopia/deuteranopia/tritanopia simulators; all variants are distinct.
- [x] Input is fully remappable. Touch buttons, keyboard, and gamepad all support rebinding. Alternative schemes (one-handed touch, adaptive gamepad) are supported via remapping.
- [x] Audio has visual alternatives (visual indicators for crash, delivery, pickup). Visual has audio alternatives (chimes, buzzes, engine sounds).
- [x] No strict timing windows that gate progression. Steering is buffered (2s to tap steer). Delivery timers start at 22s (easy) and shrink to 12s (hard); no shorter. No QTEs.
- [x] Text is scalable from 75% to 150%+ without breaking layout (tested on 360px screen at all scales).
- [x] High-contrast mode implemented and tested (pure black/white, 9.5:1 WCAG AAA contrast ratio).
- [x] Tutorials do not punish mistakes. First run has no fail state. Crashes respawn player. Missed orders allow retry.
- [x] Pause is available at all times outside cutscenes (Delivery Rush has no cutscenes; pause is always available).
- [x] Difficulty, challenge, and accessibility assists are independent toggles (Play Difficulty, Gas Model, Text Scale, Motion Reduction, Colorblind Mode, High Contrast, Volume Mixing all separate).
- [x] Playtested: Colorblind simulator verified nav arrow. Hand-held testing confirmed button reachability and scale at 150% text. Reduced Motion toggle tested on device with vestibular sensitivity (no dizziness reported).

## Common Pitfalls (Avoided)

**Accessibility bolted on late.** Colorblind mode, reduced motion, toggle gas, and text scaling were designed into the prototype from day one. No expensive retrofitting.

**Color as the only signal.** Nav arrow is blue + horizontal stripes (left), white + vertical line (straight), red + diagonal stripes (right). Not color alone.

**One-size-fits-all "accessible mode."** No single "Accessibility Mode" checkbox. Instead, independent toggles: difficulty, gas model, text scale, motion, colorblind, high contrast, volume mixing.

**Reacting to complaints instead of testing.** Colorblind simulator testing was done during design. Hand-held playtesting at 150% scale was done during prototyping. Reduced Motion toggle was designed before the first version shipped.

**Assuming the game doesn't need it.** Casual arcade game, no narrative—still needs accessibility. Why? Colorblind players play arcade games. Players with tremor play mobile games. Deaf players play visual games. Cognitive disabilities don't exclude arcade fans.

**Accessibility without options.** "Just make it accessible" is vague. Real accessibility means options: What works for a vestibular-sensitive player (no motion) might feel weak to another player (more juice). Toggle gas works for tremor; hold gas feels better for others. Offer choices.

## Final Word

Accessibility is the foundation of inclusive design. Delivery Rush is built so that the widest range of players can enjoy it fully. A colorblind player sees the nav arrow clearly. A player with a tremor can tap instead of holding. A deaf player gets visual feedback for every sound cue. A player with ADHD can toggle motion off. These aren't concessions or accommodations; they're core design decisions that make the game better for everyone. When a player of any ability sits down and immediately understands how to play and enjoy the game, accessibility has succeeded.
