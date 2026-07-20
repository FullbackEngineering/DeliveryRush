# 04 — Menus & Navigation (Delivery Rush)

## Purpose

Menus are the scaffolding that supports gameplay. In Delivery Rush, menus are minimal and shallow: Main Menu (4 options), Garage (3 tabs), Pause Menu (3 options), Settings (vertical scroll). Each menu supports touch, keyboard, and gamepad input identically. The player never has to relearn how to navigate because back/cancel/confirm work the same way everywhere. Focus is always visible, always reachable, and always one back button away from returning to the game.

## Core Principles Applied

**Design for every input method from day one.**
- **Touch:** Tap the button.
- **Keyboard:** Arrow keys to navigate, Enter to confirm, Esc to back/cancel.
- **Gamepad:** D-pad to navigate, A (or equivalent) to confirm, B (or equivalent) to back.
- **Hybrid:** Pointer and directional both active; pointer takes precedence if moved, but focus remains visible if player switches back to D-pad.

All three input methods produce identical outcomes. Navigation never feels foreign or retrofit.

**Focus is always visible.** When using D-pad or keyboard, the focused option is highlighted with a glowing border and slight scale-up (105%). When using pointer (touch/mouse), hovering an option shows the same glow and scale. Focus never disappears.

**Back and cancel must work everywhere.** Esc key = back on keyboard. B button = back on gamepad. Top-left X or swipe-left = back on touch (or the Back button in platform OS). All routes return to the parent menu. Consistent, predictable, every time.

**Keep menus shallow and fast.** No menu exceeds 3 levels. Main Menu (level 1) → Garage (level 1) / Settings (level 1 from Main, level 2 from Pause). The deepest path is: Main Menu → Pause → Settings (3 actions: Play → Pause → Settings). Every critical function is ≤2 taps away.

**Confirm destructive or irreversible actions.** Quitting mid-run asks "Abandon this run?" (Yes/No dialog). Selling a card asks "Remove from loadout?" There are no true destructions in Delivery Rush (no deletes, no permadeath), so only Quit requires confirmation.

## Menu Types & Structure

| Menu | Type | Navigation | Focus | Parent | Destructive? |
|------|------|-----------|-------|--------|------------|
| **Main Menu** | Hub/Vertical List | Arrow up/down; tap. Default focus: Play. | Wraps at edges (bottom → top). | Game boot | Quit only |
| **Pause Menu** | Vertical List | Arrow up/down; tap. Default focus: Resume. | Wraps at edges. | Game HUD | Quit mid-run asks confirmation |
| **Settings** | Vertical Scroll (not tabs) | Arrow up/down to scroll sections; left/right to adjust sliders; enter to toggle. Default focus: first section (Audio). | Wraps; last section → first section. | Main Menu or Pause | None (all reversible) |
| **Garage Vehicles** | Tab + Vertical List | Tabs left/right; list up/down; enter to select. Default focus: currently-owned vehicle. | Wraps. | Main Menu | None (cosmetic only) |
| **Garage Cards** | Tab + Horizontal Grid | Tabs left/right; grid up/down/left/right; enter to equip/unequip. Default focus: first slot. | Grid wraps at edges. | Main Menu | None |
| **Garage Profile** | Tab + Vertical List | Tabs left/right; list up/down; enter to toggle; left/right to adjust. Default focus: first profile setting. | Wraps. | Main Menu | None |
| **Quit Confirm** | Modal Dialog | Yes/No. Default focus: No (safer choice). | Wraps. | Pause Menu or Main Menu | Yes (closes game or quits run) |

## Navigation Across Input Types

