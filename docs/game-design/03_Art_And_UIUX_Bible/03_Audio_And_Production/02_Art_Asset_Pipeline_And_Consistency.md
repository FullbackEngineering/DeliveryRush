# 02 — Art Asset Pipeline & Consistency

## Delivery Rush Asset Strategy: Procedural-First, CC0 Fallback

**Core Principle:** Delivery Rush ships with **zero hand-authored asset files** (textures, models, audio). All textures are procedurally generated at boot via `TextureFactory.ts`; all audio is synthesized via WebAudio API. This strategy minimizes disk footprint, eliminates asset management overhead, and keeps the solo/AI-assisted team agile. When hand-authored assets (3D models, animations) become necessary, prefer free CC0 kits (Kenney.nl, PolyHaven) to maintain speed and licensing clarity.

## Asset Categories & Ownership

| Category | Current Status | Source | Platform Constraints | Notes |
|----------|---|---|---|---|
| **Textures** | Procedural | `src/core/TextureFactory.ts` | 512×512 at 1–2× DPR; webp-optimized | Generated at boot; includes road, buildings, vehicle skins, UI backgrounds. |
| **3D Geometry** | Mostly procedural | Three.js primitives (boxes, extrusions) | Mobile budget: <50K tris per scene; <200K total; LOD0 only | City grid static; vehicles simple box-based; future: opt-in Kenney glTF imports. |
| **Audio (SFX)** | Procedural (synthesis) | `src/audio/AudioManager.ts` + WebAudio API | Sample-rate 48 kHz; mono/stereo, vol 0.25–0.5 | 12 cues (ui_click, coin, deliver, crash, etc.); no .mp3 files. |
| **Audio (Music)** | Placeholder loop | Procedural or future CC0 loop | 8–16 bar loop, 40–60 s duration, ~140 BPM | Adaptive stem-based composition; currently a simple kick/hi-hat; ready for upgrade to cc0 license loop or custom composition. |
| **UI Glyphs** | Emoji + procedural | Unicode emoji + thin SVG procedural | Max 128×128 px per glyph | Orders (🍕, 📦, etc.), UI affordances (arrow, timer). No asset pipeline; render in-engine. |
| **Particle Effects** | Procedural (Canvas 2D / Three.js) | `src/effects/Effects.ts` | Burst, confetti, floatText, shake—all GPU or Canvas | Lightweight, 60 fps target on mid-range phones. No sprite sheets. |

## Procedural Asset Generation Pipeline

### Texture Generation (`TextureFactory.ts`)

**Inputs:** Seed (daily seed for procedural city regeneration), color palette from `Palette.ts`.

**Output:** WebGL textures (512×512, webp or png), cached in-memory for session.

**Process:**
1. Concept: Choose asset type (road, building, vehicle, UI panel).
2. Procedural Generation: Use noise functions (Perlin, grid-based hash) to generate patterns (road markings, brick/concrete, vehicle metallic finishes). Seed ensures daily consistency.
3. Styling: Apply color palette rules (warm neutrals for roads, bright accent colors for delivery markers, muted tones for traffic vehicles).
4. Integration: Bind as Three.js texture; no import/export step.

**Quality Gates:**
- Readability: Textures must remain legible at 100×100 px (mobile viewport constraint).
- Performance: Texture generation must complete at boot in <500 ms; cached thereafter.
- Consistency: Same seed produces identical textures across sessions (player trust in daily challenge fairness).

### Audio Synthesis Pipeline (`AudioManager.ts`)

**Inputs:** SFX ID (ui_click, coin, pickup, etc.), current game state (speed for engine pitch, combo level for stinger pitch).

**Output:** WebAudio context, real-time synthesized waveforms.

**Process:**
1. Trigger: Game event emitted (e.g., `GameEvent.Sfx('coin')` or throttle input → engine pitch update).
2. Synthesis: Instantiate OscillatorNode (sine/triangle) with target frequency, envelope (attack/decay), and optional frequency glide.
3. Mixing: Connect to master gain node, apply volume (0.2–0.5 range), play.
4. Cleanup: Oscillator stops and is garbage-collected after playback.

**Quality Gates:**
- Responsiveness: SFX onset <50 ms; engine pitch glides <100 ms (tight feedback loop).
- Clarity: Master gain set to 0.5 (−6 dB FS); mix hierarchy prevents Tier 2+ SFX from masking critical cues.
- No Harshness: Smooth exponential ramps prevent clicks; use sine/triangle waves (no square/sawtooth harsh harmonics).

### 3D Geometry Pipeline (Three.js Primitives)

