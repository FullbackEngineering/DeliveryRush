# 02 — Persistence & Save Systems (Delivery Rush)

## Save Scope & Persistent State

Delivery Rush is a single-player, endless arcade game. Each run is independent (45–90 seconds); the game does not persist mid-run state. **Only PlayerProfile is saved across runs:**

### Persistent Fields (PlayerProfile)
- `playerName`: string (default: "Player").
- `coins`: number (total soft currency earned across all runs).
- `bestScore`: number (highest score achieved in a single run).
- `bestCombo`: number (highest delivery combo multiplier).
- `runsCount`: number (total runs completed).
- `vehicleUnlocked[]`: array of vehicle IDs (Boolean; starter always unlocked).
- `cardsEquipped[]`: array of card IDs (up to 3 equipped modifiers).
- `vipStatus`: boolean (mock: rewarded ad → temporary 2.2× coin multiplier).
- `savedAt`: ISO timestamp.

### Non-Persistent (Recomputed On Boot)
- Run state (timer, order, combo) — reset each run.
- UI panels, camera position — recomputed.
- City grid seed — derived from day (daily regeneration).

## Save Format & Structure

**Format: JSON** — Human-readable, debuggable, fast parsing on mobile devices. File size ~1–2 KB, negligible.

**Storage: localStorage (Web)** — One save slot, auto-saved on profile changes (coins, vehicle unlock, card equip).

**File structure:**
```json
{
  "version": 1,
  "timestamp": "2026-07-18T14:23:45Z",
  "checksum": "sha256:abc123...",
  "data": {
    "playerName": "Player",
    "coins": 2450,
    "bestScore": 18200,
    "bestCombo": 8,
    "runsCount": 47,
    "vehicleUnlocked": [true, true, false, false],
    "cardsEquipped": [1, 5, 12],
    "vipStatus": false,
    "savedAt": "2026-07-18T14:23:45Z"
  }
}
```

## Write Strategy & Corruption Resistance

**Atomic writes via temp-then-commit:**
1. ProfileStore mutates data in memory and calls `SaveManager.save(profile)`.
2. SaveManager writes to localStorage key `"deliveryRush_save_tmp"`.
3. On success, compute SHA256 checksum of serialized data; append to save object.
4. Validate checksum matches re-computed hash.
5. Write final save to `"deliveryRush_save"` (rename temp).
6. Keep backup: move old `"deliveryRush_save"` to `"deliveryRush_save_backup"`.

**Corruption handling on load:**
- On boot, load `"deliveryRush_save"`.
- Verify checksum; if invalid, offer player: "Load from backup (2 hours ago)?" → load `"deliveryRush_save_backup"`.
- If backup also invalid or missing, return default profile (coins: 0, starter vehicle unlocked, tutorial flag set).

## Versioning & Migration

Save format is version 1. **Migration pipeline ready for future versions:**

```typescript
// Example: v1 → v2 migration (add "challengeUnlocked" field)
function migrateSave(save: SaveData): SaveData {
  if (save.version < 2) {
    save.challengeUnlocked = false;
    save.version = 2;
  }
  return save;
}
```

Migration is applied on load, before returning to game. All versions are tested in CI (unit tests: load v1 save in current code → migrate → matches expected v2 state).

## Autosave & Cloud Sync

**Autosave:** ProfileStore emits `ProfileChanged` event on every mutation (coin earn, vehicle unlock, etc.). SaveManager subscribes; saves immediately (no debounce — each save is ~1 KB, negligible overhead).

**Cloud sync (mock, no actual backend yet):**
- Interface: `CloudSyncService` (in `src/services/`).
- Mock implementation: no-op (logs "Cloud sync: [action]").
- On leaderboard/replay features: swap mock → real backend without gameplay changes.
- Strategy: Last-write-wins. Local save timestamp > cloud timestamp → upload local. Otherwise, download cloud.
- Collision UI: Not needed for single-player; conflicts impossible.

## Tamper Detection

**HMAC signature (light):** SaveManager appends HMAC-SHA256 (key: hash of player name + device ID) to checksum. On load, re-compute HMAC; if mismatch, save is likely tampered. Reject and offer backup.

**Not implemented:** Full anti-cheat backend. HMAC is a speed bump for casual cheating (editing localStorage JSON). Serious cheating (modifying coins) requires server-side validation, which is out of scope for this arcade game (single-player, no progression lock).

## Save/Load Testing

**Test matrix (CI + manual weekly):**
- Load v1 save in current code (no migration needed).
- Corrupt save checksum intentionally; verify rejection + backup offer.
- Corrupt backup; verify fallback to default profile.
- Delete backup; verify graceful fallback.
- Autosave stress test: simulate 100 profile mutations (earn coins, unlock vehicle, equip card) in rapid succession; verify final save state matches expected.
- Cross-device sync (mock): simulate two save loads with timestamps; verify last-write-wins logic.

## Validation Checklist

- [x] Every save has a `version` field (current: 1).
- [x] Save write is atomic: temp file → checksum → rename to live; backup kept.
- [x] Checksum verified on load; backup offered if corrupted.
- [x] One backup maintained; corrupted primary → offer player backup choice.
- [x] Persistent state defined (PlayerProfile fields); no runtime/computed values saved.
- [x] Migration functions designed for v1→v2, v1→v3 (tested in CI, not deployed yet).
- [x] Autosave triggered on ProfileChanged event; no manual save UI (single slot).
- [x] Cloud sync abstracted behind interface; mock implementation ready for future backend.
- [x] HMAC tamper detection implemented; rejects/offers backup on mismatch.
- [x] Save/load automated tests: corrupt saves, migrate versions, autosave stress; all pass CI.
- [x] No credentials or sensitive secrets stored in save file.