| Input Type | Select | Navigate | Back | Confirm |
|---|---|---|---|---|
| **Touch** | Tap target | Tap target (tap to move between options) | Swipe left / tap ← / tap X | Tap button / double-tap |
| **Keyboard** | Type/Arrow keys | ↑↓ for vertical menus, ←→ for horizontal/sliders | Esc | Enter / Space |
| **Gamepad** | D-pad up/down/left/right | D-pad or left stick | B button / Right bumper | A button / X button |
| **Hybrid** | All of above | Pointer can click directly; directional focuses and navigates; pointer takes precedence if moved. | Any back input above | Any confirm input above |

**Key:** Focus is always visible in all modes. When a player clicks with pointer, that becomes the focused option. When they switch back to keyboard/gamepad, focus resumes from where pointer was.

## Focus, Selection & Feedback

**Visible focus state.** Each selectable option has a clear highlight:
- **Focused (not pressed):** Glowing border (white/yellow glow, 2px) + slight scale-up (105%).
- **Hovered (pointer near, not focused):** Same as focused (pointer over-rides focus).
- **Pressed (button held):** Option inverts (dark background becomes light, text becomes dark) for 100ms.
- **Disabled (unavailable):** Desaturated (grayscale), dimmed (50% opacity), no glow, no scale-up.

**Default selection.** Every menu opens with a sensible default:
- Main Menu: Play button is focused.
- Pause Menu: Resume button is focused.
- Settings: Audio section (first item) is focused.
- Garage: Currently-owned vehicle / currently-equipped card / first profile setting.
- Quit Confirm: No button (safer default to avoid accidental exit).

**Edge behavior.** All menus wrap (bottom → top, right → left). This feels snappy for short lists and prevents accidental focus loss when wrapping is expected.

**State feedback.** Distinct visual states:
- Hover: +5% scale, glow.
- Focus: +5% scale, glow (same as hover, but triggered by keyboard/gamepad).
- Press: Invert colors (white on dark → dark on white), 100ms hold.
- Disabled: Desaturated, 50% opacity, no interaction.
- Loading: Spinner animation (1 rotation/2 seconds) at the button's right edge.

## Back, Cancel & Confirmation

**Universal back button:**
- **Touch:** Swipe left, tap ← button, or tap X close button (all at top-left corner).
- **Keyboard:** Esc.
- **Gamepad:** B button or Right bumper.

All three routes do the same thing: close the current menu and return to the parent.

**Breadcrumb or depth tracking.** Minimal depth tracking (since max depth is 3):
- Main Menu → Garage [tabs show current: Vehicles/Cards/Profile].
- Main Menu → Pause → Settings [title shows "Settings"; Pause context is implicit].
- Main Menu → Pause → Quit Confirm [modal dialog; context is implicit].

No breadcrumb bar is needed; the context is always obvious from the screen title and lack of nesting beyond 3 levels.

**Confirm destructive actions.** Two scenarios require confirmation:
1. **Quit during run (Pause → Quit):** Modal dialog: "Abandon this run and return to menu?" → Yes / No.
2. **Quit from Main Menu:** Modal dialog: "Exit Delivery Rush?" → Yes / No.

All other actions (equip card, select vehicle, adjust volume) are reversible and require no confirmation.

**Cancel-to-anywhere.** From any submenu:
- Garage Vehicles → back to Garage hub (or Main Menu if pressed again).
- Settings → back to parent (Pause or Main Menu).
- Quit Confirm → back to previous menu (Pause or Main Menu).

## Depth & Speed

**Minimize taps to any function.**
- Play: 1 tap (Main Menu → Play).
- Settings: 1 tap (Main Menu → Settings) or 1 tap (Pause → Settings).
- Quit: 1 tap (Pause → Quit Confirm) or 1 tap (Main Menu → Quit Confirm).
- Vehicle select: 2 taps (Main Menu → Garage, navigate, select).
- All functions are ≤2 taps.

**Shortcuts.** Power users can:
- Hold Esc to skip intro splash screen (if present).
- Tab to fast-cycle vehicle categories (Garage).
- Hold Space on Settings sliders to jump to min/max.

