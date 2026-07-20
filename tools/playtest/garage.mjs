/**
 * Garage / Car Gallery playtest (see docs/GARAGE_GALLERY_PLAN.md):
 *   1) Boot `?mode=garage`: a rotating car renders on a platform, draws < ~25.
 *   2) Cycle all 4 roster cars via next(): assert the previewed id, the tinted
 *      body-material colour, and the stat-panel DOM (name/level/km-h/bar widths)
 *      all change to match each car.
 *   3) Grant coins (`window.__three.profile.addCoins`), then exercise, via real
 *      DOM clicks: unlock a locked car (AÇ), upgrade it (YÜKSELT), and select it
 *      (SEÇ) — asserting `Profile` (ownedVehicles/vehicleLevels/selectedVehicle)
 *      reflects each change and the button labels flip accordingly.
 * Prints RESULT PASS/FAIL and screenshots the screen.
 * Run: node tools/playtest/garage.mjs   (DR_URL defaults to http://localhost:5173/)
 */
import puppeteer from 'puppeteer-core';
import { findChrome, SHOT_DIR, sleep } from './lib.mjs';
import fs from 'node:fs';

const BASE = process.env.DR_URL || 'http://localhost:5173/';
fs.mkdirSync(SHOT_DIR, { recursive: true });
const errors = [];

