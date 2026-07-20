/** Diagnostic: dump each car mesh's local Y-range + name to find why it floats. */
import puppeteer from 'puppeteer-core';
import { findChrome, sleep } from './lib.mjs';

const PORT = process.env.PORT || '5174';
const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 },
});
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/?mode=rush`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.vehicle, { timeout: 15000 });
  await sleep(400);
  const out = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const v = window.__three.vehicle;
    // The prepared holder is the first child of vehicle.object.
    const holder = v.object.children.find((c) => c.type === 'Group') || v.object;
    const model = holder.children[0] || holder;
    const rows = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      rows.push({
        name: o.name || o.parent?.name || '(mesh)',
        minY: +b.min.y.toFixed(2), maxY: +b.max.y.toFixed(2),
        w: +(b.max.x - b.min.x).toFixed(2), d: +(b.max.z - b.min.z).toFixed(2),
      });
    });
    const full = new THREE.Box3().setFromObject(model);
    return { rows, fullMinY: +full.min.y.toFixed(2), fullMaxY: +full.max.y.toFixed(2) };
  });
  console.log('FULL minY/maxY:', out.fullMinY, out.fullMaxY);
  out.rows.sort((a, b) => a.minY - b.minY);
  for (const r of out.rows) console.log(`  minY=${r.minY}  maxY=${r.maxY}  w=${r.w} d=${r.d}  ${r.name}`);
} catch (e) {
  console.log('ERR', e.message);
} finally {
  await browser.close();
  process.exit(0);
}
