# 03 — Game State & Data Model (Delivery Rush)

## Delivery Rush Domain Model

Delivery Rush's game state is centered on three primary entity types: **Vehicle** (player and AI traffic), **Order** (delivery tasks), and **PlayerProfile** (persistent progression). All state is typed and single-sourced to prevent desynchronization. Below is the authoritative entity inventory and persistence model.

---

## Entity Dictionary & Ownership

### Entity: Vehicle

**Sample Attributes:**
- `id` (string): Unique identifier within the session ("player", "traffic_0", etc.)
- `kind` (enum): "player" | "traffic"
- `type` (string): Vehicle model ID (e.g., "starter", "sport", "super", "hyper" for player; randomized for traffic)
- `position` (vec2): World coordinates (x, y) in pixels; valid range [0, 16×360] × [0, 16×360]
- `heading` (enum): Direction (N, E, S, W)
- `speed` (float): Current velocity in px/s; valid range [0, maxSpeed (380)]
- `throttleTarget` (float): 0..1; current input intent (1.0 = cruise, 0.32 = idle)
- `steerBuffer` (enum | null): Buffered next turn direction; expires after 2.0s or consumed at intersection
- `durability` (int): Hit count remaining before crash penalty; valid range [0, maxDurability (5 for player)]
- `crashRecovery` (float): 0..1 multiplier on speed during crash recovery; lerps to 1.0 over ~0.6s
- `stats` (VehicleStats object): speed, acceleration, handling, braking, etc. (derived from vehicle type + level for player; randomized for traffic)
- `activeOrder` (Order object | null): Currently carrying order (player only)

**Owned By:** Vehicle system

**Relationships:**
- Links to: Order (activeOrder, one-to-one if carrying, null if not)
- Ownership model: Vehicle owns its own record; Entity State registry holds weak references