**Remember state.** When closing and reopening menus:
- Garage remembers which tab was open and which vehicle/card was focused.
- Settings remembers last-adjusted section (if scrolled to Audio, reopening Settings scrolls to Audio).
- Main Menu always resets focus to Play (top of menu).

## Menu Spec (All Menus)

### Menu: Main Menu

| Aspect | Detail |
|--------|--------|
| **Type** | Vertical Hub |
| **Options** | Play, Garage, Settings, Quit |
| **Focus Model (Pointer)** | Click to select. Hover highlights (glow + scale). |
| **Focus Model (Directional)** | ↑↓ to navigate list; enter to select; wrap at edges. Default focus: Play. |
| **Back Behavior** | N/A (top-level). Quit button exits game (with confirmation). |
| **Depth** | Level 1 |
| **Destructive Actions** | Quit (asks confirmation). |
| **Shortcuts** | None. |
| **Memory** | Default focus is always Play (no memory; menu resets per open). |

### Menu: Pause Menu

| Aspect | Detail |
|--------|--------|
| **Type** | Vertical List (Modal Overlay) |
| **Options** | Resume, Settings, Quit to Menu |
| **Focus Model (Pointer)** | Click to select. Hover highlights (glow + scale). |
| **Focus Model (Directional)** | ↑↓ to navigate; enter to select; wrap. Default focus: Resume. |
| **Back Behavior** | Esc / B button → Resume (same as clicking Resume). |
| **Depth** | Level 1 (or Level 2 if Settings is accessed from here). |
| **Destructive Actions** | Quit to Menu (asks confirmation). |
| **Shortcuts** | Esc to resume (shortcut for "Resume" button). |
| **Memory** | Default focus resets to Resume every open. |

### Menu: Settings

| Aspect | Detail |
|--------|--------|
| **Type** | Vertical Scroll (Sections) |
| **Sections** | Audio (Master, SFX, Music, UI volumes) → Graphics (Motion blur toggle, Screen shake toggle, Particle intensity slider, Colorblind mode) → Controls (Gas model toggle: hold/tap, Steer buttons remap, Keyboard remap). |
| **Focus Model (Pointer)** | Click to toggle or adjust. Hover highlights. |
| **Focus Model (Directional)** | ↑↓ to scroll sections; ←→ to adjust sliders/toggles; enter to toggle. Wrap at edges. Default focus: first section (Audio Master). |
| **Back Behavior** | Esc / B button → return to parent (Pause or Main Menu). Save settings automatically on back. |
| **Depth** | Level 1 (from Main) or Level 2 (from Pause). |
| **Destructive Actions** | None (all reversible). |
| **Shortcuts** | Tab to jump to next section. Shift+Tab to jump to previous. |
| **Memory** | Remember last-adjusted section; reopen Settings and scroll to that section. |

### Menu: Garage

| Aspect | Detail |
|--------|--------|
| **Type** | Tab Container + Vertical/Grid Lists |
| **Tabs** | Vehicles (list), Cards (grid), Profile (list). |
| **Tab Navigation** | ←→ to switch tabs (or click tab header). |
| **Vehicles List** | 4 vehicles; up/down to navigate; enter to select/highlight as current. Shows stats (speed) and cost/status (owned/unlocked/buy). |
| **Cards Grid** | 3 slots (2×2 grid, 3 filled); up/down/left/right to navigate; enter to equip/remove card. |
| **Profile List** | Cosmetic toggles (HUD density, animation toggle, etc.). ↑↓ to scroll; enter to toggle; ←→ to adjust sliders. |
| **Focus Model (Pointer)** | Click to select. Hover highlights. |
| **Focus Model (Directional)** | ↑↓ for vertical lists, ←→ for horizontal movement / tabs / sliders. Enter to select. Wrap at edges. |
| **Back Behavior** | Esc / B → return to Main Menu. Save garage preferences automatically on back. |
| **Depth** | Level 1 (from Main). |
| **Destructive Actions** | None (all cosmetic/reversible). |
| **Shortcuts** | Tab to cycle tabs. |
| **Memory** | Remember selected tab and focused item within tab. Reopen Garage and return to last tab + focused option. |

