# 03 — Player Journey (Delivery Rush)

## Overview

Delivery Rush compresses the typical player journey into a tight arc: a 60–90 second run from first awareness through score result and retry decision. Unlike a 20-hour campaign, we must create engagement and retention *per-run* while supporting long-term cosmetic/leaderboard progression across multiple runs.

The journey has six stages, each with distinct emotional and mechanical goals.

---

## Stage 1: Discovery → First Load (0 seconds)

### Touchpoints
- [ ] Trailer or ad clip: 5-second loop of car drifting through colorful city, "45-second arcade delivery game"
- [ ] App-store listing: "Dodge traffic, chain deliveries, chase your combo multiplier"
- [ ] Friend recommendation or link share (critical for organic growth)

### Emotional Arc
**Curiosity** → **"I want to try this now"**

### Key Question
Does the value prop (arcade driving + combo chasing) land in 3 seconds? If not, player never downloads.

### Success Metric
Download rate (organic or paid); CTR on ads

---

## Stage 2: Onboarding (0–30 seconds)

### Touchpoints
- [ ] Title screen appears immediately (no splash screens, no 5-second logos)
- [ ] Three buttons visible: "Play," "Settings," "Garage"
- [ ] First tap of "Play" → instantaneous first delivery pickup (no tutorial screen, no loading bar)
- [ ] HUD appears: current combo (1×), run timer (45s), coins earned, +7s per delivery

### Emotional Arc
**Confusion** (where do I go?) → **Competence** (I steered left and turned left!) → **Pride** (First pickup, +100 coins!)

### Design Intent
Players must *feel* the car respond within 1 second of tap. Audio cue on pickup. Visual pulse on destination beacon. By pickup-complete (≈10 sec in), player understands: "Steer car, collect orders, avoid traffic."

### Key Question
Can a new player understand they should deliver to the pulsing beacon in under 15 seconds? Is the first delivery achievable in one run?

### Churn Risk
- Tutorial text that blocks play (death on arrival)
- First steering input doesn't respond (feels broken)
- First delivery unreachable (frustration, quit)

### Mitigation
- **Zero text tutorials.** Learn by doing: pickup beacon on map, nav arrow points to dropoff, glow increases as you get close.
- **Guaranteed pickup within 20 meters** of spawn (procedural order spawning never places pickup >1 block away on first delivery).
- **Generous run timer** on first run (45s + 7s = 52s total; enough for a leisurely first delivery).

### Success Metric
80%+ of players complete first delivery  
50%+ of players attempt second run

---

## Stage 3: Engagement (Run 1–5, ~3–10 minutes real-time)

### Touchpoints
- [ ] Second delivery introduces traffic (AI cars on grid)
- [ ] Third delivery: first near-miss or crash (collision feedback, -1 combo if applicable)
- [ ] Fourth delivery: first cosmetic reward unlock (new card, vehicle skin hint)
- [ ] Fifth delivery: combo counter hits 2×–3× (visual feedback: "COMBO!" pops, SFX ding)

### Emotional Arc
**Confidence** (I'm getting better) → **Curiosity** (What's a combo? What are cards?) → **Early mastery** (I got a 3× combo!) → **First frustration** (Crashed into traffic, back to 1×)

### Design Intent
Player learns through failure: crashing resets combo to 1×, but run continues. Positive reinforce: each clean delivery (no near-miss) raises combo. Negative reinforce: traffic collision visible and punishing (audio cue, shake effect).

### Key Question
Does the combo system make sense by run 5? Do players *want* to chase a higher combo next run?

### Churn Risk
- Difficulty spike: Traffic density too high too fast (player feels helpless)
- Combo system unclear: Player doesn't understand why combo resets or how to raise it
- No reward feedback: Player doesn't see what they unlocked or why it matters

### Mitigation
- **Difficulty ramp calibrated**: Runs 1–3 have sparse traffic (1–2 AI cars on grid); runs 4–5 add 1 car per run.
- **Combo feedback explicit**: "COMBO ×2!" text pops when second delivery chains cleanly; "+1" when staying in lane.
- **First cosmetic reward automatic**: By run 3–4, a new card or vehicle skin unlocks with a celebration screen. No grinding needed.

### Success Metric
70%+ of D1 players return for run 6+ (session length ≈10 min)

---

## Stage 4: Mastery (Runs 6–15, ~20–40 minutes real-time)

