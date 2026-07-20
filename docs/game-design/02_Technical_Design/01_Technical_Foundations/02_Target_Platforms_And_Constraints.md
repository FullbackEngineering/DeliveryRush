# 02 — Target Platforms & Constraints: Delivery Rush

## Supported Platforms

| Platform | Priority | Min Spec | Frame-Rate Target | Install Size | Memory Budget |
|----------|----------|----------|-------------------|---------------|----------------|
| Mid Mobile (Android/iOS) | PRIMARY | ARM64, Snapdragon 765+/A13+, 6 GB RAM, 2020+ | 60 FPS | <50 MB (initial); <100 MB post-install | 1.2–1.5 GB gameplay |
| Premium Mobile | Secondary | ARM64, latest flagship (Snapdragon 8 Gen 2, A17), 8+ GB RAM | 60 FPS, optional 90 FPS | <50 MB | 1.5–2 GB gameplay |
| Desktop (Windows/Mac/Linux) | Secondary | Intel Core i5-7600 / Ryzen 5 1600, 8 GB RAM, GTX 1060 / RX 580 | 60 FPS | <200 MB | 2–3 GB gameplay |
| Web Browser (iOS Safari, Android Chrome, Desktop) | PRIMARY | Modern browser (Chrome 90+, Safari 14+, Firefox 88+), WebGL 2.0 | 60 FPS | <30 MB download, streamed assets | 1.0–1.2 GB via Memory API |

**Note:** Delivery Rush is mobile-first web; no native iOS or Android app. All delivery via web (playable at domain or PWA).

## Technical Budgets (per-frame, per-session, per-download)

| System | Budget | Reasoning |
|--------|--------|-----------|
| CPU Frame Time | 16.6 ms (60 FPS) worst-case 99th percentile | Arcade responsiveness; steady FPS no stutters |
| RAM Gameplay | 1.2 GB (mid mobile); 2 GB (desktop) | City mesh + textures + audio buffers + state; headroom for frame buffering |
| GPU VRAM | 256–512 MB | Merged city geometry + animated vehicle sprites + UI atlases; no massive textures (low-poly style) |
| Physics Tick | Fixed 60 Hz, deterministic | Buffered steer logic + collision checks must be reproducible across saves/replays |
| Network Bandwidth | Mock services only (no real multiplayer); telemetry <5 Kbps | Services mocked for now; save/profile uploads <100 KB per session |
| Battery Drain (Mobile) | <5% per hour at 60 FPS | Typical mobile play session 2–10 minutes; target <1% drain per session |
| Load Time (Cold Start) | <3 seconds to playable (Vite dev); <2 seconds (bundled) | Instant restart is core loop; >3s bounces players |
| Asset Memory Streaming | City mesh cached after first generation (daily seed) | Subsequent runs on same day reuse cached mesh; different seed triggers regeneration |

## Input & Display Constraints

**Mobile (portrait, primary):**
- Touch input: Single-tap left/center/right buttons (buffered steer); hold center (throttle acceleration/brake).
- Safe area: Account for top notch/dynamic island (nav buttons below status bar), bottom safe zone (gesture triggers). Min insets 16 px top, 24 px bottom.
- Aspect ratio: 9:16 portrait locked. Support 16:9 phones (wider safe areas), 20:9+ (notch), 4:3 tablets (downscale gracefully).
- Haptics: Optional haptic feedback on turn/collision (via Vibration API; graceful fallback).

**Keyboard (Desktop + Web):**
- **Gas:** ↑, W, or Space (hold to accelerate, release to brake).
- **Steer:** ← / → or A / D (tap to buffer turn direction).
- **Pause/Menu:** Esc or P.
- Remappable in settings (future phase).

**Display scaling:**
- Design canvas: 720 × 1280 px (portrait, 16:9 mobile standard).
- Responsive: Adjust UI scale + camera FOV for different aspect ratios; safe zones enforced via `inset()`.
- Device pixel ratio: Capped at ~1.5 on mobile (2.0+ DPR tanks performance; defer to native upscaling).

