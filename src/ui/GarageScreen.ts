import { bus, GameEvent } from '@/core/EventBus';
import { Profile } from '@/managers/ProfileStore';
import { VEHICLES, driveStatsAtLevel, upgradeCost } from '@/data/vehicles';
import { VehicleDef } from '@/types';
import { Garage } from '@/core/Balance';
import { CarPreview } from '@/world/CarPreview';
import { formatNumber, invLerp } from '@/utils/MathUtils';

/**
 * Native HTML/CSS overlay for the Garage / Car Gallery screen (see
 * `docs/GARAGE_GALLERY_PLAN.md`). Browses the 4-car roster (prev/next) over the
 * 3D turntable (`CarPreview`), showing each car's name/level, three normalized
 * stat bars (Hız/İvme/Manevra from `driveStatsAtLevel`) + km/h, and the
 * select/upgrade/unlock actions. Pure `Profile` reader/mutator + bus listener —
 * owns no gameplay state beyond which roster index is currently previewed.
 */
export class GarageScreen {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private handlers: Array<[string, (...a: any[]) => void]> = [];
  private viewIndex: number;

  constructor(
    parent: HTMLElement,
    private preview: CarPreview,
    private onBack: () => void,
  ) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-garage';
    this.root.innerHTML = TEMPLATE;
    parent.appendChild(this.root);

    const startId = Profile.get().selectedVehicle;
    const idx = VEHICLES.findIndex((v) => v.id === startId);
    this.viewIndex = idx >= 0 ? idx : 0;

    const q = (sel: string) => this.root.querySelector(sel) as HTMLElement;
    this.els = {
      back: q('.dr-gar-back'),
      wallet: q('.dr-gar-wallet span'),
      prev: q('.dr-gar-prev'),
      next: q('.dr-gar-next'),
      name: q('.dr-gar-name'),
      lvl: q('.dr-gar-lvl'),
      dots: q('.dr-gar-dots'),
      barSpeed: q('.dr-gar-bar-speed'),
      barAccel: q('.dr-gar-bar-accel'),
      barTurn: q('.dr-gar-bar-turn'),
      valSpeed: q('.dr-gar-val-speed'),
      valAccel: q('.dr-gar-val-accel'),
      valTurn: q('.dr-gar-val-turn'),
      actions: q('.dr-gar-actions'),
    };

    this.els.back.addEventListener('click', (e) => { e.preventDefault(); this.onBack(); });
    this.els.prev.addEventListener('click', (e) => { e.preventDefault(); this.prev(); });
    this.els.next.addEventListener('click', (e) => { e.preventDefault(); this.next(); });

    this.on(GameEvent.CoinsChanged, () => this.render());
    this.on(GameEvent.ProfileChanged, () => this.render());

