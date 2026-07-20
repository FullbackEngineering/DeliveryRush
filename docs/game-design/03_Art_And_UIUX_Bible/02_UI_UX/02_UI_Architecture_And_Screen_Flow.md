# 02 — UI Architecture & Screen Flow (Delivery Rush)

## Purpose

Delivery Rush is a linear, focused experience: Boot → Main Menu → Play → Results → back to Menu (or Garage). No sub-menus, no branching narratives, no quest logs. The screen inventory is intentionally lean; each screen has one job. This chapter documents every screen, the navigation between them, and why each is designed to stay shallow and fast.

## Screen Inventory

| Screen Name | Entry Point | Primary Exit | Modal? | Role / Purpose |
|---|---|---|---|---|
| **Boot** | Game launch (cold start) | → Preload (auto) | N/A | Load assets, generate city grid seed. Player sees a splash screen (logo + game title). ~3 seconds. |
| **Main Menu** | Boot completion or Quit from any screen | Play / Garage / Settings / Quit | Non-modal | Central hub. Four buttons: Play (start a new run), Garage (customize vehicle/cards/profile), Settings (audio/graphics/controls), Quit (exit game). |
| **Game HUD** | Main Menu (Play button) | Pause menu, auto-transition to Results on timer=0 | Non-modal | The 45–90 second run. Three control buttons (Steer ←, Gas ▲, Steer →) anchored at bottom. HUD shows timer, coins, score, order card, combo, nav arrow. All info is passive; no menus open during play. |
| **Pause Menu** | Player presses Esc / Pause button during Game | Resume / Settings / Quit to Menu | Modal (overlays game) | Pauses the run timer. Three options: Resume (continue run), Settings (adjust volume/motion/colorblind), Quit to Menu (abandon run, no penalty). |
| **Settings Menu** | Pause Menu or Main Menu | Save and return to parent screen | Modal | Audio (master, SFX, music, UI volumes), Graphics (motion blur, screen shake, particle intensity, colorblind mode), Controls (rebind touch buttons, toggle gas hold/tap, keyboard remap). |
| **Garage** | Main Menu (Garage button) | Return to Main Menu | Non-modal | Three tabs: Vehicles (choose from 4 unlocked via coins), Cards (equip 3 modifier cards), Profile (name, cosmetic toggles, stats history). Each tab is a self-contained view with confirm/cancel flow. |
| **Results Screen** | Run ends (timer = 0 or player quits) | Play Again (restart) / Return to Menu | Non-modal | Shows run summary: score, coins earned, combo achieved, distance traveled, time survived. Two buttons: Play Again (new run with same vehicle/cards) or Return to Menu. |
| **Quit Confirm** | Player hits Quit in Pause or Quit in Main Menu | Confirm / Cancel | Modal | "Are you sure you want to quit?" Two options: Quit (lose current run progress if in-game; exit game if in menu) or Cancel (go back). |

## The Screen-Flow Graph

