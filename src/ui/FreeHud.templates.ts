import { Job } from '@/types';
import { formatTime } from '@/utils/MathUtils';
import orderBoardUrl from '@/assets/ui/order-board.webp?url';
import speedometerUrl from '@/assets/ui/speedometer.webp?url';
import jobsButtonUrl from '@/assets/ui/jobs-button.webp?url';

/**
 * Pure markup/CSS for `FreeHud`: the static DOM template, the job-row HTML
 * builders, and the one-time stylesheet injector. Split out of `FreeHud.ts`
 * purely for file-size/readability — no state, no behavior, nothing here
 * touches `FreeHud`'s public API.
 */

export function rowHtml(j: Job): string {
  const km = (j.distanceM / 1000).toFixed(1);
  return `
    <button class="dr-job-row${j.special ? ' special' : ''}" data-job-id="${j.id}">
      <div class="dr-job-row-icon">${j.kind.emoji}</div>
      <div class="dr-job-row-info">
        <div class="dr-job-row-title">${j.special ? '⭐ ' : ''}${j.source.name} → ${j.dest.name}</div>
        <div class="dr-job-row-meta"><span>${km} km</span><span>${formatTime(j.timeLimit)}</span><span>maks -${j.pay}</span></div>
      </div>
      <div class="dr-job-row-pay">+${j.pay}<span>🪙</span></div>
    </button>`;
}

/** Stop-to-order row: source is implicit (the POI you're parked at), so lead
 * with the destination instead. */
export function stopRowHtml(j: Job): string {
  const km = (j.distanceM / 1000).toFixed(1);
  return `
    <button class="dr-job-row${j.special ? ' special' : ''}" data-job-id="${j.id}">
      <div class="dr-job-row-icon">${j.kind.emoji}</div>
      <div class="dr-job-row-info">
        <div class="dr-job-row-title">${j.special ? '⭐ ' : ''}→ ${j.dest.name}</div>
        <div class="dr-job-row-meta"><span>${km} km</span><span>${formatTime(j.timeLimit)}</span><span>maks -${j.pay}</span></div>
      </div>
      <div class="dr-job-row-pay">+${j.pay}<span>🪙</span></div>
    </button>`;
}

export const FREE_HUD_TEMPLATE = `
  <div class="dr-free-top">
    <div class="dr-free-left">
      <div class="dr-free-badge">🌆 SERBEST</div>
      <button class="dr-free-jobs-btn"><span class="dr-free-jobs-icon"></span><span>İşler</span></button>
    </div>
    <div class="dr-free-right">
      <div class="dr-free-right-row">
        <div class="dr-free-speed"><b>0</b><span>km/h</span></div>
        <div class="dr-free-wallet">🪙 <span>0</span></div>
        <button class="dr-free-menu">☰</button>
      </div>
      <div class="dr-free-map-wrap"><canvas class="dr-free-map"></canvas></div>
    </div>
  </div>
  <div class="dr-job-active">
    <div class="dr-job-active-head">
      <div class="dr-job-active-icon">🍕</div>
      <div class="dr-job-active-info">
        <div class="dr-job-active-title">—</div>
        <div class="dr-job-active-sub">—</div>
      </div>
      <button class="dr-job-cancel">İptal</button>
    </div>
    <div class="dr-job-active-bar"><i></i></div>
  </div>
  <div class="dr-job-board">
    <div class="dr-job-board-backdrop"></div>
    <div class="dr-job-board-sheet">
      <div class="dr-job-board-head">
        <div class="dr-job-board-title">📋 İş Panosu</div>
        <button class="dr-job-board-close">✕</button>
      </div>
      <div class="dr-job-board-list"></div>
    </div>
  </div>
  <div class="dr-chase-banner">🚨 Polis peşinde! Kaç!</div>
  <div class="dr-stop-hint">🛑 Dur &amp; sipariş al</div>
  <div class="dr-stop-panel">
    <div class="dr-stop-backdrop"></div>
    <div class="dr-stop-sheet">
      <div class="dr-stop-head">
        <div class="dr-stop-icon">🍕</div>
        <div class="dr-stop-title">—</div>
        <button class="dr-stop-close">✕</button>
      </div>
      <div class="dr-stop-note">Önce mevcut teslimatı bitir</div>
      <div class="dr-stop-list"></div>
    </div>
  </div>
  <div class="dr-free-float-layer"></div>`;