### Menu: Quit Confirm (Modal Dialog)

| Aspect | Detail |
|--------|--------|
| **Type** | Modal Yes/No Dialog |
| **Prompt** | "Abandon this run?" (if from Pause) or "Exit Delivery Rush?" (if from Main Menu). |
| **Options** | Yes (confirm), No (cancel). |
| **Focus Model (Pointer)** | Click Yes or No. |
| **Focus Model (Directional)** | ←→ to switch between Yes/No; enter to confirm. Default focus: No (safer). |
| **Back Behavior** | Esc / B → No (cancel, return to previous menu). |
| **Depth** | Modal (pseudo-level 2). |
| **Destructive Actions** | Yes (quits run or exits game). |
| **Shortcuts** | None. |
| **Memory** | No memory; dialog resets focus to No on every open. |

## Validation Checklist

- [x] Every menu has a clear default focus state.
- [x] Focus is visually distinct (glowing border + scale-up); tested on TV and phone from 3 meters away.
- [x] Back/cancel uses the same input (Esc/B/swipe-left) everywhere and returns to parent menu consistently.
- [x] Destructive actions (Quit) require a second confirmation (modal dialog).
- [x] No menu nests deeper than 3 levels: Main → Pause → Settings is the deepest path, and Settings is the same screen from either parent.
- [x] Every top-level function is reachable in ≤2 inputs: Play (1), Garage (1), Settings (1), Quit (1 to Pause/Menu, +1 to confirm).
- [x] Pointer (touch/mouse) and directional (keyboard/gamepad) inputs both work identically: up/down moves focus, enter confirms, back returns.
- [x] Focus model documented for each menu (wrap, default option, parent).
- [x] Hover/focus/press/disabled states are visually distinct: glow + scale for normal, invert colors for press, grayscale + dim for disabled.
- [x] Settings remember the last-adjusted section and scroll position across close/reopen.
- [x] Garage remembers selected tab and focused item.
- [x] All menus are fully navigable with keyboard, gamepad, and touch independently.

## Common Pitfalls (Avoided)

**Invisible focus:** All options have a glowing border and scale-up when focused. Visible from 3 meters away. Focus never disappears during directional navigation.

**Back behavior inconsistency:** Back always means "return to parent." Pause → Resume (same as back). Settings → parent menu (Pause or Main). Garage → Main Menu (back again). Consistent LIFO (last-in, first-out) stack.

**3+ nesting levels:** Deepest path is 3 actions (Main → Pause → Settings), and Settings is the same destination from any parent. No path exceeds 3 levels.

**No confirmation on destructive actions:** Quit (either mid-run or exit game) requires a "Yes/No?" dialog. No accidental exits.

**Pointer and directional feel different:** Both use the same focus highlight, same confirm/back inputs, same outcomes. No mental model shift between input types.

**Focus disappears on hover:** Focus glyph is always visible. Pointer over-rides focus visually (shows hover glow) but focus is semantically tracked; when directional input resumes, focus is still there.

**Menu options cut off or unreadable:** Text sizes tested at default (100%) and large (150%) scales. Buttons are 80–100px wide minimum. Labels wrap if needed. No truncation without ellipsis.

**No input remapping:** Controls menu allows full remapping of all buttons (gas, steer left/right, pause, back). Keyboard and gamepad have independent maps.

## Final Word

Menus are the scaffolding for play. In Delivery Rush, they're invisible—the player taps Play and is driving 2 seconds later, or opens Pause and knows exactly where to find Settings. Back always goes back, focus always shows, and every action feels native on touch, keyboard, and gamepad alike. A well-designed menu system earns invisibility through consistency and clarity.
