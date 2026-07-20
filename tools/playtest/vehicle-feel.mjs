/**
 * Vehicle-juice verification: confirms front-wheel steering, body lean and
 * accel/brake pitch, and checks that the chase camera frames the car well.
 * on a 390x844 phone viewport. Drives the vehicle object directly (bypassing the
 * DOM control pad, same pattern as car-model.mjs) so the test is deterministic.
 *   PORT=5197 node tools/playtest/vehicle-feel.mjs
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';
import fs from 'node:fs';

const PORT = process.env.PORT || '5197';
const MODE = process.env.MODE || 'rush';
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

  await page.goto(`http://127.0.0.1:${PORT}/?mode=${MODE}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.vehicle, { timeout: 15000 });
  await sleep(400);

  // 1) Straight-line hard acceleration from a stop: expect a nose-up squat pitch.
  const accelState = await page.evaluate(async () => {
    const v = window.__three.vehicle;
    v.setSteerAxis(0);
    v.setThrottle(true);
    await new Promise((r) => setTimeout(r, 350)); // short burst so accel is still high
    return {
      kmh: v.speedKmh,
      visPitch: v['visPitch'],
      visLean: v['visLean'],
      hasFrontWheels: !!(v['frontWheels']?.fl && v['frontWheels']?.fr),
    };
  });
  console.log('ACCEL_STATE', JSON.stringify(accelState));
  await page.screenshot({ path: `${SHOT_DIR}/feel-accel.png` });

  // 2) Continue accelerating, then hold a hard turn while still moving: expect
  // the body to lean and both front tyres to point into the turn. Roll stays disabled.
  const turnState = await page.evaluate(async () => {
    const v = window.__three.vehicle;
    await new Promise((r) => setTimeout(r, 900)); // build real speed first
    v.setSteerAxis(1); // full "left" per the game's steer convention
    await new Promise((r) => setTimeout(r, 500)); // let the damped values settle
    return {
      kmh: v.speedKmh,
      visLean: v['visLean'],
      wheelAngle: v['visWheelAngle'],
      flPivotY: v['frontWheels']?.fl?.rotation.y ?? null,
      frPivotY: v['frontWheels']?.fr?.rotation.y ?? null,
      visualRotZ: v['visual'] ? v['visual'].rotation.z : null,
    };
  });
  console.log('TURN_STATE', JSON.stringify(turnState));
  await page.screenshot({ path: `${SHOT_DIR}/feel-turn-behind.png` });

  // Manual front-quarter shot at a closer distance so front-wheel angle is legible
  // (the normal chase cam looks from behind and hides most of the front tyres).
  await page.evaluate(() => {
    const t = window.__three; t.game.stop();
    const v = t.vehicle, cam = t.game.camera;
    const fwd = { x: Math.sin(v.yaw), z: Math.cos(v.yaw) };
    const right = { x: Math.cos(v.yaw), z: -Math.sin(v.yaw) };
    cam.position.set(v.x + fwd.x * 5.5 + right.x * 2.2, 2.1, v.z + fwd.z * 5.5 + right.z * 2.2);
    cam.lookAt(v.x, 0.65, v.z);
    t.game.renderer.render(t.game.scene, t.game.camera);
  });
  await page.screenshot({ path: `${SHOT_DIR}/feel-turn-close.png` });

  // Resume the loop for the next phase.
  await page.evaluate(() => { window.__three.game.start(); });

  // 3) Straighten out, then hard-brake (hold reverse while still rolling forward):
  // expect a nose-down dive pitch (negative-ish accel).
  const brakeState = await page.evaluate(async () => {
    const v = window.__three.vehicle;
    v.setSteerAxis(0);
    await new Promise((r) => setTimeout(r, 500)); // let lean/steer relax back out
    v.setThrottle(false);
    v.setReverse(true); // hard brake per Vehicle3D.update's reverse-hold branch
    await new Promise((r) => setTimeout(r, 200));
    const out = { kmh: v.speedKmh, visPitch: v['visPitch'], visLean: v['visLean'] };
    v.setReverse(false);
    return out;
  });
  console.log('BRAKE_STATE', JSON.stringify(brakeState));
  await page.screenshot({ path: `${SHOT_DIR}/feel-brake.png` });

  // 4) Normal chase-cam framing shot while cruising straight, for the camera
  // acceptance check (car visible, lower-third, not clipped by controls).
  const cruiseState = await page.evaluate(async () => {
    const v = window.__three.vehicle;
    v.setThrottle(true);
    v.setSteerAxis(0);
    await new Promise((r) => setTimeout(r, 900));
    return { kmh: v.speedKmh, draws: window.__three.draws };
  });
  console.log('CRUISE_STATE', JSON.stringify(cruiseState));
  await page.screenshot({ path: `${SHOT_DIR}/feel-cruise-framing.png` });

  await browser.close();
  process.exit(0);
} catch (e) {
  errors.push('FATAL: ' + e.message);
} finally {
  console.log('ERRORS', errors.length ? errors.join('\n') : '(none)');
  await browser.close();
}
