import marketArtUrl from '@/assets/ui/kopernik/kopernik-market-bg.webp?url';
import marketItemArtUrl from '@/assets/ui/kopernik/kopernik-market-item.webp?url';
import coinIconUrl from '@/assets/ui/kopernik/coin-icon.webp?url';
import gemIconUrl from '@/assets/ui/kopernik/gem-icon.webp?url';
import { SHOP_CATEGORIES, SHOP_ITEMS } from '@/data/shopItems';
import type { ShopCategory, ShopItem } from '@/data/shopItems';
import { Profile } from '@/managers/ProfileStore';
import { bus, GameEvent } from '@/core/EventBus';
import { getShopCategoryItems, getShopItemView } from '@/systems/Shop';
import type { ShopReadModelOptions } from '@/systems/Shop';
import type { PlayerProfile } from '@/types';

export interface MarketScreenOptions extends ShopReadModelOptions {
  mount?: HTMLElement;
  initialCategory?: ShopCategory;
  getProfile?: () => Readonly<PlayerProfile>;
  onClose?: () => void;
  onPurchaseRequested?: (item: ShopItem) => void;
  onCurrencyRequested?: () => void;
  onLeaderboardRequested?: () => void;
  onRewardAd?: () => Promise<boolean>;
}

export class MarketScreen {
  private readonly root: HTMLDivElement;
  private readonly getProfile: () => Readonly<PlayerProfile>;
  private category: ShopCategory;
  private busy = false;

  constructor(private readonly options: MarketScreenOptions = {}) {
    installStyles();
    this.getProfile = options.getProfile ?? (() => Profile.get());
    this.category = options.initialCategory ?? 'cards';
    this.root = document.createElement('div');
    this.root.className = 'dr-market';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Kopernik Market');
    this.root.addEventListener('click', this.onClick);
    (options.mount ?? document.body).appendChild(this.root);
    bus.on(GameEvent.ProfileChanged, this.onProfileChanged);
  }

  open(): void { this.root.hidden = false; this.render(); }
  close(): void { this.root.hidden = true; this.options.onClose?.(); }
  refresh(): void { if (!this.root.hidden) this.render(); }
  destroy(): void {
    bus.off(GameEvent.ProfileChanged, this.onProfileChanged);
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
  }

  private readonly onProfileChanged = (): void => { if (!this.root.hidden) this.render(); };
  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || !this.root.contains(target)) return;
    const action = target.dataset.action;
    if (action === 'close') return this.close();
    if (action === 'currency') return this.options.onCurrencyRequested?.();
    if (action === 'leaderboard') return this.options.onLeaderboardRequested?.();
    if (action === 'reward') return void this.claimReward();
    if (action === 'category') {
      const next = target.dataset.category as ShopCategory;
      if (SHOP_CATEGORIES.some((entry) => entry.id === next)) {
        this.category = next;
        this.render();
      }
      return;
    }
    if (action === 'buy') {
      const item = SHOP_ITEMS.find((entry) => entry.id === target.dataset.itemId);
      if (item) this.buy(item);
    }
  };

  private buy(item: ShopItem): void {
    const view = getShopItemView(item, this.getProfile(), this.options);
    if (view.state === 'owned') return this.showToast('BU ÜRÜN ZATEN SENDE');
    if (view.state === 'insufficient-funds') {
      this.showToast('BAKİYE YETERSİZ — MAĞAZA AÇILIYOR');
      window.setTimeout(() => this.options.onCurrencyRequested?.(), 350);
      return;
    }
    const ok = Profile.purchaseShopItem(item);
    if (ok) {
      this.options.onPurchaseRequested?.(item);
      this.showToast(`${item.name.toLocaleUpperCase('tr-TR')} ALINDI`);
    } else {
      this.showToast('SATIN ALMA TAMAMLANAMADI');
    }
  }

  private async claimReward(): Promise<void> {
    if (this.busy || !this.options.onRewardAd) return;
    this.busy = true;
    this.render();
    const ok = await this.options.onRewardAd();
    this.busy = false;
    this.render();
    this.showToast(ok ? '+20 KAZANDIN' : 'REKLAM TAMAMLANMADI', ok ? gemIconUrl : undefined);
  }

  private showToast(message: string, iconUrl?: string): void {
    const toast = this.root.querySelector<HTMLElement>('.dr-market__toast');
    if (!toast) return;
    toast.replaceChildren();
    if (iconUrl) {
      const icon = document.createElement('img'); icon.src = iconUrl; icon.alt = ''; toast.append(icon);
    }
    toast.append(document.createTextNode(message));
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 1900);
  }

  private render(): void {
    const profile = this.getProfile();
    const views = getShopCategoryItems(SHOP_ITEMS, this.category, profile, this.options);
    this.root.innerHTML = `
      <div class="dr-market__art" aria-hidden="true"></div>
      <main class="dr-market__ui">
        <header class="dr-market__header">
          <button class="dr-market__back" data-action="close" aria-label="Menüye dön">GERİ</button>
          <div class="dr-market__brand"><small>KOPERNİK</small><b>MARKET</b></div>
          <button class="dr-market__leader" data-action="leaderboard">LİDERLİK</button>
        </header>
        <button class="dr-market__wallet" data-action="currency" aria-label="Elmas ve coin mağazasını aç">
          <span><img src="${coinIconUrl}" alt="coin"><b>${formatNumber(profile.coins)}</b></span>
          <span><img src="${gemIconUrl}" alt="elmas"><b>${formatNumber(profile.gems)}</b></span>
          <i>+</i>
        </button>
        <nav class="dr-market__tabs" aria-label="Market kategorileri">
          ${SHOP_CATEGORIES.map((entry) => `<button class="${entry.id === this.category ? 'selected' : ''}"
            data-action="category" data-category="${entry.id}">${entry.label.toLocaleUpperCase('tr-TR')}</button>`).join('')}
        </nav>
        <section class="dr-market__list" aria-label="${views.length} ürün">
          ${views.map(({ item, state }, index) => renderItem(item, state, index)).join('')}
        </section>
        <button class="dr-market__reward" data-action="reward" ${this.busy ? 'disabled' : ''}>
          <b>${this.busy ? 'REKLAM AÇILIYOR…' : 'REKLAM İZLE'}</b><strong>+20 <img src="${gemIconUrl}" alt="elmas"></strong>
        </button>
      </main>
      <div class="dr-market__toast" role="status" aria-live="polite"></div>`;
  }
}

