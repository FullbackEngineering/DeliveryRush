# 01 — Audio Direction

## Sonic Identity Statement

Delivery Rush sounds like a bright, snappy arcade courier simulator: punchy synth tones, quick SFX stabs, and a light adaptive music loop—everything designed to reinforce speed, impact, and constant upward momentum as you chain deliveries.

## Audio Pillars

1. **Instrumentation & Texture:** Synthesized, bright synth-lead tones and sharp percussive hits. No orchestral strings or ambient pads; all generated procedurally via WebAudio API to keep the build lightweight. Engine tone is smooth and pitch-responsive (reflects current speed). UI tones are quick, crisp sine-wave blips.

2. **Emotional Tone:** Upbeat, playful, arcade-energetic. Every sound celebrates the player—confirmation on input, celebration on delivery, escalating urgency as the timer counts down. No heavy, dark, or melancholic moments; always forward momentum.

3. **Technical Signature:** All synthesized; no asset files. Procedural generation at runtime means zero disk overhead and total flexibility to adapt tone based on game state. Engine tone glides smoothly between pitches; all other SFX use fast attack/decay envelopes (10–50 ms onset, sub-second tail) so they cut through and feel snappy.

4. **Cultural / Period Reference:** Modern, timeless arcade (echoes of Crazy Taxi, Crossy Road, and 80s arcade driving games). No voice acting. Emojis handle order descriptions, so audio is pure SFX + music.

5. **Energy Level:** High-impact, punchy mix. Despite being a mobile casual game, audio is constantly active—engine hum during drive, quick stab on every user action, celebratory jingles on delivery and combo. Dynamic range is conservative (6–8 dB between loudest and quietest) so that even on muted phone speakers or in a noisy café, critical feedback always breaks through.

## Per-Category Style Notes

**Music:** Light, 8–16 bar adaptive loop (draft: upbeat electric piano + simple kick drum, ~140 BPM). Composed in stems so difficulty-dependent layers can solo/mute: at run start, minimal (kick + hi-hat only); as difficulty ramps (every ~12 deliveries, per Balance.ts), add bass, then melody, then synth counterpoint. Target 40–60 seconds per stem loop so it feels fresh, not repetitive. No lyrics. Leitmotif: a short rising arpeggio motif plays on combo-chain (1.5 s stinger).

