/**
 * Smoke test: boot -> menu -> run -> pickup -> deliver -> combo -> results.
 * Verifies the whole loop works with no console errors, and screenshots each
 * stage into tools/playtest/shots/. Run: `npm run playtest` (dev server must run).
 */
import { withGame, startRun, driveDeliveries, endRun, activeScenes, SHOT_DIR, sleep } from './lib.mjs';

await withGame(async (page) => {
  await page.screenshot({ path: `${SHOT_DIR}/01-menu.png` });
  console.log('MENU ok');

  await startRun(page);
  console.log('RUN started; HUD active =', (await activeScenes(page)).includes('HUD'));
  await sleep(600);
  await page.screenshot({ path: `${SHOT_DIR}/02-run.png` });

  const stats = await driveDeliveries(page, 4);
  console.log('AFTER 4 DELIVERIES:', JSON.stringify(stats));
  await page.screenshot({ path: `${SHOT_DIR}/03-deliveries.png` });

  await endRun(page);
  console.log('RESULTS reached =', (await activeScenes(page)).includes('Results'));
  await sleep(500);
  await page.screenshot({ path: `${SHOT_DIR}/04-results.png` });
});