function renderItem(item: ShopItem, state: 'owned' | 'affordable' | 'insufficient-funds', index: number): string {
  const icon = item.price.currency === 'gems' ? gemIconUrl : coinIconUrl;
  const price = `<span class="dr-price"><img src="${icon}" alt=""><b>${formatNumber(item.price.amount)}</b></span>`;
  return `<article class="dr-market-card rarity-${item.rarity}">
    <div class="dr-market-card__icon art-${index % 3}" aria-hidden="true"><img src="${marketItemArtUrl}" alt=""></div>
    <div class="dr-market-card__copy">
      <h2>${escapeHtml(item.name)}</h2><em>${rarityLabel(item.rarity)}</em><p>${escapeHtml(item.description)}</p>
    </div>
    <button data-action="buy" data-item-id="${item.id}" class="state-${state}">
      ${state === 'owned' ? 'SENDE' : price}
    </button>
  </article>`;
}

function rarityLabel(value: string): string {
  return ({ common: 'STANDART', rare: 'NADİR', epic: 'DESTANSI', legendary: 'EFSANEVİ' } as Record<string, string>)[value] ?? value;
}
function formatNumber(value: number): string { return new Intl.NumberFormat('tr-TR').format(value); }
function escapeHtml(value: string): string {
  const span = document.createElement('span'); span.textContent = value; return span.innerHTML;
}

