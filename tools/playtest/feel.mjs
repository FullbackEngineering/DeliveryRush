/**
 * Driving-feel report: throttle profile (idle / accel curve / top / brake curve),
 * plus a random-steer session measuring turns, grid containment, and crash rate.
 * The single best tool for tuning the driving in src/core/Balance.ts.
 *
 * Note: wall-clock ms are distorted under headless (slow scene clock); trust the
 * steady-state values (idle/top speed, series shape, bounds, crash count).
 * Run: `npm run playtest:feel` (dev server must run).
 */
import { withGame, startRun, SHOT_DIR, sleep } from './lib.mjs';

await withGame(async (page) => {
  await startRun(page);

  // --- Throttle profile ---------------------------------------------------
  const throttle = await page.evaluate(async () => {
    const g = window.game.scene.getScene('Game');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const cruise = g.vehicle.cruiseSpeed;
    const spd = () => Math.round(g.vehicle.currentSpeed);
    window.bus.emit('control:throttle', false); await sleep(2500);
    const idle = spd();
    window.bus.emit('control:throttle', true);
    const accel = []; for (let i = 0; i < 40; i++) { await sleep(50); accel.push(spd()); }
    const top = spd();
    window.bus.emit('control:throttle', false);
    const decel = []; for (let i = 0; i < 40; i++) { await sleep(50); decel.push(spd()); }
    return {
      cruise: Math.round(cruise), idle, idleFraction: +(idle / cruise).toFixed(2),
      top, topFraction: +(top / cruise).toFixed(2),
      accelSeries: accel.filter((_, i) => i % 4 === 0),
      decelSeries: decel.filter((_, i) => i % 4 === 0),
    };
  });
  console.log('THROTTLE', JSON.stringify(throttle, null, 2));

  // --- Driving: alternate turns (deterministic) / bounds / crashes --------
  // Alternates left/right so turns reliably commit despite the slow headless
  // clock — verifies the buffered-turn mechanic and grid containment.
  const drive = await page.evaluate(async () => {
    const g = window.game.scene.getScene('Game');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const off = 40, W = g.grid.worldW, H = g.grid.worldH;
    let turns = 0, crashes = 0, oob = 0, steersSent = 0, last = g.vehicle.dir, wasInv = false;
    const seen = new Set([last]);
    window.bus.emit('control:throttle', true); // hold gas while driving
    for (let i = 0; i < 200 && !g.run.ended; i++) {
      if (i % 6 === 0) { window.bus.emit('control:steer', steersSent % 2 ? 'left' : 'right'); steersSent++; }
      await sleep(100);
      const d = g.vehicle.dir; seen.add(d); if (d !== last) { turns++; last = d; }
      const inv = g.vehicle.isInvulnerable; if (inv && !wasInv) crashes++; wasInv = inv;
      const x = g.vehicle.sprite.x, y = g.vehicle.sprite.y;
      if (x < -off || x > W + off || y < -off || y > H + off) oob++;
    }
    return { steersSent, turns, crashes, outOfBounds: oob, headingsSeen: [...seen], finalSpeed: Math.round(g.vehicle.currentSpeed) };
  });
  console.log('DRIVE', JSON.stringify(drive));
  await page.screenshot({ path: `${SHOT_DIR}/feel.png` });
});
