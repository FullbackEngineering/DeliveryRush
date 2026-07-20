import { bus, GameEvent } from '@/core/EventBus';
import { Order } from '@/types';
import { formatNumber, formatTime } from '@/utils/MathUtils';

interface RunSummary {
  coins: number;
  deliveries: number;
  score: number;
  bestStreak: number;
}

/**
 * The whole in-run interface as an HTML/CSS overlay in #ui (over the 3D canvas):
 * top bar (coins · timer · score), the active-order card with its own countdown,
 * a combo popup, floating reward text, the 3-2-1 intro countdown, and the end-of-
 * run results panel. It only listens to bus facts and renders — it owns no game
 * state. Native DOM = crisp text + perfect touch on the retry button.
 */
export class Hud {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private handlers: Array<[string, (...a: any[]) => void]> = [];
  private lastSecondShown = -1;
  // RunTimer/OrderTimer fire every frame while running; cache the last
  // written value (quantized to 0.1% for the bars) and skip DOM writes that
  // wouldn't visibly change anything.
  private lastTimerFrac = -1;
  private lastTimerLow = false;
  private lastOrderFrac = -1;
  private lastOrderUrgentShow = false;

  constructor(parent: HTMLElement, private onRetry: () => void, private onMenu?: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-hud';
    this.root.innerHTML = TEMPLATE;
    parent.appendChild(this.root);

    const q = (sel: string) => this.root.querySelector(sel) as HTMLElement;
    this.els = {
      coins: q('.dr-coins span'),
      score: q('.dr-score span'),
      timerVal: q('.dr-timer-val'),
      timerFill: q('.dr-timer-bar > i'),
      timer: q('.dr-timer'),
      order: q('.dr-order'),
      orderIcon: q('.dr-order-icon'),
      orderKind: q('.dr-order-kind'),
      orderSub: q('.dr-order-sub'),
      orderFill: q('.dr-order-timer > i'),
      urgent: q('.dr-order-urgent'),
      combo: q('.dr-combo'),
      floatLayer: q('.dr-float-layer'),
      count: q('.dr-count'),
      results: q('.dr-results'),
      rScore: q('.dr-r-score'),
      rDeliveries: q('.dr-r-deliveries'),
      rCombo: q('.dr-r-combo'),
      rCoins: q('.dr-r-coins'),
      rTitle: q('.dr-r-title'),
    };

    (this.root.querySelector('.dr-retry') as HTMLElement).addEventListener('click', (e) => {
      e.preventDefault();
      this.hideResults();
      this.onRetry();
    });
    (this.root.querySelector('.dr-menu') as HTMLElement).addEventListener('click', (e) => {
      e.preventDefault();
      this.onMenu?.();
    });

    this.on(GameEvent.RunStart, () => this.reset());
    this.on(GameEvent.RunTimer, (s: number, f: number) => this.setTimer(s, f));
    this.on(GameEvent.RunCoins, (c: number) => (this.els.coins.textContent = formatNumber(c)));
    this.on(GameEvent.RunScore, (s: number) => (this.els.score.textContent = formatNumber(s)));
    this.on(GameEvent.ComboChanged, (streak: number, mult: number) => this.setCombo(streak, mult));
    this.on(GameEvent.OrderSpawned, (o: Order) => this.setOrder(o, false));
    this.on(GameEvent.OrderPickedUp, (o: Order) => this.setOrder(o, true));
    this.on(GameEvent.OrderTimer, (f: number) => this.setOrderTimer(f));
    this.on(GameEvent.OrderDelivered, (o: Order) => this.onDelivered(o));
    this.on(GameEvent.OrderExpired, () => this.flashMiss());
    this.on(GameEvent.Countdown, (n: number | string) => this.showCount(n));
    this.on(GameEvent.RunEnd, (s: RunSummary) => this.showResults(s));
  }

  private on(evt: string, fn: (...a: any[]) => void): void {
    bus.on(evt, fn);
    this.handlers.push([evt, fn]);
  }

  destroy(): void {
    for (const [evt, fn] of this.handlers) bus.off(evt, fn);
    this.handlers = [];
    this.root.remove();
  }

  // --- Renderers -----------------------------------------------------------
  private reset(): void {
    this.els.coins.textContent = '0';
    this.els.score.textContent = '0';
    this.els.combo.classList.remove('show');
    this.hideResults();
    this.els.order.classList.remove('show');
    this.lastSecondShown = -1;
    this.lastTimerFrac = -1;
    this.lastTimerLow = false;
    this.lastOrderFrac = -1;
    this.lastOrderUrgentShow = false;
  }