### Touchpoints
- [ ] First 5× combo achieved (feels like a real accomplishment; major visual celebration)
- [ ] First 8× combo (run clock extended, player realizes combos create longer sessions)
- [ ] Leaderboard briefly visible after run (weekly/all-time rank for this run's score)
- [ ] Card synergy discovered: "Speed card + Coin card = 200 coins per delivery, nice!"
- [ ] First major difficulty spike: Order timer shrinks from 22s to 18s (run 10+ triggers difficulty ramp)

### Emotional Arc
**Challenge** → **Transcendence** (I did it! 5× combo!) → **Renewed challenge** (Now traffic is harder; can I still chain combos?)

### Design Intent
Player has internalized core loop; now optimizes. Each run feels distinct (procedural city, random orders, difficulty scaling). Player begins thinking strategically: "Should I pursue this high-value order or chain for combo?"

### Key Question
Is there a visible skill ceiling? Do players feel like they could *always* push for a 6×, 7×, or 8× combo with perfect play?

### Churn Risk
- **Skill ceiling too low**: Player feels like they've "solved" the game by run 8, nothing left to chase.
- **Difficulty spike too steep**: Run 12 suddenly feels impossible (order timers 12s, heavy traffic); player can't achieve 5× combos anymore.
- **No progression beyond score**: If cosmetics and leaderboards don't update, player sees no long-term goal.

### Mitigation
- **Lean into combo as skill signal**: 8× combo is **hard**—requires frame-perfect steering, traffic prediction, order-route optimization. Achievable but not guaranteed.
- **Difficulty ramps over 12 deliveries** (per canonical brief): Order timer slides 22→12s, traffic density rises smoothly, VIP order chance increases. Experienced players adapt.
- **Cosmetics unlock every 5–10 runs**: Steady visual progression (new vehicle skin, card variant, cosmetic badge).
- **Leaderboards update per-run**: Player sees their rank change; creates "one more run" pull.

### Success Metric
45%+ of D1 players remain active at week 1  
Weekly playtime average: 1–3 hours

---

## Stage 5: Retention & Longevity (Runs 15+, Week 1 onwards)

### Touchpoints
- [ ] Weekly leaderboard resets (new competitive window; top-100 players celebrated)
- [ ] Seasonal cosmetics (new vehicle skins, card designs every 2 weeks)
- [ ] Difficulty plateaus: Player's personal-best combos stabilize (5–7× range)
- [ ] Card synergy depth emerges: Player realizes "Shield + Risk card = aggressive play build"
- [ ] Community highlights: Weekly clip of top combo on social channel (optional, if applicable)

### Emotional Arc
**Mastery** → **Renewed purpose** (Leaderboards reset; chase top-50 this week!) → **Sustainable routine** (This is my game; I play 3 runs every few days)

### Design Intent
Player has mastered core loop; now retention hooks are *social* (leaderboards, cosmetics, seasonal challenges) and *content* (new card types every month, themed cosmetics, seasonal events). No mandatory grinding; play is voluntary and intrinsically motivated by combo-chasing and leaderboard races.

### Key Question
Will the player return next week *without* FOMO mechanics (no limited-time cosmetics, no streaks, no daily login rewards)? Or does longevity depend on extrinsic motivation?

### Churn Risk
- **Post-mastery void**: Player feels like they've "finished" the game; leaderboard top-50 is all that's left, feels distant.
- **Cosmetics dry up**: No new vehicle skins or cards for weeks; visual progression stalls.
- **Leaderboard inflation**: As more players reach 8× combos, leaderboard feels gatekeepingly competitive.
- **Seasonal content too predictable**: Same cosmetics every season; no surprises.

### Mitigation
- **Evergreen leaderboard rotation**: Weekly + monthly + all-time + themed (e.g., "highest average order value," "fastest run"); multiple paths to recognition.
- **Cosmetic cadence: 1 new vehicle + 1 new card every 2 weeks** (sustainable, no grind required to obtain them; just play normally).
- **Seasonal challenges (optional)**: "This week, chain 5 high-value orders" (cosmetic badge, not mandatory).
- **Card expansion**: New card type every 4–6 weeks (mild game-balance work, keeps build optimization fresh for Casey-type players).
- **No FOMO**: All cosmetics are permanent availability or evergreen seasonal (not time-limited).

### Success Metric
30%+ of week-1 players active at week 4  
20%+ of week-1 players active at week 12  
DAU / MAU ratio: 25–40% (players return every 2–3 days)

---

## Stage 6: Advocacy (Week 4+)

### Touchpoints
- [ ] Leaderboard top-50 players have distinctive cosmetics (visual signaling)
- [ ] Optional social share: "I got 8× combo! [Screenshot link]" → spreads to Discord, Reddit
- [ ] Referral mechanic (optional): Friend joins via link, both get cosmetic cosmetics (if applicable)
- [ ] Community spaces: Official Discord for strategy, clips, leaderboard discussion
- [ ] Win-back campaign for lapsed players: "Missed last 2 weeks? New cards available" (no FOMO, just reminder)

### Emotional Arc
**Pride & Belonging** (I'm in top-50, show my friends) → **Community identity** (I'm a Delivery Rush player) → **Word-of-mouth** (Tell friends)

### Design Intent
Player becomes promoter. They screenshot their 8× combo run, share on social media, or stream a quick session. Low-friction sharing mechanics (one-tap screenshot + link) lower the bar for advocacy.

### Key Question
Would this player recommend Delivery Rush to a friend *today*? Why or why not?

### Churn Risk
- **No social loop**: Players play solo; no incentive to invite friends.
- **Community silence**: No official Discord or social presence; player has nowhere to share victories.
- **Toxic leaderboards**: Cheating or exploits undermine competitive integrity; players lose trust.

### Mitigation
- **Social sharing is friction-free**: One-tap screenshot + auto-copy shareable link.
- **Optional Discord**: Official channel for clips, strategy, leaderboard-chasing squads (not mandatory; optional community).
- **Referral cosmetics (optional)**: Friend joins via link, both get 1 exclusive cosmetic after 5 joint plays (if applicable; can skip if team doesn't have bandwidth).
- **Anti-cheat monitoring**: Leaderboard integrity is sacred; audit for exploits monthly.

### Success Metric
20%+ of active players generate ≥1 referral per month (organic growth signal)  
Community Discord growth (if active)  
User reviews & store ratings

---

## Churn-Point Summary & Owners

| Stage | Churn Risk | Current Mitigation | Owner |
|---|---|---|---|
| **Onboarding** | 50%+ drop after run 1 (tutorial too slow, steering unresponsive) | Eliminate text tutorials; guarantee first delivery pickup. | Core game designer (feel) |
| **Engagement** | 40%+ drop after run 5 (difficulty spike, unclear combo system) | Smooth difficulty ramp runs 1–5; explicit combo feedback. | Level designer (tuning) |
| **Mastery** | 30%+ drop after run 12 (skill ceiling felt too low; nothing left to chase) | Lean into 8× combo as hard mastery goal; leaderboards. | Systems designer (balance) |
| **Retention** | 20%+ drop after week 4 (cosmetics dry up, no social loop) | Bi-weekly cosmetic drops; leaderboard resets; optional Discord. | Live ops / content (cadence) |
| **Advocacy** | Zero referrals (no social loop, no incentive to invite) | Friction-free screenshot sharing; optional referral cosmetics. | Product (social features) |

---

## Emotional Journey Graph

```
       Mastery            Pride
       /    \              /
     /        \          /
D → O → E → M → R → A
|                        |
First              Advocacy or
Contact            Churn

D = Discovery (5 sec)
O = Onboarding (30 sec)
E = Engagement (runs 1–5, ~3–10 min)
M = Mastery (runs 6–15, ~20–40 min)
R = Retention (week 1+, repeating)
A = Advocacy (week 4+, word-of-mouth)
```

A healthy journey shows:
- **Discovery → Onboarding**: Steep ramp (curiosity → competence)
- **Onboarding → Engagement**: Smooth ramp (player learns combo system)
- **Engagement → Mastery**: Challenge peak (first 5× combo is hard, emotionally rewarding)
- **Mastery → Retention**: Plateau with bounces (leaderboard resets create mini-peaks)
- **Retention → Advocacy**: Optional ascent (players who want to share do; no FOMO pressure)

No flat stage = engagement risk. No downhill = retention risk.

---

## Validation Checklist

- [x] All six stages defined (Discovery through Advocacy)
- [x] Emotional arc traced (not flat; distinct ups/downs per stage; realistic)
- [x] 3+ touchpoints per stage identified (specific design moments)
- [x] Success metric defined for each stage (% retention, events, cosmetics unlocked)
- [x] Churn risk identified and mitigated per stage (specific fixes assigned to owners)
- [x] Onboarding maps to core loop (pickup → dropoff → delivery = core 30-sec loop)
- [x] Mastery stage has defined skill ceiling (8× combo as hard-but-achievable peak)
- [x] Retention strategy addresses post-mastery (leaderboards, cosmetics, difficulty plateau)
- [x] Advocacy loop is clear (optional social share, no mandatory referrals, Discord optional)
- [x] Journey map shared with dev team (this doc serves as reference for all design reviews)

