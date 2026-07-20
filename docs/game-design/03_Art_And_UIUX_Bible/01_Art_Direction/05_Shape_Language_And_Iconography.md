# 05 — Shape Language & Iconography: Delivery Rush

## Shape-to-Meaning Map

| Shape Category | Emotion / Role | Used In | Examples |
|---|---|---|---|
| **Round forms** | Safe, friendly, interactive, collectible | Player car, delivery beacons, coins, positive feedback | Player vehicle body (16px corner radius), pickup beacon (pulsing circle 16px radius), coin particles |
| **Angular/Jagged forms** | Threat, obstacle, hazard, "avoid this" | Traffic cars, obstacles, enemy markers, impact zones | Traffic car hood (8px sharper angle), spike hazards (45° points), crash particles (triangular bursts) |
| **Geometric/Rectilinear** | Order, stability, UI chrome, structure | Buildings, UI panels, grid-aligned world | Building extrusions (rectangular, 4px bevels), button containers (44×44px, 4px radius), grid intersections |
| **Asymmetric/Directional** | Movement, intent, input feedback | Steering arrows, motion indicators, combo flow | Left/Right steer buttons (◀ ▶ asymmetric), gas button (▲ pointing forward), combo ring growth |

**Consistency rule:** Round shapes NEVER signal threat. Angular shapes NEVER signal safety. This distinction is learned in the first 30 seconds and enforced throughout.

## Silhouette Rules

### Friendly/Player Entity Silhouette
- **Shape:** Rounded rectangle 3:1 length-to-height ratio (48×16px base).
- **Wheels:** Large, circular, extends beyond body (chunky proportions).
- **Detail:** Smooth curves on hood, gentle windshield angle (no aggressive lines).
- **Recognizability:** Readable as "player car" from 1280px distance. Round base (no sharp edges) signals friendly.
- **Silhouette test:** Solid black outline passes the squint test; reads distinctly from traffic cars.
- **Reference:** Crossy Road car proportions; Kenney Car Kit "SUV" model.

### Hostile/Traffic Car Silhouette
- **Shape:** 3:1 length-to-height ratio (40×14px), slightly smaller than player.
- **Hood angle:** 8px sharpening at front (angular, threatening).
- **Wheels:** Smaller, less prominent (less friendly).
- **Color:** Gray-green (neutral threat) or orange-red (active threat).
- **Recognizability:** Distinct from player car via smaller size, sharper hood. Reads as "obstacle" at a glance.
- **Silhouette test:** Passes squint test; clearly different from player vehicle.

