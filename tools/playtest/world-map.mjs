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
  await sleep(700);

  const created = await page.evaluate(async () => {
    const { WorldMap } = await import('/src/ui/WorldMap.ts');
    const t = window.__three;
    const host = document.createElement('div');
    host.id = 'world-map-test-host';
    Object.assign(host.style, { position: 'fixed', right: '12px', top: '380px', zIndex: '30' });
    document.querySelector('#ui').appendChild(host);
    const map = new WorldMap({
      mount: host, scene: t.game.scene, grid: t.grid, size: 150, updateHz: 10,
      getSnapshot: () => {
        const markers = [];
        if (t.order?.target) {
          const target = t.nodePos(t.order.target.col, t.order.target.row);
          markers.push({ ...target, kind: t.order.pickedUp ? 'dropoff' : 'pickup', label: t.order.kind });
        }
        if (t.pois) {
          for (const poi of t.pois) markers.push({ x: poi.x, z: poi.z, kind: 'poi' });
        }
        return { player: { x: t.vehicle.x, z: t.vehicle.z, yaw: t.vehicle.yaw, kind: 'player' }, markers };
      },
    });
    map.render();
    window.__worldMap = map;
    return {
      cols: t.grid.cols, rows: t.grid.rows, worldW: t.grid.worldW, worldD: t.grid.worldD,
      webglCanvases: host.querySelectorAll('canvas.dr-world-map__world').length,
      overlayCanvases: host.querySelectorAll('canvas.dr-world-map__overlay').length,
      size: host.querySelector('.dr-world-map').getBoundingClientRect().width,
    };
  });
  await sleep(400);
  await page.screenshot({ path: `${SHOT_DIR}/world-map-${mode}.png` });
  const ok = created.webglCanvases === 1 && created.overlayCanvases === 1
    && created.cols > 0 && created.rows > 0 && Math.abs(created.size - 150) < 1
    && errors.length === 0;
  console.log(`MODE=${mode.toUpperCase()} ${ok ? 'PASS' : 'FAIL'} ${JSON.stringify(created)}`);
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
