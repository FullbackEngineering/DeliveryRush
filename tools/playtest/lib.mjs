/**
 * Delivery Rush playtest harness — shared library.
 *
 * Drives the running dev server (http://localhost:5173) in a real headless
 * Chrome via puppeteer-core, so gameplay changes can be verified end-to-end
 * (boot, render, the delivery loop, driving/feel, touch alignment) — not just
 * typechecked. Encodes the headless gotchas we hit while building it.
 *
 * Requires: `npm run dev` running in another terminal, and Chrome installed.
 * Usage from scripts: `import { withGame, startRun, ... } from './lib.mjs'`.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

export const URL = process.env.DR_URL || 'http://localhost:5173/';
export const SHOT_DIR = process.env.DR_SHOTS || 'tools/playtest/shots';

/** Locate an installed Chrome/Edge (Windows-first, env override wins). */
export function findChrome() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  const candidates = [
    env,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const p of candidates) if (safeExists(p)) return p;
  throw new Error('No Chrome/Edge found. Set PUPPETEER_EXECUTABLE_PATH.');
}
function safeExists(p) { try { return fs.existsSync(p); } catch { return false; } }

/** Common launch flags. These defeat headless RAF/timer throttling — without
 * them Phaser's clock runs at a fraction of real speed. */
const ARGS = [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
];

export const DEVICES = {
  design: { width: 720, height: 1280, deviceScaleFactor: 1 },
  iphone12: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  pixel5: { width: 393, height: 851, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  wide: { width: 420, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Boot a page to the main menu and hand it to `fn`. Collects console errors and
 * page errors into `ctx.errors`. Always closes the browser.
 * @param {(page, ctx) => Promise<void>} fn
 * @param {{device?: keyof typeof DEVICES}} [opts]
 */
export async function withGame(fn, opts = {}) {
  const device = DEVICES[opts.device || 'design'];
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findChrome(), headless: 'new', args: ARGS,
    defaultViewport: device.isMobile ? undefined : device,
  });
  const errors = [];
  try {
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    if (device.isMobile) await page.setViewport(device);
    await page.bringToFront();
    // Spoof visibility so Phaser never pauses. Do NOT override requestAnimationFrame.
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction(
      () => window.game?.isBooted && window.bus &&
        window.game.scene.getScenes(true).some((s) => s.scene.key === 'MainMenu'),
      { timeout: 15000 },
    );
    await fn(page, { client, errors, device });
  } finally {
    console.log('\n---- CONSOLE / PAGE ERRORS ----');
    console.log(errors.length ? errors.join('\n') : '(none)');
    await browser.close();
  }
}

/** Active scene keys. */
export const activeScenes = (page) =>
  page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key));

/**
 * Start the Game scene and force the run to begin. The 3-2-1 countdown relies on
 * Phaser's scene clock, which runs slow under headless — so we skip it here.
 */
export async function startRun(page) {
  await page.evaluate(() => window.game.scene.start('Game'));
  await page.waitForFunction(() => window.game.scene.getScene('Game')?.sys.isActive(), { timeout: 8000 });
  await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    g.time.removeAllEvents();
    g.countdownText?.destroy();
    if (!g.started) g.beginRun();
  });
  await page.waitForFunction(() => window.game.scene.getScene('Game').started === true, { timeout: 8000 });
}

/**
 * Drive N deliveries by moving the active order's target node onto the car each
 * tick (robust: doesn't fight the vehicle's lane-keeping). Returns run stats.
 */
export async function driveDeliveries(page, n = 4) {
  return page.evaluate(async (target) => {
    const g = window.game.scene.getScene('Game');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let ticks = 0;
    while (ticks < 120 && g.run && !g.run.ended && g.run.deliveries < target) {
      const o = g.orders?.current;
      if (o && g.vehicle?.sprite) {
        const node = o.pickedUp ? o.dropoff : o.pickup;
        node.col = Math.round(g.vehicle.sprite.x / g.grid.block);
        node.row = Math.round(g.vehicle.sprite.y / g.grid.block);
      }
      await sleep(100);
      ticks++;
    }
    const r = g.run;
    return { deliveries: r.deliveries, streak: r.streak, maxStreak: r.maxStreak, score: r.score, coins: r.coinsThisRun, time: Math.round(r.time * 10) / 10 };
  }, n);
}

/** Force the run to end and wait for the Results scene. */
export async function endRun(page) {
  await page.evaluate(() => { const g = window.game.scene.getScene('Game'); if (g?.run) g.run.time = 0.3; });
  await page.waitForFunction(
    () => window.game.scene.getScenes(true).some((s) => s.scene.key === 'Results'),
    { timeout: 8000 },
  );
}

/** Read a snapshot of gameplay state for assertions. */
export const gameState = (page) => page.evaluate(() => {
  const g = window.game.scene.getScene('Game');
  return {
    started: g.started, ended: g.run?.ended,
    time: Math.round(g.run?.time * 10) / 10,
    speed: Math.round(g.vehicle?.currentSpeed), dir: g.vehicle?.dir,
    normalizedSpeed: +g.vehicle?.normalizedSpeed?.toFixed(2),
    hasOrder: !!g.orders?.current, deliveries: g.run?.deliveries,
  };
});
