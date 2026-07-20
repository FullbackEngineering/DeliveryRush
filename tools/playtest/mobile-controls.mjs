/**
 * Real-touch regression test for the Three.js mobile driving controls.
 * Verifies hit testing, hold/release, pointer capture, analog steering and
 * reverse in both RUSH and SERBEST at the 390x844 phone viewport.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';

const BASE = process.env.DR_URL || 'http://localhost:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

async function point(page, selector) {
  return page.$eval(selector, (el, expectedSelector) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, w: r.width, h: r.height,
      hit: hit?.className || hit?.tagName || '', matches: !!hit?.closest(expectedSelector) };
  }, selector);
}

async function touch(client, type, points) {
  await client.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

async function testMode(mode) {
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(`${BASE}?mode=${mode}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three?.vehicle && window.__three?.bus, { timeout: 15000 });
  if (mode === 'rush') {
    await page.waitForFunction(() => window.__three?.state?.running === true, { timeout: 8000 });
  }
  await page.waitForSelector('.dr-wheel');
  await sleep(250);
  await page.evaluate(() => {
    window.__mobileEvents = [];
    const b = window.__three.bus;
    b.on('control:throttle', (v) => window.__mobileEvents.push(['gas', v]));
    b.on('control:steeraxis', (v) => window.__mobileEvents.push(['steer', +v.toFixed(2)]));
    b.on('control:reverse', (v) => window.__mobileEvents.push(['reverse', v]));
  });

  const gas = await point(page, '.dr-pedal');
  const wheel = await point(page, '.dr-wheel');
  const reverse = await point(page, '.dr-reverse');
  const hitOk = gas.matches && wheel.matches && reverse.matches;

  // Gas must remain held after the finger leaves the visible button. This is
  // the mobile edge case covered by setPointerCapture().
  await touch(client, 'touchStart', [{ x: gas.x, y: gas.y, radiusX: 8, radiusY: 8 }]);
  await sleep(180);
  const gasDown = await page.evaluate(() => window.__three.vehicle.throttle === true);
  await touch(client, 'touchMove', [{ x: gas.x - 100, y: gas.y - 100, radiusX: 8, radiusY: 8 }]);
  await sleep(180);
  const gasCaptured = await page.evaluate(() => window.__three.vehicle.throttle === true);
  await touch(client, 'touchEnd', []);
  await sleep(100);
  const gasUp = await page.evaluate(() => window.__three.vehicle.throttle === false);

  // Drag right: DriveControls deliberately emits a negative axis (Vehicle3D's
  // sign convention); release must recenter to zero.
  await touch(client, 'touchStart', [{ x: wheel.x, y: wheel.y, radiusX: 8, radiusY: 8 }]);
  await touch(client, 'touchMove', [{ x: wheel.x + 60, y: wheel.y, radiusX: 8, radiusY: 8 }]);
  await sleep(120);
  const steerDown = await page.evaluate(() => window.__three.vehicle.steerInput);
  await touch(client, 'touchEnd', []);
  await sleep(100);
  const steerUp = await page.evaluate(() => window.__three.vehicle.steerInput);

  await touch(client, 'touchStart', [{ x: reverse.x, y: reverse.y, radiusX: 8, radiusY: 8 }]);
  await sleep(120);
  const reverseDown = await page.evaluate(() => window.__three.vehicle.reverse === true);
  await touch(client, 'touchEnd', []);
  await sleep(100);
  const reverseUp = await page.evaluate(() => window.__three.vehicle.reverse === false);

  const events = await page.evaluate(() => window.__mobileEvents);
  await page.screenshot({ path: `${SHOT_DIR}/mobile-controls-${mode}.png` });
  const eventsOk = events.some(([k, v]) => k === 'gas' && v === true)
    && events.some(([k, v]) => k === 'gas' && v === false)
    && events.some(([k, v]) => k === 'steer' && Math.abs(v) > 0.5)
    && events.some(([k, v]) => k === 'steer' && v === 0)
    && events.some(([k, v]) => k === 'reverse' && v === true)
    && events.some(([k, v]) => k === 'reverse' && v === false);
  const ok = hitOk && gasDown && gasCaptured && gasUp && steerDown < -0.5
    && steerUp === 0 && reverseDown && reverseUp && eventsOk && errors.length === 0;

  console.log(`MODE=${mode.toUpperCase()} ${ok ? 'PASS' : 'FAIL'}`);
  console.log('  hit-test', JSON.stringify({ gas, wheel, reverse }));
  console.log('  state', JSON.stringify({ gasDown, gasCaptured, gasUp, steerDown, steerUp, reverseDown, reverseUp }));
  console.log('  events', JSON.stringify(events));
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
console.log(`\nOVERALL ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
