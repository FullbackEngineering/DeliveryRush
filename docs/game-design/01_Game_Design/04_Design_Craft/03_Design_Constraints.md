# 03 — Design Constraints — Delivery Rush

## Constraints for Delivery Rush

### Technical

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| **Renderer** | Three.js WebGL | Phaser 2D per-frame redraw tanked mobile FPS (reason for rewrite); Three.js static city geometry compiled once, 60fps target on mid-tier phones |
| **Target Resolution** | 720×1280 (9:16 portrait) | Mobile-first web; `Scale.FIT` responsive; design canvas 720×1280 |
| **Frame Rate** | 60 fps minimum | Mobile casual players expect snappy feel; 30fps floor on oldest devices (iPhone SE, Pixel 3) |
| **Memory Budget** | ~100 MB (pre-compiled) | Target iOS/Android 2GB device baseline; terrain + traffic pool + audio buffers fit comfortably |
| **Draw Call Budget** | < 200/frame | Three.js static city + pooled traffic cars + UI layer; avoid per-entity draw calls |
| **Scripting** | TypeScript 5.9 + Vite 6 | Strong typing, rapid dev iteration; `noUnusedLocals/Params` OFF (rapid dev), `strict` ON |
| **Audio** | WebAudio synthesized (no asset files) | No audio assets (licensing/size); all sounds generated procedurally via `AudioManager.ts` |
| **Textures** | Procedurally generated at boot | No texture files; all generated at boot via `TextureFactory.ts` (faster boot, smaller download) |
| **Save Format** | localStorage, versioned + migrated | Mobile web standard; versioning in `SaveManager.ts` handles schema updates across releases |

### Platform-Specific

| Platform | Constraint | Impact on Design |
|----------|-----------|------------------|
| **iOS Safari** | WebGL 2.0 only (no WGPU) | Three.js WebGL setup; no cutting-edge GPU features |
| **Android Chrome** | Varies (Adreno, Mali, PowerVR GPUs) | Conservative draw call budget; test on low-end (Mali-400, 4 years old) |
| **Portrait only** | 9:16 aspect (never landscape) | UI safe zones: 16px margin top/bottom, 8px sides; all text/buttons within safe area |
| **Touch-only (primary)** | 3 big buttons (L / Gas / R) | Buttons 160×160px min; entire screen usable with one thumb; no hover states |
| **Keyboard (secondary)** | ↑/W/Space (gas), ←/→/A/D (steer) | Must work; not optimized for competitive play (touch is primary) |

### Team

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| **Team Size** | 1 (solo) + AI-assisted | Budget constraints; speed-to-playable prioritized; outsourcing art/audio to procedural generation |
| **Development Model** | Solo with Claude Code AI | Rapid iteration; no meetings; synchronous design + code; decision = implementation |
| **Key Expertise** | Game design, TS/web dev, WebAudio | No 3D artist (procedural), no networking expert (mock services only), no mobile/console porting |
| **Experience Level** | Solo/expert in game design + web; learning Three.js | Learning curve on Three.js is expected; prioritize gameplay > graphics polish |
| **Timeline Constraint** | Playable core loop by ~8 weeks | Gate: "60-second run with 3+ deliveries, visible traffic, combo working" |

### Scope & Time

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| **Ship Date** | No hard deadline; iterate to "playable core loop" first | Mobile casual games benefit from polish; "launch early" risks abandonment if not fun yet |
| **Session Length** | 45–90 seconds per run | Casual mobile play; longer than a Flappy Bird tap, shorter than a 10-minute commute |
| **Number of Deliveries** | 3–5 per average run (unlimited technical max) | Pacing: at least 3 gives sense of progression; 5–8 is expert ceiling |
| **City Grid Size** | 16×16 blocks procedurally generated (daily seed) | Ensures map is unique per day but replayable within a day; reduces memory overhead |
| **Traffic Entities** | ~15–20 active AI cars (pool size 20) | Memory/CPU balanced; enough congestion to feel "alive," not so much that it's chaos |
| **Multiplayer** | Single-player only (no online) | Simplifies technical scope; mock services (ads, cosmetics) are future work; no server cost |
| **Meta Screens** | Game loop (boot→game→results→garage→retry) only; no campaign/narrative | Focus: core loop is fun; meta screens are skeleton now (upgrade garage, cosmetics, leaderboard UI stubs) |

### Quality Targets

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| **Supported Languages** | English only (launch) | Single-language scope; UI text is minimal (mostly numbers, emoji glyphs, button labels) |
| **Colorblind Modes** | Deuteranopia + Protanopia support (UI + traffic) | 8% of population; traffic cars use shape + color; buttons use glyph + color (not color alone) |
| **Text Scaling** | 12px min (small UI hints) to 48px max (combo counter) | Support 150% system text scale on iOS/Android without breaking layout |
| **Accessibility** | Screen reader hints on UI; high-contrast mode | Difficult (game-heavy); do: label buttons, make combo/timer readable; defer: full narration |
| **Performance Floor** | 30 fps minimum on 4-year-old devices | Playable (not "smooth," but not nauseating); if 60fps drops below 30, scale resolution or reduce draw calls |

### Known Risks

- **Three.js learning curve** might delay core loop. Mitigation: Use established patterns (Babylon.js parallels exist); break rendering into small modules; prioritize static city compilation over fancy effects.
  
- **Procedural city generation** might produce unplayable layouts (dead ends, impossible intersections). Mitigation: Validate grid at boot; reject and regenerate if constraints violated; ensure 16×16 is always solvable.

- **Audio synthesis complexity** might break on low-end devices (WebAudio isn't universally optimized). Mitigation: Profile WebAudio on Android; fall back to simple sine-wave SFX if needed; cache synthesized buffers.

- **Mobile battery drain** if 60fps sustained. Mitigation: Use `requestAnimationFrame` (respects device refresh rate); pause rendering on blur; cap DPR at ~2 on high-res phones.

- **Monetization mocks** (rewarded ads, cosmetics) might feel artificial. Mitigation: Implement reward loops (coins → vehicle unlock) *without* real ad/payment integration; future swappable with real backend.

---

**Constraint Review Cadence**: Monthly (each milestone: boot green → core loop playable → alpha feature complete)

**Escalation Path**: If a constraint breaks:
1. Designer + dev sync (1h)
2. Prioritize constraints by impact (Frame rate > Memory > Draw calls)
3. Cut scope or extend timeline
4. Document decision + rationale in DEVELOPMENT_STATUS.md

---

## Validation Checklist

- [x] All constraints documented in one place (this file)
- [x] Constraints prioritized: Frame rate > Draw calls > Memory > Scope expansion
- [x] Consequence of violation is clear (e.g., violate frame rate → device excluded from playable universe)
- [x] Team (solo + AI) understands constraints and uses them in decision-making (Design Principles doc references these)
- [x] Constraints have been stress-tested via prototype (Phaser 2D revealed FPS issue; rewrite decision born from this)
- [x] Trade-offs identified (performance vs. visual fidelity: Three.js static geometry is the solution; fancy shaders = future work)
- [x] Plan exists if constraint breaks (escalation path documented; mock systems ready for real backend swap)
- [x] Constraints reviewed monthly at milestones; DEVELOPMENT_STATUS.md tracks status
- [x] Feature scope explicitly approved against constraints (e.g., "Add real-time 8-player online" would violate Team/Time/Scope → rejected)
- [x] No "soft" constraints (all have teeth; violate them = ship delay or scope cut)
