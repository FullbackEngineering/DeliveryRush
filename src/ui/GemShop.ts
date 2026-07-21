import { Profile } from '@/managers/ProfileStore';
import { bus, GameEvent } from '@/core/EventBus';
import { formatNumber } from '@/utils/MathUtils';
import { GEM_PACKS, AD_GEM_REWARD } from '@/data/gemPacks';
import { buyGems, watchAdForGems } from '@/services/gametegra/gems';
import { isHost } from '@/services/gametegra/gametegra';

/**
 * Real-money gem shop (Gametegra IAP + a rewarded-ad grant). A self-contained
 * native-DOM overlay plus a floating trigger button — mounts hidden and opens on
 * tap, so wiring it is one line and it never touches MarketScreen. Purchases and
 * ads need the SuperApp host; outside it the actions disable with a note.
 */
export class GemShop {
  private readonly root: HTMLDivElement;
  private readonly trigger: HTMLButtonElement;
  private busy = false;

  // Elmas dükkanı overlay'ini ve açma butonunu kurar, profil değişimini dinler.
  constructor(mount: HTMLElement) {
    injectStyle();

    this.trigger = document.createElement('button');
    this.trigger.className = 'dr-gem-trigger';
    this.trigger.textContent = '💎 Elmas Al';
    this.trigger.addEventListener('click', () => this.open());
    mount.appendChild(this.trigger);

    this.root = document.createElement('div');
    this.root.className = 'dr-gem';
    this.root.hidden = true;
    mount.appendChild(this.root);

    bus.on(GameEvent.ProfileChanged, () => {
      if (!this.root.hidden) this.render();
    });
    this.render();
  }

  // Overlay'i açar ve içeriği tazeler.
  open(): void {
    this.root.hidden = false;
    this.render();
  }

  // Overlay'i kapatır.
  close(): void {
    this.root.hidden = true;
  }

  // Bir paket satın alır (host varsa); işlem sırasında butonları kilitler.
  private async onBuy(code: string): Promise<void> {
    if (this.busy) return;
    const pack = GEM_PACKS.find((p) => p.code === code);
    if (!pack) return;
    this.busy = true;
    this.render();
    await buyGems(pack);
    this.busy = false;
    this.render();
  }

  // Ödüllü reklam izleyip elmas kazandırır (host varsa).
  private async onAd(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.render();
    await watchAdForGems();
    this.busy = false;
    this.render();
  }

  // Cüzdanı, paketleri ve reklam seçeneğini çizer; host yoksa aksiyonları kilitler.
  private render(): void {
    const gems = Profile.get().gems;
    const host = isHost();
    const disabled = host && !this.busy ? '' : 'disabled';
    const note = host
      ? ''
      : `<div class="dr-gem__note">Elmas satın alma ve reklam yalnızca Gametegra SuperApp içinde çalışır.</div>`;
    this.root.innerHTML = `
      <div class="dr-gem__backdrop"></div>
      <div class="dr-gem__sheet" role="dialog" aria-label="Elmas Al">
        <div class="dr-gem__head">
          <div class="dr-gem__title">💎 Elmas Al</div>
          <div class="dr-gem__bal">💎 ${formatNumber(gems)}</div>
          <button class="dr-gem__close" aria-label="Kapat">✕</button>
        </div>
        ${note}
        <div class="dr-gem__packs">
          ${GEM_PACKS.map(
            (p) => `
            <button class="dr-gem__pack" data-code="${p.code}" ${disabled}>
              <span class="dr-gem__pack-gems">💎 ${formatNumber(p.gems)}</span>
              ${p.bonus ? `<span class="dr-gem__pack-bonus">${p.bonus}</span>` : ''}
              <span class="dr-gem__pack-buy">${this.busy ? '…' : 'Satın Al'}</span>
            </button>`,
          ).join('')}
        </div>
        <button class="dr-gem__ad" ${disabled}>📺 Reklam izle → +${AD_GEM_REWARD} 💎</button>
      </div>`;

    this.root.querySelector('.dr-gem__backdrop')?.addEventListener('click', () => this.close());
    this.root.querySelector('.dr-gem__close')?.addEventListener('click', () => this.close());
    this.root.querySelectorAll<HTMLElement>('.dr-gem__pack').forEach((el) =>
      el.addEventListener('click', () => void this.onBuy(el.dataset.code!)),
    );
    this.root.querySelector('.dr-gem__ad')?.addEventListener('click', () => void this.onAd());
  }
}