// Roster body colours (src/data/vehicles.ts) — used to verify the turntable
// actually re-tints per car, not just that the DOM text changes.
const EXPECTED = [
  { id: 'starter', name: 'City Scooter', bodyColor: 0xffd54a, topSpeedKmh: 65 },
  { id: 'sport', name: 'Sport Coupe', bodyColor: 0xef4444, topSpeedKmh: 86 },
  { id: 'super', name: 'Super GT', bodyColor: 0x3b82f6, topSpeedKmh: 104 },
  { id: 'hyper', name: 'Hyper X', bodyColor: 0x1f2733, topSpeedKmh: 126 },
];

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

  await page.goto(BASE + '?mode=garage', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__three && window.__three.garage === true, { timeout: 15000 });
  await page.waitForSelector('.dr-gar-name', { timeout: 10000 });
  await sleep(400); // let the first setCar() resolve + one turntable frame render

  // --- Reads a full DOM + engine snapshot of the currently previewed car. ------
  async function snapshot() {
    return page.evaluate(() => {
      const t = window.__three;
      const q = (sel) => document.querySelector(sel);
      let bodyColor = null;
      t.preview.holder.traverse((o) => {
        if (bodyColor !== null || !o.isMesh || !o.material) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (/body/i.test(m.name || '')) bodyColor = m.color.getHex();
      });
      return {
        viewId: t.viewId,
        draws: t.draws,
        name: q('.dr-gar-name')?.textContent ?? null,
        lvlText: q('.dr-gar-lvl')?.textContent?.trim() ?? null,
        speedVal: q('.dr-gar-val-speed')?.textContent ?? null,
        speedBar: q('.dr-gar-bar-speed')?.style.width ?? null,
        accelBar: q('.dr-gar-bar-accel')?.style.width ?? null,
        turnBar: q('.dr-gar-bar-turn')?.style.width ?? null,
        actionsHtml: q('.dr-gar-actions')?.innerHTML ?? null,
        bodyColor,
      };
    });
  }

  // --- 1) Initial boot: renders, draws are cheap. ------------------------------
  const boot = await snapshot();
  console.log('BOOT', JSON.stringify({ viewId: boot.viewId, draws: boot.draws, name: boot.name }));
  await page.screenshot({ path: `${SHOT_DIR}/garage-initial.png` });

  // --- 2) Cycle all 4 roster cars, asserting id/colour/stats all change. ------
  const snaps = [boot];
  for (let i = 1; i < EXPECTED.length; i++) {
    await page.evaluate(() => window.__three.next());
    await sleep(250); // setCar() is async (cached loadGLB) — give it a tick
    snaps.push(await snapshot());
  }
  await page.screenshot({ path: `${SHOT_DIR}/garage-cycle-last.png` });

  let cycleOk = true;
  const cycleLog = [];
  for (let i = 0; i < EXPECTED.length; i++) {
    const exp = EXPECTED[i];
    const s = snaps[i];
    const idMatch = s.viewId === exp.id;
    const nameMatch = s.name === exp.name;
    const colorMatch = s.bodyColor === exp.bodyColor;
    const speedMatch = s.speedVal === `${exp.topSpeedKmh} km/h`;
    const pass = idMatch && nameMatch && colorMatch && speedMatch;
    cycleOk = cycleOk && pass;
    cycleLog.push(`${exp.id}: id=${idMatch} name=${nameMatch} color=${colorMatch}(${s.bodyColor?.toString(16)}) `
      + `speed=${speedMatch}(${s.speedVal}) bars=[${s.speedBar},${s.accelBar},${s.turnBar}]`);
  }
  // Bars must also actually differ car-to-car (roster is meant to read distinct).
  const distinctBars = new Set(snaps.map((s) => s.speedBar)).size === EXPECTED.length;
  console.log('CYCLE', cycleOk && distinctBars ? 'PASS' : 'FAIL');
  cycleLog.forEach((l) => console.log('  ' + l));
  console.log(`  distinct speed-bar widths across roster: ${distinctBars}`);

  // --- 3) Economy: grant coins, then unlock -> upgrade -> select (real clicks). -
  await page.evaluate(() => window.__three.profile.addCoins(99999));
  await sleep(50);

  // We're currently on 'hyper' (index 3, premium/locked) after the cycle above —
  // assert the disabled PREMIUM state, then step back to 'super' (locked,
  // coin-buyable) to exercise AÇ / YÜKSELT / SEÇ.
  const hyperSnap = await snapshot();
  const premiumLocked = /PREMIUM/.test(hyperSnap.actionsHtml) && /disabled/.test(hyperSnap.actionsHtml);
  console.log('PREMIUM-LOCKED', premiumLocked ? 'PASS' : 'FAIL', hyperSnap.actionsHtml?.replace(/\s+/g, ' '));

  await page.evaluate(() => window.__three.prev()); // hyper -> super
  await sleep(250);

  const beforeUnlock = await page.evaluate(() => ({
    coins: window.__three.coins,
    owned: window.__three.profile.get().ownedVehicles.slice(),
  }));

  const clicked1 = await page.evaluate(() => {
    const btn = document.querySelector('.dr-gar-unlock');
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });
  await sleep(150);
  const afterUnlock = await page.evaluate(() => ({
    coins: window.__three.coins,
    owned: window.__three.profile.get().ownedVehicles.slice(),
  }));
  const unlockOk = clicked1 && afterUnlock.owned.includes('super') && !beforeUnlock.owned.includes('super')
    && afterUnlock.coins < beforeUnlock.coins;
  console.log('UNLOCK', unlockOk ? 'PASS' : 'FAIL',
    JSON.stringify({ before: beforeUnlock, after: afterUnlock, clicked: clicked1 }));

  const beforeUpgrade = await page.evaluate(() => ({
    coins: window.__three.coins,
    level: window.__three.profile.vehicleLevel('super'),
  }));
  const clicked2 = await page.evaluate(() => {
    const btn = document.querySelector('.dr-gar-upgrade');
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });
  await sleep(150);
  const afterUpgrade = await page.evaluate(() => ({
    coins: window.__three.coins,
    level: window.__three.profile.vehicleLevel('super'),
  }));
  const upgradeOk = clicked2 && afterUpgrade.level === beforeUpgrade.level + 1
    && afterUpgrade.coins < beforeUpgrade.coins;
  console.log('UPGRADE', upgradeOk ? 'PASS' : 'FAIL',
    JSON.stringify({ before: beforeUpgrade, after: afterUpgrade, clicked: clicked2 }));

  await page.screenshot({ path: `${SHOT_DIR}/garage-after-upgrade.png` });

  const clicked3 = await page.evaluate(() => {
    const btn = document.querySelector('.dr-gar-select');
    if (!btn) return false;
    btn.click();
    return true;
  });
  await sleep(150);
  const afterSelect = await page.evaluate(() => ({
    selected: window.__three.selected,
    selectedBtnPresent: !!document.querySelector('.dr-gar-btn.selected'),
  }));
  const selectOk = clicked3 && afterSelect.selected === 'super' && afterSelect.selectedBtnPresent;
  console.log('SELECT', selectOk ? 'PASS' : 'FAIL', JSON.stringify(afterSelect));

  await page.screenshot({ path: `${SHOT_DIR}/garage-final.png` });
  const finalDraws = await page.evaluate(() => window.__three.draws);

  ok = boot.draws < 25 && finalDraws < 25
    && cycleOk && distinctBars && premiumLocked && unlockOk && upgradeOk && selectOk
    && errors.length === 0;

  console.log('RESULT', ok ? 'PASS' : 'FAIL',
    `bootDraws=${boot.draws} finalDraws=${finalDraws} cycle=${cycleOk && distinctBars} `
    + `premium=${premiumLocked} unlock=${unlockOk} upgrade=${upgradeOk} select=${selectOk}`);
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