let styled = false;
function installStyles(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = `
    .dr-market { position:fixed; inset:0; z-index:80; overflow:hidden; pointer-events:auto; color:#fff;
      background:#06101f; font-family:system-ui,-apple-system,"Segoe UI",sans-serif; }
    .dr-market[hidden] { display:none; }
    .dr-market * { box-sizing:border-box; }
    .dr-market__art { position:absolute; inset:0; background:url("${marketArtUrl}") center/cover no-repeat;
      filter:brightness(.58) saturate(.9); transform:scale(1.02); }
    .dr-market__ui { position:absolute; inset:0; display:flex; flex-direction:column; gap:9px;
      padding:calc(env(safe-area-inset-top,0px) + 9px) 12px calc(env(safe-area-inset-bottom,0px) + 10px); }
    .dr-market button { cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .dr-market__header { display:grid; grid-template-columns:48px 1fr 80px; align-items:center; gap:8px; }
    .dr-market__back,.dr-market__leader { min-height:42px; border:2px solid #27d7ff; border-radius:11px;
      color:#dffaff; background:#071725; font-weight:1000; }
    .dr-market__leader { border-color:#ffbd32; color:#ffda69; font-size:10px; }
    .dr-market__brand { text-align:center; line-height:.94; text-shadow:0 3px 0 #000; }
    .dr-market__brand small,.dr-market__brand b { display:block; font-weight:1000; }
    .dr-market__brand small { color:#ffbd2f; font-size:13px; letter-spacing:.12em; }
    .dr-market__brand b { color:#49ddff; font-size:28px; }
    .dr-market__wallet { display:flex; align-items:center; justify-content:center; gap:8px; min-height:44px;
      border:2px solid #259ed0; border-radius:12px; color:#fff; background:#081522; font-size:12px; }
    .dr-market__wallet span { display:flex;align-items:center;gap:5px;padding:5px 10px; border-right:1px solid #29445e; }
    .dr-market__wallet span img { width:22px;height:22px;object-fit:contain; }
    .dr-market__wallet span b { color:#ffd442; }
    .dr-market__wallet span:nth-child(2) b { color:#49ddff; }
    .dr-market__wallet i { display:grid; place-items:center; width:25px; height:25px; border-radius:7px;
      color:#06101f; background:#44ddff; font-style:normal; font-size:20px; font-weight:1000; }
    .dr-market__tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
    .dr-market__tabs button { min-height:38px; border:2px solid #2a4b69; border-radius:9px; color:#9eb3ca;
      background:#0a1725; font-size:11px; font-weight:1000; }
    .dr-market__tabs button.selected { border-color:#ffb82c; color:#271700; background:#ffbd2f; }
    .dr-market__list { flex:1; min-height:0; display:flex; flex-direction:column; gap:8px; overflow-y:auto;
      overscroll-behavior:contain; padding:1px 1px 5px; }
    .dr-market-card { flex:0 0 auto; display:grid; grid-template-columns:76px 1fr 82px; align-items:center; gap:8px;
      min-height:118px; padding:9px; border:2px solid #1fa8d5; border-radius:13px; background:#071321;
      box-shadow:0 5px 0 #03101a; }
    .dr-market-card.rarity-epic { border-color:#a84cff; }.dr-market-card.rarity-legendary { border-color:#ffae24; }
    .dr-market-card__icon { position:relative; width:72px; height:86px; overflow:hidden; border:2px solid #2ccbea;
      border-radius:11px; background:#0c2235; }
    .dr-market-card__icon img { width:100%; height:100%; object-fit:cover; pointer-events:none; }
    .dr-market-card__copy { min-width:0; }.dr-market-card h2 { margin:0; color:#45dcff; font-size:15px; line-height:1.05; }
    .dr-market-card em { display:inline-block; margin:4px 0; padding:2px 5px; border-radius:4px; color:#d8c4ff;
      background:#39205a; font-size:8px; font-style:normal; font-weight:900; }
    .dr-market-card p { margin:0; color:#aebed0; font-size:9px; line-height:1.25; }
    .dr-market-card > button { min-height:44px; padding:5px; border:2px solid #ffd25b; border-radius:9px;
      color:#241600; background:#ffb82c; font-size:10px; font-weight:1000; }
    .dr-market-card > button.state-owned { border-color:#3c536d; color:#8ca0b5; background:#172638; }
    .dr-market-card > button.state-insufficient-funds { color:#fff; background:#9f5b0b; }
    .dr-price{display:flex;align-items:center;justify-content:center;gap:5px}.dr-price img{width:20px;height:20px;object-fit:contain}
    .dr-market__reward { display:grid; grid-template-columns:1fr auto; align-items:center; gap:7px; min-height:58px;
      border:3px solid #1ce57d; border-radius:13px; color:#fff; background:#07301f; box-shadow:0 5px 0 #03180f; }
    .dr-market__reward:disabled { opacity:.65; }.dr-market__reward b { font-size:14px; }.dr-market__reward strong { color:#35e6ff; font-size:14px; }
    .dr-market__reward strong{display:flex;align-items:center;gap:5px}.dr-market__reward strong img{width:21px;height:21px;object-fit:contain}
    .dr-market__toast { position:absolute; z-index:8; left:50%; top:48%; min-width:240px; padding:12px 15px;
      transform:translate(-50%,-8px); border:2px solid #39dcff; border-radius:12px; color:#fff; background:#071321;
      display:flex;align-items:center;justify-content:center;gap:6px;text-align:center; font-size:12px; font-weight:1000; opacity:0; pointer-events:none; transition:.18s ease; }
    .dr-market__toast img{width:22px;height:22px;object-fit:contain}
    .dr-market__toast.show { opacity:1; transform:translate(-50%,0); }
  `;
  document.head.appendChild(style);
}