    void this.preview.setCar(this.currentDef);
    this.render();
  }

  /** The id of the roster car currently previewed (for the harness). */
  get currentId(): string {
    return this.currentDef.id;
  }

  private get currentDef(): VehicleDef {
    return VEHICLES[this.viewIndex];
  }

  next(): void {
    this.move(1);
  }

  prev(): void {
    this.move(-1);
  }

  destroy(): void {
    for (const [evt, fn] of this.handlers) bus.off(evt, fn);
    this.handlers = [];
    this.root.remove();
  }

  private move(delta: number): void {
    this.viewIndex = (this.viewIndex + delta + VEHICLES.length) % VEHICLES.length;
    void this.preview.setCar(this.currentDef);
    this.render();
  }

  private on(evt: string, fn: (...a: any[]) => void): void {
    bus.on(evt, fn);
    this.handlers.push([evt, fn]);
  }

  private render(): void {
    const p = Profile.get();
    const def = this.currentDef;
    const owned = p.ownedVehicles.includes(def.id);
    const selected = p.selectedVehicle === def.id;
    const level = owned ? Profile.vehicleLevel(def.id) : 1;
    const drive = driveStatsAtLevel(def, level);

    this.els.wallet.textContent = formatNumber(p.coins);

    this.els.name.textContent = def.name;
    this.els.lvl.innerHTML = `Lv ${level}/${def.maxLevel}`
      + (!owned ? ' <span class="dr-gar-lock">🔒</span>' : '');

    const { topSpeed: spRange, accel: acRange, turn: tuRange } = Garage.statRange;
    this.els.barSpeed.style.width = `${invLerp(spRange[0], spRange[1], drive.topSpeed) * 100}%`;
    this.els.barAccel.style.width = `${invLerp(acRange[0], acRange[1], drive.accel) * 100}%`;
    this.els.barTurn.style.width = `${invLerp(tuRange[0], tuRange[1], drive.turn) * 100}%`;
    this.els.valSpeed.textContent = `${Math.round(drive.topSpeed * 3.6)} km/h`;
    this.els.valAccel.textContent = drive.accel.toFixed(1);
    this.els.valTurn.textContent = drive.turn.toFixed(2);

    this.els.dots.innerHTML = VEHICLES.map((_, i) =>
      `<span class="dr-gar-dot${i === this.viewIndex ? ' active' : ''}"></span>`).join('');

    this.renderActions(def, owned, selected, level);
  }

  private renderActions(def: VehicleDef, owned: boolean, selected: boolean, level: number): void {
    const coins = Profile.get().coins;
    let html = '';

    if (!owned) {
      if (def.unlockCost >= 0) {
        const afford = coins >= def.unlockCost;
        html += `<button class="dr-gar-btn primary dr-gar-unlock"${afford ? '' : ' disabled'}>`
          + `AÇ · 🪙${formatNumber(def.unlockCost)}</button>`;
      } else {
        html += `<button class="dr-gar-btn locked" disabled>🔒 PREMIUM</button>`;
      }
    } else {
      const row: string[] = [];
      if (selected) {
        row.push(`<button class="dr-gar-btn selected" disabled>✓ SEÇİLİ</button>`);
      } else {
        row.push(`<button class="dr-gar-btn primary dr-gar-select">SEÇ</button>`);
      }
      if (level < def.maxLevel) {
        const cost = upgradeCost(def, level);
        const can = Profile.canUpgradeVehicle(def.id);
        row.push(`<button class="dr-gar-btn upgrade dr-gar-upgrade"${can ? '' : ' disabled'}>`
          + `YÜKSELT · 🪙${formatNumber(cost)}</button>`);
      } else {
        row.push(`<button class="dr-gar-btn locked" disabled>MAKS SEVİYE</button>`);
      }
      html += `<div class="dr-gar-btn-row">${row.join('')}</div>`;
      html += `<button class="dr-gar-btn play dr-gar-play">▶ BU ARAÇLA OYNA</button>`;
    }

    this.els.actions.innerHTML = html;

    this.els.actions.querySelector('.dr-gar-unlock')?.addEventListener('click', (e) => {
      e.preventDefault();
      Profile.unlockVehicle(def.id);
    });
    this.els.actions.querySelector('.dr-gar-select')?.addEventListener('click', (e) => {
      e.preventDefault();
      Profile.selectVehicle(def.id);
    });
    this.els.actions.querySelector('.dr-gar-upgrade')?.addEventListener('click', (e) => {
      e.preventDefault();
      Profile.upgradeVehicle(def.id);
    });
    this.els.actions.querySelector('.dr-gar-play')?.addEventListener('click', (e) => {
      e.preventDefault();
      Profile.selectVehicle(def.id);
      this.onBack();
    });
  }
}

