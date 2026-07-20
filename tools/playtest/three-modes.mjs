/**
 * Verify the mode split + bigger free city + building collision, end-to-end in a
 * real headless browser:
 *   1) `/`          → mode-select screen renders (two cards).
 *   2) `?mode=rush` → drives, stays on roads, no errors, screenshot.
 *   3) `?mode=free` → big city + wide avenues, drives, stays on roads, screenshot.
 * On-road = car centre within its line's half-width (avenue-aware) of a grid line.
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR } from './lib.mjs';
import fs from 'node:fs';

const BASE = process.env.DR_URL || 'http://localhost:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--no-sandbox', '--mute-audio', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

async function newPage() {
  const page = await browser.newPage();
  const errors = [];
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return { page, errors };
}

async function driveTest(mode) {
  const { page, errors } = await newPage();
  await page.goto(BASE + '?mode=' + mode, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.vehicle && window.__three.grid, { timeout: 15000 });
  await sleep(400);

  const result = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle, grid = t.grid;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const block = grid.block;
    const tol = 1.4;
    const onRoad = (x, z) => {
      const cl = Math.round(x / block), rl = Math.round(z / block);
      const dx = Math.abs(x - cl * block), dz = Math.abs(z - rl * block);
      return dx <= grid.halfAt(cl) + tol || dz <= grid.halfAt(rl) + tol;
    };
    const startPos = { x: v.x, z: v.z };
    let off = 0, total = 0;
    const steers = ['straight', 'right', 'left', 'right', 'straight', 'left', 'right', 'left'];
    v.setThrottle(true);
    for (const st of steers) {
      v.setSteer(st);
      for (let i = 0; i < 10; i++) {
        await sleep(50); total++;
        if (!onRoad(v.x, v.z)) off++;
      }
    }
    v.setThrottle(false);
    return {
      worldW: grid.worldW, cols: grid.cols, block, avenueEvery: grid.avenueEvery,
      total, off, moved: +(Math.abs(v.x - startPos.x) + Math.abs(v.z - startPos.z)).toFixed(1),
      draws: t.draws, fps: t.fps,
    };
  });
  await page.screenshot({ path: `${SHOT_DIR}/mode-${mode}.png` });
  console.log(`MODE=${mode}`, JSON.stringify(result));
  console.log(result.off === 0
    ? `  PASS — on roads for all ${result.total} samples, moved ${result.moved}m, ${result.draws} draws`
    : `  FAIL — ${result.off}/${result.total} samples off-road`);
  console.log('  errors:', errors.length ? errors.join(' | ') : '(none)');
  await page.close();
  return result.off === 0 && errors.length === 0;
}

let ok = true;
try {
  // 1) Mode-select screen.
  const { page, errors } = await newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  const menu = await page.waitForFunction(
    () => document.querySelector('.dr-mode-rush') && document.querySelector('.dr-mode-free'),
    { timeout: 10000 },
  ).then(() => true).catch(() => false);
  await page.screenshot({ path: `${SHOT_DIR}/mode-select.png` });
  console.log('MODE-SELECT', menu ? 'PASS — two cards render' : 'FAIL — cards missing');
  console.log('  errors:', errors.length ? errors.join(' | ') : '(none)');
  ok = ok && menu && errors.length === 0;
  await page.close();

  // 2) + 3) Rush + Free driving/collision.
  ok = (await driveTest('rush')) && ok;
  ok = (await driveTest('free')) && ok;
} finally {
  await browser.close();
  console.log('\nOVERALL', ok ? 'PASS' : 'FAIL');
}