**Persistence:** Runtime only (discarded on run end, position doesn't survive)

**Rationale:** Vehicle state is completely transient. A new run generates a fresh vehicle state. Position, heading, and speed are meaningless after the run ends (score/coins are saved in PlayerProfile). No save/load needed.

---

### Entity: Order

**Sample Attributes:**
- `id` (int): Auto-incremented unique ID within the run; valid range [0, ∞)
- `kind` (string): Order type (e.g., "pizza", "coffee", "sushi", "flowers"); maps to icon and base reward
- `baseReward` (int): Coin value before multiplier; valid range [80, 150] depending on kind
- `vip` (boolean): Whether this order is a high-value delivery (5–30% chance depending on difficulty)
- `pickup` (GridCoord): {col, row} of the pickup beacon; valid range [0, 15] × [0, 15]
- `dropoff` (GridCoord): {col, row} of the dropoff beacon; distinct from pickup
- `timeLimit` (float): Seconds from pickup to delivery; valid range [12, 22] (shrinks with difficulty)
- `pickedUp` (boolean): Whether player has entered the pickup radius
- `spawnTime` (float): Run-elapsed seconds when order was spawned; for debugging/replay
- `icon` (string): Emoji or texture key for the order type (derived from kind)

**Owned By:** OrderSystem

**Relationships:**
- Links to: Vehicle (if the player is carrying it; one-to-one, weak reference via id)
- Ownership model: OrderSystem owns the active Order; Entity State holds a reference; no back-reference from Order to Vehicle (loose coupling)

**Persistence:** Runtime only

**Rationale:** Orders are ephemeral—they exist only during a run. Once the run ends, all orders are discarded. Completion (delivered or expired) doesn't persist; only the aggregate (total deliveries, high score) is saved.

---

### Entity: PlayerProfile

**Sample Attributes:**
- `version` (int): Schema version; initialized to 1; incremented on migration
- `name` (string): Player display name; valid length 1–20 characters
- `level` (int): Player progression level; valid range [1, 100]
- `xp` (int): Total experience points earned; valid range [0, ∞)
- `coins` (int): Soft currency (in-game earned); valid range [0, ∞)
- `gems` (int): Hard currency (premium, bought); valid range [0, ∞)
- `highScore` (int): Best leaderboard score across all runs; valid range [0, ∞)
- `totalDeliveries` (int): Lifetime delivery count; valid range [0, ∞)
- `selectedVehicle` (string): Currently selected vehicle ID (e.g., "starter", "sport"); defaults to "starter"
- `vehicleLevels` (dict: vehicle_id → level): Upgrade level for each vehicle; valid range [1, maxLevel per vehicle]
- `unlockedVehicles` (array of string): Vehicle IDs player has purchased; always includes "starter"
- `unlockedCards` (array of CardDef id): Card modifiers player has unlocked; populated by shop purchases
- `cardLevels` (dict: card_id → level): Upgrade level for each card
- `lastPlayedDate` (ISO-8601 timestamp): Last run completion time; for streak/daily quest tracking
- `totalPlaytime` (int): Cumulative session playtime in seconds; valid range [0, ∞)

**Owned By:** ProfileStore (singleton)

**Relationships:**
- Links to: VehicleDef (selectedVehicle, vehicleLevels); CardDef (unlockedCards, cardLevels) — weak references by ID
- Ownership model: Strong reference; ProfileStore is the canonical source; SaveManager serializes it

**Persistence:** Persistent (saved to browser localStorage, versioned)

**Rationale:** Player progression, unlocks, and stats must survive across sessions. ProfileStore is the single mutation point; UI and services read via getters; SaveManager handles serialization and versioning.

---

### Entity: RunState (Session-Scoped Economy)

**Sample Attributes:**
- `time` (float): Seconds remaining in the run; valid range [0, 60]
- `streak` (int): Consecutive clean deliveries (combo counter); valid range [0, ∞)
- `maxStreak` (int): Peak streak reached this run; valid range [0, ∞)
- `deliveries` (int): Total deliveries completed this run; valid range [0, ∞)
- `coinsThisRun` (int): Coins earned this run (pre-tax); valid range [0, ∞)
- `score` (int): Leaderboard score this run; valid range [0, ∞)
- `difficulty` (float): 0..1 computed from deliveries / rampDeliveries; drives order time limit & VIP chance
- `coinBonus` (float): Multiplier from equipped cards; valid range [1.0, 3.0]; default 1.0
- `freeCrashes` (int): Remaining free crash charges from cards; default 0

**Owned By:** RunState system

**Relationships:**
- Links to: no direct links (isolated economy)
- Ownership model: Owned entirely by RunState; no external mutation

**Persistence:** Runtime only (reset at run start; results (score, coins, combo) are logged to PlayerProfile at run end)

**Rationale:** RunState is a pure state machine for one run. It computes on-the-fly and is not saved mid-run. Only the final result (score added to highScore, coins to wallet) is persisted.

---

### Entity: CityGrid (Procedural Map)

**Sample Attributes:**
- `seed` (int): Daily seed for procedural generation (same seed = same city layout)
- `cols` (int): Grid width; always 16
- `rows` (int): Grid height; always 16
- `block` (int): Distance between intersections in pixels; always 360
- `intersections` (array[16×16]): 2D array of Intersection objects
- `hazards` (sparse dict: (col, row) → HazardType): Traffic densities, road work locations, weather zones
- `buildings` (sparse dict: (col, row) → BuildingDef): Procedurally placed scenery

Each Intersection:
- `col`, `row` (ints): Grid position
- `center` (vec2): World pixel position = (col × block, row × block)
- `type` (enum): "cross" | "t-junction" | "dead-end"; affects valid turn directions
- `traffic` (int): Spawn priority for AI cars at this node

**Owned By:** CityGrid system

**Relationships:**
- No external relationships; self-contained
- Ownership model: Owned entirely by CityGrid; queried by Vehicle, OrderSystem, TrafficSystem

**Persistence:** Runtime only

**Rationale:** The city is regenerated per run with a seeded RNG. Same seed = same layout (replayability). No need to save; the seed itself is sufficient to reconstruct on the next run if replays are implemented.

---

## Runtime vs. Persistent State Classification

| Entity / State | Type | Owner | Persistence | Rationale |
|---|---|---|---|---|
| Vehicle position, speed, heading, steer buffer | Runtime | Vehicle | None | Meaningless after run; not replayed in MVP |
| Order (active) | Runtime | OrderSystem | None | Ephemeral; results (delivery count) logged to profile |
| RunState (time, combo, coins this run) | Runtime | RunState | None | Session-scoped; only final result (score) persists |
| CityGrid (intersections, hazards) | Runtime | CityGrid | None | Regenerated per run via seed |
| PlayerProfile (level, coins, vehicles, cards) | Persistent | ProfileStore | Saved | Core progression; outlives sessions |
| SaveFile (versioned JSON) | Persistent | SaveManager | Disk (localStorage) | Serialized PlayerProfile; versioned for migrations |

---

## Single Source of Truth Design

Each piece of state has exactly one authoritative owner:

- **Combo multiplier:** Owned by RunState. Event bus broadcasts ComboChanged; HUD listens but doesn't cache.
- **Player coins:** Owned by PlayerProfile (persistent) during a run; RunState tracks coins_this_run (temporary). At run end, RunState coins are added to PlayerProfile.
- **Vehicle position:** Owned by Vehicle system. Only Vehicle can modify position; CityGrid queries it.
- **Order state (picked up, delivered):** Owned by OrderSystem. RunState reads order.baseReward but doesn't mutate the order.
- **Player vehicle selection:** Owned by ProfileStore. ControlPad/UI query it; never write directly.

---

## Relationships & References

**One-to-One:**
- Player Vehicle ↔ Active Order (player carries at most one order at a time)
- PlayerProfile ↔ SelectedVehicle (player has one active vehicle, but multiple vehicle types exist)

**One-to-Many:**
- PlayerProfile → VehicleLevels (player owns many vehicles, each at a specific upgrade level)
- PlayerProfile → CardLevels (player owns many equipped cards at various levels)
- CityGrid → Intersections (16×16 grid of intersections)
- Traffic System → Vehicle list (many AI cars in a pool)

**Weak References (by ID):**
- Vehicle → VehicleDef (vehicle record stores the type ID; referenced entity is in data/vehicles.ts)
- Order → OrderKind (order stores kind string; resolved to icon/reward in data/orderKinds.ts)
- PlayerProfile → VehicleDef (stores selectedVehicle as string ID; no circular reference)

---

## Schema Versioning & Migration Strategy

**Current Schema Version:** 1 (MVP)

**Fields:**
- PlayerProfile `version` field is incremented on any breaking change.
- SaveManager checks `version` on load; if < current, apply migrations.
- Example migrations (for future versions):
  - v1→v2: If gems field doesn't exist, initialize to 0.
  - v2→v3: If `batteryPassProgress` field exists, migrate to new `events` structure.

**Deprecation Plan:**
- Schema v1 will be supported through Season 1 (MVP launch).
- If v2 ships in Season 2, v1 saves are auto-migrated; no player loss.
- Major versions (v5+) may require fresh-start notice (rare).

---

## Data Flow: Run Start to Results

```
1. Load PlayerProfile from SaveManager
2. Copy selectedVehicle, unlockedCards to RunState modifiers (coinBonus, freeCrashes, etc.)
3. Seed CityGrid with daily seed; generate intersections, hazards, buildings
4. Create active Vehicle (player) at spawn point
5. RunState initializes: time = 45s, streak = 0, coins = 0
6. OrderSystem spawns first order; places beacons
7. --- GAMEPLAY LOOP (per frame) ---
   → RunState.tick(dt): decrement time, update difficulty
   → Vehicle.tick(dt): apply throttle/steer, move, check collisions
   → OrderSystem.tick(dt): countdown order timer, check pickup/delivery
   → Event bus broadcasts: ComboChanged, OrderDelivered, ComboBroken, RunTimer
   → HUD/Audio/Effects listen and react (no state mutation)
   → Entity State updates entity records
8. --- RUN END (time ≤ 0) ---
   → Freeze all systems
   → Compute final score
   → PlayerProfile.coins += runState.coinsThisRun
   → PlayerProfile.highScore = max(highScore, runState.score)
   → PlayerProfile.totalDeliveries += runState.deliveries
   → SaveManager.SaveProfile(playerProfile)
   → Transition to Results screen
```

---

## Validation Checklist

- [x] Every entity type has a designated owner system.
- [x] Every attribute is claimed by one system; no duplicates between systems.
- [x] Relationships (one-to-one, one-to-many, many-to-many) are explicit and bidirectional where needed.
- [x] Each entity is classified as Runtime or Persistent; classification is justified.
- [x] No circular ownership chains exist (A owns B owns C owns A).
- [x] Derived data is marked as such and regeneration logic is identified (e.g., difficulty computed from deliveries).
- [x] Schema is versioned and deprecation plan exists.
- [x] Single-source-of-truth principle enforced: combo owned by RunState, coins owned by PlayerProfile.
- [x] Weak references (by ID) prevent circular references while maintaining data integrity.

## Status

**Complete.** Delivery Rush MVP uses this data model. Three.js rewrite preserves all entity types and relationships (only rendering implementation changes).
