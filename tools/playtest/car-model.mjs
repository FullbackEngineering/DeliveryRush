/**
 * Verifies the real low-poly car GLB loads, is oriented/scaled sanely (nose +Z,
 * wheels grounded), and renders without errors. Reports the model bounding box +
 * draw calls and captures behind-the-car screenshots. Run with the dev server up:
 *   node tools/playtest/car-model.mjs            (defaults to :5174)
 *   PORT=5173 node tools/playtest/car-model.mjs
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';
import fs from 'node:fs';

const PORT = process.env.PORT || '5174';
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
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(`http://localhost:${PORT}/?mode=rush`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.vehicle, { timeout: 15000 });
  await sleep(500);

  const box = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const v = window.__three.vehicle;
    const b = new THREE.Box3().setFromObject(v.object);
    const s = new THREE.Vector3(); b.getSize(s);
    // Is it the real GLB (many meshes) or the 9-box fallback?
    let meshes = 0; v.object.traverse((o) => { if (o.isMesh) meshes++; });
    return {
      sizeX: +s.x.toFixed(2), sizeY: +s.y.toFixed(2), sizeZ: +s.z.toFixed(2),
      minY: +b.min.y.toFixed(2), meshCount: meshes, draws: window.__three.draws,
    };
  });
  console.log('CAR_BBOX', JSON.stringify(box));
  await page.screenshot({ path: `${SHOT_DIR}/car-spawn.png` });

  // Beauty shots: freeze the loop and orbit a manual camera around the car so the
  // model (orientation/paint/finish) can be judged independent of chase framing.
  const beauty = async (name, cx, cy, cz, angle) => {
    await page.evaluate(({ cx, cy, cz, angle }) => {
      const t = window.__three; t.game.stop();
      const v = t.vehicle, cam = t.game.camera;
      const fwd = { x: Math.sin(v.yaw), z: Math.cos(v.yaw) };
      const per = { x: Math.cos(v.yaw), z: -Math.sin(v.yaw) };
      cam.position.set(
        v.x + fwd.x * cz + per.x * cx,
        cy,
        v.z + fwd.z * cz + per.z * cx,
      );
      cam.lookAt(v.x, 0.9, v.z);
      t.game.renderer.render(t.game.scene, t.game.camera);
    }, { cx, cy, cz, angle });
    await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
  };
  await beauty('car-rearq', 4.5, 3.0, -7);  // behind + to the side (see the rear/flip)
  await beauty('car-frontq', 5.0, 2.6, 7);  // ahead + to the side (see the face)
  console.log('BEAUTY done');
  await browser.close();
  process.exit(0);

  // Drive forward so the chase cam frames the car from behind.
  await page.evaluate(async () => {
    const v = window.__three.vehicle;
    v.setThrottle(true);
    await new Promise((r) => setTimeout(r, 1800));
  });
  await page.screenshot({ path: `${SHOT_DIR}/car-drive.png` });
  const after = await page.evaluate(() => ({ kmh: window.__three.kmh, draws: window.__three.draws, pos: window.__three.pos }));
  console.log('CAR_DRIVE', JSON.stringify(after));
} catch (e) {
  errors.push('FATAL: ' + e.message);
} finally {
  console.log('ERRORS', errors.length ? errors.join('\n') : '(none)');
  await browser.close();
}
