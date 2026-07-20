# 03 — Networking & Multiplayer (Delivery Rush)

## Multiplayer Decision: SKIP

**Delivery Rush is single-player only.** No real-time multiplayer (PvP, co-op) is in scope.

### Rationale
1. **Core loop doesn't require co-presence.** The game is a personal score-attack run. Splitting attention between steering and observing other players degrades the experience.
2. **Asynchronous multiplayer is sufficient for the roadmap.** Leaderboards (high score tracking), ghost races (replay replay AI), and cosmetic sharing are roadmapped for post-launch and require no real-time sync.
3. **Team size and infrastructure:** Solo/AI-assisted development; no dedicated server ops team. Multiplayer would triple timeline (6–12 months) and infrastructure cost.
4. **Platform:** Web-based mobile game; player base is casual drop-in/drop-out. Multiplayer lobby/matchmaking friction is high.

### Future Async Features (No Networking Spike Needed Now)
- **Leaderboard:** POST score to mock backend; GET top 100 on MainMenu. Interface: `LeaderboardService` (mock implementation ready).
- **Ghost race:** Record replay data (steering inputs); playback as NPC on future runs. Fully local, no sync.
- **Share cosmetics:** Mock "upload cosmetics" to cloud; mock "download friend's cosmetics." Backend: deferred.

## Network Architecture (N/A — Not Implemented)

N/A: Single-player game. No client-server architecture, networking protocol, or multiplayer state synchronization.

## Architecture Decision Document (If Multiplayer Were Added Later)

For reference, if asynchronous leaderboards require a backend:

**Model:** Client-Server.  
**Authority:** Server validates score (anti-cheat: verify score > previous + reasonable run time).  
**Tick rate:** N/A (asynchronous, not real-time).  
**Sync:** On game end, POST score object to `/api/leaderboard/submit`. No latency-critical gameplay.  
**Bandwidth:** ~200 bytes per POST (score, player ID, timestamp). One POST per run (45–90 s apart). Negligible.  
**Security:** Server re-simulates score calculation (coins × combo multiplier) from run data; rejects if inconsistent.  

## Validation Checklist

- [x] Multiplayer is deliberately skipped; single-player is the defined scope.
- [x] Asynchronous features (leaderboard, ghost race, cosmetics share) are roadmapped but do not require real-time networking today.
- [x] If backend is added later (leaderboards), `LeaderboardService` interface exists; swap mock → real backend with no gameplay changes.
- [x] No multiplayer state machine, lag compensation, or conflict resolution logic is implemented (not needed).
- [x] No bandwidth budget for multiplayer is allocated (not a constraint).
- N/A: Network model, tick rate, client prediction, server validation, anti-cheat infrastructure (deferred to post-launch if multiplayer features are added).