let styled = false;
// Elmas dükkanı stillerini bir kez enjekte eder.
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-gem-trigger { position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(env(safe-area-inset-bottom,0px) + var(--sa-bottom,0px) + 14px);
      z-index: 12; pointer-events: auto; border: 0; border-radius: 999px; cursor: pointer;
      padding: 12px 22px; font-weight: 900; font-size: 15px; color: #10203a;
      background: linear-gradient(180deg,#7fd0ff,#39a2f0); box-shadow: 0 8px 22px rgba(0,0,0,.4);
      -webkit-tap-highlight-color: transparent; }
    .dr-gem-trigger:active { transform: translateX(-50%) translateY(2px); }
    .dr-gem { position: fixed; inset: 0; z-index: 30; display: flex; align-items: flex-end;
      justify-content: center; pointer-events: auto;
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color: #e6edf7; }
    .dr-gem[hidden] { display: none; }
    .dr-gem__backdrop { position: absolute; inset: 0; background: rgba(5,9,18,0.66); }
    .dr-gem__sheet { position: relative; width: min(100vw - 16px, 440px);
      margin-bottom: calc(env(safe-area-inset-bottom,0px) + var(--sa-bottom,0px) + 12px);
      background: linear-gradient(180deg,#141d2e,#0d1524); border: 1px solid rgba(120,150,200,0.22);
      border-radius: 22px; padding: 16px; box-shadow: 0 -12px 34px rgba(0,0,0,0.5); }
    .dr-gem__head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .dr-gem__title { flex: 1; font-weight: 900; font-size: 17px; }
    .dr-gem__bal { padding: 7px 11px; border: 1px solid #334563; border-radius: 999px;
      background: #111e33cc; font-size: 13px; font-weight: 800; }
    .dr-gem__close { width: 36px; height: 36px; border: 1px solid #354762; border-radius: 12px;
      color: #b9c8dc; background: #152238; font-size: 20px; cursor: pointer; }
    .dr-gem__note { margin: 2px 0 12px; font-size: 12px; color: #ffd8a8; font-weight: 700;
      background: rgba(245,165,36,0.12); border: 1px solid rgba(245,165,36,0.3);
      border-radius: 12px; padding: 8px 10px; }
    .dr-gem__packs { display: flex; flex-direction: column; gap: 8px; }
    .dr-gem__pack { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
      border: 1px solid rgba(120,150,200,0.22); border-radius: 14px; padding: 12px 14px;
      background: rgba(255,255,255,0.05); color: #e6edf7; font-weight: 800; cursor: pointer;
      -webkit-tap-highlight-color: transparent; }
    .dr-gem__pack:disabled { opacity: 0.5; cursor: default; }
    .dr-gem__pack-gems { flex: 1; font-size: 16px; }
    .dr-gem__pack-bonus { color: #37d67a; font-size: 12px; font-weight: 900; }
    .dr-gem__pack-buy { color: #06280f; background: linear-gradient(180deg,#3ad07a,#28a35c);
      border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 900; }
    .dr-gem__ad { width: 100%; margin-top: 10px; border: 1px dashed rgba(120,150,200,0.4);
      border-radius: 14px; padding: 13px; background: rgba(255,255,255,0.04); color: #cdd8ea;
      font-weight: 900; font-size: 14px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .dr-gem__ad:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(s);
}
