/**
 * Phase-1 Three.js skeleton check: boots the new renderer, confirms the whole
 * 16×16 city renders in very few draw calls (the perf fix), and screenshots it.
 * Note: headless FPS is unreliable (software GL + RAF throttling); the draw-call
 * count is the meaningful signal here. Run: `node tools/playtest/three-smoke.mjs`.
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
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto('http://localhost:5173/?mode=rush', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.draws > 0, { timeout: 15000 });
  await sleep(1500);
  const stats = await page.evaluate(() => ({ fps: window.__three.fps, draws: window.__three.draws, tris: window.__three.tris }));
  console.log('THREE_SKELETON', JSON.stringify(stats), '(fps unreliable headless; draws is the signal)');
  await page.screenshot({ path: `${SHOT_DIR}/three-01.png` });
} catch (e) {
  errors.push(`FATAL: ${e.message}`);
} finally {
  console.log('---- ERRORS ----');
  console.log(errors.length ? errors.join('\n') : '(none)');
  await browser.close();
}
