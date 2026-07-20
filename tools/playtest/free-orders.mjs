/**
 * Phase 1 (open-world orders) check: boots SERBEST (`?mode=free`), confirms POIs
 * render, then exercises the PRIMARY interaction — stop-to-order:
 *   1) drives fast through a source POI's zone and asserts its order panel does
 *      NOT open while still moving (driving through must never interrupt driving);
 *   2) brakes to a stop inside the same zone and asserts the panel DOES open with
 *      2-4 orders;
 *   3) accepts one (via a real DOM click) — since the car is already parked at the
 *      source, pickup should register almost immediately;
 *   4) auto-drives (grid-waypoint routing, so it follows roads instead of cutting
 *      diagonally through buildings) to the delivery destination and asserts
 *      JobDelivered fires and `Profile.coins` actually changed.
 * Also screenshots the minimap, the stop panel, and the post-delivery state.
 * Run: node tools/playtest/free-orders.mjs   (dev server up on 5173 or 5174)
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';
import fs from 'node:fs';

const BASE = process.env.DR_URL || 'http://localhost:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const errors = [];

const browser = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--no-sandbox', '--mute-audio', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

let ok = true;
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

  await page.goto(BASE + '?mode=free', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(
    () => window.__three && window.__three.vehicle && window.__three.grid && window.__three.board,
    { timeout: 15000 },
  );
  await page.waitForFunction(() => window.__three.pois.length > 0, { timeout: 10000 });
  await sleep(300);

  const world = await page.evaluate(() => ({
    poiCount: window.__three.pois.length,
    poiTypes: [...new Set(window.__three.pois.map((p) => p.type))],
    coinsStart: window.__three.coins,
    draws: window.__three.draws,
  }));
  console.log('WORLD', JSON.stringify(world));
  await page.screenshot({ path: `${SHOT_DIR}/free-orders-world.png` });

  // --- Drive to the nearest source POI: fast approach (assert no auto-open),
  // then brake to a stop inside its zone (assert the panel DOES open). --------
  const stopTest = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle, block = t.grid.block;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    v.speedMultiplier = 3.5;

    // Pick the source nearest by GRID CELLS (Manhattan), not straight-line
    // distance — on this road network that tracks actual drive distance/turns
    // far better (a Euclidean-nearest POI can still need a long detour).
    const sources = t.pois.filter((p) => p.isSource);
    const startCol = Math.round(v.x / block), startRow = Math.round(v.z / block);
    const source = sources.reduce((best, p) => {
      const d = Math.abs(p.col - startCol) + Math.abs(p.row - startRow);
      return d < best.d ? { p, d } : best;
    }, { p: sources[0], d: Infinity }).p;

    // A POI's (col,row) is its plot's LOW corner — but the marker itself is
    // edge-snapped (see world/Pois.ts), so the nearest *intersection* to route
    // through may be any of the plot's 4 corners depending which edge it faces.
    // Then, instead of driving all the way to the POI's exact (off-road) point,
    // clamp the final approach onto the nearest corridor actually reachable
    // within Nav.reachM — a corner is a road CENTRELINE, not its edge, so
    // aiming there directly can still land short of reach.
    function nearestCorner(target) {
      const candidates = [
        { col: target.col, row: target.row },
        { col: target.col + 1, row: target.row },
        { col: target.col, row: target.row + 1 },
        { col: target.col + 1, row: target.row + 1 },
      ].map((c) => ({ ...c, x: c.col * block, z: c.row * block }));
      return candidates.reduce((best, c) => {
        const d = Math.hypot(c.x - target.x, c.z - target.z);
        return d < best.d ? { c, d } : best;
      }, { c: candidates[0], d: Infinity }).c;
    }
    function nearPoint(target, corner) {
      const halfCol = t.grid.halfAt(corner.col) - 0.6;
      const halfRow = t.grid.halfAt(corner.row) - 0.6;
      const xOnCol = Math.min(Math.max(target.x, corner.x - halfCol), corner.x + halfCol);
      const distCol = Math.abs(xOnCol - target.x);
      const zOnRow = Math.min(Math.max(target.z, corner.z - halfRow), corner.z + halfRow);
      const distRow = Math.abs(zOnRow - target.z);
      return distCol <= distRow ? { x: xOnCol, z: target.z } : { x: target.x, z: zOnRow };
    }
    function buildPath(fromX, fromZ, target) {
      const curCol = Math.round(fromX / block), curRow = Math.round(fromZ / block);
      const corner = nearestCorner(target);
      const np = nearPoint(target, corner);
      return [
        { x: curCol * block, z: curRow * block },
        { x: corner.x, z: curRow * block },
        { x: corner.x, z: corner.z },
        { x: np.x, z: np.z },
      ];
    }
    async function driveWaypoints(path, budgetMs, opts = {}) {
      let elapsed = 0;
      let observedDriveThroughOpen = false;
      let sawFastInZone = false;
      for (const wp of path) {
        let guard = 0;
        while (Math.hypot(wp.x - v.x, wp.z - v.z) > 6 && guard < 900 && elapsed < budgetMs) {
          const dx = wp.x - v.x, dz = wp.z - v.z;
          let err = Math.atan2(dx, dz) - v.yaw;
          while (err > Math.PI) err -= 2 * Math.PI;
          while (err < -Math.PI) err += 2 * Math.PI;
          v.setThrottle(Math.abs(err) < 0.4 || v.currentSpeed < 9);
          v.setSteer(err > 0.1 ? 'left' : err < -0.1 ? 'right' : 'straight');
          if (opts.checkDriveThrough) {
            const dist = Math.hypot(opts.checkDriveThrough.x - v.x, opts.checkDriveThrough.z - v.z);
            if (dist <= 13 && v.speedKmh >= 4) {
              sawFastInZone = true;
              if (t.board.stoppedAt) observedDriveThroughOpen = true;
            }
          }
          await sleep(50);
          elapsed += 50;
          guard++;
        }
        if (elapsed >= budgetMs) break;
      }
      return { elapsed, observedDriveThroughOpen, sawFastInZone };
    }

    // Phase A: fast approach — must NOT open while still moving through the zone.
    const path = buildPath(v.x, v.z, source);
    const approach = await driveWaypoints(path, 180000, { checkDriveThrough: source });

    // Phase B: brake to a full stop right where we are (should already be inside
    // or very near the zone after the approach's final leg targets the POI itself).
    v.setThrottle(false);
    v.setSteer('straight');
    let stopElapsed = 0;
    while (v.speedKmh > 0 && stopElapsed < 8000) { await sleep(50); stopElapsed += 50; }
    // Nudge into the zone if the final waypoint undershot (short direct crawl).
    let nudgeElapsed = 0;
    while (Math.hypot(source.x - v.x, source.z - v.z) > 11 && nudgeElapsed < 15000) {
      const dx = source.x - v.x, dz = source.z - v.z;
      let err = Math.atan2(dx, dz) - v.yaw;
      while (err > Math.PI) err -= 2 * Math.PI;
      while (err < -Math.PI) err += 2 * Math.PI;
      v.setThrottle(v.currentSpeed < 3);
      v.setSteer(err > 0.1 ? 'left' : err < -0.1 ? 'right' : 'straight');
      await sleep(50);
      nudgeElapsed += 50;
    }
    v.setThrottle(false);
    while (v.speedKmh > 0) { await sleep(50); }
    await sleep(400); // let JobBoard.tick observe the stop

    return {
      sourceName: source.name,
      approachElapsed: approach.elapsed,
      sawFastInZone: approach.sawFastInZone,
      driveThroughOpened: approach.observedDriveThroughOpen,
      distToSource: +Math.hypot(source.x - v.x, source.z - v.z).toFixed(1),
      speedKmh: v.speedKmh,
      stoppedAtId: t.board.stoppedAt?.id ?? null,
      stoppedAtName: t.board.stoppedAt?.name ?? null,
    };
  });
  console.log('STOP-TEST', JSON.stringify(stopTest));
  await sleep(200);
  await page.screenshot({ path: `${SHOT_DIR}/free-orders-stop-panel.png` });
  const panelOpen = await page.evaluate(() => document.querySelector('.dr-stop-panel.open') !== null);
  const stopRowCount = await page.evaluate(() => document.querySelectorAll('.dr-stop-panel .dr-job-row').length);
  console.log('STOP-PANEL-DOM', JSON.stringify({ panelOpen, stopRowCount }));

  // --- Accept the first order in the panel (real DOM click) ------------------
  const accepted = await page.evaluate(() => {
    const row = document.querySelector('.dr-stop-panel .dr-job-row');
    if (!row) return false;
    row.click();
    return true;
  });
  await page.waitForFunction(() => !!window.__three.job, { timeout: 5000 }).catch(() => {});
  await sleep(250);
  const afterAccept = await page.evaluate(() => ({ job: window.__three.job, panelOpen: document.querySelector('.dr-stop-panel.open') !== null }));
  console.log('ACCEPTED', accepted, JSON.stringify(afterAccept));

  // --- Drive to the destination (grid-waypoint routed) ------------------------
  const drive = await page.evaluate(async () => {
    const t = window.__three, v = t.vehicle, block = t.grid.block;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    v.speedMultiplier = 3.5;
    const coinsBefore = t.coins;

    // See the stop-test phase above for why this clamps onto the nearest
    // reachable corridor instead of aiming at the POI's exact off-road point.
    function nearestCorner(target) {
      const candidates = [
        { col: target.col, row: target.row },
        { col: target.col + 1, row: target.row },
        { col: target.col, row: target.row + 1 },
        { col: target.col + 1, row: target.row + 1 },
      ].map((c) => ({ ...c, x: c.col * block, z: c.row * block }));
      return candidates.reduce((best, c) => {
        const d = Math.hypot(c.x - target.x, c.z - target.z);
        return d < best.d ? { c, d } : best;
      }, { c: candidates[0], d: Infinity }).c;
    }
    function nearPoint(target, corner) {
      const halfCol = t.grid.halfAt(corner.col) - 0.6;
      const halfRow = t.grid.halfAt(corner.row) - 0.6;
      const xOnCol = Math.min(Math.max(target.x, corner.x - halfCol), corner.x + halfCol);
      const distCol = Math.abs(xOnCol - target.x);
      const zOnRow = Math.min(Math.max(target.z, corner.z - halfRow), corner.z + halfRow);
      const distRow = Math.abs(zOnRow - target.z);
      return distCol <= distRow ? { x: xOnCol, z: target.z } : { x: target.x, z: zOnRow };
    }
    function buildPath(fromX, fromZ, target) {
      const curCol = Math.round(fromX / block), curRow = Math.round(fromZ / block);
      const corner = nearestCorner(target);
      const np = nearPoint(target, corner);
      return [
        { x: curCol * block, z: curRow * block },
        { x: corner.x, z: curRow * block },
        { x: corner.x, z: corner.z },
        { x: np.x, z: np.z },
      ];
    }
    async function driveWaypoints(path, budgetMs) {
      let elapsed = 0;
      for (const wp of path) {
        let guard = 0;
        while (Math.hypot(wp.x - v.x, wp.z - v.z) > 6 && guard < 900 && elapsed < budgetMs) {
          const dx = wp.x - v.x, dz = wp.z - v.z;
          let err = Math.atan2(dx, dz) - v.yaw;
          while (err > Math.PI) err -= 2 * Math.PI;
          while (err < -Math.PI) err += 2 * Math.PI;
          v.setThrottle(Math.abs(err) < 0.4 || v.currentSpeed < 9);
          v.setSteer(err > 0.1 ? 'left' : err < -0.1 ? 'right' : 'straight');
          await sleep(50);
          elapsed += 50;
          guard++;
        }
        if (elapsed >= budgetMs) break;
      }
      return elapsed;
    }

    const job = t.job;
    let elapsed = 0;
    let sawPickup = job ? job.state === 'toDropoff' : false;
    if (job && job.state === 'toPickup') {
      // Shouldn't normally happen (stop-to-order means you're already at the
      // source), but drive to it just in case the zone/pickup hasn't ticked yet.
      elapsed += await driveWaypoints(buildPath(v.x, v.z, job.source), 20000);
      sawPickup = t.job ? t.job.state === 'toDropoff' : !t.job;
    }
    const job2 = t.job;
    if (job2 && job2.state === 'toDropoff') {
      elapsed += await driveWaypoints(buildPath(v.x, v.z, job2.dest), 150000);
    }
    v.setThrottle(false);
    v.setSteer('straight');
    await sleep(200);
    return {
      sawPickup, delivered: !t.job, coinsBefore, coinsAfter: t.coins,
      draws: t.draws, fps: t.fps, elapsedMs: elapsed,
    };
  });
  console.log('DRIVE-TO-DEST', JSON.stringify(drive));
  await sleep(200);
  await page.screenshot({ path: `${SHOT_DIR}/free-orders-after.png` });

  const coinsChanged = drive.coinsAfter !== drive.coinsBefore;
  ok = world.poiCount >= 10
    && stopTest.sawFastInZone && !stopTest.driveThroughOpened
    && panelOpen && stopRowCount >= 2 && stopRowCount <= 4
    && accepted && drive.sawPickup && drive.delivered && coinsChanged
    && errors.length === 0;

  console.log('RESULT', ok ? 'PASS' : 'FAIL',
    `pois=${world.poiCount} fastInZone=${stopTest.sawFastInZone} driveThroughOpened=${stopTest.driveThroughOpened} `
    + `panelOpen=${panelOpen} rows=${stopRowCount} accepted=${accepted} pickup=${drive.sawPickup} `
    + `delivered=${drive.delivered} coins=${drive.coinsBefore}->${drive.coinsAfter} draws=${drive.draws} fps=${drive.fps}`);
} catch (e) {
  errors.push('FATAL: ' + e.message);
  ok = false;
} finally {
  console.log('\n---- CONSOLE / PAGE ERRORS ----');
  console.log(errors.length ? errors.join('\n') : '(none)');
  await browser.close();
  console.log('\nOVERALL', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 1);
}
