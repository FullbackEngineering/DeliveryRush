import currencyArtUrl from '@/assets/ui/kopernik/kopernik-currency-bg.webp?url';
import gemArtUrl from '@/assets/ui/kopernik/kopernik-gems.webp?url';
import coinArtUrl from '@/assets/ui/kopernik/kopernik-coins.webp?url';
import coinIconUrl from '@/assets/ui/kopernik/coin-icon.webp?url';
import gemIconUrl from '@/assets/ui/kopernik/gem-icon.webp?url';
import { Profile } from '@/managers/ProfileStore';
import { bus, GameEvent } from '@/core/EventBus';
import { formatNumber } from '@/utils/MathUtils';
import { GEM_PACKS, COIN_PACKS, AD_GEM_REWARD } from '@/data/gemPacks';
import { buyCoins, buyGems, watchAdForGems } from '@/services/gametegra/gems';

export interface GemShopOptions { showTrigger?: boolean; }

export class GemShop {
  private readonly root: HTMLDivElement;
  private readonly trigger: HTMLButtonElement;
  private busy = false;

  constructor(mount: HTMLElement, options: GemShopOptions = {}) {
    injectStyle();
    this.trigger = document.createElement('button');
    this.trigger.className = 'dr-gem-trigger';
    this.trigger.textContent = 'PARA MAĞAZASI';
    this.trigger.hidden = options.showTrigger === false;
    this.trigger.addEventListener('click', () => this.open());
    mount.appendChild(this.trigger);
    this.root = document.createElement('div');
    this.root.className = 'dr-gem';
    this.root.hidden = true;
    this.root.addEventListener('click', this.onClick);
    mount.appendChild(this.root);
    bus.on(GameEvent.ProfileChanged, this.onProfileChanged);
    this.render();
  }

  open(): void { this.root.hidden = false; this.render(); }
  close(): void { this.root.hidden = true; }
  destroy(): void {
    bus.off(GameEvent.ProfileChanged, this.onProfileChanged);
    this.root.removeEventListener('click', this.onClick);
    this.root.remove(); this.trigger.remove();
  }

  private readonly onProfileChanged = (): void => { if (!this.root.hidden) this.render(); };
  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || !this.root.contains(target)) return;
    const action = target.dataset.action;
    if (action === 'close') return this.close();
    if (action === 'ad') return void this.onAd();
    if (action === 'gems') return void this.onBuyGems(Number(target.dataset.index));
    if (action === 'coins') return void this.onBuyCoins(Number(target.dataset.index));
  };

  private async onBuyGems(index: number): Promise<void> {
    const pack = GEM_PACKS[index];
    if (this.busy || !pack) return;
    this.busy = true; this.render();
    // `finally` so a failed/timed-out payment can never leave the buttons locked.
    const outcome = await buyGems(pack).finally(() => { this.busy = false; this.render(); });
    // Cancel (player closed the payment sheet) is NOT an error — stay silent.
    if (outcome.ok) this.showToast(`+${formatNumber(pack.gems)} KAZANDIN`, gemIconUrl);
    else if (!outcome.cancelled) this.showToast('SATIN ALMA TAMAMLANMADI');
  }

  private async onBuyCoins(index: number): Promise<void> {
    const pack = COIN_PACKS[index];
    if (this.busy || !pack) return;
    this.busy = true; this.render();
    const outcome = await buyCoins(pack).finally(() => { this.busy = false; this.render(); });
    if (outcome.ok) this.showToast(`+${formatNumber(pack.coins)} KAZANDIN`, coinIconUrl);
    else if (!outcome.cancelled) this.showToast('SATIN ALMA TAMAMLANMADI');
  }

  private async onAd(): Promise<void> {
    if (this.busy) return;
    this.busy = true; this.render();
    const ok = await watchAdForGems().finally(() => { this.busy = false; this.render(); });
    this.showToast(ok ? `+${AD_GEM_REWARD} KAZANDIN` : 'REKLAM TAMAMLANMADI', ok ? gemIconUrl : undefined);
  }

  private showToast(message: string, iconUrl?: string): void {
    const toast = this.root.querySelector<HTMLElement>('.dr-gem__toast');
    if (!toast) return;
    toast.replaceChildren();
    if (iconUrl) {
      const icon = document.createElement('img'); icon.src = iconUrl; icon.alt = ''; toast.append(icon);
    }
    toast.append(document.createTextNode(message)); toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 1900);
  }

  private render(): void {
    const profile = Profile.get();
    this.root.innerHTML = `
      <div class="dr-gem__art" aria-hidden="true"></div>
      <main class="dr-gem__ui">
        <header><button data-action="close" aria-label="Markete dön">GERİ</button>
          <div><small>KOPERNİK</small><b>PARA MAĞAZASI</b></div>
          <button data-action="close" aria-label="Kapat">KAPAT</button></header>
        <div class="dr-gem__wallet"><span><img src="${gemIconUrl}" alt="elmas"><b>${formatNumber(profile.gems)}</b></span><span><img src="${coinIconUrl}" alt="coin"><b>${formatNumber(profile.coins)}</b></span></div>
        <section class="dr-gem__columns">
          <div><h2><img src="${gemIconUrl}" alt="Elmas paketleri"></h2>${GEM_PACKS.map((pack, index) => `<button class="dr-gem-pack gem" data-action="gems" data-index="${index}" ${this.busy ? 'disabled' : ''}>
            <img class="dr-gem-pack__art" src="${gemArtUrl}" alt=""><b>${formatNumber(pack.gems)}</b><small>${pack.bonus ?? 'PAKET'}</small><strong>SATIN AL</strong></button>`).join('')}</div>
          <div><h2><img src="${coinIconUrl}" alt="Coin paketleri"></h2>${COIN_PACKS.map((pack, index) => `<button class="dr-gem-pack coin" data-action="coins" data-index="${index}" ${this.busy ? 'disabled' : ''}>
            <img class="dr-gem-pack__art" src="${coinArtUrl}" alt=""><b>${formatNumber(pack.coins)}</b><small>${pack.bonus ?? 'PAKET'}</small><strong>SATIN AL</strong></button>`).join('')}</div>
        </section>
        <button class="dr-gem__ad" data-action="ad" ${this.busy ? 'disabled' : ''}><b>${this.busy ? 'İŞLEM AÇILIYOR…' : 'REKLAM İZLE'}</b><strong>+${AD_GEM_REWARD} <img src="${gemIconUrl}" alt="elmas"></strong></button>
      </main><div class="dr-gem__toast" role="status" aria-live="polite"></div>`;
  }
}