let styled = false;
export function injectFreeHudStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-free { position: fixed; inset: 0; z-index: 6; pointer-events: none;
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color: #e6edf7; }
    .dr-free * { box-sizing: border-box; }
    .dr-free > * { pointer-events: none; }

    /* --- Top bar: left (badge + jobs), right (speed/wallet/menu + minimap) --- */
    .dr-free-top { position: fixed; top: calc(env(safe-area-inset-top,0px) + 10px); left: 12px; right: 12px;
      z-index: 6; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .dr-free-left, .dr-free-right, .dr-free-right-row { pointer-events: auto; display: flex; align-items: center; gap: 8px; }
    .dr-free-right { flex-direction: column; align-items: flex-end; }
    .dr-free-badge, .dr-free-wallet, .dr-free-speed { background: rgba(13,19,31,0.72);
      border: 1px solid rgba(120,150,200,0.2); border-radius: 14px; padding: 8px 12px;
      font-weight: 900; font-size: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
    .dr-free-badge { border-left: 4px solid #5aa9ff; }
    .dr-free-wallet { color: #ffd54a; }
    .dr-free-speed { width: clamp(92px,24vw,112px); height: clamp(52px,13vw,62px); padding: 0 14px;
      display: flex; align-items: center; justify-content: center; gap: 3px; text-align: center;
      font-variant-numeric: tabular-nums; border: 0; border-radius: 0; box-shadow: none;
      background: url("${speedometerUrl}") center/100% 100% no-repeat;
      transition: color .15s, filter .15s; }
    .dr-free-speed b { font-size: 18px; text-shadow: 0 2px 4px #070c16; }
    .dr-free-speed span { font-size: 10px; color: #9fb0c9; margin-left: 1px; }
    /* Over the local speed limit: pill goes red so you know you're risking a fine. */
    .dr-free-speed.over { color: #ffd7d7; filter: drop-shadow(0 0 6px rgba(239,68,68,.8));
      animation: dr-free-pulse .7s ease-in-out infinite; }
    .dr-free-speed.over span { color: #ffb3b3; }
    .dr-free-jobs-btn, .dr-free-menu { background: rgba(13,19,31,0.72); border: 1px solid rgba(120,150,200,0.22);
      color: #cdd8ea; border-radius: 14px; padding: 9px 12px; font-weight: 900; font-size: 13px; cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3); -webkit-tap-highlight-color: transparent; }
    .dr-free-jobs-btn:active, .dr-free-menu:active { transform: translateY(2px); }
    .dr-free-jobs-btn { display: flex; align-items: center; gap: 6px; padding: 5px 10px 5px 6px; }
    .dr-free-jobs-icon { width: 34px; height: 34px; flex: 0 0 34px;
      background: url("${jobsButtonUrl}") center/contain no-repeat; }
    .dr-free-left { flex-direction: column; align-items: flex-start; gap: 6px; }

    .dr-free-map-wrap { width: clamp(96px, 28vw, 128px); height: clamp(96px, 28vw, 128px); border-radius: 50%;
      overflow: hidden; margin-top: 2px;
      background: rgba(13,19,31,0.72); border: 1px solid rgba(120,150,200,0.22); box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
    .dr-free-map { display: block; width: 100%; height: 100%; }

    /* --- Active job card (sits just under the top bar + minimap column) --- */
    .dr-job-active { position: fixed; top: calc(env(safe-area-inset-top,0px) + 176px); left: 12px; right: 12px;
      z-index: 6; pointer-events: auto; background: rgba(13,19,31,0.8); backdrop-filter: blur(8px);
      border: 1px solid rgba(120,150,200,0.2); border-left: 4px solid #f5a524; border-radius: 16px;
      padding: 10px 12px; opacity: 0; transform: translateY(-10px); pointer-events: none;
      transition: opacity .22s ease, transform .22s ease; box-shadow: 0 8px 22px rgba(0,0,0,0.4); }
    .dr-job-active.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .dr-job-active.delivering { border-left-color: #37d67a; }
    .dr-job-active.urgent .dr-job-active-title { animation: dr-free-pulse .6s ease-in-out infinite; }
    .dr-job-active.late { border-left-color: #ef4444; }
    .dr-job-active-head { display: flex; align-items: center; gap: 10px; }
    .dr-job-active-icon { font-size: 26px; width: 40px; height: 40px; flex: 0 0 40px; display: flex;
      align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border-radius: 10px; }
    .dr-job-active-info { flex: 1; min-width: 0; }
    .dr-job-active-title { font-weight: 800; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dr-job-active-sub { font-size: 12px; color: #9fb0c9; margin-top: 2px; }
    .dr-job-cancel { flex: 0 0 auto; background: rgba(239,68,68,0.14); border: 1px solid rgba(239,68,68,0.4);
      color: #ff9b9b; border-radius: 10px; padding: 7px 10px; font-weight: 800; font-size: 12px; cursor: pointer;
      -webkit-tap-highlight-color: transparent; }
    .dr-job-active-bar { height: 5px; margin-top: 8px; border-radius: 4px; background: rgba(255,255,255,0.14); overflow: hidden; }
    .dr-job-active-bar > i { display: block; height: 100%; width: 100%; transform-origin: left center;
      background: linear-gradient(90deg,#f5a524,#ffd06b); transition: transform .18s linear; }
    .dr-job-active.delivering .dr-job-active-bar > i { background: linear-gradient(90deg,#37d67a,#8ef0b0); }
    @keyframes dr-free-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }

    /* --- Job board bottom sheet --- */
    .dr-job-board { position: fixed; inset: 0; z-index: 9; opacity: 0; pointer-events: none;
      transition: opacity .2s ease; }
    .dr-job-board:not(.open) * { pointer-events: none; }
    .dr-job-board.open { opacity: 1; pointer-events: auto; }
    .dr-job-board-backdrop { position: absolute; inset: 0; background: rgba(5,9,18,0.6); pointer-events: auto; }
    .dr-job-board-sheet { position: absolute; left: 0; right: 0; bottom: 0; max-height: 52vh; display: flex;
      flex-direction: column; background: linear-gradient(180deg,#141d2e,#0d1524);
      border-top: 1px solid rgba(120,150,200,0.22); border-radius: 22px 22px 0 0;
      box-shadow: 0 -12px 34px rgba(0,0,0,0.5); transform: translateY(14px);
      transition: transform .25s cubic-bezier(.2,.9,.3,1.2); pointer-events: auto;
      padding-bottom: calc(env(safe-area-inset-bottom,0px) + 10px); }
    .dr-job-board.open .dr-job-board-sheet { transform: translateY(0); }
    .dr-job-board-head { display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 8px; }
    .dr-job-board-title { font-weight: 900; font-size: 16px; }
    .dr-job-board-close { background: rgba(255,255,255,0.06); border: 1px solid rgba(120,150,200,0.2);
      color: #cdd8ea; border-radius: 10px; width: 32px; height: 32px; font-weight: 900; cursor: pointer; }
    .dr-job-board-list { overflow-y: auto; padding: 4px 12px 8px; display: flex; flex-direction: column; gap: 8px; }
    .dr-job-board-list.disabled .dr-job-row { opacity: 0.4; pointer-events: none; }
    .dr-job-empty { text-align: center; color: #9fb0c9; font-size: 13px; padding: 20px 8px; }
    .dr-job-row { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: none;
      border-radius: 14px; padding: 10px 12px; background: rgba(255,255,255,0.05); cursor: pointer;
      color: #e6edf7; -webkit-tap-highlight-color: transparent; }
    .dr-job-row:active { transform: translateY(1px); }
    .dr-job-row.special { background: rgba(255,213,74,0.1); border: 1px solid rgba(255,213,74,0.3); }
    .dr-job-row-icon { font-size: 22px; width: 36px; height: 36px; flex: 0 0 36px; display: flex;
      align-items: center; justify-content: center; background: rgba(255,255,255,0.06); border-radius: 10px; }
    .dr-job-row-info { flex: 1; min-width: 0; }
    .dr-job-row-title { font-weight: 800; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dr-job-row-meta { font-size: 11px; color: #9fb0c9; margin-top: 2px; display: flex; gap: 8px; }
    .dr-job-row-pay { flex: 0 0 auto; font-weight: 900; font-size: 14px; color: #37d67a; }
    .dr-job-row-pay span { font-size: 12px; }

    /* --- Police chase banner (top-centre, below the top bar + active job card) --- */
    .dr-chase-banner { position: fixed; left: 50%; top: calc(env(safe-area-inset-top,0px) + 258px);
      transform: translateX(-50%) translateY(-8px); z-index: 8; pointer-events: none; opacity: 0;
      color: #fff; font-weight: 900; font-size: 15px; letter-spacing: 0.02em; white-space: nowrap;
      background: linear-gradient(180deg, rgba(220,38,38,0.95), rgba(150,20,20,0.95));
      border: 1px solid rgba(255,120,120,0.6); border-radius: 14px; padding: 9px 16px;
      box-shadow: 0 8px 22px rgba(200,0,0,0.4); transition: opacity .2s ease, transform .2s ease; }
    .dr-chase-banner.show { opacity: 1; transform: translateX(-50%) translateY(0);
      animation: dr-free-pulse .6s ease-in-out infinite; }

    /* --- Stop-to-order: world hint toast + the panel itself --- */
    .dr-stop-hint { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom,0px) + 200px);
      z-index: 6; pointer-events: none; opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.96);
      transition: opacity .18s ease, transform .18s ease; color: #ffd8a8; font-weight: 800; font-size: 13px;
      background: rgba(13,19,31,0.82); border: 1px solid rgba(245,165,36,0.4); border-radius: 14px;
      padding: 8px 14px; box-shadow: 0 6px 18px rgba(0,0,0,0.4); white-space: nowrap; }
    .dr-stop-hint.show { opacity: 1; transform: translateX(-50%) translateY(0) scale(1);
      animation: dr-free-pulse 1s ease-in-out infinite; }

    .dr-stop-panel { position: fixed; inset: 0; z-index: 9; opacity: 0; pointer-events: none;
      transition: opacity .2s ease; }
    .dr-stop-panel:not(.open) * { pointer-events: none; }
    .dr-stop-panel.open { opacity: 1; pointer-events: auto; }
    .dr-stop-backdrop { position: absolute; inset: 0; background: rgba(5,9,18,0.6); pointer-events: auto; }
    .dr-stop-sheet { position: absolute; left: 0; right: 0; bottom: 0; max-height: 52vh; display: flex;
      flex-direction: column; background: linear-gradient(180deg,#141d2e,#0d1524);
      border-top: 1px solid rgba(245,165,36,0.3); border-radius: 22px 22px 0 0;
      box-shadow: 0 -12px 34px rgba(0,0,0,0.5); transform: translateY(14px);
      transition: transform .25s cubic-bezier(.2,.9,.3,1.2); pointer-events: auto;
      padding-bottom: calc(env(safe-area-inset-bottom,0px) + 10px); }
    .dr-stop-panel.open .dr-stop-sheet { transform: translateY(0); }
    .dr-stop-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 6px; }
    .dr-stop-icon { font-size: 26px; width: 40px; height: 40px; flex: 0 0 40px; display: flex;
      align-items: center; justify-content: center; background: rgba(245,165,36,0.12); border-radius: 10px; }
    .dr-stop-title { flex: 1; min-width: 0; font-weight: 900; font-size: 16px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; }
    .dr-stop-close { background: rgba(255,255,255,0.06); border: 1px solid rgba(120,150,200,0.2);
      color: #cdd8ea; border-radius: 10px; width: 32px; height: 32px; font-weight: 900; cursor: pointer; flex: 0 0 auto; }
    .dr-stop-note { display: none; margin: 0 16px 6px; font-size: 12px; font-weight: 700; color: #ff9b9b;
      background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; padding: 6px 10px; }
    .dr-stop-note.show { display: block; }
    .dr-stop-list { overflow-y: auto; padding: 4px 12px 8px; display: flex; flex-direction: column; gap: 8px; }
    .dr-stop-list.disabled .dr-job-row { opacity: 0.4; pointer-events: none; }

    /* Supplied low-poly shop-order artwork. Live HTML remains above the image,
       preserving accessibility, localization and real job data. */
    .dr-stop-sheet { left: 50%; right: auto; bottom: calc(env(safe-area-inset-bottom,0px) + 18px);
      width: min(calc(100vw - 12px),420px); height: min(60vh,538px); max-height: none;
      border: 0; border-radius: 0; box-shadow: none; padding: 0; overflow: hidden;
      background: url("${orderBoardUrl}") center/100% 100% no-repeat;
      transform: translate(-50%,18px); }
    .dr-stop-panel.open .dr-stop-sheet { transform: translate(-50%,0); }
    .dr-stop-head { height: 18%; flex: 0 0 18%; padding: 4.5% 6.5% 1% 28%; gap: 6px; }
    .dr-stop-icon { display: none; }
    .dr-stop-title { padding: 8px 10px; text-align: center; font-size: 14px; color: #e6edf7;
      text-shadow: 0 2px 4px #070c16; }
    .dr-stop-close { width: 34px; height: 34px; border-radius: 0; border: 0; background: transparent; }
    .dr-stop-note { position: absolute; top: 16%; left: 8%; right: 8%; z-index: 2; margin: 0; }
    .dr-stop-list { flex: 1; min-height: 0; overflow-y: auto; padding: 1.5% 6.5% 7%; gap: 1.6%; }
    .dr-stop-list .dr-job-row { position: relative; flex: 1 1 0; min-height: 0; padding: 4.5% 5% 3% 22%;
      border: 0; border-radius: 0; background: transparent; gap: 0; }
    .dr-stop-list .dr-job-row.special { border: 0; background: rgba(255,213,74,.04); }
    .dr-stop-list .dr-job-row-icon { display: none; }
    .dr-stop-list .dr-job-row-info { align-self: stretch; display: flex; flex-direction: column; min-width: 0; }
    .dr-stop-list .dr-job-row-title { height: 42%; padding: 2px 4px; color: #101a2b; font-size: clamp(10px,3vw,13px);
      display: flex; align-items: center; text-shadow: 0 1px rgba(255,255,255,.45); }
    .dr-stop-list .dr-job-row-meta { position: absolute; left: 16%; right: 24%; bottom: 9%; margin: 0;
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4%; color: #dbe7f8;
      font-size: clamp(8px,2.4vw,10px); }
    .dr-stop-list .dr-job-row-meta span { text-align: center; white-space: nowrap; }
    .dr-stop-list .dr-job-row-pay { position: absolute; right: 3%; bottom: 14%; width: 19%; text-align: center;
      color: #06210f; font-size: clamp(11px,3.2vw,14px); text-shadow: 0 1px rgba(255,255,255,.25); }
    .dr-stop-list .dr-job-row-pay span { display: none; }
    .dr-stop-list .dr-job-row:nth-child(3) { top: -7px; }

    /* --- Floating reward text --- */
    .dr-free-float-layer { position: fixed; top: 46%; left: 0; right: 0; text-align: center; z-index: 7; }
    .dr-free-float { font-weight: 900; font-size: 30px; text-shadow: 0 2px 10px rgba(0,0,0,0.6);
      -webkit-text-stroke: 1.5px rgba(0,0,0,0.35); animation: dr-free-float 1.1s ease-out forwards; }
    @keyframes dr-free-float { 0%{opacity:0;transform:translateY(14px) scale(0.7)}
      20%{opacity:1;transform:translateY(0) scale(1.1)} 70%{opacity:1} 100%{opacity:0;transform:translateY(-50px) scale(1)} }
  `;
  document.head.appendChild(s);
}
