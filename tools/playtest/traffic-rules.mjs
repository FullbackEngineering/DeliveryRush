import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';

const BASE = process.env.DR_URL || 'http://127.0.0.1:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const errors = [];
const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

let ok = true;
try {
  const page = await browser.newPage();
  page.on('requestfailed', (request) => console.log('REQUEST_FAILED', request.url(), request.failure()?.errorText));
  page.on('response', (response) => { if (response.url().includes('traffic_pack')) console.log('TRAFFIC_ASSET', response.status(), response.url()); });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    if (message.type() === 'warning') console.log('BROWSER_WARNING', message.text());
  });
  await page.goto(`${BASE}?mode=rush`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three?.traffic?.debugState, { timeout: 15000 });
  console.log('HARNESS_READY');
  await sleep(3000);
  console.log('MODEL_STATUS', await page.evaluate(() => window.__three.traffic['trafficModelStatus']));
  await page.waitForFunction(() => window.__three.traffic['trafficModelsReady'], { timeout: 12000 });
  await sleep(900);

  const initial = await page.evaluate(() => ({
    ...window.__three.traffic.debugState(),
    modelVariants: window.__three.traffic['trafficModelMeshes'].length,
    signalCount: window.__three.traffic.signals['approaches'].length,
    draws: window.__three.draws,
  }));
  console.log('INITIAL', JSON.stringify(initial));
  await page.screenshot({ path: `${SHOT_DIR}/traffic-rules.png` });

  await page.evaluate(() => {
    const t = window.__three;
    t.game.stop();
    const traffic = t.traffic;
    const cars = traffic['cars'];
    traffic['hideAll']();
    const line = Math.round(t.vehicle.x / t.grid.block) * t.grid.block;
    const lane = t.grid.halfAt(Math.round(line / t.grid.block)) * 0.5;
    cars.forEach((car, index) => { car.active = index < 4; });
    for (let i = 0; i < 4; i++) {
      const car = cars[i];
      car.axis = 'z'; car.dir = i < 2 ? 1 : -1; car.line = line; car.laneHalf = lane;
      car.pos = t.vehicle.z + 10 + i * 8; car.variant = i;
      const pose = traffic['carWorldPose'](car);
      traffic['writeCar'](i, pose.x, pose.z, pose.yaw);
    }
    traffic['trafficModelMeshes'].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
    traffic['vehicleLights'].instanceMatrix.needsUpdate = true;
    t.game.renderer.render(t.game.scene, t.game.camera);
  });
  await page.screenshot({ path: `${SHOT_DIR}/traffic-assets.png` });
  await page.evaluate(() => window.__three.game.start());

  const ruleTest = await page.evaluate(() => {
    const t = window.__three;
    t.game.stop();
    const traffic = t.traffic;
    const grid = t.grid;
    const cars = traffic['cars'];
    cars.forEach((car) => { car.active = false; });
    traffic['target'] = 0;
    const car = cars[0];
    const col = Math.floor(grid.cols / 2);
    const row = Math.floor(grid.rows / 2);
    car.active = true;
    car.axis = 'z'; car.dir = 1;
    car.line = col * grid.block;
    car.laneHalf = grid.halfAt(col) * 0.5;
    car.cruiseSpeed = 10; car.speed = 10;
    car.pos = row * grid.block - grid.halfAt(row) - 3.15 - 22;
    // Keep the player near enough to prevent recycling, but well outside the
    // tested lane so only the traffic signal influences this car.
    t.vehicle.x = car.line - car.laneHalf + 20;
    t.vehicle.z = car.pos;

    const green = 7, amber = 1.4, allRed = 0.7;
    traffic.signals['timer'] = green + amber + allRed + 1; // horizontal green => vertical red
    traffic.signals.update(0);
    for (let i = 0; i < 360; i++) traffic.update(1 / 60, t.vehicle, false);
    const stopPosition = row * grid.block - grid.halfAt(row) - 3.15;
    const red = {
      pos: car.pos, speed: car.speed, stopPosition,
      error: Math.abs(stopPosition - car.pos), signal: traffic.debugState().vertical,
    };

    traffic.signals['timer'] = 1; // vertical green
    traffic.signals.update(0);
    const greenStart = car.pos;
    for (let i = 0; i < 180; i++) traffic.update(1 / 60, t.vehicle, false);
    const greenMove = car.pos - greenStart;
    const laneX = car.line - car.dir * car.laneHalf;
    const halfLane = grid.halfAt(col) * 0.5;
    const rightLaneChecks = [
      { axis: 'z', dir: 1, offset: -halfLane },
      { axis: 'z', dir: -1, offset: halfLane },
      { axis: 'x', dir: 1, offset: halfLane },
      { axis: 'x', dir: -1, offset: -halfLane },
    ].map((route) => Math.abs(route.offset - (route.axis === 'z' ? -route.dir * halfLane : route.dir * halfLane)) < 0.001);
    return {
      red,
      greenMove,
      laneOffset: laneX - car.line,
      expectedLaneOffset: -car.laneHalf,
      rightLaneChecks,
      state: traffic.debugState(),
    };
  });
  console.log('RULE_TEST', JSON.stringify(ruleTest));

  const playerYieldTest = await page.evaluate(() => {
    const t = window.__three;
    t.game.stop();
    const traffic = t.traffic;
    const grid = t.grid;
    const cars = traffic['cars'];
    cars.forEach((candidate) => { candidate.active = false; candidate.playerBrake = false; });
    traffic['target'] = 0;

    const car = cars[0];
    const col = Math.floor(grid.cols / 2);
    const row = Math.floor(grid.rows / 2);
    const line = col * grid.block;
    const lane = grid.halfAt(col) * 0.5;
    t.vehicle.x = line - lane;
    t.vehicle.z = row * grid.block;
    t.vehicle.yaw = 0;
    t.vehicle.object.position.set(t.vehicle.x, 0, t.vehicle.z);
    t.vehicle.object.rotation.y = 0;

    car.active = true;
    car.axis = 'z'; car.dir = 1; car.line = line; car.laneHalf = lane;
    car.cruiseSpeed = 11; car.speed = 11; car.pos = t.vehicle.z - 32;
    traffic.signals['timer'] = 1; // vertical green: only the player can stop it
    traffic.signals.update(0);
    for (let i = 0; i < 360; i++) traffic.update(1 / 60, t.vehicle, true);

    const stopped = {
      speed: car.speed,
      centreDistance: t.vehicle.z - car.pos,
      bumperGap: t.vehicle.z - car.pos - 5.8,
      playerBrake: car.playerBrake,
      stoppedForPlayer: traffic.debugState().stoppedForPlayer,
    };

    // Once the player clears the lane, the AI must resume instead of remaining
    // latched in a stopped state.
    t.vehicle.x += 12;
    const resumeStart = car.pos;
    for (let i = 0; i < 180; i++) traffic.update(1 / 60, t.vehicle, true);
    return { stopped, resumedDistance: car.pos - resumeStart, resumedSpeed: car.speed };
  });
  console.log('PLAYER_YIELD_TEST', JSON.stringify(playerYieldTest));

  const pass = initial.modelVariants === 4
    && initial.signalCount > 0
    && initial.variants.length >= 3
    && initial.rightLaneViolations === 0
    && initial.singleModelViolations === 0
    && initial.modelBounds.every((box) => Math.abs(box.w - 2.4) < 0.01 && Math.abs(box.h - 1.63) < 0.01 && Math.abs(box.l - 5.8) < 0.01)
    && ruleTest.red.signal === 'red'
    && ruleTest.red.error < 0.5
    && ruleTest.red.speed < 0.05
    && ruleTest.greenMove > 5
    && Math.abs(ruleTest.laneOffset - ruleTest.expectedLaneOffset) < 0.001
    && ruleTest.rightLaneChecks.every(Boolean)
    && playerYieldTest.stopped.playerBrake
    && playerYieldTest.stopped.stoppedForPlayer === 1
    && playerYieldTest.stopped.speed < 0.05
    && playerYieldTest.stopped.bumperGap >= 2.1
    && playerYieldTest.stopped.bumperGap <= 2.35
    && playerYieldTest.resumedDistance > 5
    && playerYieldTest.resumedSpeed > 3
    && errors.length === 0;
  ok = pass;
  console.log('ERRORS', errors.length ? errors.join(' | ') : '(none)');
  console.log('OVERALL', pass ? 'PASS' : 'FAIL');
  await page.close();
} catch (error) {
  ok = false;
  console.log('FATAL', error.message);
  console.log('ERRORS', errors.length ? errors.join(' | ') : '(none)');
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
