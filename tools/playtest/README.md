# Delivery Rush — Playtest Harness

Drives the running game in a real headless Chrome (puppeteer-core) so gameplay
changes can be **verified and felt**, not just typechecked.

```bash
npm run dev            # terminal 1 — must be running
npm run playtest       # smoke: full delivery loop + screenshots
npm run playtest:feel  # driving-feel profile (throttle curve, turns, bounds, crashes)
npm run playtest:touch # touch alignment + canvas centering across phones
```

Screenshots → `shots/`. See `.claude/skills/playtest/SKILL.md` for the full guide
and the headless gotchas encoded in `lib.mjs`.

`shots/` is throwaway output — safe to delete.
