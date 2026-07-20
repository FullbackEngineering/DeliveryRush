/**
 * Phase 5 check: the full 3D delivery loop. Waits out the intro countdown, then
 * auto-pilots the car to the pickup and on to the dropoff (steering toward the
 * active order's target node), and confirms OrderPickedUp → OrderDelivered fire
 * and the RunState economy (deliveries/coins/combo/score) moves. Screenshots the
 * HUD + beacons. Run: `node tools/playtest/three-loop.mjs` (dev server up).
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';
import fs from 'node:fs';

fs.mkdirSync(SHOT_DIR, { recursive: true });
const errors = [];
const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--no-sandbox', '--mute-audio', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});
try {
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto('http://localhost:5173/?mode=rush', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.run, { timeout: 15000 });

  // Wait for the countdown to finish and the run to be live + an order to exist.
  await page.waitForFunction(() => window.__three.state.running && window.__three.order, { timeout: 8000 });
  await sleep(200);
  await page.screenshot({ path: `${SHOT_DIR}/three-loop-start.png` });
  const first = await page.evaluate(() => ({ order: window.__three.order, state: window.__three.state }));
  console.log('START', JSON.stringify(first));

  // Park ~38 m before the pickup beacon, facing it, and screenshot (verify beacon).
  await page.evaluate(() => {
    const t = window.__three, v = t.vehicle, o = t.order;
    if (!o) return;
    const tg = t.nodePos(o.target.col, o.target.row);
    v.x = tg.x; v.z = tg.z - 38; v.yaw = 0;
  });
  await sleep(1500);
  await page.screenshot({ path: `${SHOT_DIR}/three-loop-beacon.png` });

  // Auto-pilot: steer toward the current order target, gas on, until a delivery
  // lands (deliveries increments) or we time out.
  const result = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    v.speedMultiplier = 2.6; // beeline faster (headless clock is slow)
    const deliveries0 = t.state.deliveries;
    let sawPickup = false, elapsed = 0;
    while (elapsed < 28000) {
      const o = t.order;
      if (o) {
        const tgt = t.nodePos(o.target.col, o.target.row);
        const dx = tgt.x - v.x, dz = tgt.z - v.z;
        let err = Math.atan2(dx, dz) - v.yaw;
        while (err > Math.PI) err -= 2 * Math.PI;
        while (err < -Math.PI) err += 2 * Math.PI;
        v.setThrottle(true);
        v.setSteer(err > 0.12 ? 'left' : err < -0.12 ? 'right' : 'straight');
        if (o.pickedUp) sawPickup = true;
      }
      if (t.state.deliveries > deliveries0) break;
      await sleep(60); elapsed += 60;
    }
    v.setThrottle(false); v.setSteer('straight');
    return {
      sawPickup, delivered: t.state.deliveries > deliveries0,
      deliveries: t.state.deliveries, coins: t.state.coins, streak: t.state.streak,
      score: t.state.score, timeLeft: t.state.time, draws: t.draws, elapsedMs: elapsed,
    };
  });
  console.log('LOOP', JSON.stringify(result));
  await page.screenshot({ path: `${SHOT_DIR}/three-loop-after.png` });

  // Report pass/fail signals.
  const ok = result.sawPickup && result.delivered && result.coins > 0;
  console.log('RESULT', ok ? 'PASS' : 'CHECK', `pickup=${result.sawPickup} delivered=${result.delivered} coins=${result.coins} combo=${result.streak}`);
} catch (e) {
  errors.push('FATAL: ' + e.message);
} finally {
  console.log('ERRORS', errors.length ? errors.join('\n') : '(none)');
  await browser.close();
}