**Current Approach:** Procedural city grid built from extruded boxes (buildings, street blocks). Vehicles are simplified box-based shapes.

**Future Enhancement:** If hand-modeled assets needed (e.g., detailed vehicle interior, elaborate building silhouettes):
1. Source: Download free CC0 glTF from Kenney.nl or PolyHaven (e.g., "Car Kit", "City Kit").
2. Preparation: Ensure poly count <50K per model; verify LOD0 only (no LOD1/LOD2 needed for mobile).
3. Import: Add to `src/assets/models/` with versioned naming: `model_[type]_[variant]_v01.gltf`.
4. Integration: Load via Three.js GLTFLoader; instantiate and place in scene.
5. QA: Verify correct material assignment, collision bounds, and 60 fps on device.

## Naming & Folder Conventions

All procedural assets live in code; no separate file hierarchy. Explicitly authored assets (if added) follow this convention:

```
src/
  assets/
    models/
      vehicles/
        model_car_starter_v01.gltf
        model_car_sport_v01.gltf
      buildings/
        model_building_lowrise_v01.gltf
        model_building_storefront_v01.gltf
    textures/  (future: precomputed fallback textures if procedural fails)
      texture_road_asphalt_v01.webp
      texture_metal_rust_v01.webp
    audio/  (future: CC0 music loop or custom tracks)
      music_loop_main_v01.mp3
```

**Naming Rules:**
- Lowercase, underscores only (no spaces).
- Pattern: `[asset_type]_[object]_[variant]_[version]`.
- Version suffix (v01, v02, v03…) always included; superseded versions moved to `Archived/`.

**In-Code Asset Definitions:**
- Procedural assets: defined directly in code (TextureFactory, AudioManager, effects/).
- Configuration: all tuning in `Balance.ts`, palettes in `Palette.ts`, content data in `data/` (vehicles.ts, cards.ts, orderKinds.ts, etc.).

## Technical Specs (Mobile-First)

| Constraint | Delivery Rush Target | Justification |
|---|---|---|
| **Texture Resolution** | 512×512 px | Procedural generation; mobile VRAM budget; DPR 1–2× only. |
| **Texture Format** | WebP (fallback: PNG) | Smaller footprint; 60 fps on mid-range phones. |
| **3D Poly Budget** | <200K tris total; <50K per model | Mobile GPU memory; mid-phone capable of ~2–4M pixels per frame at 60 fps. Target 30–60 draw calls. |
| **Audio Sample Rate** | 48 kHz (WebAudio API default) | Browser standard; synthesis-only (no .wav/.mp3 decoding). |
| **Audio Format** | WebAudio synthesized + future MP3/Ogg for music loop | SFX = synthesis; music = optional CC0 loop (if not procedurally composed). |
| **Build Size** | <5 MB (gzip) | No audio/texture assets in bundle; code + UI fonts only. |
| **Target Device** | iPhone SE / mid-range Android | Portrait, 720×1280 viewport, touch-capable, 2–4 GB RAM. |

## Review & Approval Gates

### For Procedural Assets (Code Review)

**Texture Generation Code:** Approve for visual readability (tiles seamlessly? colors match palette? no artifacts at edges?), performance (<500 ms generation), and seed consistency.

- Reviewer: Lead Engineer
- Checklist: Readable at 100 px scale? Consistent palette? Seed locked? Performance measured?

**Audio Synthesis Code:** Approve for clarity (no clicks? SFX punchy? engine pitch smooth?), responsiveness (<50 ms onset for SFX, <100 ms for pitch glide), and mix hierarchy.

- Reviewer: Audio Lead (if available; otherwise Lead Engineer)
- Checklist: Tone table reviewed? Volume levels tested? No frequency overlap? Mix priority verified?

**3D Geometry:** Approve for silhouette readability (visible on small mobile screen?), poly budget compliance, and 60 fps target.

- Reviewer: Lead Engineer + Design Lead
- Checklist: Legible at 720p portrait? Poly count confirmed? No performance regression?

### For Imported CC0 Assets (if added)

**Blockout Review (before import):** Verify proportions, silhouette, and naming convention match game vision.

- Input: Reference sheet + proportions (side/front/top view sketches).
- Approval Criteria: Fits game art style (Crossy Road / Kenney aesthetic)? Proportions match existing in-game assets?

**Final Review (in-engine):** Verify material assignment, lighting, collision setup, performance.

- Input: Imported glTF in scene.
- Approval Criteria: Correct material IDs assigned? No missing UV seams? 60 fps verified on device? Consistent with procedural visual language?

