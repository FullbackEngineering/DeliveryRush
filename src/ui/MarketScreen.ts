import { SHOP_CATEGORIES, SHOP_ITEMS } from '@/data/shopItems';
import type { ShopCategory, ShopItem } from '@/data/shopItems';
import { Profile } from '@/managers/ProfileStore';
import { bus, GameEvent } from '@/core/EventBus';
import { getShopCategoryItems } from '@/systems/Shop';
import type { ShopItemView, ShopReadModelOptions } from '@/systems/Shop';
import type { PlayerProfile } from '@/types';

export interface MarketScreenOptions extends ShopReadModelOptions {
  mount?: HTMLElement;
  initialCategory?: ShopCategory;
  getProfile?: () => Readonly<PlayerProfile>;
  onClose?: () => void;
  /** The host owns spending, granting, persistence, audio and analytics. */
  onPurchaseRequested?: (item: ShopItem) => void;
}

const STYLE_ID = 'delivery-rush-market-style';

/** Standalone native-DOM market. It does not register routes or mutate profile state. */
export class MarketScreen {
  private readonly root: HTMLDivElement;
  private readonly options: MarketScreenOptions;
  private readonly getProfile: () => Readonly<PlayerProfile>;
  private category: ShopCategory;
  private previouslyFocused: HTMLElement | null = null;
  /** Re-render live while open when the profile (coins/gems/ownership) changes. */
  private readonly onProfileChanged = (): void => {
    if (!this.root.hidden) this.render();
  };

  constructor(options: MarketScreenOptions = {}) {
    this.options = options;
    this.getProfile = options.getProfile ?? (() => Profile.get());
    this.category = options.initialCategory ?? 'cards';
    this.root = document.createElement('div');
    this.root.className = 'dr-market';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Market');
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('keydown', this.onKeyDown);

    installStyles();
    (options.mount ?? document.body).appendChild(this.root);
    bus.on(GameEvent.ProfileChanged, this.onProfileChanged);
  }

  open(): void {
    if (!this.root.hidden) return;
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    this.render();
    requestAnimationFrame(() => this.root.querySelector<HTMLElement>('[data-close]')?.focus());
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.previouslyFocused?.focus();
    this.options.onClose?.();
  }

  /** Re-read the profile after the host completes a purchase. */
  refresh(): void {
    if (!this.root.hidden) this.render();
  }

  destroy(): void {
    bus.off(GameEvent.ProfileChanged, this.onProfileChanged);
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || !this.root.contains(target)) return;

    const action = target.dataset.action;
    if (action === 'close') {
      this.close();
      return;
    }

    if (action === 'category') {
      const category = target.dataset.category as ShopCategory | undefined;
      if (SHOP_CATEGORIES.some((entry) => entry.id === category)) {
        this.category = category!;
        this.render();
      }
      return;
    }

    if (action === 'buy') {
      const item = SHOP_ITEMS.find((entry) => entry.id === target.dataset.itemId);
      if (!item) return;
      // The single mutation point does the spend + grant; ProfileChanged re-renders us.
      const ok = Profile.purchaseShopItem(item);
      if (ok) {
        bus.emit(GameEvent.Haptic, 'light');
        this.options.onPurchaseRequested?.(item);
      }
      this.render();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close();
  };

