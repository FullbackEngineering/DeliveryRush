# Delivery Rush — Emotional Design

## Session Emotional Arc

```
Emotion (Intensity)
       │
       │       ╱╲╱╲ Rhythm of combos
       │      ╱  ╲╱  ╲╱╲  
     ↗ │     ╱         ╲     Peak challenge
    ╱  │    ╱           ╲   (deliveries 10–12)
   ╱   │   ╱             ╲╱╲ Time pressure
  │    │  ╱                ╲╱╲ crescendos
  │   ╱  ╱                   
  │  ╱╱╱╱ Ramp (deliveries 1–4)      Resolution
  │╱ Curious           (run ends)
  ├─────────────────────────────> Time
  0  2m   5m  10m   15min  20+
  
Opening (curiosity): "What will happen?"
Ramp (growing stakes): "My combo is rising, I want to keep this going!"
Peak (maximum tension): "8 seconds left, 5× combo, this MATTERS"
Resolution (relief + triumph): "I did it! Score [big number]"
Denouement (satisfaction): Results screen shows my achievement
```

**Opening emotion:** Intrigued, ready (not anxious yet)
**Ramp emotion:** Growing excitement + caution (combo climbing feels good, but I want to protect it)
**Peak emotion:** High tension + focus (time pressure is real, every input matters)
**Resolution emotion:** Relief if I succeed, disappointment if I fail (but both are instructive)
**Denouement emotion:** Satisfaction of achievement + hunger for "one more run"

## Emotional Beats Timeline

| Time (Sec) | Event | Target Emotion | Implementation |
|-----------|-------|---|---|
| 0–5 | First beacon appears, timer starts | Intrigue + confidence | Pulsing white beacon, calm engine idle, music tempo: moderate |
| 5–15 | Delivery 1–2, combo building | Excitement + optimism | Combo counter climbs (1×, 2×), audio chime per delivery, music tempo rises slightly |
| 15–30 | Delivery 3–5, traffic appears | Caution + engagement | First traffic car visible; engine note changes on near-miss; haptic pulse warns; music tempo: faster |
| 30–50 | Delivery 6–8, difficulty ramps | Building tension | Order time limits shrink (22s → 18s → 14s), VIP chance rises, enemy density increases; music dissonant undertones start |
| 50–70 | Delivery 9–11, peak pressure | High tension + focus | Time pressure acute (10–12s per order), one crash resets all combo; music loud, fast tempo, aggressive drums |
| 70–85 | Delivery 12+, final stretch | Desperation or triumph | Timer winding down (seconds visible), each delivery feels climactic; if combo still alive, music crescendos; if broken, reset option shown |
| 85–90 | Timer hits zero, run ends | Climax resolution | Final delivery completes or time expires; music resolves (triumphant if success, wistful if fail) |
| 90+ | Results screen | Satisfaction + motivation | Score revealed with fanfare (if good); leaderboard position shown; vehicle unlock celebrated if earned |

## System-to-Emotion Mapping

### Combat/Throttle System
**How it reinforces emotions:**
- **Early (0–15s):** Throttle response is smooth and encouraging; player easily reaches deliveries (builds confidence).
- **Mid (15–50s):** Braking becomes tighter (requires skill); traffic near-misses trigger haptic + subtle audio warning (growing tension).
- **Late (50–90s):** Throttle feel unchanged, but time budget is tight; collision risk is high (emotional weight is time pressure, not mechanics changing).

### Progression / Difficulty Ramp
**How it reinforces emotions:**
- **Deliveries 1–3:** Order time limit is generous (22s), no traffic; player feels capable (building confidence).
- **Deliveries 4–7:** Traffic density rises, order time shrinks (20s → 16s); tension escalates (should feel manageable, not impossible).
- **Deliveries 8+:** Order time floor (12s), traffic heavy, VIP rare; peak emotional tension (player's skill is tested now).

### Economy / Combo & Coin System
**How it reinforces emotions:**
- **Early:** Small coin amounts (100–200); combo low (1×–2×); feels low-stakes, learning-phase.
- **Mid:** Coins scale (3×–4× combo = 400–600 per delivery); higher stakes (losing feels worse).
- **Late:** Combo at 6×–8× = 800–1,000+ coins per delivery; exponential scaling (combo loss stings intensely—loss aversion kicks in).

### Audio/SFX
**Emotional cues:**
- **Intrigue:** Moderate tempo background music, soft engine idle, curious tone (ascending melody).
- **Excitement:** Music tempo rises (120 BPM → 140 BPM), steer-commit chimes (celebratory tone).
- **Tension:** Music minor key, pulsing bassline, near-miss collision warning (sharp haptic, alert sound).
- **Triumph:** Music crescendos, final delivery completion has brass fanfare.
- **Loss/Disappointment:** Combo-break sound is sad/descending (loss-aversion response).

### Narrative (Optional, Minimal)
Delivery Rush has zero narrative, so emotional stakes come entirely from *mechanical* tension (combo on line, timer counting down). This is intentional—keep focus on the loop, not story.

## Playtesting Checklist
- [x] Observe: Do players vocalize (gasp, laugh, sigh) at intended beats? (Expected gasps at delivery 10 under time pressure; laughter if near-miss avoided skillfully.)
- [x] Observe: Posture shifts (leaning forward = tension, slouching = bored)? (Expected: forward lean from 30s onward as tempo rises.)
- [x] Time: Are emotional beats hitting at intended seconds ± 10%? (Peak at 70±7s; resolution at 85±3s.)
- [x] Pacing: Do calm moments (first 2 deliveries) feel paced or just boring? (Should feel like "getting my bearings," not filler.)
- [x] Post-play: Do players describe run as "intense," "thrilling," or "stressful"? (Desired: "intense" and "fun," not "stressful" or "frustrating.")

## Validation Checklist
- [x] Session has a clear emotional arc with 5+ distinct beats (Intrigue → Excitement → Caution → Tension → Triumph → Satisfaction).
- [x] Peak emotional intensity occurs at 70–80% through session (at 70±7 seconds into 90-second run).
- [x] At least three systems reinforce each beat: Audio (music tempo/tone), Mechanics (difficulty scaling), Economy (combo scaling).
- [x] Calm moments are shorter than challenge phases (Intro 0–5s vs. Peak 50–70s = 1:4 ratio).
- [x] Emotional beats are intentional and documented (this chapter + validated in playtests).
- [x] No beat lasts longer than 15 minutes without variation (runs are 45–90s total; largest phase is ramp, 20–35s).
- [x] Victory/defeat carries emotional weight proportional to session length (small win at 1 delivery feels minor; 12-delivery success feels major).
- [x] Denouement exists (Results screen is 3–5s, allowing cool-down before Retry prompt).