### Obstacle/Hazard Silhouette
- **Shape:** Spike crown (45° angles radiating outward), or jagged box (sharp corners every 4px).
- **No curves:** Pure angles communicate "don't touch."
- **Small and high-contrast:** Hazards are bright red (#E53935), stand out against primary beige.
- **Recognizability:** Instant danger signal even at small sizes (16px+).
- **Silhouette test:** Jagged outline unmistakable even as tiny UI element.

### Building/World Architecture Silhouette
- **Shape:** Rectangular extrusion, clean corners (4px bevels for depth).
- **Proportions:** Varied heights (80–256px), widths (64–192px), but all rectangular (no organic shapes).
- **Repetition:** Buildings feel like a cohesive urban kit; repetition is intentional (cost/clarity).
- **Silhouette test:** Every building reads as "structure, not interactive" (squared-off vs rounded).

**Silhouette test protocol:** Render each shape as solid black at its smallest intended size. Can the player identify entity type without color or label? All Delivery Rush silhouettes pass.

**Squint test protocol:** Squint at the shape set. Do silhouettes blur together or remain distinct? Player car (rounded), traffic car (angular), obstacle (jagged), building (geometric) all remain distinct when squinted.

## Icon Grid & Style Rules

**Base grid:** 32px (icons scale as multiples: 16px for UI, 32px standard, 64px for larger hero assets).

**Stroke weight:** 2px (consistent across all outlined icons). Filled icons use solid shapes without outlines.

**Corner radius:** 4px (applied universally to all UI icons except directional arrows). Exception: triangular/angular icons (warning, spike) use sharp 45° points (no radius).

**Color palette for icons:**
| Icon State | Color | Usage |
|---|---|---|
| **Active (default)** | Semantic color (green/orange/red) + white outline (1px, readability) | Visible, interactive |
| **Disabled / Greyed** | #9E9E9E (neutral gray, 50% opacity) | Locked vehicle, expired order, unavailable action |
| **Locked** | #9E9E9E + 🔒 overlay (small lock icon) | Garage locked vehicle, premium feature |
| **Hover/Interactive** | Brighten 10% (e.g., #FF9C52 from #FF8C42) | Button/interactive element feedback |

**Anti-patterns avoided:**
- No gradients on icons (flattens at small sizes, looks cheap).
- No inner shadows or bevels (adds visual noise at 16px).
- No thin outlines (<2px, disappear at small scale).
- No decorative serifs or ornaments (compromise readability).

## Icon Inventory

| Icon / Glyph | Semantic Meaning | Min Size | States | Usage Context | Notes |
|---|---|---|---|---|---|
| **📦 (Pickup/Delivery emoji)** | "Deliver this package" | 32px (UI), 24px (in-world beacon) | Active (full color), Completed (greyed) | Delivery order target beacon, quest marker | Emoji (no custom design); supports all ages/languages |
| **⚠️ (Danger emoji)** | "Avoid this hazard" | 24px (warning overlay) | Active (orange), N/A | Hazard zone marker, near-miss alert | Emoji; pairs with red shape (color + icon redundancy) |
| **◀ Left Arrow** | "Steer left" | 44×44px button | Default (#3D3D3D), Hover (#555555), Active (#FF8C42) | Left control button | Asymmetric shape (points left), no curves |
| **▲ Up Arrow (Gas)** | "Accelerate" | 44×44px button | Default (#3D3D3D), Hold (#FF8C42 + scale 105%) | Center control button (gas pedal) | Points forward, largest/most prominent button |
| **▶ Right Arrow** | "Steer right" | 44×44px button | Default (#3D3D3D), Hover (#555555), Active (#FF8C42) | Right control button | Asymmetric shape (points right), mirrors left arrow |
| **💰 (Coin emoji)** | "Money / score" | 24px (HUD), 16px (indicator) | Gold color (#FFD700, inherit from orange) | Coin counter, reward notification | Emoji; instantly recognizable across cultures |
| **⏱️ (Timer emoji)** | "Time remaining" | 24px (HUD), 16px (mini) | Pulsing (warning at <10s) | Order timer, run countdown display | Emoji; color changes to red (#E53935) when urgent (<5s) |
| **✓ (Checkmark)** | "Success / delivery complete" | 32px (particle), 24px (UI) | Green (#66BB6A), grows/expands animation | Delivery confirmation screen, combo milestone icon | Simple 2px stroke, no frills; 45° angle check mark |
| **+ (Plus / Combo increment)** | "Bonus multiplier" | 32px (combo ring) | Orange (#FF8C42) glow | Combo counter increment, stacked deliveries | Single 2px vertical + horizontal line, centered |

**Icon states (universal rules):**
- **Active:** Full saturation, full opacity, primary color.
- **Disabled:** 50% opacity, desaturated to gray (#9E9E9E).
- **Locked:** Disabled state + 🔒 overlay (small lock icon, 12px).
- **Hover (interactive):** Brighten by 10% in HSL (e.g., #FF8C42 → #FF9C52).
- **Press/Active (button):** Scale 102%, color to active accent (#FF8C42).

## Visual Grammar Across The Game

**Consistency principle:** A shape used in UI should echo a shape in the world. Examples:
- Circular delivery beacon in HUD (top bar icon) matches circular pulsing beacon in world.
- Orange "interactable" color in UI buttons matches orange hazard markers in world.
- Green success feedback in score display matches green delivery burst particles in-world.

**Transfer of language:**
- Coins appear as golden spheres in world AND as 💰 emoji in HUD.
- Danger red (#E53935) appears on obstacle spikes AND on health-depletion UI.
- Angular traffic cars in world use angular UI icon style (triangle-based indicator).

This unified language reduces cognitive load and makes the game feel cohesive.

## Shape Language & Icon System Worksheet (Filled)

### Shape-to-Meaning Map
- **Round forms:** Safety, friendliness, collectible → Used in: Player car body (16px radius), delivery beacon pulsing circle, coin rewards, positive feedback particles
- **Angular forms:** Threat, obstacle, hazard → Used in: Traffic car hood (8px sharp angle), spike hazards (45° spikes), crash impact triangles
- **Organic forms:** N/A for Delivery Rush (no living creatures, kept geometric for clarity)
- **Geometric forms:** Order, UI chrome, structure → Used in: Building extrusions (rectangular), button containers (44×44px 4px radius), grid-aligned intersections

### Silhouette Rules
- **Friendly entity silhouette:** Rounded rectangle 3:1 ratio, large round wheels, smooth curves. Readable as "player car" at 1280px distance. Reference: Crossy Road vehicle.
- **Hostile entity silhouette:** 3:1 ratio, 8px sharper hood angle, smaller wheels. Distinct from player via smaller size + sharp hood. Threat implied by shape.
- **Elite/Special silhouette:** Spike crown (45° angles radiating) or jagged box (sharp corners every 4px). Instant danger signal even at 16px size.
- **Pass silhouette test at minimum display size (720px viewport)?** Yes; player car, traffic car, hazard all remain distinct when squinted at small scale.

### Icon Grid & Style Rules
- **Base grid size:** 32px (scales to 16px UI, 64px hero assets).
- **Stroke weight:** 2px (all outlined icons consistent).
- **Corner radius:** 4px universal (except directional arrows, which use 45° sharp points).
- **Color palette for icons:** Active = semantic color (green/orange/red) + white 1px outline. Disabled = #9E9E9E 50% opacity. Locked = disabled + 🔒 overlay. Hover = brighten 10%.

### Icon Inventory (Filled)
| Icon Name | Metaphor | Min Size | States | Notes |
|---|---|---|---|---|
| 📦 Pickup | Package/delivery | 24–32px | Active/Disabled | Emoji for all-ages clarity; pairs with orange beacon |
| ⚠️ Hazard | Warning/danger | 24px | Active only | Emoji overlay; pairs with red shape (redundancy) |
| ◀ Left Steer | Directional intent | 44×44px | Default/Hover/Active | 2px stroke, asymmetric arrow |
| ▲ Gas | Accelerate forward | 44×44px | Default/Hold | Largest button; points forward |
| ▶ Right Steer | Directional intent | 44×44px | Default/Hover/Active | Mirrors left arrow, 2px stroke |
| 💰 Coins | Currency/reward | 16–24px | Static/Pulsing | Emoji; color pulses orange on earned coins |
| ⏱️ Timer | Time remaining | 16–24px | Active/Urgent | Emoji; color red when <5 seconds remaining |
| ✓ Success | Delivery complete | 24–32px | Expanding animation | 2px checkmark, green color, particle effect |
| \+ Combo | Multiplier bonus | 32px | Glow pulse | 2px lines, orange glow, appears on combo milestone |

## Validation Checklist

- [x] Every core shape (friendly, hostile, neutral, special) has distinct silhouette readable at smallest intended size (16px minimum).
- [x] Squint test passes for all silhouettes; entities don't blur together at distance (rounded vs angular vs jagged remain distinct).
- [x] All icons align to uniform 32px grid base and use consistent 2px stroke weight (or all-filled logic).
- [x] Corner radius applied uniformly (4px all UI icons, except directional arrows with sharp 45° points).
- [x] Metaphors are consistent: heart always = health (N/A Delivery Rush, but principle noted), lock always = "restricted", arrow = direction.
- [x] Icon states visually distinct (active full color, disabled gray 50% opacity, locked with 🔒 overlay); no color-alone differentiation.
- [x] Smallest icon (16px UI indicator) reads clearly against dark (#3D3D3D), light (#F5F1EB), and mid-tone backgrounds (primary beige #D4B896).
- [x] Shapes used in UI (emoji, arrows, checkmark) also appear in world or are explained by tooltip/context.
- [x] No ambiguous icons; each icon's meaning confirmed by context (e.g., package emoji + pulsing beacon = "deliver here").
- [x] A new player learns visual grammar in first 30 seconds (round = safe, angular = threat, arrows = steer).

## Common Pitfalls (Avoided)

- ✓ Silhouettes are distinct (player car rounded, traffic car angular, hazard jagged—no confusion).
- ✓ Corner radius consistent (all UI 4px, sharp only on directional/threat shapes).
- ✓ Icons designed for smallest use case first (16px UI indicators readable, scale up to 32–64px gracefully).
- ✓ Metaphors reinforce game reality (orange = interactive, red = danger, green = success; no contradictions).
- ✓ No color-only differentiation (blessed vs cursed states always paired with icon/shape, not hue alone).
- ✓ Icons not overdecorated (emoji simple, arrows 2px line weight, checkmark minimal—clarity over detail).
- ✓ Shapes unified across UI and world (coin emoji in HUD reflects coin particles in-world; orange UI matches orange hazard markers).

## Version History

- **v1.0** — 2026-07-18 — Initial shape language guide. Silhouettes locked, icon system defined, 32px grid established. Ready for asset production.
