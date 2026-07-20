# 14 — Session Length: Delivery Rush

## Overview
Delivery Rush is designed for **45–90 second runs** with **instant restart**, making it ideal for commute play, break-time gaming, or casual sessions. However, the game's structure supports flexible session boundaries—players can stop after any run feeling accomplished, or chain multiple runs for extended play (10–30 minutes per session typical).

---

## Target Session Length Justification

**Archetype:** Casual/arcade mobile (roguelike-adjacent).

**Target:** 45–90 seconds per run; multiple runs per session (typically 3–10 runs = 3–15 minutes; extended sessions up to 30 minutes).

**Why this length:**
- **Respects mobile context.** 45–90 seconds fits a commute, a lunch break, or a waiting moment.
- **Instant retry loop.** A failed run ends in 60 seconds; player immediately restarts. Frustration is low.
- **Natural completion.** Run ends when countdown hits zero—clear boundary. No "one more level" friction.
- **Escalation in single session.** 45–90 seconds is long enough to experience difficulty progression (12 deliveries, order time shrinking, traffic increasing). Short enough to feel fresh on replay.

---

## Session Structure: Anatomy of a Single Run

### Ramp-up Phase (0–3 seconds)
Player boots game. Main menu → "Start Run" → game loads first delivery beacon.

**Pacing:** Quick, inviting. Minimal downtime. Game-ready state is instant.

**Content:** No tutorial on subsequent runs; Starter vehicle loads immediately.

**Feedback:** Upbeat menu music, first beacon appears with gentle pulsing animation.

---

### Engagement Phase (3–75 seconds, ~72 seconds)
Core gameplay: player drives through 6–12 deliveries (depending on how quickly they chain them).

**Sub-phases:**

**Early (3–25s, Deliveries 1–3):** Easy tempo. Player settles into controls, builds confidence. Order time: 22s/delivery. Light traffic (0–3 cars).

**Mid (25–50s, Deliveries 4–7):** Escalating challenge. Traffic increases. Order time shrinks to 15–19s. Player is focused on execution.

**Late (50–75s, Deliveries 8–12):** Peak intensity. Order time is 12–15s. Traffic is dense (6–8 cars). Player is chasing combo or managing risk.

**Pacing:** Accelerates gradually. Engagement is continuous; dopamine ticks every 30–45s (per delivery).

---

### Climax Phase (75–85 seconds, ~10 seconds)
Countdown clock is visibly winding down. Final deliveries.

**Tension:** Time pressure is real. Player is either chasing high combo (risk) or accepting a safe score (caution).

**Pacing:** Fast, urgent. Music tempo may increase (optional audio design).

**Outcome:** Either a clean delivery (satisfying chime, combo confirmed), or a miss (clock hits zero mid-delivery, order fails).

---

### Wind-down Phase (85–90 seconds, ~5 seconds)
Countdown hits 0:00. Results screen appears.

**Pacing:** Slow, satisfying. Deceleration from climax.

**Feedback:** Jingle plays (pitch tied to score). Score breakdown displays. Personal best is updated if beaten. Combo counter shows "Best combo: ×5" (e.g.).

**Agency:** Player sees clear options: "Restart," "Garage," or "Results."

**Sentiment:** Player feels accomplished ("I earned that score") or motivated ("next time I'll hit ×8").

---

**Total engagement = 70–80% of run time. Ramp and wind-down buffer intensity.**

---

## Pacing Within a Session

### Pacing Table

| Target Session | Reward Frequency | Challenge Frequency | Story Moments | Natural Break Points |
|---|---|---|---|---|
| 45–90s (1 run) | Every 30–45s | Every 30–45s | Implicit (score-building) | End of run |
| 10–15 min (3–5 runs) | Every 30–45s | Every 30–45s | Personal-best milestones | After every run |
| 30+ min (10+ runs) | Every 30–45s | Every 30–45s | Vehicle unlocks (every 5 runs) | After every run |

**Natural break points:** After each run completes. Player naturally pauses to check results, then decides: "One more?" or "I'll quit here."

---

## Flexible Session Boundaries

Delivery Rush supports multiple playstyles:

### For Speedrunners
- Challenge modes (optional): "Complete 8 deliveries in 90 seconds" (time-attack).
- Leaderboard: Global top 100 fastest times / highest scores.
- Incentive: Achievement cosmetic ("Speedrunner" decal, unlock after 5 sub-90-second runs).

---

### For Completionists
- Cosmetic collection: 20+ cosmetic options, mix-and-match colors/wheels/decals = 100s of appearances.
- Vehicle mastery: Unlock all 4 vehicles, then practice each one.
- Achievement grinding: "Delivery Master" (hit ×8 combo), "High Roller" (earn 3000+ coins in one run), "Perfect Run" (complete 12 deliveries in one run).

---

### For Casual Players
- No pressure. Quit after 1–2 runs and feel satisfied.
- No mandatory cosmetic unlock chains.
- Personal-best tracking is optional; players who ignore it still have fun.

---

### For Social Players
- (Optional feature) Leaderboard with friends.
- Share scores to social media (optional).
- Competitive events (optional, not coercive).

---

## Session Length Handling: Real-World Scenarios

### Scenario 1: 2-minute break (commute)
Player plays 1 run (45–90s) + results screen (5s). Quitting point is natural. Player feels good about the score. Next commute, they return to beat it. **Works perfectly.**

### Scenario 2: 10-minute break (lunch)
Player plays 3–5 runs. After the 3rd run, they see a personal best or a cosmetic unlock. Motivation to continue or quit both feel natural. Quitting is not punished. **Works well.**

### Scenario 3: 30-minute session (home, casual play)
Player plays 10–15 runs. Vehicle unlock may trigger (Sport, Super). Cosmetics accumulate. Personal best climbs. Player feels productive. Exiting the game at any point feels earned. **Works well.**

---

## No Friction at Natural Stopping Points

- **After a run:** Results screen shows options clearly. No forced "next" button. Player can quit from results screen without penalty.
- **From garage:** Player customizes vehicle/cards and can quit. No timer pushing them to "go play."
- **No forced progression:** Completing one run doesn't unlock a mandatory challenge. Next run is optional.

---

## Validation Checklist

- [x] Target session length is defined (45–90s per run; 3–15 min typical session; up to 30+ min for extended play).
- [x] Session length matches genre expectations (arcade/casual on mobile).
- [x] Session structure has clear ramp (0–3s), engagement (3–75s), climax (75–85s), wind-down (85–90s) phases.
- [x] Natural break points exist after every run (~90s intervals).
- [x] Rewards are spaced to match session length (frequent: every delivery ~every 30–45s).
- [x] No mandatory content extends beyond target session (runs are always 45–90s; player can quit after any run).
- [x] Optional content allows flexible extension (cosmetics, leaderboards for speedrunners, achievements for completionists).
- [x] Players feel accomplished at run end, not rushed or dragging (results screen + personal-best confirmation).

---

**Previous:** [13_Retention_Strategy.md](13_Retention_Strategy.md)  
**Next:** [15_Replayability_Strategy.md](15_Replayability_Strategy.md)