**Sound Effects:** All synth-based sine or triangle waves with fast envelopes. Reference SFX palette:
- **ui_click**: 800 Hz sine, 60 ms, vol 0.25 (confirm button press).
- **ui_back**: 400 Hz sine, 80 ms, vol 0.2 (menu back/cancel).
- **pickup**: 1200 Hz sine ramp to 1600 Hz, 150 ms, vol 0.35 (beacon reached, order accepted).
- **deliver**: 2000 Hz > 1200 Hz glide, 200 ms, vol 0.4 (delivery complete, coin payout).
- **coin**: 1600 Hz sine burst (x3, 50 ms each), vol 0.25 (layered coin count-up).
- **combo**: rising arpeggio (1200 → 1600 → 2000 Hz), 300 ms total, vol 0.35 (combo +1).
- **crash**: 400 Hz sine drop to 150 Hz, 400 ms, vol 0.5 (collision; resets combo).
- **near_miss**: 1000 Hz brief spike (100 ms), vol 0.3 (traffic near, tension alert).
- **countdown**: 800 Hz pulse (×3, 100 ms), vol 0.4 (final 3 seconds of run clock).
- **go**: 1800 Hz sine burst + 2400 Hz harmonic, 200 ms, vol 0.5 (run start, green light equivalent).
- **fail**: 300 Hz sine drop to 100 Hz, 500 ms, vol 0.45 (time's up, run end).
- **nitro**: (future enhancement) rising pitch-sweep 1200–2400 Hz, 250 ms, vol 0.35 (power-up activation).
- **levelup**: multi-tone ascending (800/1200/1600 Hz, staggered 100 ms), vol 0.4 (difficulty tier reached).

All SFX use exponential volume ramps (fast onset, soft tail) to avoid harsh clicks and maximize clarity.

**Ambience:** Continuous engine tone (smooth sine-wave oscillator, 120–300 Hz depending on current throttle and speed). Pitch glides smoothly to reflect acceleration/braking in real time, creating a tight feedback loop between player input and audio. No discrete engine gear shifts (stays fluid). When idling (gas released), engine tone settles to a low steady pitch (120 Hz); at cruise (full throttle, 240 px/s), reaches ~220 Hz. This dynamic pitch is the player's primary speed feedback and core to "feeling" the throttle. Engine tone is always audible during drive and provides a steady rhythm foundation for music/SFX to layer over.

**UI Sound:** Minimal, tight palette. Every button press (left steer, gas, right steer, pause) gets a distinct but brief tone: click = 60 ms, back = 80 ms, no reverb or long tail. UI sounds use Tier 1 priority so they're never masked by music. Menu navigation uses piano-like sine tones (drop in frequency on "back" to signal retreat).

**Voice/VO:** None. Order glyphs are emoji, and the narrative is purely visual (delivery icons, timer, score). All communication is audio-visual: beacons pulse, on-screen text, and SFX together convey state.

## Adaptive Audio Rules

- **Engine Tone Pitch Scaling:** Engine frequency = 120 + (current_speed / max_speed) × 100. Smooth glide (0.1 s ramp) on throttle change so no jarring pitch jumps.
- **Difficulty Ramp (per ~12 deliveries):** Trigger difficulty progression event; music stems add: order time limit shrinks (22 → 12 s), music bass/melody layers solo in, combo-stinger arpeggio becomes more frequent and higher-pitched.
- **Combo Chain:** Each time combo increments, quick "combo" arpeggio cue plays (300 ms, non-blocking). Combo multiplier shown visually; audio reinforces it with layered pitch.
- **Run Timer Critical (last 10 seconds):** "Countdown" pulse (800 Hz × 3 beats) triggers. Music tempo may increase +10 BPM. Ambience intensity rises (optional future: add high-frequency hum).
- **Crash / Collision:** "crash" cue (400→150 Hz drop, 400 ms). Combo resets to 1 (visual). Music briefly ducks -6 dB for 200 ms to isolate impact, then crossfades back.
- **Near-Miss (traffic proximity):** "near_miss" (1000 Hz spike, 100 ms) triggers if player vehicle approaches traffic car within threshold. Tension cue, no game state change.
- **Run End (time = 0):** "fail" tone (300→100 Hz, 500 ms). Music stops abruptly or crossfades to results-screen stinger (silent or celebratory, TBD). Score displayed; no SFX on results screen during initial results view.

## Mix Priority List

| Tier | Category | Level (dB) | Ducking Rule |
|------|----------|-----------|--------------|
| 1 | Critical Feedback (crash, countdown, fail, UI click) | 0 | Engine and music reduce −6 dB for 200 ms |
| 2 | Engine Tone + Music (adaptive loop) | −3 | Ambience reduces −4 dB; engine steady unless ducked |
| 3 | SFX (pickup, deliver, coin, combo) | −6 | Standard playback; no ducking; layered under engine |
| 4 | [Reserved] | N/A | Ambience layer (future use if ambient city sounds added) |

**Master gain:** 0.5 (120 dB FS). Headroom: ~8 dB reserved for peaks.

**Independent Volume Sliders:**
- Music (0–100%)
- SFX (0–100%)
- Engine Tone (0–100%)
- UI Sounds (0–100%)

Each slider is stored in `Profile.settings` and applied at runtime in `AudioManager.ts`.

## Validation Checklist

- [x] Sonic identity statement is one sentence and guides all decisions.
- [x] Audio pillars (5) derived from art direction, arcade tone, and procedural tech.
- [x] All five audio categories documented: Music (adaptive loop), SFX (11 cues), Ambience (engine pitch), UI Sound (click/back), Voice (none—emoji-driven).
- [x] Adaptive audio rules map game states to sonic responses: throttle pitch, difficulty ramp, combo, timer, crash, near-miss, run end.
- [x] Mix hierarchy and ducking levels documented; critical feedback always Tier 1 (0 dB, never masked).
- [x] Four independent volume sliders implemented in `Profile.settings` (Music, SFX, Engine, UI).
- [x] Audio confirms every player input: button presses trigger ui_click/ui_back; throttle change = engine pitch glide; steering = no SFX (visual only).
- [x] Threat and danger have escalating audio: near_miss (spike alert), countdown (pulse urgency), crash (impact drop), fail (end tone).
- [x] VO not applicable (emoji-driven narrative); no recording QA needed.
- [x] New listener hears arcade courier game: bright synths, fast pacing, upbeat tone, no ambiguity on genre or mood.

## Notes

- All audio is synthesized on-demand via the WebAudio API (`AudioManager.ts`). No .mp3/.wav assets; zero storage overhead.
- Engine tone is the core engagement loop—smooth pitch tracking creates tight player feedback. Currently (Phaser prototype) synthesized and working; will refine in Three.js rebuild to ensure no harshness at extreme pitches.
- Music loop is a future pass: currently a placeholder; design is ready for stem-based adaptive composition.
- Difficulty ramps are tied to `Balance.ts` constants (order time limit, traffic density, VIP chance). Audio triggers follow gameplay state via `EventBus` events.
- All SFX are sub-300 ms to avoid muddiness and keep the mix bright and snappy.
