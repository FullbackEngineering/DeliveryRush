# 07 — Input & Control Abstraction (Delivery Rush)

## Overview

Delivery Rush abstracts device input (touch buttons, keyboard, gamepad) into three high-level actions: **steer_left**, **steer_straight**, **steer_right**, and **throttle_hold**. Gameplay code responds only to these actions, never to raw keys. Remapping is runtime-safe and persisted. Feel parameters (input buffer, dead zones) are tunable via data.

---

## Action Map

### Actions for Delivery Rush

Delivery Rush has four core actions, all **digital** (pressed/held/released):

| Action ID | Intent | Type | Default: Touch | Default: Keyboard | Default: Gamepad |
|-----------|--------|------|---|---|---|
| `steer_left` | Turn player car left at next intersection | Digital | Tap Left Button | A or Left Arrow | D-Pad Left / L-Stick Left |
| `steer_straight` | Cancel buffered turn; drive straight | Digital | Tap Center Button | D or Down Arrow | D-Pad Down / L-Stick Neutral |
| `steer_right` | Turn player car right at next intersection | Digital | Tap Right Button | D or Right Arrow | D-Pad Right / L-Stick Right |
| `throttle_hold` | Hold to accelerate; release to coast/brake | Digital (Hold) | Hold Center Button | W, Up Arrow, Space, Shift | Right Trigger, R-Bumper, A Button (hold) |

**Additional Actions (Future):**
- `pause`: Esc, P, Start button, pause area tap.
- `ui_confirm`: Touch, Enter, A button.
- `ui_back`: Back button, B button.

---

## Abstraction Layers

```
┌──────────────────────────────────────────────────────────┐
│ Layer 1: Raw Device Input                                │
│ (touch events, keyboard, gamepad, accelerometer)         │
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────┐
│ Layer 2: Normalized Events                               │
│ (button pressed/held/released, stick axis 0–1, position) │
└────────────┬──────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────┐
│ Layer 3: Action Mapping                                  │
│ (device input → action intent via bindings table)        │
└────────────┬──────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────┐
│ Layer 4: Gameplay                                        │
│ (Vehicle.onActionPressed('steer_left'), etc.)           │
└──────────────────────────────────────────────────────────┘
```

**Layer 1 — Raw Input:**
- Touch: three buttons (left, center/gas, right); positions from `#controls` DOM element.
- Keyboard: `A`, `D`, `W`, `Space`, `↑`, `↓`, `←`, `→`, `Shift`, `Esc`, `P`.
- Gamepad: D-Pad, L-Stick, R-Trigger, R-Bumper, A/B buttons.

**Layer 2 — Normalized:**
- `button: { action: 'steer_left', state: 'pressed' | 'held' | 'released' }` (digital).
- `stick: { action: 'steer_left', value: 0.65 }` (analog, if L-Stick is used for steering; value 0..1).

**Layer 3 — Mapping:**
- Bindings table in memory (can be edited at runtime and persisted to localStorage).
- Multiple inputs can map to one action (OR logic: "steer_left" fires if Left Button OR A key OR D-Pad Left).
- Conflicts: if two actions bind to the same key, player is warned; can reassign one.

**Layer 4 — Gameplay:**
- Vehicle system calls `InputManager.GetAction('steer_left')` → returns true/false.
- Or subscribes to `bus.on('input:action', 'steer_left', () => { /* handle */ })`.

---

## Input Manager: Core Interface

### API (Pseudocode)

```typescript
class InputManager {
  // Query current action state
  IsActionPressed(actionId: string): boolean
  IsActionHeld(actionId: string): boolean
  GetActionValue(actionId: string): number // for analog actions

  // Bind an action to a device input
  SetBinding(actionId: string, device: 'keyboard' | 'gamepad' | 'touch', key: string): void
  GetBindings(actionId: string): Binding[]
  ClearAllBindings(): void
  LoadBindingsFromStorage(): void
  SaveBindingsToStorage(): void

  // Detect device activity
  GetActiveDevice(): 'keyboard' | 'gamepad' | 'touch' | 'mixed'

  // Configuration
  SetDeadZone(value: 0.1): void
  SetInputBufferWindow(ms: number): void
  IsInputBufferEnabled(): boolean
}
```

### Bindings Storage Format (localStorage)

```json
{
  "inputBindings": {
    "steer_left": [
      { "device": "touch", "key": "button_left" },
      { "device": "keyboard", "key": "KeyA" },
      { "device": "gamepad", "key": "dpad_left" }
    ],
    "steer_right": [
      { "device": "touch", "key": "button_right" },
      { "device": "keyboard", "key": "KeyD" },
      { "device": "gamepad", "key": "dpad_right" }
    ],
    "throttle_hold": [
      { "device": "touch", "key": "button_center" },
      { "device": "keyboard", "key": "Space" },
      { "device": "gamepad", "key": "rt" }
    ]
  },
  "inputSettings": {
    "deadZone": 0.15,
    "invertYLook": false,
    "haptics": true,
    "inputBufferMs": 500
  }
}
```

