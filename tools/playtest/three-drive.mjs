/**
 * Phase 3+4 check: drive the car in the 3D city. Holds the gas, taps steering,
 * and confirms the car moves, speeds up, and commits turns — plus a screenshot.
 * Headless clock is slow so absolute speed is low, but movement/turning/draws are
 * the signal. Run: `node tools/playtest/three-drive.mjs` (dev server up).
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
  await page.waitForFunction(() => window.__three && window.__three.vehicle, { timeout: 15000 });
  await sleep(300);
  const start = await page.evaluate(() => window.__three.pos);
  const info = await page.evaluate(() => {
    const t = window.__three, c = t.game.camera.position;
    return { car: t.pos, yaw: t.yaw, cam: { x: Math.round(c.x), y: Math.round(c.y), z: Math.round(c.z) } };
  });
  console.log('SPAWN', JSON.stringify(info));
  await page.screenshot({ path: `${SHOT_DIR}/three-spawn.png` });

  // Drive straight down the road, then screenshot the street view.
  await page.evaluate(async () => {
    const v = window.__three.vehicle;
    v.setThrottle(true);
    await new Promise((r) => setTimeout(r, 2200));
  });
  await page.screenshot({ path: `${SHOT_DIR}/three-drive.png` });

  const drive = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    v.setThrottle(true);
    let maxKmh = 0;
    const yaw0 = v.yaw;
    for (let i = 0; i < 12; i++) { await sleep(100); maxKmh = Math.max(maxKmh, t.kmh); } // straight
    v.setSteer('right');
    for (let i = 0; i < 16; i++) { await sleep(100); maxKmh = Math.max(maxKmh, t.kmh); } // hold right
    const yawRight = v.yaw;
    v.setSteer('left');
    for (let i = 0; i < 16; i++) { await sleep(100); } // hold left
    const yawLeft = v.yaw;
    v.setSteer('straight');
    return {
      end: t.pos, maxKmh, draws: t.draws,
      yaw0: +yaw0.toFixed(2), yawRight: +yawRight.toFixed(2), yawLeft: +yawLeft.toFixed(2),
      turnedRight: Math.abs(yawRight - yaw0) > 0.3, turnedBackLeft: yawLeft < yawRight,
    };
  });
  const moved = Math.abs(drive.end.x - start.x) + Math.abs(drive.end.z - start.z);
  console.log('DRIVE3D', JSON.stringify({ start, ...drive, moved }));
  await page.screenshot({ path: `${SHOT_DIR}/three-drive.png` });
} catch (e) {
  errors.push('FATAL: ' + e.message);
} finally {
  console.log('ERRORS', errors.length ? errors.join('\n') : '(none)');
  await browser.close();
}