const TEMPLATE = `
  <div class="dr-gar-top">
    <button class="dr-gar-back">←</button>
    <div class="dr-gar-wallet">🪙 <span>0</span></div>
  </div>

  <button class="dr-gar-nav dr-gar-prev" aria-label="Önceki araç">‹</button>
  <button class="dr-gar-nav dr-gar-next" aria-label="Sonraki araç">›</button>

  <div class="dr-gar-plate">
    <div class="dr-gar-name"></div>
    <div class="dr-gar-lvl"></div>
  </div>
  <div class="dr-gar-dots"></div>

  <div class="dr-gar-panel">
    <div class="dr-gar-stats">
      <div class="dr-gar-stat">
        <span class="dr-gar-stat-label">Hız</span>
        <div class="dr-gar-bar"><i class="dr-gar-bar-speed"></i></div>
        <span class="dr-gar-stat-val dr-gar-val-speed"></span>
      </div>
      <div class="dr-gar-stat">
        <span class="dr-gar-stat-label">İvme</span>
        <div class="dr-gar-bar"><i class="dr-gar-bar-accel"></i></div>
        <span class="dr-gar-stat-val dr-gar-val-accel"></span>
      </div>
      <div class="dr-gar-stat">
        <span class="dr-gar-stat-label">Manevra</span>
        <div class="dr-gar-bar"><i class="dr-gar-bar-turn"></i></div>
        <span class="dr-gar-stat-val dr-gar-val-turn"></span>
      </div>
    </div>
    <div class="dr-gar-actions"></div>
  </div>`;

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-garage { position: fixed; inset: 0; z-index: 12; pointer-events: auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #e6edf7; }
    .dr-garage * { box-sizing: border-box; }

    .dr-gar-top { position: fixed; top: calc(env(safe-area-inset-top,0px) + 10px); left: 12px; right: 12px;
      z-index: 2; display: flex; align-items: center; justify-content: space-between; }
    .dr-gar-back { background: rgba(13,19,31,0.72); border: 1px solid rgba(120,150,200,0.22);
      color: #cdd8ea; border-radius: 14px; width: 40px; height: 40px; font-weight: 900; font-size: 18px;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.3); -webkit-tap-highlight-color: transparent; }
    .dr-gar-back:active { transform: translateY(2px); }
    .dr-gar-wallet { background: rgba(13,19,31,0.72); border: 1px solid rgba(120,150,200,0.2);
      border-radius: 14px; padding: 9px 14px; font-weight: 900; font-size: 14px; color: #ffd54a;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3); }

    .dr-gar-nav { position: fixed; top: 60%; transform: translateY(-50%);
      width: clamp(42px, 12vw, 54px); height: clamp(42px, 12vw, 54px); border-radius: 50%;
      background: rgba(13,19,31,0.55); border: 1px solid rgba(120,150,200,0.25); color: #e6edf7;
      font-size: clamp(22px, 6vw, 28px); font-weight: 900; display: flex; align-items: center;
      justify-content: center; cursor: pointer; z-index: 2; box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      -webkit-tap-highlight-color: transparent; }
    .dr-gar-nav:active { transform: translateY(-50%) scale(0.92); }
    .dr-gar-prev { left: 10px; }
    .dr-gar-next { right: 10px; }

    .dr-gar-plate { position: fixed; top: calc(env(safe-area-inset-top,0px) + 64px); left: 50%;
      transform: translateX(-50%); text-align: center; background: rgba(13,19,31,0.72);
      border: 1px solid rgba(120,150,200,0.22); border-radius: 16px; padding: 8px clamp(16px,6vw,26px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.3); z-index: 2; max-width: 78vw; }
    .dr-gar-name { font-weight: 900; font-size: clamp(16px, 5vw, 20px); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; }
    .dr-gar-lvl { margin-top: 2px; font-size: 12px; color: #9fb0c9; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 6px; }
    .dr-gar-lock { font-size: 12px; }

    .dr-gar-dots { position: fixed; top: calc(env(safe-area-inset-top,0px) + 122px); left: 50%;
      transform: translateX(-50%); display: flex; gap: 6px; z-index: 2; }
    .dr-gar-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.25);
      transition: all .18s ease; }
    .dr-gar-dot.active { background: #ffd54a; width: 16px; border-radius: 3px; }

    .dr-gar-panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2;
      background: linear-gradient(180deg, #141d2e, #0d1524); border-top: 1px solid rgba(120,150,200,0.22);
      border-radius: 22px 22px 0 0; box-shadow: 0 -12px 34px rgba(0,0,0,0.5);
      padding: 14px 16px calc(env(safe-area-inset-bottom,0px) + 14px); }

    .dr-gar-stats { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
    .dr-gar-stat { display: grid; grid-template-columns: 52px 1fr 58px; align-items: center; gap: 8px; }
    .dr-gar-stat-label { font-size: 12px; font-weight: 800; color: #9fb0c9; }
    .dr-gar-bar { height: 8px; border-radius: 5px; background: rgba(255,255,255,0.1); overflow: hidden; }
    .dr-gar-bar i { display: block; height: 100%; border-radius: 5px; width: 0%;
      background: linear-gradient(90deg,#37d67a,#8ef0b0); transition: width .25s ease; }
    .dr-gar-stat-val { font-size: 11px; font-weight: 800; text-align: right; color: #e6edf7;
      font-variant-numeric: tabular-nums; white-space: nowrap; }

    .dr-gar-actions { display: flex; flex-direction: column; gap: 8px; }
    .dr-gar-btn-row { display: flex; gap: 8px; }
    .dr-gar-btn { flex: 1; border: none; border-radius: 14px; padding: 12px 10px; font-weight: 900;
      font-size: clamp(12px, 3.6vw, 14px); cursor: pointer; -webkit-tap-highlight-color: transparent;
      color: #e6edf7; background: rgba(255,255,255,0.08); }
    .dr-gar-btn:active:not(:disabled) { transform: translateY(2px); }
    .dr-gar-btn.primary { background: linear-gradient(180deg,#37d67a,#1f9d57); color: #06210f; }
    .dr-gar-btn.selected { background: rgba(55,214,122,0.14); border: 1px solid rgba(55,214,122,0.5);
      color: #37d67a; }
    .dr-gar-btn.upgrade { background: rgba(255,213,74,0.14); border: 1px solid rgba(255,213,74,0.4);
      color: #ffd54a; }
    .dr-gar-btn.locked { background: rgba(255,255,255,0.06); color: #64748b; }
    .dr-gar-btn.play { background: linear-gradient(180deg,#5aa9ff,#2563eb); color: #fff; }
    .dr-gar-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  `;
  document.head.appendChild(s);
}