```
                    ┌─────────────┐
                    │    BOOT     │
                    │(3s splash)  │
                    └──────┬──────┘
                           │ auto
                    ┌──────▼────────┐
                    │  MAIN MENU    │◄───────────────────┐
                    │ Play/Garage/  │                    │
                    │ Settings/Quit │                    │ [Return to Menu]
                    └┬─────┬─────┬──┘                    │
                     │     │     │                       │
            [Play]   │     │     │   [Settings] [Quit]   │
                     │     │     │                       │
        ┌────────────┘     │     │                    ┌──┴──────┐
        │         ┌────────┘     │                    │Quit     │
        │         │      ┌───────┘                    │Confirm? │
        │         │      │                            │Y / N    │
        │         │  ┌───▼────────────┐               │   │ exit│
        │         │  │    GARAGE      │               └───┘    │
        │         │  │ Vehicles/Cards/│                       │
        │         │  │ Profile        │                       │
        │         │  └────────────┬───┘                       │
        │         │      [Apply/  └─────► (back to Menu)     │
        │         │       Back]                               │
        │         │                                           │
        │      ┌──▼──────────────┐                            │
        │      │   SETTINGS      │                            │
        │      │ Audio/Graphics/ │                            │
        │      │ Controls        │                            │
        │      └──┬───┬──────────┘                            │
        │         │   │                                       │
        │    [Save/Cancel] ◄───────┐                          │
        │         │ (from Pause)   │                          │
        │         │                │                          │
        │    ┌────▼─────────────┐  │                          │
        │    │ GAME HUD (Run)   │  │                          │
        │    │ Timer/Coins/Score│  │                          │
        │    │ Order/Combo      │  │                          │
        │    └────┬─────────────┘  │                          │
        │         │ [Pause] or     │                          │
        │      [Esc/Pause button]  │                          │
        │         │                │                          │
        │    ┌────▼───────────┐    │                          │
        │    │  PAUSE MENU    │    │                          │
        │    │ Resume/Settings│    │                          │
        │    │ /Quit          │    │                          │
        │    └────┬───┬───┬───┘    │                          │
        │    │   │   │   │                                    │
        │[Resume] │   │ [Quit to Menu] ─────────► (Y/N?)     │
        │         │   │                                       │
        │         │   └──────► (Settings) ────────► (back)   │
        │         │                                           │
        │ (timer=0 or force-quit)                            │
        │         │                                           │
        │    ┌────▼──────────────┐                            │
        │    │ RESULTS SCREEN    │                            │
        │    │ Score/Coins/Combo │                            │
        │    │ Play Again / Menu  │                            │
        │    └────┬────────┬──────┘                            │
        │         │        │                                   │
        │    [Play]       [Menu]                              │
        │     │            │                                   │
        └─────┘            └──────────────────────────────────┘
```

**Depth rule:** Play, Garage, and Results are 1 edge from Menu. Settings is 2 edges (Menu→Settings or Pause→Settings). Quit confirmation is modal (1 tap from anywhere).

## Information Architecture

**Horizontal grouping:**
- **Menu Suite:** Main Menu, Play, Results (core game loop).
- **Settings Suite:** Settings (accessible from Main Menu or Pause).
- **Garage Suite:** Garage tabs (Vehicles, Cards, Profile; all clustered under one parent).
- **Flow control:** Pause menu links back to game or to Settings or out to Menu.

**Progressive disclosure:**
- Main Menu shows 4 top-level buttons.
- Garage reveals tabs only after entry (Vehicles, Cards, Profile are hidden from Main Menu view).
- Results screen shows summary; detailed stats (per-delivery breakdown) hide in a swipe-down or expandable detail pane.
- Settings uses vertical scroll (not tabs) for simplicity: Audio, then Graphics, then Controls (each is a section).

**Back vs. Stack:**
Back button behavior is consistent: always returns to parent. Pause → Resume/Settings/Quit; Settings (from Pause) → back to Pause; Settings (from Menu) → back to Menu. Stack-based (LIFO). No breadcrumb; depth is shallow enough that tracking is automatic.

**Persistent vs. Temporary:**
- **Persistent:** Main Menu persists across sessions (cold boot or Quit).
- **Temporary:** Pause menu overlays the game (semi-transparent background); closing it returns to the exact game state.
- **Full-screen:** Results screen replaces the game HUD; it's a complete view, not an overlay.

## Wireframing

### Main Menu
```
┌─────────────────────────────────┐
│      DELIVERY RUSH              │  ← Title (center, large, bold)
│    [60s arcade courier]         │  ← Subtitle (center, smaller)
│                                 │
│        ┌─────────────────┐      │
│        │  PLAY NEW RUN   │      │  ← Primary action (100px tall, centered)
│        └─────────────────┘      │
│                                 │
│        ┌─────────────────┐      │
│        │  GARAGE         │      │  ← Vehicle/Card/Profile customization
│        └─────────────────┘      │
│                                 │
│        ┌─────────────────┐      │
│        │  SETTINGS       │      │  ← Audio/Graphics/Controls
│        └─────────────────┘      │
│                                 │
│        ┌─────────────────┐      │
│        │  QUIT           │      │  ← Exit game
│        └─────────────────┘      │
│                                 │
└─────────────────────────────────┘
```