---

## Input Feel Tuning

All timing and sensitivity parameters are data-driven (no hardcoded values in gameplay code):

### Input Buffer

| Parameter | Purpose | Default | Range | Notes |
|-----------|---------|---------|-------|-------|
| **inputBufferMs** | How long a steer input persists while waiting for an intersection | ⚙️ 2000 ms | 1000–3000 ms | Must exceed one block travel time (starter car: ~1500ms to cross 360px block) |
| **inputBufferWindow** | Distance from intersection where buffered steer commits | ⚙️ 26 px | 15–50 px | Wider = more forgiving; narrower = more precise |

**Tuning:**
- Increase `inputBufferMs` to 2500 for more forgiving, arcade feel.
- Decrease to 1500 for skill-based, responsive play.

### Dead Zones & Sensitivity

| Parameter | Purpose | Default | Range | Notes |
|-----------|---------|---------|-------|-------|
| **deadZone** (gamepad stick) | Ignore small stick movements (prevents drift) | ⚙️ 0.15 | 0.05–0.3 | Lower = more sensitive; higher = more sluggish |
| **sensitivityCurve** | Shape of response (linear, eased) | ⚙️ Linear | Linear / EaseInQuad / EaseOutQuad | EaseInQuad = precision at center, responsive at edges |
| **sensitivityMultiplier** | Overall stick/touch sensitivity | ⚙️ 1.0 | 0.5–2.0 | Increase for fast-twitch players; decrease for relaxed play |

**Tuning:**
- Raise `deadZone` to 0.25 for casual play (reduces accidental turns).
- Lower to 0.08 for competitive players (quick reactions).

### Device Priority

When multiple devices are active simultaneously (e.g., keyboard + gamepad):

- **Priority order:** Gamepad > Keyboard > Touch (if both are active, gamepad input is preferred).
- **Can be changed at runtime:** `SetDevicePriority(['gamepad', 'keyboard', 'touch'])`.

---

## Remapping (Runtime Rebinding)

### Rebind Flow

1. Player opens Settings → Input section.
2. Player selects an action (e.g., "Steer Left").
3. UI prompts: "Press or tap new button."
4. Player presses a new key/button (or cancels).
5. If **conflict detected** (button already bound to another action):
   - Ask: "This button is already bound to [other_action]. Rebind anyway?" (Yes/No)
   - If Yes: unbind from other action, rebind to new action.
   - If No: cancel, keep old binding.
6. Save to localStorage immediately.
7. Next restart automatically loads the new bindings.

### Preset Profiles (Optional)

For touchscreen accessibility, provide presets:
- **"Tap & Hold"**: tap to steer (single tap = input, hold = throttle on same button).
- **"Thumbstick"**: three big buttons for steer; one area for throttle (hold).
- **"One-Handed Left"**: left side of screen only.
- **"One-Handed Right"**: right side of screen only.

---

## Multi-Device Support

### Simultaneous Input

Delivery Rush supports keyboard + gamepad or touch + gamepad at the same time:

- If left arrow key is pressed AND gamepad D-Pad left is pressed, gamepad input takes priority.
- Mouse (if implemented for future game modes) never competes with touch on mobile (browser handles that).

### Device Detection

```typescript
function UpdateActiveDevice() {
  const hasKeyboardInput = IsAnyKeyPressed(['A', 'D', 'W', 'Space']);
  const hasGamepadInput = IsGamepadConnected() && IsAnyGamepadButtonPressed();
  const hasTouchInput = IsTouchActive();
  
  if (hasGamepadInput) activeDevice = 'gamepad';
  else if (hasKeyboardInput) activeDevice = 'keyboard';
  else if (hasTouchInput) activeDevice = 'touch';
  else activeDevice = null;
}
```

---

## Accessibility Features

### One-Handed Play

Provide layout preset for left-hand-only or right-hand-only steering:

**Left-hand layout:**
- Left button: steer left (thumb)
- Center button: steer straight (thumb)
- Right button: steer right (index)
- Throttle area: large hold zone on right side (thumb or palm)

**Right-hand layout:** Mirror the above.

### Toggle vs. Hold (Throttle)

- **Hold mode (default):** Player holds center button to accelerate; releasing brakes.
- **Toggle mode (optional):** First tap to accelerate; second tap to brake. Good for players with RSI risk.

Player can switch via Settings → Input → "Throttle Mode" → Hold / Toggle.

### Sensitivity Limits

Cap maximum sensitivity at 2.0× to prevent RSI risk. Slider provides granular control (0.5× to 2.0× in 0.1× steps).

### Colorblind-Safe UI

