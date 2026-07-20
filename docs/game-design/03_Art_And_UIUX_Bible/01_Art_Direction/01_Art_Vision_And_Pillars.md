# 01 — Art Vision & Pillars: Delivery Rush

## Vision Statement

A bright, low-poly 3D arcade city where every car, building, and delivery glows with warm light—readable in one glance, drivable with one thumb, playable at 60 fps on any phone.

## Art Pillars (5)

1. **Extreme Clarity Over Realism**
   - Rationale: Core design pillar is one-thumb control and instant readability. At 60 fps on mobile, every asset must communicate its role without ambiguity.
   - Visual implication: Chunky readable silhouettes (car ≈ 3:1 length-to-height), high contrast against the sky, no overlapping elements. Characters/NPCs read instantly as "friendly" (round) or "threat" (angular). UI elements are 44×44px minimum touch target.

2. **Warm, Inviting Color Language**
   - Rationale: Casual arcade tone requires accessibility and approachability; the game is played in short bursts by all ages.
   - Visual implication: Primary palette anchors to warm tones (golds, oranges, sandy beiges, grass greens) with soft shadows. No cool/desaturated backgrounds; even night scenes glow warm via street lights.

3. **Snappy Arcade Energy**
   - Rationale: Speed is a design pillar; juice and feedback reinforce player agency and satisfaction.
   - Visual implication: Bright, high-saturation accent colors for action feedback (delivery complete = bright green, crash = orange burst). Quick particle effects, screen shake on impact, camera anticipation before turns.

4. **Mobile-First Low-Poly Geometry**
   - Rationale: Performance is non-negotiable; static city built once, streamed if needed. No per-frame redraw.
   - Visual implication: Procedural boxes/extrusions for buildings, wheels for vehicles. Prefer Kenney Car/City Kit glTF assets where they reduce draw calls. Soft shadows baked or via simple shadow maps. Target 60 fps at 1x device pixel ratio on mid-tier Android.

5. **Colorblind-Distinct + Icon-Based Communication**
   - Rationale: Accessibility is core to casual arcade design; 8% of players are colorblind.
   - Visual implication: Never signal state with color alone. Delivery = pulsing beacon + emoji glyph (📦). Danger = angular red shape + ⚠️ icon. UI states use size, opacity, and icon overlay (disabled = 50% gray + lock icon).

## Emotional Tone

- **Register:** Playful/arcade, energetic but not stressful. Think Crossy Road's "just one more run" friendliness, not Crazy Taxi's urgency.
- **Palette keywords:** Warm (5000–6500K color temp), saturated accents (orange, bright green), soft shadows, zero neon/sci-fi.
- **Lighting style:** Soft ambient occlusion + directional light with gentle shadows. Sky is bright and clear (no fog/haze). Street lights add local warm pools.
- **Shape language:** Rounded vehicle bodies and player UI (safety/friendliness); angular threat silhouettes (traffic cars, obstacles); geometric buildings (order/predictability).

## Reference & Moodboard

- **Target inspirations:** 
  - Crossy Road (low-poly isometric, readable at any distance, arcade charm)
  - Kenney Car Kit / City Kit (CC0 low-poly game assets, warm default palette)
  - Crazy Taxi (delivery mechanic, short runs, score-driven replayability)
  - Figma brand UI (dark rounded panels, big tap targets, emoji clarity)

- **Anti-targets:** 
  - We avoid Grand Theft Auto-style realism (too much visual noise, unreadable on mobile, slow).
  - We reject dark/desaturated palettes (doesn't match arcade joy).
  - We won't use thin strokes or small fonts (fails on 720×1280 mobile).
  - We avoid ambiguous icons (emoji clarifies intent where needed).

- **Moodboard location:** Embedded in canonical brief; further expansion stored in `/docs/game-design/03_Art_And_UIUX_Bible/01_Art_Direction/moodboard/` (Figma board or screenshot folder).

## Discipline Checklist

- [x] **Character design aligns:** Player car uses 3:1 proportions, warm color (beige/orange options), chunky wheels. NPCs are simple rounded shapes (friendly) or angular (threat). All readable at 1280px distance.
- [x] **Environments feel cohesive:** Procedural city uses consistent block size (16×16 grid), soft shadow maps, warm street-light palette. Every building is a extruded box, no photorealistic textures.
- [x] **UI language matches world:** Dark rounded panels (premium feel, high contrast), 44px+ buttons, emoji glyphs for orders. Font is bold and sans-serif (readability). Buttons use warm accent on hover/active.
- [x] **VFX tone is consistent:** Delivery burst = warm spark particles (orange/gold). Crash = orange impact flash + shake. Combo ring pulses in warm green. No cool blues or sci-fi effects.
- [x] **Marketing assets feel authentic:** Trailer/screenshots show warm-lit city at sunset, three-button control UI, smiling car characters. Copy emphasizes "casual," "mobile," "instant restart."

## Validation Checklist

- [x] Vision statement is one sentence, evocative, and specific (not "beautiful" or "stylized").
- [x] Each art pillar tied to a design pillar (one-thumb clarity, speed juice, mobile performance, accessibility).
- [x] Each pillar has concrete visual implication (e.g., 44px touch targets, warm palette 5000K, Kenney assets).
- [x] Emotional tone defined: playful/arcade, warm palette, soft shadows, rounded+angular shape language.
- [x] Target references named (Crossy Road, Kenney kits, Crazy Taxi, Figma UI).
- [x] Anti-targets named (GTA realism, dark palettes, thin fonts, ambiguous icons).
- [x] All five disciplines tested and aligned (characters, environments, UI, VFX, marketing).
- [x] No ambiguity: any artist reading this vision can produce on-brand work immediately.