**Asset Tracking Spreadsheet** (if hand-authored assets added later):
- Columns: Asset Name | Category | Source (Kenney / PolyHaven / Custom) | Poly Count | Texture Size | Version | Integrated | Approved | Notes
- Updated: Weekly or on each asset completion.

## Consistency Rules (Solo / AI-Assisted Team)

**Procedural Consistency:**
- All textures generated from single `Palette.ts` color system. No ad-hoc colors in code.
- All SFX use shared frequency tables in `AudioManager.ts`; no divergent synth specs per sound.
- All geometry uses same Three.js material library; shared shader setup.

**Imported Asset Consistency (future):**
- All hand-authored models use the same low-poly, readable Kenney/casual aesthetic.
- Color palette must map to game `Palette.ts`; no bespoke per-asset color adjustments.
- All models must achieve >60 fps when instantiated; performance-regressed models rejected.

**Code Review Gates:**
- Procedural changes must pass visual inspection (screenshot) and performance measurement (frame time).
- New SFX require listening test and mix-priority verification (does it mask critical feedback?).
- Geometry changes require device test (does it render at 60 fps?).

## Asset Accessibility & Distribution

**No External Downloads:** All textures/audio synthesized at boot. No dependency on CDN or external asset server.

**Deterministic Builds:** Same source code + build config = identical binary across builds (reproducible builds). Daily seed ensures procedural city regeneration is fair and verifiable.

**Offline Playable:** Game runs without network (except for future backend calls to mocks). Procedural assets guarantee single-run startup cost.

## Validation Checklist

- [x] Pipeline stages defined: Concept → Procedural Generation → Integration → QA.
- [x] All assets are either procedurally generated in code or future CC0 imports (no hand-authored art currently shipping).
- [x] Naming convention established for future imports: lowercase, underscores, version suffixes (v01, v02, etc.).
- [x] Folder structure for future imports defined: `src/assets/models/`, `src/assets/textures/`, `src/assets/audio/`.
- [x] Technical specs (texture 512×512, poly <200K total, audio 48 kHz, <5 MB build) sourced from mobile constraints.
- [x] Review gates exist: procedural code review (visual + perf), imported asset blockout/final approval.
- [x] Consistency rules documented: single Palette.ts, shared synth spec, shared material library.
- [x] Asset tracking template provided for future expansion (if hand-authored assets added).
- [N/A] No current outsourced work (solo team); rules prepared if outsourcing needed later.
- [x] Build is deterministic and reproducible; all assets generated from seed.

## Common Pitfalls & Mitigations

**Pitfall:** Procedural generation is non-deterministic (different seed, visually jarring city).
- **Mitigation:** Daily seed locked in Balance.ts; logged at session start for debugging. Same day = same city layout and textures.

**Pitfall:** Procedural textures drift from visual target (too abstract, hard to read).
- **Mitigation:** TextureFactory.ts has explicit "readability at small scale" test. Palette.ts lock-in ensures color consistency. Regular screenshot comparison against reference mockups.

**Pitfall:** SFX pile-up (too many simultaneous tones, harsh mix).
- **Mitigation:** Mix hierarchy enforced in AudioManager.ts. Tier 1 SFX (critical) use ducking; Tier 3 (ambient engine) never masks Tier 1. Listening tests on device speaker (not headphones) to catch harshness.

**Pitfall:** Performance regression (added complex procedural generation or high-poly imported model).
- **Mitigation:** Baseline 60 fps target on iPhone SE / mid-range Android is non-negotiable. All changes require device test. Frame time budget: 16.7 ms per frame; aim for 10–12 ms nominal to leave headroom for GC and input lag.

**Pitfall:** Asset versioning confusion (which texture is "final"?).
- **Mitigation:** Strict v01/v02/v03 numbering. Old versions moved to Archived/. One canonical "current" version per asset. In-code references always point to current; no dangling references to superseded versions.

## Final Notes

Delivery Rush's procedural-first approach means the asset pipeline is **code-driven, not file-driven**. The "production brief" for a new procedural asset is a code spec: "Add a new vehicle skin texture with these parameters—seed range, Palette refs, target resolution. Verify readability at 100×100 and gen time <50 ms." Team velocity is high because no asset export/import/versioning overhead.

If hand-authored assets become necessary (art direction pivot, outsourced character models), the pipeline is prepared: CC0 sourcing, blockout review, strict naming, performance gates, and tracking spreadsheet. The transition from procedural-only to hybrid (procedural + CC0) can happen without disrupting existing workflows.

**Current Build Status:** ~2 MB uncompressed (no asset files, code + vendor libs only). Procedural generation adds ~100 ms to boot; cached in-memory for session. Target 60 fps on mobile achieved in Three.js rebuild.
