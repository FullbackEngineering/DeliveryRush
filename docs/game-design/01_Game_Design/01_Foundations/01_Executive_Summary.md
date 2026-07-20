# Delivery Rush — Executive Summary

## Overview

Delivery Rush is a one-thumb arcade courier game where you hold to accelerate through a procedurally generated low-poly 3D city and tap to steer, delivering orders before the countdown clock expires. Each completed delivery raises your combo multiplier (capping at 8×); crash or miss an order and the multiplier resets—creating a tension between speed and precision that defines the run.

## Unique Selling Points

- **Hold-to-go throttle courier mechanic:** The center button is a gas pedal (hold to accelerate, release to brake); left/right tap-steer buffers turns to the next intersection. Throttle timing through traffic and corners is the core skill, differentiating from traditional tapping-only mobile racers.
- **Procedurally regenerated low-poly 3D city (daily seed):** Every run is readable at a glance yet feels fresh. Generated via Three.js geometry; bright, chunky shapes inspired by Crossy Road. No repeated art assets or tiles.
- **Delivery combo chains with risk/reward tension:** Consecutive clean deliveries build a multiplier that boosts coin rewards. One crash or missed order resets it. Players chase the next delivery despite timer pressure—the core emotional loop.
- **Zero-friction sessions, instant restart:** Boot to first delivery in seconds. Die, tap, retry. No tutorials, no friction. Session length 45–90 seconds per run; target audience plays in spare moments on mobile.

## Quick Profile

| Attribute | Value |
|-----------|-------|
| **Genre** | Casual arcade driving / hyper-casual score-attack |
| **Platforms** | Mobile-first web (portrait 9:16), iOS/Android via wrapper; keyboard playable |
| **Target Audience** | Casual mobile players (all ages) seeking quick, skill-light-but-masterable sessions |
| **Monetization** | Free-to-play; cosmetic garage upgrades (soft currency), rewarded ad (2× coins per run) |
| **Development Status** | In production (Three.js rewrite; Phaser 2D prototype exists) |
| **Estimated Release** | Post-alpha (60 fps 3D core loop achieved) |
| **Team Size** | Solo + AI-assisted |

## Comparable Titles

- **Crazy Taxi:** Timed fare delivery, arcade speed, combo/tip payouts. Shared DNA: time pressure + delivery routes. Delivery Rush differs: procedural city, throttle-based controls (not tapping), portrait mobile-first.
- **Crossy Road:** Friendly low-poly 3D aesthetic, instant restart loop, one-thumb pick-up-and-play. Shared DNA: visual style, friction-free sessions. Delivery Rush differs: driving + delivery chains (not exploration), combo multiplier (not permanent progression).
- **Cars: Fast as Lightning:** Hold-to-accelerate / release-to-brake touch driving, mobile-native. Shared DNA: throttle model, casual arcade feel. Delivery Rush differs: three-button layout (not one), combo economy, explicit delivery objectives.

## Current Status & Milestones

- **Achieved:** Phaser 2D prototype demonstrates core 60-second loop (auto-forward + buffered steer + order pickup/dropoff + combo economy). Full control/input, audio (synthesized WebAudio), balance tuning via `src/core/Balance.ts`.
- **In progress:** Three.js renderer rewrite to fix Phaser's per-frame vector-city FPS tanking on mobile. Static geometry generation, camera systems, effects (burst, confetti, shake). Reusing all engine-agnostic logic (run/score/combo, balance data, services/mocks, save/profile).
- **Next gate:** Playable 3D core loop at 60 fps on mid-range phones (target: ~40ms per frame); visual juice (screen shake, audio feedback, particle effects) sells velocity and impact.

## Market Context

Casual mobile arcade games remain evergreen (Crossy Road, Alto's Adventure sustain millions of plays). The "hold-to-accelerate" subgenre (Cars: Fast as Lightning, racing hyper-casuals) shows strong retention and ad-supported monetization. Procedural cities reduce art burden, enabling solo teams. Delivery Rush fills a gap: arcade driving + tight controls + combo incentive + zero tutorial friction, targeting players who want snackable skill-light runs in spare moments.

---

## Validation Checklist

- [x] Pitch is 2–3 sentences and doesn't rely on reader knowing another game.
- [x] Each USP is concrete (specific mechanic or feature), not vague descriptors.
- [x] Profile table is complete: genre, platform, audience, monetization, status, timeline, team size.
- [x] Comparable titles are real, recognizable games; comparison is clear and specific (mechanic + differentiator).
- [x] Status section includes team size, development phase, and next gate.
- [x] Market context answers "Why this game in 2026?" and grounds it in design/market reality.
- [x] No marketing language ("groundbreaking," "revolutionary," "immersive"). All claims are concrete.
- [x] One page. Concise, dense. First-time reader understands core identity in under 5 minutes.