### Game HUD Layout
```
┌──────────────────────────────────────┐
│ ⏱ 0:45        💰 1,250  🏆 12,500    │  ← Timer, Coins, Score (minimal, top)
│                                       │
│                                       │
│       ═══════════════════════════     │
│       ║  🍔 Deliver to Downtown   ║   │  ← Active Order Card (center, pulsing)
│       ║  +200 coins in 15s        ║   │
│       ═══════════════════════════     │
│                                       │
│                                       │
│                 ◀ ▼ ▶ 3 blocks       │  ← Nav Arrow (color-coded) + distance
│                                       │
│  ╔═════════════════════════════════╗  │
│  ║ ◀ Steer ▲ Gas ▶ Steer           ║  │  ← Three big control buttons
│  ╚═════════════════════════════════╝  │
│                      4× COMBO         │  ← Combo counter (fades when idle)
└──────────────────────────────────────┘
```

### Pause Menu (modal overlay)
```
┌──────────────────────────────────────┐
│  PAUSED                              │  ← Title (center)
│                                      │
│     ┌────────────────────┐           │
│     │ RESUME             │           │  ← Default focus
│     └────────────────────┘           │
│                                      │
│     ┌────────────────────┐           │
│     │ SETTINGS           │           │
│     └────────────────────┘           │
│                                      │
│     ┌────────────────────┐           │
│     │ QUIT TO MENU       │           │
│     └────────────────────┘           │
│                                      │
└──────────────────────────────────────┘
```

### Results Screen
```
┌──────────────────────────────────────┐
│         RUN COMPLETE!               │  ← Status
│                                      │
│  Score:        12,500               │  ← Metrics (left-aligned, large)
│  Coins Earned: 2,100                │
│  Best Combo:   6×                   │
│  Distance:     2.4 km               │
│  Time:         58s                  │
│                                      │
│     ┌────────────────────┐           │
│     │ PLAY AGAIN         │           │  ← Primary action
│     └────────────────────┘           │
│                                      │
│     ┌────────────────────┐           │
│     │ RETURN TO MENU     │           │  ← Secondary
│     └────────────────────┘           │
│                                      │
└──────────────────────────────────────┘
```

### Garage (Vehicles Tab)
```
┌──────────────────────────────────────┐
│ GARAGE                               │
│ [Vehicles] [Cards] [Profile]         │  ← Horizontal tabs
│                                      │
│  Starter (owned)                     │  ← Vehicle name + status
│  ○────────────────────────○ 240 px/s │  ← Speed slider (visual only)
│  [SELECTED]                          │  ← Status
│                                      │
│  Sport (1,200 coins)                 │
│  ○────────────────────────●─ 280 px/s│
│  [BUY] / [LOCKED]                    │
│                                      │
│  Super (3,500 coins)                 │
│  ○─────────●─────────────── 320 px/s │
│  [BUY] / [LOCKED]                    │
│                                      │
│  Hyper (8,000 coins)                 │
│  ○──────────────●──────── 360 px/s   │
│  [BUY] / [LOCKED]                    │
│                                      │
│  ◄ Back                              │  ← Return to Menu
└──────────────────────────────────────┘
```

## Relationship To Game States

- **STATE_BOOT:** Boot screen (splash, asset load).
- **STATE_MENU:** Main Menu (central hub).
- **STATE_GARAGE:** Garage (vehicle/card selection; pauses the main loop).
- **STATE_GAMEPLAY:** Game HUD + Pause Menu (run timer is live). Pause is a modal overlay, not a state change.
- **STATE_RESULTS:** Results screen (end-of-run summary).
- **STATE_SETTINGS:** Settings menu (accessible from Menu or Pause; modal overlay).

Transitions:
- Boot → Menu (auto, no user input).
- Menu → Garage / Menu → Gameplay / Menu → Settings / Menu → Quit.
- Gameplay → Pause (player input, pause overlay).
- Pause → Resume (Gameplay) / Pause → Settings / Pause → Quit to Menu.
- Gameplay → Results (auto, timer = 0 or player quits run).
- Results → Play Again (Gameplay, same vehicle/cards) / Results → Menu.
- Settings (from anywhere) → parent (Pause or Menu).