  private setTimer(seconds: number, fraction: number): void {
    const s = Math.ceil(seconds);
    if (s !== this.lastSecondShown) {
      this.els.timerVal.textContent = formatTime(seconds);
      this.lastSecondShown = s;
    }
    const frac = Math.round(Math.max(0, fraction) * 1000);
    if (frac !== this.lastTimerFrac) {
      this.lastTimerFrac = frac;
      this.els.timerFill.style.transform = `scaleX(${frac / 1000})`;
    }
    const low = seconds <= 10;
    if (low !== this.lastTimerLow) {
      this.lastTimerLow = low;
      this.els.timer.classList.toggle('low', low);
    }
  }

  private setOrder(o: Order, pickedUp: boolean): void {
    this.els.orderIcon.textContent = o.icon;
    this.els.orderKind.textContent = o.vip ? `⭐ ${o.kind}` : o.kind;
    this.els.orderSub.textContent = pickedUp
      ? `Teslim et · +${o.baseReward} 🪙`
      : `Al · ${o.kind}`;
    this.els.order.classList.toggle('vip', o.vip);
    this.els.order.classList.toggle('delivering', pickedUp);
    this.els.order.classList.add('show');
    // Pop the card so a state change is noticed.
    this.els.order.classList.remove('pop');
    void this.els.order.offsetWidth;
    this.els.order.classList.add('pop');
  }

  private setOrderTimer(fraction: number): void {
    const frac = Math.round(Math.max(0, fraction) * 1000);
    if (frac !== this.lastOrderFrac) {
      this.lastOrderFrac = frac;
      this.els.orderFill.style.transform = `scaleX(${frac / 1000})`;
    }
    const show = fraction <= 0.34;
    if (show !== this.lastOrderUrgentShow) {
      this.lastOrderUrgentShow = show;
      this.els.urgent.classList.toggle('show', show);
    }
  }

  private setCombo(streak: number, mult: number): void {
    if (streak <= 1) {
      this.els.combo.classList.remove('show');
      return;
    }
    this.els.combo.textContent = `COMBO ×${mult}`;
    this.els.combo.classList.remove('show');
    void this.els.combo.offsetWidth;
    this.els.combo.classList.add('show');
  }

  private onDelivered(o: Order): void {
    this.els.order.classList.remove('show');
    this.floatText(`+${o.baseReward} 🪙`, '#37d67a');
  }

  private flashMiss(): void {
    this.els.order.classList.remove('show');
    this.floatText('KAÇTI!', '#ef4444');
  }

