/** Visual + interaction regression for supplied low-poly HUD assets. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';

const BASE = process.env.DR_URL || 'http://localhost:5173/';
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

let ok = false;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  await page.goto(`${BASE}?mode=free`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three?.vehicle && window.__three?.poiSystem, { timeout: 15000 });
  await sleep(700);

  const hud = await page.evaluate(() => {
    const selectors = ['.dr-pedal', '.dr-free-speed', '.dr-free-jobs-icon'];
    const backgrounds = Object.fromEntries(selectors.map((selector) => [
      selector, getComputedStyle(document.querySelector(selector)).backgroundImage,
    ]));
    const menu = document.querySelector('.dr-free-menu').getBoundingClientRect();
    return { backgrounds, menuRight: menu.right, viewport: innerWidth };
  });
  await page.screenshot({ path: `${SHOT_DIR}/ui-assets-hud.png` });

  await page.evaluate(() => {
    const t = window.__three;
    const source = t.poiSystem.list.find((poi) => poi.isSource);
    t.game.stop();
    t.board.stoppedAt = source;
    t.bus.emit('stop:orderopen', source);
  });
  await page.waitForSelector('.dr-stop-panel.open .dr-job-row', { timeout: 5000 });
  await sleep(350);
  const panel = await page.evaluate(() => {
    const sheet = document.querySelector('.dr-stop-sheet');
    const rect = sheet.getBoundingClientRect();
    const rows = [...document.querySelectorAll('.dr-stop-panel .dr-job-row')];
    return {
      rows: rows.length,
      background: getComputedStyle(sheet).backgroundImage,
      insideViewport: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      rowHeights: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
    };
  });
  await page.screenshot({ path: `${SHOT_DIR}/ui-assets-orders.png` });
  await page.click('.dr-stop-panel .dr-job-row');
  await sleep(150);
  const accepted = await page.evaluate(() => ({
    hasJob: !!window.__three.job,
    panelClosed: !document.querySelector('.dr-stop-panel')?.classList.contains('open'),
  }));

  const assetsPresent = hud.backgrounds['.dr-pedal'].includes('gas-pedal')
    && hud.backgrounds['.dr-free-speed'].includes('speedometer')
    && hud.backgrounds['.dr-free-jobs-icon'].includes('jobs-button')
    && panel.background.includes('order-board');
  ok = assetsPresent && hud.menuRight <= hud.viewport && panel.rows === 3
    && panel.insideViewport && panel.rowHeights.every((height) => height >= 70)
    && accepted.hasJob && accepted.panelClosed && errors.length === 0;
  console.log('HUD', JSON.stringify(hud));
  console.log('PANEL', JSON.stringify(panel));
  console.log('ACCEPTED', JSON.stringify(accepted));
  console.log('ERRORS', errors.length ? errors.join(' | ') : '(none)');
  console.log('OVERALL', ok ? 'PASS' : 'FAIL');
} catch (error) {
  errors.push(`FATAL: ${error.message}`);
  console.log(errors.join('\n'));
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
