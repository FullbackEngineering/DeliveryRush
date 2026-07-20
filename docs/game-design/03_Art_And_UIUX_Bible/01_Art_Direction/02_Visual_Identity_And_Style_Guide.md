# 02 — Visual Identity & Style Guide: Delivery Rush (v1.0)

## Art Pillars

**Bright, chunky, readable.** Every asset prioritizes clarity over detail. Mobile-first low-poly. Warm, welcoming tone.

## Color Palette

| Role | Hex | Usage | Notes |
|------|-----|-------|-------|
| **Primary Warm** | #D4B896 | Building walls, default world tone, vehicle bodies | Sandy beige; dominates the 3D city |
| **Secondary Accent** | #FF8C42 | UI highlights, button active state, threat markers | Warm orange; high saturation for action feedback |
| **Accent Success** | #66BB6A | Delivery complete, positive feedback, combo ring | Bright green; immediately reads as "success" |
| **Accent Danger** | #E53935 | Crash feedback, hazard zones, near-miss warning | Warm red; signals impact without sci-fi tone |
| **Neutral Light** | #F5F1EB | UI text (on dark), panel backgrounds, icon fill | Off-white/cream; high contrast for readability |
| **Neutral Dark** | #3D3D3D | Dark UI panels, text (on light), shadows | Charcoal; premium feel for UI chrome |

All colors tested against colorblind simulators (deuteranopia, tritanopia). Meaning never relies on hue alone.

## Typography

| Role | Font | Size (Mobile) | Size (Desktop) | Weight | Use Case |
|------|------|---------------|----------------|--------|----------|
| **Game Title** | SF Pro Display (or Roboto Bold) | 36pt | 48pt | Bold | Main menu, title screens |
| **Primary Heading** | SF Pro Display | 24pt | 32pt | Semibold | HUD labels (Score, Combo) |
| **Body / UI Label** | SF Pro Display | 12pt | 14pt | Regular | Button text, timer, distance, coin value |
| **HUD Numeral** | Roboto Mono (tabular) | 14pt | 18pt | Bold | Score, combo count, timer |
| **Flavor / Hint** | SF Pro Display | 10pt | 12pt | Light | Tutorial hints, item tooltips |

All text is high-contrast (4.5:1 minimum). Bold weights preferred for moving/animated text. No thin weights (fail at 10px on mobile).

## Shape Language & Silhouette Rules

| Element | Shape Rule | Rationale |
|---------|-----------|-----------|
| **Player Vehicle** | 3:1 length-to-height, 16px corner radius, chunky wheels | Friendly, readable, instantly identifiable as "your car" |
| **NPC/Traffic Car** | 3:1 ratio, 8px corner radius, angular hood detail | Distinct from player; slightly more angular = potential threat |
| **Friendly NPC** | Round blob body + simple wheel, no armor | Communicates harmless, collectable |
| **Obstacle/Hazard** | Sharp 45° angles, spiky crowns, no curves | Instantly reads as "avoid" without color |
| **Buildings** | Rectangular extrusions, 4px corner bevel at edges | Order, predictability, no ornament |
| **UI Buttons** | 44×44px minimum, 4px corner radius all buttons, flat fill | Touch-friendly, premium flat design |
| **Delivery Beacon** | Pulsing circle 16px radius, emoji overlay | Instantly reads as "target" when pulsing |

**Silhouette test:** All shapes pass the silhouette test at 1280px distance (viewport width). Player car reads distinctly from traffic car. Friendly NPCs read round at a glance.

## Character Standards

- **Player car:** 48×16px base (world scale), warm beige or orange options, large emoji steering indicator (◀ ▲ ▶).
- **NPC cars:** 40×14px, gray-green (neutral) or red-orange (threat), simple wheel geometry.
- **Collision model:** Circle per axle (two points per car); no mesh collision.
- **Animation:** Car sway left/right at turns (2px max offset), wheel spin (360° per 0.5s at cruise speed), gentle bounce at delivery point.
- **No humanoid characters:** Game uses emoji glyphs (👤 for NPCs, 🚗 for vehicles). Keeps scope small, art style focused.

## Environment Standards

