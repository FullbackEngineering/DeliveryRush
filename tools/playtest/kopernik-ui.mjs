import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChrome, URL as BASE_URL, SHOT_DIR, sleep } from './lib.mjs';

const viewport = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
fs.mkdirSync(SHOT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  defaultViewport: viewport,
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio',
  ],
});

const errors = [];
const page = await browser.newPage();
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
});

async function open(route, selector, shot) {
  await page.goto(new URL(route, BASE_URL), { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await sleep(250);
  await page.screenshot({ path: path.join(SHOT_DIR, shot) });
}

try {
  await open('/', '.dr-modes', 'kopernik-menu.png');
  const title = await page.title();
  if (title !== 'Kopernik') throw new Error(`Unexpected page title: ${title}`);
  await page.click('[data-reward]');
  await page.waitForFunction(() => document.querySelector('.dr-modes-toast')?.textContent?.includes('+100'));

  await open('/?mode=market', '.dr-market', 'kopernik-market.png');
  await page.click('.dr-market__wallet-hot');
  await page.waitForSelector('.dr-gem:not([hidden])', { visible: true });
  await sleep(150);
  await page.screenshot({ path: path.join(SHOT_DIR, 'kopernik-currency.png') });
  await page.click('.dr-gem__close');
  await page.click('.dr-market__reward');
  await page.waitForFunction(() => document.querySelector('.dr-market__toast')?.textContent?.includes('+20'));

  await open('/?mode=leaderboard', '.dr-leaderboard', 'kopernik-leaderboard.png');
  await page.click('.dr-leaderboard__tab-rush');
  await page.waitForSelector('.dr-leaderboard__live .dr-leaderboard__row');
  await page.click('.dr-leaderboard__tab-delivery');
  await page.waitForSelector('.dr-leaderboard__live .dr-leaderboard__row');

  const checks = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    bodyOverflow: getComputedStyle(document.body).overflow,
    leaderboard: Boolean(window.__three?.leaderboard),
    rows: document.querySelectorAll('.dr-leaderboard__row').length,
  }));
  if (checks.viewport[0] !== 390 || checks.viewport[1] !== 844) throw new Error(`Bad viewport: ${checks.viewport}`);
  if (checks.bodyOverflow !== 'hidden' || !checks.leaderboard || checks.rows === 0) throw new Error(`UI checks failed: ${JSON.stringify(checks)}`);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('KOPERNIK UI PASS', checks);
} finally {
  await browser.close();
}
