/** Standalone live-world-map verification for both Three.js driving modes. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';

const BASE = process.env.DR_URL || 'http://127.0.0.1:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

async function testMode(mode) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto(`${BASE}?mode=${mode}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three?.vehicle && window.__three?.grid, { timeout: 15000 });
  await page.waitForSelector('.dr-world-map', { timeout: 10000 });
  await sleep(900);

  const created = await page.evaluate(() => {
    const t = window.__three;
    const root = document.querySelector('.dr-world-map');
    t.worldMap.render();
    const cameraX = t.worldMap.camera.position.x;
    const originalX = t.vehicle.x;
    t.vehicle.x += t.grid.block;
    t.worldMap.render();
    const viewFollowsPlayer = Math.abs(t.worldMap.camera.position.x - cameraX - t.grid.block) < 0.01;
    t.vehicle.x = originalX;
    t.worldMap.render();
    return {
      cols: t.grid.cols, rows: t.grid.rows, worldW: t.grid.worldW, worldD: t.grid.worldD,
      mapCount: document.querySelectorAll('.dr-world-map').length,
      webglCanvases: root.querySelectorAll('canvas.dr-world-map__world').length,
      overlayCanvases: root.querySelectorAll('canvas.dr-world-map__overlay').length,
      size: root.getBoundingClientRect().width,
      integratedRush: !!document.querySelector('.dr-world-map--rush'),
      integratedFree: !!document.querySelector('.dr-free-map-wrap .dr-world-map--embedded'),
      legacyFreeCanvas: !!document.querySelector('.dr-free-map-wrap > .dr-free-map'),
      viewFollowsPlayer,
      circular: getComputedStyle(root).borderRadius === '50%',
    };
  });
  const performance = await page.evaluate(async () => {
    const t = window.__three;
    const map = t.worldMap;
    let sourceRenders = 0;
    let snapshotCalls = 0;
    const originalRender = map.renderer.render.bind(map.renderer);
    const originalSnapshot = map.options.getSnapshot;
    map.renderer.render = (...args) => { sourceRenders++; return originalRender(...args); };
    map.options.getSnapshot = () => { snapshotCalls++; return originalSnapshot(); };
    const start = { x: t.vehicle.x, z: t.vehicle.z };
    t.vehicle.speedMultiplier = 2.5;
    t.vehicle.setThrottle(true);
    await new Promise((resolve) => setTimeout(resolve, 2200));
    t.vehicle.setThrottle(false);
    map.renderer.render = originalRender;
    map.options.getSnapshot = originalSnapshot;
    return {
      sourceRenders,
      snapshotCalls,
      moved: Math.hypot(t.vehicle.x - start.x, t.vehicle.z - start.z),
      fps: t.fps,
    };
  });
  await sleep(400);
  await page.screenshot({ path: `${SHOT_DIR}/world-map-${mode}.png` });
  const integrated = mode === 'rush' ? created.integratedRush : created.integratedFree && !created.legacyFreeCanvas;
  const ok = created.mapCount === 1 && created.webglCanvases === 1 && created.overlayCanvases === 1
    && created.cols > 0 && created.rows > 0 && created.size >= 95 && created.size <= 140
    && created.viewFollowsPlayer && created.circular && integrated
    && performance.sourceRenders === 0 && performance.snapshotCalls <= 40
    && errors.length === 0;
  console.log(`MODE=${mode.toUpperCase()} ${ok ? 'PASS' : 'FAIL'} ${JSON.stringify(created)}`);
  console.log(`  performance ${JSON.stringify(performance)}`);
  console.log('  errors', errors.length ? errors.join(' | ') : '(none)');
  await page.close();
  return ok;
}

let ok = false;
try {
  ok = (await testMode('rush')) && (await testMode('free'));
} finally {
  await browser.close();
}
console.log(`OVERALL ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
