# KOPERNİK UI — Design QA

## Scope

- 390 × 844 mobile viewport
- Main menu, card market, gem/coin shop, and leaderboard
- Generated visual references compared side-by-side with browser captures
- Core navigation, rewarded ads, purchases, tabs, and back actions exercised

## Comparison result

The runtime screens preserve the source artwork's composition, colors, type,
lighting, spacing, and full-frame content. Mobile derivatives use lossless WebP
with blurred edge extension only where the source aspect ratio required it; no
artwork was stretched or cropped.

One mismatch found during the first pass was the development FPS marker and
duplicate live-wallet text appearing over the artwork. Both were removed from
non-gameplay screens, then the four screens were captured and compared again.

Evidence: `tools/playtest/shots/kopernik-ui-comparison.png`

## Functional result

- Main-menu RUSH, SERBEST, GARAJ, MARKET, reward, daily-card and leaderboard controls are reachable.
- Market categories, three card purchase areas, currency screen and rewarded-ad flow work.
- Gem and coin packs route through the Gametegra purchase bridge.
- Coin, rush-best and delivery leaderboard categories load through the service abstraction.
- Browser console/page errors: none.
- `npm run playtest:kopernik-ui`: passed.
- `npm run build`: passed.

final result: passed