## Template — Navigation Summary

| Aspect | Detail |
|--------|--------|
| **Total Screens** | 8 (Boot, Main Menu, Game HUD, Pause Menu, Settings, Garage, Results, Quit Confirm) |
| **Depth (max)** | 2 edges (Menu → Garage → Settings is not possible; Settings from Garage requires back to Menu first; this is intentional—Garage is self-contained.) |
| **Critical Shortcuts** | Esc/Pause button = pause from gameplay; Back/B button = exit any menu; Quit button always available in Pause and Main Menu |
| **Persistent Elements** | Main Menu is always the restart point after Quit. Garage preferences (selected vehicle/cards) persist in save file. |
| **Edge Behavior** | Focus wraps in menus (last button → first button on down-arrow); edges do not scroll (all content visible at once). |
| **Mobile Constraints** | Portrait 720×1280. Thumb zones: bottom third is easily reachable. Top third is reachable with stretch. All critical UI (control buttons, timer) respects this. |

## Validation Checklist

- [x] Screen inventory is complete: Boot, Menu, Game, Pause, Settings, Garage, Results, Quit Confirm. No orphaned screens.
- [x] Every screen has a documented entry and exit.
- [x] No screen is unreachable without restarting.
- [x] No screen is a dead end: Pause → Resume/Settings/Quit; Garage → back to Menu; Settings → back to parent; Results → Play Again or Menu.
- [x] Critical functions reachable in ≤2 taps: Quit (Menu → Quit or Pause → Quit; 1 tap). Settings (Menu → Settings or Pause → Settings; 1 tap). Resume (Pause → Resume; 1 tap).
- [x] Screen names are consistent: "Play" not "Start"; "Garage" not "Shop"; "Results" not "End Screen".
- [x] Flow graph drawn and reviewed (ASCII diagram above).
- [x] Each screen is assigned to a game state (Boot, Menu, Gameplay, Results, Garage, Settings; Pause is modal overlay of Gameplay).
- [x] Wireframes exist for all 8 screens (Main Menu, Game HUD, Pause, Garage, Results shown above; Settings is vertical scroll; Boot is splash; Quit Confirm is modal dialog).
- [x] Persistent UI elements: Timer and order card stay visible at all times during gameplay (not hidden by Pause overlay, though pause dims the game behind it).
- [x] Modal vs. non-modal: Pause and Settings are modal (overlay, semi-transparent background). Menu, Gameplay, Garage, Results are full-screen non-modal.

## Common Pitfalls (Avoided)

**Designing without inventory:** All 8 screens were listed before layout began.

**Deep navigation:** Deepest path is Menu → Garage (1 edge), Menu → Settings (1 edge), Pause → Settings (1 edge). No path exceeds 2 edges.

**No escape path:** Every menu has a back button or Cancel option. Pause can be closed by Resume or Quit. No modal traps the player.

**Orphaned screens:** All 8 screens connect to the flow graph. No unreachable dead-ends.

**Ignoring mobile constraints:** All UI is portrait-first, thumb-friendly, no tiny buttons or unreachable text.

**Inconsistent back behavior:** Back always means "return to parent." From Pause, back = Resume (or close Pause overlay). From Garage, back = Menu. From Settings, back = parent (Pause or Menu). Consistent LIFO stack model.

**Mixing actions and decisions:** During gameplay (action mode), only three buttons (gas, steer, steer) are available. Decisions (vehicle choice, card equip) happen in Garage (safe menu, no timer).

## Final Word

Delivery Rush is intentionally lean. Eight screens, shallow navigation, one job per screen. A player enters Menu, taps Play, is in the first delivery within 5 seconds. Pause is one button away at any time. Settings and Garage are optional explorations, never required to play. This simplicity is the architecture's strength: every screen is clear, every path is short, and the core loop (play → results → repeat) is never obscured by menu complexity.