  private render(): void {
    const profile = this.getProfile();
    // Cosmetic ownership comes straight from the profile; merge over any host-supplied ids.
    const ownedItemIds = new Set<string>([
      ...profile.ownedCosmetics,
      ...(this.options.ownedItemIds ?? []),
    ]);
    const views = getShopCategoryItems(SHOP_ITEMS, this.category, profile, {
      ...this.options,
      ownedItemIds,
    });

    this.root.innerHTML = `
      <section class="dr-market__shell">
        <header class="dr-market__header">
          <div>
            <span class="dr-market__eyebrow">DELIVERY RUSH</span>
            <h1>Market</h1>
          </div>
          <div class="dr-market__wallet" aria-label="Cüzdan">
            <span>🪙 ${formatNumber(profile.coins)}</span>
            <span>💎 ${formatNumber(profile.gems)}</span>
          </div>
          <button class="dr-market__close" data-action="close" data-close aria-label="Marketi kapat">×</button>
        </header>
        <nav class="dr-market__tabs" aria-label="Market kategorileri">
          ${SHOP_CATEGORIES.map(
            (entry) => `<button
              data-action="category"
              data-category="${entry.id}"
              class="${entry.id === this.category ? 'is-active' : ''}"
              aria-pressed="${entry.id === this.category}"
            ><span>${entry.icon}</span>${entry.label}</button>`,
          ).join('')}
        </nav>
        <main class="dr-market__content">
          <div class="dr-market__section-title">
            <h2>${categoryTitle(this.category)}</h2>
            <span>${views.length} ürün</span>
          </div>
          <div class="dr-market__grid">
            ${views.map(renderItem).join('')}
          </div>
        </main>
      </section>`;
  }
}

function renderItem(view: ShopItemView): string {
  const { item, state } = view;
  const isOwned = state === 'owned';
  const canBuy = state === 'affordable';
  const label = isOwned
    ? 'Sende var'
    : canBuy
      ? `${currencyIcon(item.price.currency)} ${formatNumber(item.price.amount)}`
      : `${currencyIcon(item.price.currency)} ${formatNumber(item.price.amount)}`;

  return `<article class="dr-market__card dr-market__card--${item.rarity}">
    ${item.featured ? '<span class="dr-market__featured">ÖNE ÇIKAN</span>' : ''}
    <div class="dr-market__icon" aria-hidden="true">${item.icon}</div>
    <div class="dr-market__copy">
      <span class="dr-market__rarity">${rarityLabel(item.rarity)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </div>
    <button
      class="dr-market__buy ${isOwned ? 'is-owned' : ''}"
      data-action="buy"
      data-item-id="${item.id}"
      ${canBuy ? '' : 'disabled'}
      aria-label="${escapeHtml(item.name)}: ${label}"
    >${label}</button>
    ${state === 'insufficient-funds' ? `<small>${currencyIcon(item.price.currency)} ${formatNumber(view.shortfall)} eksik</small>` : ''}
  </article>`;
}

function categoryTitle(category: ShopCategory): string {
  if (category === 'cards') return 'Yetenek kartları';
  if (category === 'boosts') return 'Tek koşuluk boostlar';
  return 'Aracına stil kat';
}

function currencyIcon(currency: 'coins' | 'gems'): string {
  return currency === 'coins' ? '🪙' : '💎';
}

function rarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: 'SIRADAN',
    rare: 'NADİR',
    epic: 'DESTANSI',
    legendary: 'EFSANEVİ',
  };
  return labels[rarity] ?? rarity.toUpperCase();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

function escapeHtml(value: string): string {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML;
}

function installStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dr-market { position: fixed; inset: 0; z-index: 80; pointer-events: auto; color: #eef6ff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: radial-gradient(circle at 50% -15%, #203862 0, #0b1527 38%, #070d18 100%); overflow: auto; overscroll-behavior: contain; }
    .dr-market[hidden] { display: none; }
    .dr-market * { box-sizing: border-box; }
    .dr-market button { font: inherit; }
    .dr-market__shell { width: min(100%, 720px); min-height: 100%; margin: 0 auto; padding: max(20px, env(safe-area-inset-top)) 18px max(28px, env(safe-area-inset-bottom)); }
    .dr-market__header { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; }
    .dr-market__header h1 { margin: 2px 0 0; font-size: clamp(28px, 7vw, 42px); line-height: 1; letter-spacing: -1.5px; }
    .dr-market__eyebrow { color: #37d67a; font-size: 11px; font-weight: 900; letter-spacing: 2px; }
    .dr-market__wallet { display: flex; gap: 7px; }
    .dr-market__wallet span { padding: 9px 11px; border: 1px solid #334563; border-radius: 999px; background: #111e33cc; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .dr-market__close { width: 42px; height: 42px; border: 1px solid #354762; border-radius: 14px; color: #b9c8dc; background: #152238; font-size: 27px; cursor: pointer; }
    .dr-market__tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 24px 0; padding: 5px; border: 1px solid #273752; border-radius: 18px; background: #0a1322aa; }
    .dr-market__tabs button { min-height: 50px; border: 0; border-radius: 13px; color: #8393aa; background: transparent; font-weight: 800; cursor: pointer; transition: 150ms ease; }
    .dr-market__tabs button span { margin-right: 7px; }
    .dr-market__tabs button.is-active { color: #fff; background: linear-gradient(135deg, #235b47, #173f44); box-shadow: inset 0 0 0 1px #3cd58a66, 0 5px 14px #0005; }
    .dr-market__section-title { display: flex; align-items: baseline; justify-content: space-between; margin: 0 2px 13px; }
    .dr-market__section-title h2 { margin: 0; font-size: 19px; }
    .dr-market__section-title span { color: #71839c; font-size: 12px; font-weight: 700; }
    .dr-market__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .dr-market__card { position: relative; display: flex; min-height: 260px; flex-direction: column; padding: 16px; overflow: hidden; border: 1px solid #2a3b57; border-radius: 22px; background: linear-gradient(160deg, #17243a 0%, #0f192a 100%); box-shadow: 0 14px 30px #0003; }
    .dr-market__card::before { content: ''; position: absolute; width: 120px; height: 120px; right: -34px; top: -42px; border-radius: 50%; background: var(--rarity, #94a3b8); filter: blur(45px); opacity: .2; }
    .dr-market__card--common { --rarity: #94a3b8; }
    .dr-market__card--rare { --rarity: #3b82f6; }
    .dr-market__card--epic { --rarity: #8b5cf6; }
    .dr-market__card--legendary { --rarity: #ffd54a; }
    .dr-market__featured { position: absolute; z-index: 1; top: 12px; right: 12px; padding: 5px 7px; border-radius: 7px; color: #07150e; background: #37d67a; font-size: 8px; font-weight: 1000; letter-spacing: .8px; }
    .dr-market__icon { display: grid; width: 68px; height: 68px; place-items: center; margin-bottom: 13px; border: 1px solid color-mix(in srgb, var(--rarity) 55%, #fff0); border-radius: 19px; background: color-mix(in srgb, var(--rarity) 15%, #0d1728); font-size: 34px; }
    .dr-market__copy { flex: 1; }
    .dr-market__rarity { color: var(--rarity); font-size: 9px; font-weight: 1000; letter-spacing: 1.3px; }
    .dr-market__copy h3 { margin: 4px 0 6px; font-size: 16px; line-height: 1.15; }
    .dr-market__copy p { margin: 0 0 14px; color: #8fa2bc; font-size: 12px; line-height: 1.45; }
    .dr-market__buy { width: 100%; min-height: 42px; border: 0; border-radius: 13px; color: #07150e; background: linear-gradient(135deg, #37d67a, #2bb46a); font-size: 13px; font-weight: 900; cursor: pointer; box-shadow: 0 7px 18px #1ca96838; }
    .dr-market__buy:disabled { color: #718198; background: #26334a; box-shadow: none; cursor: default; }
    .dr-market__buy.is-owned { color: #6ecf9d; background: #18382f; }
    .dr-market__card small { margin-top: 6px; color: #f09090; text-align: center; font-size: 10px; font-weight: 700; }
    .dr-market button:focus-visible { outline: 3px solid #5ea6ff; outline-offset: 2px; }
    @media (max-width: 430px) {
      .dr-market__shell { padding-inline: 12px; }
      .dr-market__header { grid-template-columns: 1fr auto; }
      .dr-market__wallet { grid-row: 2; grid-column: 1 / -1; justify-self: stretch; }
      .dr-market__wallet span { flex: 1; text-align: center; }
      .dr-market__close { grid-column: 2; grid-row: 1; }
      .dr-market__grid { gap: 9px; }
      .dr-market__card { min-height: 270px; padding: 13px; border-radius: 18px; }
      .dr-market__featured { position: static; align-self: flex-start; margin: -2px 0 8px; }
      .dr-market__icon { width: 58px; height: 58px; font-size: 29px; }
    }
  `;
  document.head.appendChild(style);
}
