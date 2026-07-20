/**
 * Phase 2 (police / speeding / fines) check. Boots SERBEST (`?mode=free`), then:
 *   1) confirms patrol cops exist and render;
 *   2) makes the player speed while shepherding a patrol cop into notice range,
 *      and asserts a fine fires: `Profile.coins` drops, a chase starts
 *      (`ChaseStarted` + `police.isChasing`), and the fine event carried an amount;
 *   3) (soft) moves every cop far away and confirms the chase can END (escape).
 * Screenshots the chase. Run: node tools/playtest/police.mjs  (dev server up).
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';
import fs from 'node:fs';

const BASE = process.env.DR_URL || 'http://localhost:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const errors = [];

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--no-sandbox', '--mute-audio', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

let ok = true;
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(BASE + '?mode=free', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.vehicle && window.__three.police, { timeout: 15000 });
  await sleep(400);

  const world = await page.evaluate(() => ({
    cops: window.__three.police.cops.length,
    coinsStart: window.__three.coins,
    draws: window.__three.draws,
  }));
  console.log('WORLD', JSON.stringify(world));

  // --- Speed + shepherd a cop into range until a fine fires -------------------
  const fine = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle, police = t.police;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let chaseStarted = false, fineAmount = 0, fineReason = '';
    t.bus.on('police:chasestart', () => { chaseStarted = true; });
    t.bus.on('police:fine', (amt, reason) => { fineAmount = amt; fineReason = reason; });

    v.speedMultiplier = 3.5;   // reach a speeding km/h quickly under the slow headless clock
    v.setSteer('straight');
    v.setThrottle(true);
    const coinsBefore = t.coins;
    const cop = police.cops[0];
    let elapsed = 0;
    while (!chaseStarted && elapsed < 25000) {
      // Keep cop #0 parked just beside the (moving) player, eligible to fine.
      cop.state = 'patrol';
      cop.fineCooldown = 0;
      cop.x = v.x + 18;
      cop.z = v.z;
      cop.object.position.set(cop.x, 0, cop.z);
      await sleep(50);
      elapsed += 50;
    }
    await sleep(200);
    return {
      chaseStarted, fineAmount, fineReason, chasing: police.isChasing,
      coinsBefore, coinsAfter: t.coins, kmh: v.speedKmh, elapsedMs: elapsed,
    };
  });
  console.log('FINE', JSON.stringify(fine));
  await page.screenshot({ path: `${SHOT_DIR}/police-chase.png` });
  const bannerShown = await page.evaluate(() => document.querySelector('.dr-chase-banner.show') !== null);
  console.log('CHASE-BANNER', bannerShown);

  // --- Soft escape check: shove every cop far away, confirm the chase can end --
  const escape = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle, police = t.police;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    v.setThrottle(false);
    let elapsed = 0;
    while (police.isChasing && elapsed < 30000) {
      for (const c of police.cops) { c.x = v.x + 900; c.z = v.z + 900; c.object.position.set(c.x, 0, c.z); }
      await sleep(50);
      elapsed += 50;
    }
    return { ended: !police.isChasing, elapsedMs: elapsed };
  });
  console.log('ESCAPE (soft)', JSON.stringify(escape));

  const coinsDropped = fine.coinsAfter < fine.coinsBefore;
  ok = world.cops >= 1 && fine.chaseStarted && fine.chasing && coinsDropped
    && fine.fineAmount > 0 && bannerShown && errors.length === 0;

  console.log('RESULT', ok ? 'PASS' : 'FAIL',
    `cops=${world.cops} chaseStarted=${fine.chaseStarted} coins=${fine.coinsBefore}->${fine.coinsAfter} `
    + `fine=${fine.fineAmount}(${fine.fineReason}) banner=${bannerShown} escaped=${escape.ended} draws=${world.draws}`);
} catch (e) {
  errors.push('FATAL: ' + e.message);
  ok = false;
} finally {
  console.log('\n---- CONSOLE / PAGE ERRORS ----');
  console.log(errors.length ? errors.join('\n') : '(none)');
  await browser.close();
  console.log('\nOVERALL', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
}
