/**
 * Market / Shop playtest (Market integration):
 *   1) Boot ?mode=market: the native-DOM shop renders (wallet, tabs, item grid).
 *   2) Grant coins, buy a coins CARD → ownedCards gains its cardId, coins drop by
 *      the price, and the button flips to "Sende var".
 *   3) Buy a coins COSMETIC → ownedCosmetics gains its id.
 *   4) Buy a consumable BOOST twice → boostInventory count increments each time.
 *   5) No console errors. Screenshots each tab (cards / cosmetics / boosts).
 * Run: node tools/playtest/market.mjs   (DR_URL defaults to http://localhost:5173/)
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
    '--no-sandbox', '--mute-audio'],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

let ok = true;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.goto(BASE + '?mode=market', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.market === true, { timeout: 15000 });
  await page.waitForSelector('.dr-market__shell', { timeout: 10000 });
  await sleep(200);

  // Grant coins so every coins-priced item is affordable.
  await page.evaluate(() => window.__three.profile.addCoins(99999));
  await sleep(80);
  await page.screenshot({ path: `${SHOT_DIR}/market-cards.png` });

  const prof = () => page.evaluate(() => {
    const p = window.__three.profile.get();
    return { coins: p.coins, gems: p.gems, ownedCards: p.ownedCards.slice(),
      ownedCosmetics: p.ownedCosmetics.slice(), boostInventory: { ...p.boostInventory } };
  });
  const buy = (id) => page.evaluate((id) => {
    const btn = document.querySelector(`.dr-market__buy[data-item-id="${id}"]`);
    if (!btn) return { clicked: false, found: false };
    if (btn.disabled) return { clicked: false, found: true, disabled: true };
    btn.click();
    return { clicked: true };
  }, id);
  const tab = (cat) => page.evaluate((cat) => {
    const b = document.querySelector(`[data-action="category"][data-category="${cat}"]`);
    if (b) b.click();
    return !!b;
  }, cat);

  // --- 2) Buy a coins CARD (card-magnet-coins → cardId magnetCoins, 950) ------
  const before1 = await prof();
  const buy1 = await buy('card-magnet-coins');
  await sleep(120);
  const after1 = await prof();
  const cardLabel = await page.evaluate(() => {
    const btn = document.querySelector('.dr-market__buy[data-item-id="card-magnet-coins"]');
    return btn ? btn.textContent.trim() : null;
  });
  const cardOk = buy1.clicked && after1.ownedCards.includes('magnetCoins')
    && !before1.ownedCards.includes('magnetCoins') && after1.coins === before1.coins - 950
    && /Sende var/i.test(cardLabel || '');
  console.log('CARD', cardOk ? 'PASS' : 'FAIL',
    JSON.stringify({ coins: `${before1.coins}->${after1.coins}`, label: cardLabel, buy1 }));

  // --- 3) Buy a coins COSMETIC (cosmetic-pizza-topper, 800) -------------------
  await tab('cosmetics'); await sleep(150);
  await page.screenshot({ path: `${SHOT_DIR}/market-cosmetics.png` });
  const before2 = await prof();
  const buy2 = await buy('cosmetic-pizza-topper');
  await sleep(120);
  const after2 = await prof();
  const cosOk = buy2.clicked && after2.ownedCosmetics.includes('cosmetic-pizza-topper')
    && after2.coins === before2.coins - 800;
  console.log('COSMETIC', cosOk ? 'PASS' : 'FAIL',
    JSON.stringify({ coins: `${before2.coins}->${after2.coins}`, owned: after2.ownedCosmetics, buy2 }));

  // --- 4) Buy a consumable BOOST twice (boost-combo-shield, 275 each) ---------
  await tab('boosts'); await sleep(150);
  await page.screenshot({ path: `${SHOT_DIR}/market-boosts.png` });
  const before3 = await prof();
  await buy('boost-combo-shield'); await sleep(100);
  await buy('boost-combo-shield'); await sleep(100);
  const after3 = await prof();
  const boostCount = (after3.boostInventory['boost-combo-shield'] || 0)
    - (before3.boostInventory['boost-combo-shield'] || 0);
  const boostOk = boostCount === 2 && after3.coins === before3.coins - 550;
  console.log('BOOST', boostOk ? 'PASS' : 'FAIL',
    JSON.stringify({ count: boostCount, coinsDrop: before3.coins - after3.coins }));

  ok = cardOk && cosOk && boostOk && errors.length === 0;
  console.log('RESULT', ok ? 'PASS' : 'FAIL');
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