Input remapping UI uses:
- Text labels (not color alone) to show bound buttons.
- Icons (button shapes) in addition to color coding.
- High contrast (dark text on light background).

---

## Keyboard & Gamepad Mapping

### Default Keyboard Bindings

| Action | Primary | Secondary |
|--------|---------|-----------|
| `steer_left` | A | Left Arrow |
| `steer_straight` | D | Down Arrow |
| `steer_right` | D | Right Arrow |
| `throttle_hold` | W, Space, Shift | Up Arrow |
| `pause` | Esc, P | — |

Note: W and Space both trigger gas for muscle-memory redundancy.

### Default Gamepad Bindings

| Action | Primary | Secondary |
|--------|---------|-----------|
| `steer_left` | D-Pad Left | L-Stick Left (with dead zone 0.15) |
| `steer_straight` | D-Pad Down | L-Stick Neutral |
| `steer_right` | D-Pad Right | L-Stick Right |
| `throttle_hold` | R-Trigger or R-Bumper | A Button (hold) |
| `pause` | Start Button | — |

---

## Implementation Strategy

### InputManager Class

```typescript
export class InputManager {
  private bindings: Map<string, Binding[]> = new Map();
  private activeDevice: DeviceType = 'touch';
  private inputBuffer: Map<string, number> = new Map(); // action → buffer time remaining
  private settings: InputSettings;

  constructor() {
    this.LoadDefaultBindings();
    this.LoadBindingsFromStorage();
    this.SubscribeToPlatformInput();
  }

  private SubscribeToPlatformInput() {
    document.addEventListener('keydown', (e) => this.OnKeyDown(e.code));
    document.addEventListener('keyup', (e) => this.OnKeyUp(e.code));
    window.addEventListener('gamepaddisconnected', () => this.OnGamepadDisconnected());
    // Touch handled via #controls element event listeners (already set up in ControlPad.ts)
  }

  IsActionPressed(actionId: string): boolean {
    const bindings = this.bindings.get(actionId) || [];
    return bindings.some(b => this.IsBindingActive(b));
  }

  IsBindingActive(binding: Binding): boolean {
    switch (binding.device) {
      case 'keyboard':
        return this.keyState.get(binding.key) === 'pressed';
      case 'gamepad':
        return this.gamepadState.get(binding.key) === true;
      case 'touch':
        return this.touchState.get(binding.key) === true;
    }
  }

  SetBinding(actionId: string, device: string, key: string) {
    // Update bindings table
    const bindings = this.bindings.get(actionId) || [];
    bindings.push({ device, key });
    this.bindings.set(actionId, bindings);
    this.SaveBindingsToStorage();
  }

  SaveBindingsToStorage() {
    const data = {
      inputBindings: Object.fromEntries(this.bindings),
      inputSettings: this.settings,
    };
    localStorage.setItem('deliveryRush_inputBindings', JSON.stringify(data));
  }

  LoadBindingsFromStorage() {
    const saved = localStorage.getItem('deliveryRush_inputBindings');
    if (saved) {
      const data = JSON.parse(saved);
      this.bindings = new Map(Object.entries(data.inputBindings));
      this.settings = data.inputSettings;
    }
  }
}
```

---

## Testing Input

### Test Cases

- [ ] Player holds steer_left on keyboard; car turns left at intersection; no input drop.
- [ ] Player rebinds steer_left to gamepad D-Pad Left; quit game; restart; binding persists.
- [ ] Player presses steer_left while holding throttle_hold; both inputs are processed simultaneously.
- [ ] Player switches from keyboard to gamepad mid-run; game responds to gamepad input (device priority works).
- [ ] Player tries to bind same key to two actions; warning shown; rebind proceeds only if confirmed.
- [ ] On low-end Android (slow touch), touch latency < 100ms (input buffer handles slight delays).

---

## Validation Checklist

- [x] Every gameplay action is in the mapping table with human-readable intent.
- [x] Each action has default bindings for all target devices (keyboard, gamepad, touch).
- [x] Remapping is implemented: player can rebind any action at runtime; conflicts are warned.
- [x] Input mappings persist across sessions (saved to localStorage).
- [x] Feel parameters (buffer, dead zone) are exposed to tunable config (Balance.ts), not hardcoded.
- [x] Gameplay code only calls `IsActionPressed('steer_left')` or subscribes to action events; never reads raw input.
- [x] Accessibility options are present: toggle-vs-hold, one-handed layout, sensitivity limits.
- [x] Touch, keyboard, and gamepad can be used simultaneously; device priority is clear.
- [x] All input UI is colorblind-safe (text labels + icons).

## Status

**Complete.** Delivery Rush Phaser MVP implements this abstraction in ControlPad.ts and InputManager.ts. Three.js rewrite will preserve the input contract (same actions, bindings, feel parameters).
