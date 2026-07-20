/**
 * Touch-alignment check across phone viewports: taps the visual center of each
 * control-pad button and verifies Phaser registers the tap at the same game
 * coordinate (offset should be ~0). Also reports the canvas placement so you can
 * catch off-center canvas bugs (flex vs. Phaser autoCenter fighting).
 * Run: `npm run playtest:touch` (dev server must run).
 */
import { withGame, startRun, sleep, DEVICES } from './lib.mjs';

for (const device of ['iphone12', 'pixel5', 'wide']) {
  await withGame(async (page) => {
    await startRun(page);
    await page.waitForFunction(() => window.game.scene.getScene('HUD')?.sys.isActive(), { timeout: 8000 });
    await page.evaluate(() => {
      const hud = window.game.scene.getScene('HUD');
      window.__hits = []; window.__fired = [];
      hud.input.on('pointerdown', (p) => window.__hits.push({ x: Math.round(p.x), y: Math.round(p.y) }));
      window.bus.on('control:throttle', (on) => window.__fired.push('throttle:' + on));
      window.bus.on('control:steer', (s) => window.__fired.push('steer:' + s));
    });

    const geom = await page.evaluate(() => {
      const g = window.game, r = g.canvas.getBoundingClientRect();
      const gw = g.scale.gameSize.width, gh = g.scale.gameSize.height;
      const sX = r.width / gw, sY = r.height / gh;
      const y = gh - 130, midW = 210, sideW = 190, gap = 18, midX = gw / 2;
      const btns = {
        gas: { gx: midX, gy: y - 6 },
        left: { gx: midX - midW / 2 - gap - sideW / 2, gy: y },
        right: { gx: midX + midW / 2 + gap + sideW / 2, gy: y },
      };
      const out = {};
      for (const k in btns) out[k] = { ...btns[k], sx: r.left + btns[k].gx * sX, sy: r.top + btns[k].gy * sY };
      const topGap = Math.round(r.top), botGap = Math.round(window.innerHeight - (r.top + r.height));
      return { rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }, centered: Math.abs(topGap - botGap) <= 2, topGap, botGap, btns: out };
    });

    const results = {};
    for (const k of ['gas', 'left', 'right']) {
      const b = geom.btns[k];
      await page.evaluate(() => { window.__hits = []; window.__fired = []; });
      const client = await page.target().createCDPSession();
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.sx, y: b.sy }] });
      await sleep(50);
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(120);
      const cap = await page.evaluate(() => ({ hits: window.__hits, fired: window.__fired }));
      const hit = cap.hits[0];
      results[k] = { offset: hit ? { dx: hit.x - Math.round(b.gx), dy: hit.y - Math.round(b.gy) } : null, fired: cap.fired };
    }
    console.log(`\n=== ${device} (${DEVICES[device].width}x${DEVICES[device].height}) ===`);
    console.log('canvas', JSON.stringify(geom.rect), 'centered:', geom.centered, `(top ${geom.topGap} / bot ${geom.botGap})`);
    for (const k of ['gas', 'left', 'right']) console.log(' ', k, JSON.stringify(results[k]));
  }, { device });
}