## Store & Certification Constraints

**Web (primary delivery):**
- HTTPS enforced (mixed content blocked).
- Privacy policy required (data retention: saves stored locally in IndexedDB; cleared on browser wipe unless cloud save enabled).
- No external payment gateways (in-app purchase via mock service for soft currency; future real IAP must use Stripe/PayPal, App Store billing).
- Accessibility: WCAG 2.1 Level AA target (captions in future; color contrast on buttons; focus management).

**Mobile (future native app, if any):**
- Age rating: PEGI 3 (E for Everyone); no violence, ads, or in-game chat.
- Save backup: Auto-sync via cloud (Google Play Games / GameCenter) or local export.
- Controller support: Optional gamepad detection and mapping (ABXY buttons auto-mapped to steer/gas).

## Minimum Spec Defense

**Why Snapdragon 765+ (2020) as mobile floor?**
- Typical mid-range Android device in 2024–2026; represents 40%+ of active Android player base.
- ~2x GPU performance over 2018 budget phones; 60 FPS achievable without extreme asset cuts.
- Development priority: optimize for this floor; premium devices get stable 60 FPS; low-end (Snapdragon 680, 4-year-old iPhones) may drop to 30 FPS or require quality mode toggle.

**Why no console (Switch/PS5)?**
- Web-first positioning; no native SDK overhead.
- Console port is future phase only if web traction justifies it.

## Constraint Budgets Breakdown

- **60 FPS budget (16.6 ms per frame):** ~8 ms rendering (3D geometry, effects), ~6 ms logic (physics, AI, collision), ~2 ms input/events/audio scheduling, ~0.6 ms margin.
- **City memory (100 MB):** ~60 MB merged geometry (15×15 grid, ~10k tris per block, ~4–5 MB shared textures), ~20 MB audio (loops, SFX), ~20 MB UI/font atlases, headroom for GC.
- **Mobile battery:** Arcade games are short sessions (45–90 s). 5 runs per hour at 5% drain = 25% battery/hour, acceptable for casual play; extended sessions (>30 min) may trigger battery saver mode.

## Validation Checklist

- [x] Platform matrix lists all targets; each has documented CPU/GPU/RAM floor (Snapdragon 765+, A13, GTX 1060, WebGL 2.0).
- [x] Frame-rate target is uniform (60 FPS all platforms); no 30 FPS mode claimed (if budget forces it, it's a pivot, not a feature).
- [x] Memory budget accounts for OS overhead + rendering buffers (1.2–1.5 GB gameplay on mobile = 2–2.5 GB total device RAM after OS/services).
- [x] Download size <50 MB is realistic for ~2 MB bundle + 30 MB audio/fonts; post-install streaming for tileset/detail textures.
- [x] Input methods mapped and testable (touch buttons on mobile, keyboard on desktop, optional gamepad).
- [x] Store policies read: privacy policy drafted; no external payment links; WCAG 2.1 AA targeted.
- [x] Minimum spec is defensible: Snapdragon 765+ is 2020-era, widely available, performance-validated in industry benchmarks.

## Common Pitfalls — Addressed

- **"Supports mobile, web, and desktop"** → Clarified: primary = web (all OSes); mobile-first portrait 9:16; no native app v1.
- **Targeting 60 FPS everywhere** → Confirmed: 60 FPS across all platforms is a pillar; if budget forces 30 FPS, it's a replan, not a mode.
- **Ignoring store policies** → Privacy policy, WCAG 2.1 AA accessibility, and telemetry consent sketched.
- **Memory budget ignoring streaming** → City mesh cached per daily seed; subsequent runs reuse; budget is stable after first load.
- **Touch buttons too small** → 3 buttons (left/center/right) are ~200 × 150 px each on 720 px wide screen; >1.5 cm tap targets meet mobile safety standards.