let styled = false;
function injectStyle(): void {
  if (styled) return; styled = true;
  const style = document.createElement('style');
  style.textContent = `
    .dr-gem-trigger { position:fixed; left:50%; bottom:14px; z-index:12; transform:translateX(-50%);
      min-height:42px; padding:0 20px; border:2px solid #36cfff; border-radius:12px; color:#eaffff;
      background:#071525; font-weight:1000; pointer-events:auto; }.dr-gem-trigger[hidden]{display:none}
    .dr-gem { position:fixed; inset:0; z-index:95; overflow:hidden; pointer-events:auto; color:#fff;
      background:#06101f; font-family:system-ui,-apple-system,"Segoe UI",sans-serif; }.dr-gem[hidden]{display:none}
    .dr-gem *{box-sizing:border-box}.dr-gem__art{position:absolute;inset:0;background:url("${currencyArtUrl}") center/cover no-repeat;
      filter:brightness(.58) saturate(.88);transform:scale(1.02)}
    .dr-gem__ui{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 12px)}
    .dr-gem button{cursor:pointer;-webkit-tap-highlight-color:transparent}.dr-gem header{display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:7px}
    .dr-gem header>button{height:44px;border:2px solid #28d9ff;border-radius:11px;color:#fff;background:#071827;font-size:8px;font-weight:1000}
    .dr-gem header>div{text-align:center;line-height:1}.dr-gem header small,.dr-gem header b{display:block;font-weight:1000}.dr-gem header small{color:#ffc335;font-size:12px;letter-spacing:.12em}
    .dr-gem header b{color:#42dcff;font-size:24px}.dr-gem__wallet{display:flex;justify-content:center;gap:8px}.dr-gem__wallet span{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border:2px solid #287fa7;border-radius:9px;background:#071827;text-align:center;font-size:11px}
    .dr-gem__wallet img{width:22px;height:22px;object-fit:contain}.dr-gem__wallet b{color:#ffd43d;font-size:14px}.dr-gem__columns{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:8px}.dr-gem__columns>div{min-height:0;display:flex;flex-direction:column;gap:8px}
    .dr-gem__columns h2{margin:0;padding:5px;border:2px solid #27bce8;border-radius:10px;color:#4bdfff;background:#071827;text-align:center;font-size:17px}.dr-gem__columns h2 img{width:30px;height:30px;object-fit:contain}.dr-gem__columns>div:nth-child(2) h2{border-color:#d88b17;color:#ffc63e}
    .dr-gem-pack{flex:1;min-height:0;display:grid;grid-template-columns:42px 1fr;grid-template-rows:1fr auto auto;align-items:center;gap:2px 6px;padding:7px;border:2px solid #238cb8;border-radius:12px;color:#fff;background:#081827;text-align:left}
    .dr-gem-pack.coin{border-color:#aa6c12}.dr-gem-pack__art{grid-row:1/4;width:40px;height:52px;border-radius:10px;object-fit:cover;background:#0b3048}.coin .dr-gem-pack__art{background:#3c290a}
    .dr-gem-pack>b{color:#50e2ff;font-size:20px}.coin>b{color:#ffd13b}.dr-gem-pack small{color:#a9bacd;font-size:8px}.dr-gem-pack strong{display:block;padding:5px;border-radius:6px;color:#251600;background:#ffb82d;text-align:center;font-size:9px}
    .dr-gem-pack:disabled,.dr-gem__ad:disabled{opacity:.65}.dr-gem__ad{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px;min-height:62px;border:3px solid #20e27d;border-radius:13px;color:#fff;background:#07301f}
    .dr-gem__ad strong{display:flex;align-items:center;gap:5px;color:#43eaff}.dr-gem__ad strong img{width:23px;height:23px;object-fit:contain}.dr-gem__toast{position:absolute;z-index:5;left:50%;top:48%;min-width:240px;padding:12px;transform:translate(-50%,-8px);border:2px solid #38dcff;border-radius:12px;background:#071321;display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;font-size:12px;font-weight:1000;opacity:0;pointer-events:none;transition:.18s}.dr-gem__toast img{width:22px;height:22px;object-fit:contain}.dr-gem__toast.show{opacity:1;transform:translate(-50%,0)}
  `;
  document.head.appendChild(style);
}