  private floatText(text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'dr-float';
    el.textContent = text;
    el.style.color = color;
    this.els.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  private showCount(n: number | string): void {
    const el = this.els.count;
    el.textContent = String(n);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    if (n === 'GO' || n === 'GO!') setTimeout(() => el.classList.remove('show'), 500);
  }

  private showResults(s: RunSummary): void {
    this.els.order.classList.remove('show');
    this.els.combo.classList.remove('show');
    this.els.rScore.textContent = formatNumber(s.score);
    this.els.rDeliveries.textContent = String(s.deliveries);
    this.els.rCombo.textContent = `×${s.bestStreak}`;
    this.els.rCoins.textContent = formatNumber(s.coins);
    this.els.results.classList.add('show');
  }

  private hideResults(): void {
    this.els.results.classList.remove('show');
  }
}

const TEMPLATE = `
  <div class="dr-top">
    <div class="dr-pill dr-coins">🪙 <span>0</span></div>
    <div class="dr-timer">
      <div class="dr-timer-val">0:45</div>
      <div class="dr-timer-bar"><i></i></div>
    </div>
    <div class="dr-pill dr-score">🏆 <span>0</span></div>
  </div>
  <div class="dr-order">
    <div class="dr-order-icon">🍕</div>
    <div class="dr-order-info">
      <div class="dr-order-kind">Pizza</div>
      <div class="dr-order-sub">Al</div>
      <div class="dr-order-timer"><i></i></div>
    </div>
    <div class="dr-order-urgent">ACELE</div>
  </div>
  <div class="dr-combo">COMBO ×2</div>
  <div class="dr-float-layer"></div>
  <div class="dr-count"></div>
  <div class="dr-results">
    <div class="dr-results-card">
      <div class="dr-r-title">SÜRE DOLDU</div>
      <div class="dr-r-score-big"><span class="dr-r-score">0</span><small>puan</small></div>
      <div class="dr-r-grid">
        <div><b class="dr-r-deliveries">0</b><span>Teslimat</span></div>
        <div><b class="dr-r-combo">×0</b><span>En iyi kombo</span></div>
        <div><b class="dr-r-coins">0</b><span>🪙 Coin</span></div>
      </div>
      <div class="dr-r-actions">
        <button class="dr-menu">MENÜ</button>
        <button class="dr-retry">TEKRAR OYNA</button>
      </div>
    </div>
  </div>`;

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-hud { position: fixed; inset: 0; z-index: 5; pointer-events: none;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #e6edf7; }
    .dr-hud * { box-sizing: border-box; }

    .dr-top { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 10px);
      left: 12px; right: 12px; display: flex; align-items: flex-start; gap: 10px; }
    .dr-pill { background: rgba(13,19,31,0.72); backdrop-filter: blur(6px);
      border: 1px solid rgba(120,150,200,0.18); border-radius: 14px;
      padding: 8px 12px; font-weight: 800; font-size: 17px; min-width: 78px;
      display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
    .dr-coins { color: #ffd54a; }
    .dr-score { margin-left: auto; color: #e6edf7; }

    .dr-timer { flex: 0 0 auto; text-align: center; min-width: 108px; }
    .dr-timer-val { font-weight: 900; font-size: 30px; letter-spacing: 0.02em;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5); font-variant-numeric: tabular-nums; }
    .dr-timer-bar { height: 7px; margin-top: 3px; border-radius: 5px;
      background: rgba(255,255,255,0.14); overflow: hidden; }
    .dr-timer-bar > i { display: block; height: 100%; width: 100%; transform-origin: left center;
      background: linear-gradient(90deg,#37d67a,#8ef0b0); transition: transform .18s linear; }
    .dr-timer.low .dr-timer-val { color: #ff6b6b; animation: dr-pulse .7s ease-in-out infinite; }
    .dr-timer.low .dr-timer-bar > i { background: linear-gradient(90deg,#ef4444,#ff8a8a); }
    @keyframes dr-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.09)} }

    .dr-order { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 74px);
      left: 12px; right: 12px; margin: 0 auto; max-width: 440px;
      background: rgba(13,19,31,0.78); backdrop-filter: blur(8px);
      border: 1px solid rgba(120,150,200,0.2); border-left: 4px solid #f5a524;
      border-radius: 16px; padding: 10px 12px; display: flex; align-items: center; gap: 12px;
      box-shadow: 0 8px 22px rgba(0,0,0,0.4); opacity: 0; transform: translateY(-12px);
      transition: opacity .25s ease, transform .25s ease; pointer-events: none; }
    .dr-order.show { opacity: 1; transform: translateY(0); }
    .dr-order.delivering { border-left-color: #37d67a; }
    .dr-order.vip { border-left-color: #ffd54a; box-shadow: 0 8px 26px rgba(255,213,74,0.25); }
    .dr-order.pop { animation: dr-pop .3s ease; }
    @keyframes dr-pop { 0%{transform:scale(0.96)} 60%{transform:scale(1.03)} 100%{transform:scale(1)} }
    .dr-order-icon { font-size: 34px; width: 52px; height: 52px; flex: 0 0 52px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06); border-radius: 12px; }
    .dr-order-info { flex: 1; min-width: 0; }
    .dr-order-kind { font-weight: 800; font-size: 17px; }
    .dr-order-sub { font-size: 13px; color: #9fb0c9; margin: 1px 0 6px; }
    .dr-order-timer { height: 6px; border-radius: 4px; background: rgba(255,255,255,0.14); overflow: hidden; }
    .dr-order-timer > i { display: block; height: 100%; width: 100%; transform-origin: left center;
      background: linear-gradient(90deg,#f5a524,#ffd06b); transition: transform .18s linear; }
    .dr-order-urgent { flex: 0 0 auto; font-size: 11px; font-weight: 900; letter-spacing: 0.05em;
      color: #fff; background: #ef4444; border-radius: 8px; padding: 4px 7px; opacity: 0;
      transform: scale(0.8); transition: opacity .2s, transform .2s; }
    .dr-order-urgent.show { opacity: 1; transform: scale(1); animation: dr-pulse .6s ease-in-out infinite; }

    .dr-combo { position: absolute; top: 40%; left: 0; right: 0; text-align: center;
      font-weight: 900; font-size: 44px; color: #ffd54a; opacity: 0;
      text-shadow: 0 3px 14px rgba(0,0,0,0.6); pointer-events: none;
      -webkit-text-stroke: 2px #7a5500; }
    .dr-combo.show { animation: dr-combo 1s ease forwards; }
    @keyframes dr-combo { 0%{opacity:0;transform:translateY(10px) scale(0.6)}
      25%{opacity:1;transform:translateY(0) scale(1.12)} 60%{transform:scale(1)} 100%{opacity:0;transform:translateY(-24px) scale(1)} }

    .dr-float-layer { position: absolute; top: 46%; left: 0; right: 0; text-align: center;
      pointer-events: none; }
    .dr-float { font-weight: 900; font-size: 32px; text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      -webkit-text-stroke: 1.5px rgba(0,0,0,0.35); animation: dr-float 1.1s ease-out forwards; }
    @keyframes dr-float { 0%{opacity:0;transform:translateY(14px) scale(0.7)}
      20%{opacity:1;transform:translateY(0) scale(1.1)} 70%{opacity:1} 100%{opacity:0;transform:translateY(-50px) scale(1)} }

    .dr-count { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 150px; color: #fff; opacity: 0; pointer-events: none;
      text-shadow: 0 6px 30px rgba(0,0,0,0.6); }
    .dr-count.show { animation: dr-count .55s ease-out; }
    @keyframes dr-count { 0%{opacity:0;transform:scale(1.9)} 40%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.75)} }

    .dr-results { position: absolute; inset: 0; z-index: 8; display: flex; align-items: center;
      justify-content: center; background: rgba(5,9,18,0.72); backdrop-filter: blur(4px);
      opacity: 0; pointer-events: none; transition: opacity .3s ease; padding: 20px; }
    .dr-results.show { opacity: 1; pointer-events: auto; }
    .dr-results-card { width: 100%; max-width: 380px; background: linear-gradient(180deg,#141d2e,#0d1524);
      border: 1px solid rgba(120,150,200,0.22); border-radius: 24px; padding: 26px 22px;
      text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.6); transform: translateY(16px);
      transition: transform .35s cubic-bezier(.2,.9,.3,1.2); }
    .dr-results.show .dr-results-card { transform: translateY(0); }
    .dr-r-title { font-weight: 900; font-size: 15px; letter-spacing: 0.18em; color: #9fb0c9; }
    .dr-r-score-big { margin: 8px 0 18px; line-height: 1; }
    .dr-r-score-big .dr-r-score { font-weight: 900; font-size: 66px; color: #ffd54a;
      display: block; text-shadow: 0 4px 20px rgba(255,213,74,0.3); }
    .dr-r-score-big small { color: #64748b; font-weight: 700; letter-spacing: 0.15em; font-size: 13px; }
    .dr-r-grid { display: flex; gap: 8px; margin-bottom: 22px; }
    .dr-r-grid > div { flex: 1; background: rgba(255,255,255,0.04); border-radius: 14px; padding: 12px 6px; }
    .dr-r-grid b { display: block; font-size: 24px; font-weight: 900; }
    .dr-r-grid span { display: block; font-size: 11px; color: #9fb0c9; margin-top: 3px; }
    .dr-r-actions { display: flex; gap: 10px; }
    .dr-retry { flex: 1; border: none; border-radius: 16px; padding: 16px;
      font-weight: 900; font-size: 18px; color: #06210f; cursor: pointer;
      background: linear-gradient(#37d67a,#22a058); box-shadow: 0 6px 0 #1a7e44, 0 10px 24px rgba(0,0,0,0.4);
      transition: transform .06s, box-shadow .06s; -webkit-tap-highlight-color: transparent; }
    .dr-retry:active { transform: translateY(4px); box-shadow: 0 2px 0 #1a7e44; }
    .dr-menu { flex: 0 0 auto; border: 1px solid rgba(130,160,210,0.28); border-radius: 16px;
      padding: 16px 18px; font-weight: 900; font-size: 16px; color: #cdd8ea; cursor: pointer;
      background: rgba(255,255,255,0.05); box-shadow: 0 6px 0 rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.4);
      transition: transform .06s, box-shadow .06s; -webkit-tap-highlight-color: transparent; }
    .dr-menu:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.35); }
  `;
  document.head.appendChild(s);
}