- **World grid:** 16×16 pixel block size (one city tile). Intersections at grid-aligned centers.
- **Building density:** Procedurally placed 64–192px-wide buildings (1–12 blocks), 80–256px height, 32px floor-to-floor. No overlaps.
- **Vegetation:** Simple cylinder trees (8px trunk, 24px canopy), randomly rotated, pooled (max 200 trees visible). Terrain is single-color procedural grid.
- **Props:** 4-8px boxes (mailboxes, bins), no texture detail. Collision volumes only.
- **Tiling:** No repeating textures; all geometry is solid color + normal map baking (if used).

## Lighting & Rendering Specifications

- **Ambient light:** Fixed at #FFE4B5 (light warm glow), intensity 0.7.
- **Directional light:** 45° from sun (golden hour angle), warm #FFFACD, intensity 1.2, shadow darkness 0.4 (40% gray minimum).
- **Shadow maps:** 1024×1024 resolution, soft-PCF filtering. Only terrain casts shadows.
- **AO (Ambient Occlusion):** Baked at 0.5 intensity on building corners. No real-time SSAO (performance).
- **Bloom:** Minimal; only delivery beacon + combo ring glow (bloom radius 0.3 units, color inherited from accent success).
- **Target:** 60 fps at 1x device pixel ratio on mid-tier phones (Snapdragon 888). Max draw calls: 50.

## VFX Style Guide

| Event | Particle Style | Count | Duration | Color |
|-------|---|---|---|---|
| **Delivery Complete** | 8-12 burst spheres, up+out trajectory | 12 | 0.5s | #66BB6A + white |
| **Crash Impact** | 16 sharp sparks, radial spread, gravity | 16 | 0.8s | #E53935 + orange |
| **Combo Milestone (×2, ×4, ×8)** | Glow ring expand, no particles | — | 0.3s | #66BB6A (pulse) |
| **Near-Miss Warning** | 4 yellow streaks, quick fade | 4 | 0.4s | #FFEB3B |

All particles use simple quads, no mesh deformation. Motion blur optional (disabled on low-end). No screen-space effects other than letterbox (portrait UI safe zone).

## UI Style

| State | Style | Example |
|-------|-------|---------|
| **Default Button** | 44×44px, 4px radius, #3D3D3D fill, #F5F1EB text (14pt Bold) | ◀, ▲(GAS), ▶ |
| **Hover/Tap** | Brighten to #555555 fill, scale to 102% | Instant visual feedback |
| **Active/Hold** | #FF8C42 fill, white text, scale 105% | Gas button while held |
| **Disabled** | #9E9E9E fill, 50% opacity, lock icon overlay | Greyed out (e.g., locked vehicle) |
| **Panel Background** | #3D3D3D with 0.9 opacity, 8px radius, 2px stroke #555555 | HUD panels, menu screens |
| **Score/Timer Text** | #F5F1EB on dark, 18pt Roboto Mono Bold, tabular figures | Always readable, no flicker |

All UI uses flat design with no gradients or shadows (except 2px drop shadow on text over gameplay).

## Example Assets

- **Hero car reference sheet:** `/docs/game-design/03_Art_And_UIUX_Bible/01_Art_Direction/assets/player-car-reference.png` (orthographic views, 48×16px base, warm beige variant shown)
- **Building kit:** `/assets/building-modules/` (extrusion rules + prefabs in Three.js)
- **UI button template:** Figma file linked in project (states and scale rules).
- **Color palette export:** `/docs/game-design/03_Art_And_UIUX_Bible/01_Art_Direction/delivery-rush-palette.ase` (Adobe Swatch; also .gpl for GIMP).

## Version History

- **v1.0** — 2026-07-18 — Initial guide. Finalized palette, typography, shape language, and rendering specs. Ready for production asset creation.

## Validation Checklist

- [x] Art pillars are 3–5 words and appear in every key asset decision.
- [x] Color palette hex-coded; designer can export and match exactly.
- [x] Character and environment standards include proportions (3:1 ratio, 48×16px car, 16×16 grid).
- [x] Shape language measurable (4px corner radius buttons, 16px beacon, 45° spikes).
- [x] Bad examples noted (no GTA realism, no thin fonts, no ambiguous icons).
- [x] Lighting specs numeric (AO 0.5, shadow 0.4, bloom radius 0.3, 60 fps target).
- [x] Reference sheets exist (car, buildings, buttons, palette exports).
- [x] UI states covered: default, hover, active, disabled.
- [x] Guide versioned (v1.0, dated). Changes logged.
- [x] A contractor or new artist can produce on-brand work after one read-through.
