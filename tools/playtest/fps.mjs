/**
 * Performance probe: compares Phaser's real render FPS in the menu vs. in the
 * running game (which draws the whole procedural city). A big drop = the world
 * render is the bottleneck. Run: `node tools/playtest/fps.mjs` (dev server up).
 */
import { withGame, startRun } from './lib.mjs';

const sampleFps = (label) => async (page) => {
  const arr = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 200)); out.push(Math.round(window.game.loop.actualFps)); }
    return out;
  });
  const nums = arr.filter((n) => Number.isFinite(n));
  const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  console.log(`${label} fps: avg ${avg}  samples ${JSON.stringify(arr)}`);
  return avg;
};

await withGame(async (page) => {
  await sampleFps('MENU')(page);
  await startRun(page);
  const objs = await page.evaluate(() => window.game.scene.getScene('Game').children.length);
  console.log('GAME scene display objects:', objs);
  await sampleFps('GAME')(page);
});
