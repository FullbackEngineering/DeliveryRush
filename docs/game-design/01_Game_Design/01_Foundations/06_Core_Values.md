# Delivery Rush — Core Values

## Core Values (Ranked by Priority)

### 1. Player Skill Expression Over Luck (HIGH PRIORITY)

**Principle:** Every outcome should trace to a player decision, not randomness. Players should feel they earned their score through throttle timing and steering precision, not by chance.

**How it manifests:**
- Traffic behavior is predictable (AI cars follow lanes, don't teleport or act erratically).
- Order beacons are always visible and always reachable; no "hidden" destinations or surprise timers.
- Throttle and steering respond exactly as input (no input lag, no frame-skipping surprises).
- Crashes happen for clear, telegraphed reasons (hit a car, missed a turn, ran out of time).

**What it costs:** Unpredictability. Roguelike-style chaos (random enemy spawns, wild difficulty spikes) is sacrificed for readability and fairness. Some players want surprise; we choose skill.

**Conflict resolution:** If Skill Expression conflicts with Accessibility (#2), we redesign the feature to serve both. (E.g., "Should we randomize traffic density?" Only if density is still *readable*, not overwhelming. If randomness makes the run illegible, we remove it.)

---

### 2. Accessibility for All-Ages Casual Players (HIGH PRIORITY)

**Principle:** The game should be playable and enjoyable by anyone, regardless of age, ability, or prior gaming experience. No tutorials, gatekeeping, or exclusion.

**How it manifests:**
- Colorblind-distinct button colors (blue ‹, red ▲, green ›); directional glyphs (arrows), not color alone.
- Remappable controls (touch buttons, keyboard, gamepad).
- No timed text-reading sequences; story is visual (emoji).
- Difficulty is always fair and scalable; casual players can finish, speedrunners can score.
- Touch targets are large (1+ cm on mobile); UI is readable on small screens.

**What it costs:** Complexity. We don't pursue cutting-edge graphics, obscure lore, or hardcore-only challenge modes. Simplicity serves access.

**Conflict resolution:** If Accessibility conflicts with Skill Expression (#1), we prioritize Accessibility. (E.g., "Should we have a permadeath mode?" Yes, but only as optional—Accessibility demands choice.)

---

### 3. Respect Player Time (MEDIUM PRIORITY)

**Principle:** Every player interaction should assume the player has limited time and attention. No grinds, no wait timers, no friction.

**How it manifests:**
- Sessions are 45–90 seconds. One run is a complete experience.
- Restart is instant; no splash screens, no loading delays.
- No progression gates (vehicles/cards don't lock content; cosmetics only).
- No ads mid-session (only offered at end of run, voluntarily, for 2× coins).
- No "come back tomorrow" mechanics; every play counts immediately.

**What it costs:** Long-term engagement hooks. Battle passes, seasonal cosmetics, and FOMO tactics are excluded. Retention comes from "one more run," not grinding.

**Conflict resolution:** If Time Respect conflicts with monetization proposals, we prioritize Time Respect. (E.g., "Should we add a daily-only limited cosmetic?" No—it creates FOMO, disrespecting player autonomy. Sell cosmetics, don't gate them by time.)

---

### 4. Combo-Driven Risk/Reward (MEDIUM PRIORITY)

**Principle:** The combo multiplier is the core tension. Each delivery raises it; one mistake resets it. Players should feel this acutely—the multiplier *matters* emotionally and economically.

**How it manifests:**
- Combo multiplier is visibly displayed and celebrated (large on-screen animation, audio chime).
- Each completed delivery shows coins earned *before* and *after* multiplier (so players see the difference).
- Crashing or missing an order immediately resets multiplier to 1× (no forgiveness, no "combo saved" shields).
- Order timers shrink as combo rises and as time runs out (difficulty escalates, multiplier incentive grows).

**What it costs:** Forgiving difficulty. No "oops, I forgive that mistake" moments. Every run is a pushback-your-luck decision: "Do I push for the next delivery or play it safe?"

**Conflict resolution:** If Combo Tension conflicts with Accessibility (#2), we redesign. (E.g., "Should casual players avoid combo pressure?" Yes—offer a "relaxed mode" with no combo resets. Keep tension in standard mode.)

---

### 5. Visual & Audio Coherence (MEDIUM PRIORITY)

**Principle:** Every visual and audio choice should reinforce the emotional tone (playful urgency) and aesthetic (bright, low-poly, arcade). No dissonant elements.

**How it manifests:**
- Art style is low-poly, bright, readable. No photorealism, no dark grimdark, no overdone detail.
- Audio is upbeat synth and musical SFX. No harsh crashes, no dark ambient, no voice acting.
- UI matches tone: rounded panels, big tap targets, emoji glyphs, no tiny text.
- Color palette is warm (ochre, soft green, sky blue); no neon saturation or desaturation.

**What it costs:** Artistic range. We won't explore dark/serious tones, realistic detail, or experimental audio. Coherence demands consistency.

**Conflict resolution:** If Art Coherence conflicts with Skill Expression (#1) or Accessibility (#2), we redesign. (E.g., "Should we add dark-themed UI for OLED phones?" Yes, but keep the warm tone—dark background with warm highlights.)

---

### Decision Framework

When a proposal surfaces, apply this filter:

1. **Does this align with core values?** (Yes / No / Partial)
2. **If partial or no, which value does it serve?** (Rank by priority.)
3. **Can we redesign it to serve both the proposal's intent and a core value?** (If yes, redesign.)
4. **If not, which value takes priority?** (Higher ranking wins.)

**Example: "Should we add power-ups that auto-complete a delivery?"**

- Question 1: Partial. Serves accessibility (easier for casual players) but undermines Skill Expression (#1).
- Question 2: Accessibility (#2, high) vs. Skill Expression (#1, high).
- Question 3: Redesign? "Power-up speeds the car, doesn't auto-complete." This offers accessibility without removing player agency.
- Decision: Include speed-boost power-up, not auto-complete.

**Example: "Should we add a story mode with longer runs?"**

- Question 1: No. Disrespects Time (#3) and muddles the Combo core (#4).
- Question 2: Serves narrative ambition, but story is not a core value (explicitly excluded in anti-vision).
- Question 3: Redesign? A 10-minute campaign contradicts "45–90 second runs." Redesign would require removing the core loop, which defeats the purpose.
- Decision: Cut story mode. Keep single-run focus.

---

## Recent Decisions Guided by Values

- **Throttle mechanic, not tap-spam:** Prioritizes Skill Expression (#1). Timing decisions over reaction speed.
- **Procedural city, daily seed:** Prioritizes Time Respect (#3) and Combo (#4). Fresh run each day, no grinding same map.
- **No permadeath:** Prioritizes Accessibility (#2). Casual players can play without fear.
- **Colorblind button UI:** Prioritizes Accessibility (#2). Directional glyphs serve all players.
- **Instant restart, no loading:** Prioritizes Time Respect (#3). Boot to next run in 1 second.
- **No story cutscenes:** Prioritizes Time Respect (#3). Story inferred via emoji, no friction.

---

## Validation Checklist

- [x] Core values are specific and defensible. No vague statements like "quality" or "fun."
- [x] Each value includes principle (why), manifestation (how), and cost (what's sacrificed).
- [x] Values are ranked. Skill (#1) and Accessibility (#2) are high; if they conflict, redesign is attempted.
- [x] Combo (#4) is explicitly ranked medium, meaning it can bend if Skill or Accessibility demand it.
- [x] At least two recent decisions (throttle mechanic, procedural city, colorblind UI) trace directly to values.
- [x] Team (solo + AI) has read values; they're referenced in design decisions.
- [x] Values are visible and guide feature proposals (as shown in decision framework examples).
- [x] No two high-priority values directly contradict. (Skill and Accessibility coexist; design resolves conflicts.)

