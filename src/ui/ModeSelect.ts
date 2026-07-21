import menuArtUrl from '@/assets/ui/kopernik/kopernik-menu-bg.webp?url';
import coinIconUrl from '@/assets/ui/kopernik/coin-icon.webp?url';
import musicOnIconUrl from '@/assets/ui/kopernik/music-on.webp?url';
import musicOffIconUrl from '@/assets/ui/kopernik/music-off.webp?url';
import { Profile } from '@/managers/ProfileStore';

export type MenuMode = 'rush' | 'free' | 'garage' | 'market' | 'leaderboard';

export class ModeSelect {
  private readonly root: HTMLElement;
  private readonly dailyTick: number;
  private busy = false;
  private musicEnabled = localStorage.getItem('kopernik.musicEnabled') !== 'false';

  constructor(parent: HTMLElement, onPick: (mode: MenuMode) => void, private readonly onRewardAd?: () => Promise<boolean>) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-modes intro';
    this.root.innerHTML = TEMPLATE;
    parent.appendChild(this.root);

    this.root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        this.root.classList.add('leaving');
        window.setTimeout(() => onPick(button.dataset.mode as MenuMode), 140);
      });
    });
    this.root.addEventListener('click', this.onClick);
    this.updateMusicControl();
    this.dailyTick = window.setInterval(() => this.updateDailyStatus(), 1000);
    this.updateDailyStatus();
  }

  destroy(): void {
    window.clearInterval(this.dailyTick);
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || !this.root.contains(target)) return;
    const action = target.dataset.action;
    if (action === 'daily-open') this.openDaily();
    if (action === 'daily-close') this.closeDaily();
    if (action === 'daily-claim') this.claimDaily();
    if (action === 'reward') void this.claimAdReward();
    if (action === 'start') this.startMenu();
    if (action === 'music') this.toggleMusic();
  };

  private startMenu(): void {
    this.root.classList.remove('intro');
  }

  private toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('kopernik.musicEnabled', String(this.musicEnabled));
    document.querySelectorAll<HTMLAudioElement>('audio').forEach((audio) => { audio.muted = !this.musicEnabled; });
    window.dispatchEvent(new CustomEvent('kopernik:music-toggle', { detail: { enabled: this.musicEnabled } }));
    this.updateMusicControl();
  }

  private updateMusicControl(): void {
    const button = this.root.querySelector<HTMLButtonElement>('.dr-music-toggle');
    const icon = button?.querySelector<HTMLImageElement>('img');
    if (!button || !icon) return;
    icon.src = this.musicEnabled ? musicOnIconUrl : musicOffIconUrl;
    button.setAttribute('aria-pressed', String(this.musicEnabled));
    button.setAttribute('aria-label', this.musicEnabled ? 'Müziği kapat' : 'Müziği aç');
    button.classList.toggle('muted', !this.musicEnabled);
  }

  private openDaily(): void {
    const modal = this.root.querySelector<HTMLElement>('.dr-daily-modal');
    if (!modal) return;
    modal.hidden = false;
    this.renderDailyModal();
  }

  private closeDaily(): void {
    const modal = this.root.querySelector<HTMLElement>('.dr-daily-modal');
    if (modal) modal.hidden = true;
  }

  private claimDaily(): void {
    const reward = Profile.claimDailyCard();
    if (reward) this.showToast(reward.item ? `${reward.item.name} KARTI SENİN!` : `+${reward.fallbackCoins} SENİN!`, true, reward.item ? undefined : coinIconUrl);
    this.updateDailyStatus();
    this.renderDailyModal();
  }

  private updateDailyStatus(): void {
    const remaining = Profile.dailyCardRemainingMs();
    const status = this.root.querySelector<HTMLElement>('.dr-daily-status');
    const button = this.root.querySelector<HTMLElement>('.dr-menu-daily');
    if (!status || !button) return;
    const ready = remaining <= 0;
    button.classList.toggle('ready', ready);
    status.textContent = ready ? 'HAZIR' : formatDuration(remaining);
    status.setAttribute('aria-label', ready ? 'Günlük kart hazır' : `Yeni kart ${formatDuration(remaining)} sonra`);
    const modal = this.root.querySelector<HTMLElement>('.dr-daily-modal');
    if (modal && !modal.hidden) this.renderDailyModal();
  }

  private renderDailyModal(): void {
    const content = this.root.querySelector<HTMLElement>('.dr-daily-content');
    if (!content) return;
    const remaining = Profile.dailyCardRemainingMs();
    content.innerHTML = remaining <= 0
      ? `<p class="dr-daily-kicker">ÜCRETSİZ ÖDÜL</p><h2>GÜNLÜK KART HAZIR</h2><p>Özel kartını şimdi aç.</p><button data-action="daily-claim">KARTI AÇ</button>`
      : `<p class="dr-daily-kicker claimed">ALINDI</p><h2>BUGÜNKÜ KART ALINDI</h2><p>Yeni kart için kalan süre</p><strong class="dr-daily-countdown">${formatDuration(remaining)}</strong>`;
  }

  private async claimAdReward(): Promise<void> {
    if (this.busy || !this.onRewardAd) return;
    this.busy = true;
    this.root.classList.add('is-busy');
    this.showToast('REKLAM HAZIRLANIYOR…', false);
    const ok = await this.onRewardAd();
    this.busy = false;
    this.root.classList.remove('is-busy');
    this.showToast(ok ? '+100 KAZANDIN!' : 'REKLAM TAMAMLANMADI', true, ok ? coinIconUrl : undefined);
  }

  private showToast(message: string, autoHide = true, iconUrl?: string): void {
    const toast = this.root.querySelector<HTMLElement>('.dr-modes-toast');
    if (!toast) return;
    toast.replaceChildren();
    if (iconUrl) {
      const icon = document.createElement('img');
      icon.src = iconUrl;
      icon.alt = '';
      toast.append(icon);
    }
    toast.append(document.createTextNode(message));
    toast.classList.add('show');
    if (autoHide) window.setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

const TEMPLATE = `
  <div class="dr-modes-art" aria-hidden="true"></div>
  <button class="dr-music-toggle" data-action="music" aria-pressed="true" aria-label="Müziği kapat"><img src="${musicOnIconUrl}" alt=""></button>
  <section class="dr-menu-intro" aria-label="Kopernik giriş">
    <button class="dr-start-now" data-action="start">START NOW</button>
  </section>
  <main class="dr-modes-ui">
    <div class="dr-menu-rewards">
      <button class="dr-menu-daily" data-action="daily-open"><small>GÜNLÜK KART</small><b>ÜCRETSİZ KART</b><span class="dr-daily-status">HAZIR</span></button>
      <button class="dr-menu-reward" data-action="reward"><small>REKLAM ÖDÜLÜ</small><b>REKLAM İZLE</b><span>+100 <img src="${coinIconUrl}" alt="coin"></span></button>
    </div>
    <nav class="dr-menu-modes" aria-label="Oyun modları">
      <button class="rush" data-mode="rush"><small>3 DAKİKALIK KOŞU</small><b>RUSH</b></button>
      <button class="free" data-mode="free"><small>AÇIK ŞEHİR</small><b>SERBEST</b></button>
      <button class="garage" data-mode="garage"><small>ARAÇLAR VE GELİŞTİRMELER</small><b>GARAJ</b></button>
      <button class="market" data-mode="market"><small>KARTLAR VE ÖZEL ÜRÜNLER</small><b>MARKET</b></button>
    </nav>
    <button class="dr-menu-leader" data-mode="leaderboard">LİDERLİK TABLOSU</button>
  </main>
  <div class="dr-menu-version">v1.0.0</div>
  <div class="dr-modes-toast" role="status" aria-live="polite"></div>
  <section class="dr-daily-modal" role="dialog" aria-modal="true" aria-label="Günlük kart" hidden>
    <button class="dr-daily-close" data-action="daily-close" aria-label="Kapat">KAPAT</button>
    <div class="dr-daily-content"></div>
  </section>`;

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = `
    .dr-modes{position:fixed;inset:0;z-index:12;overflow:hidden;pointer-events:auto;background:#06101f;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.dr-modes *{box-sizing:border-box}.dr-modes.leaving{opacity:0;transition:opacity .18s ease}
    .dr-modes-art{position:absolute;inset:0;background:#06101f url("${menuArtUrl}") center/cover no-repeat}.dr-modes-art::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(2,8,18,.55) 67%,rgba(2,8,18,.94) 100%)}
    .dr-menu-intro{position:absolute;inset:0;z-index:4;display:flex;align-items:flex-end;justify-content:center;padding:0 24px calc(env(safe-area-inset-bottom,0px) + 74px);transition:opacity .2s ease,transform .2s ease}.dr-modes:not(.intro) .dr-menu-intro{opacity:0;transform:translateY(18px);pointer-events:none}
    .dr-start-now{width:min(330px,86vw);min-height:66px;border:3px solid #ffd14a;border-radius:17px;color:#2b1600;background:linear-gradient(180deg,#ffd84b,#f49b13);box-shadow:0 7px 0 #7f4300,0 12px 28px rgba(0,0,0,.55),0 0 22px rgba(255,184,39,.34);font-size:27px;font-style:italic;font-weight:1000;letter-spacing:.04em;text-shadow:0 1px 0 rgba(255,255,255,.4)}.dr-start-now:active{transform:translateY(5px);box-shadow:0 2px 0 #7f4300,0 6px 18px rgba(0,0,0,.55)}
    .dr-music-toggle{position:absolute;z-index:20;right:14px;top:calc(env(safe-area-inset-top,0px) + 14px);width:48px;height:48px;padding:7px;border:2px solid #39dfff;border-radius:14px;background:rgba(5,18,32,.9);box-shadow:0 4px 0 #073b52,0 0 16px rgba(57,223,255,.25)}.dr-music-toggle img{width:100%;height:100%;object-fit:contain}.dr-music-toggle.muted{border-color:#ff9f32;box-shadow:0 4px 0 #673300,0 0 16px rgba(255,159,50,.25)}
    .dr-menu-version{position:absolute;z-index:5;right:14px;top:calc(env(safe-area-inset-top,0px) + 69px);color:rgba(225,239,255,.72);font-size:10px;font-weight:900;letter-spacing:.08em;text-shadow:0 2px 5px #000;transition:opacity .18s ease}.dr-modes:not(.intro) .dr-menu-version{opacity:0}
    .dr-modes-ui{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:9px;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 14px)}
    .dr-modes.intro .dr-modes-ui{opacity:0;transform:translateY(18px);pointer-events:none}.dr-modes-ui{transition:opacity .2s ease,transform .2s ease}
    .dr-modes button{cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:inherit}.dr-modes button:focus-visible{outline:3px solid #fff;outline-offset:2px}
    .dr-menu-rewards{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dr-menu-rewards button{min-height:78px;padding:9px;border:2px solid;border-radius:14px;color:#fff;background:rgba(5,18,32,.94);box-shadow:0 5px 0 rgba(0,0,0,.55);text-align:left}.dr-menu-rewards small,.dr-menu-rewards b,.dr-menu-rewards span{display:block}.dr-menu-rewards small{color:#a8bfd3;font-size:9px;font-weight:900}.dr-menu-rewards b{margin:4px 0;font-size:14px}.dr-menu-rewards span{font-size:11px;font-weight:1000}.dr-menu-daily{border-color:#24d7ff!important}.dr-menu-daily span{color:#55e8ff}.dr-menu-daily.ready{border-color:#ffc42d!important}.dr-menu-daily.ready span{color:#ffd34d}.dr-menu-reward{border-color:#28df81!important}.dr-menu-reward span{display:flex;align-items:center;gap:5px;color:#52f0a0}.dr-menu-reward span img{width:20px;height:20px;object-fit:contain}.dr-modes.is-busy .dr-menu-reward{pointer-events:none;opacity:.65}
    .dr-menu-modes{display:grid;gap:7px}.dr-menu-modes button{position:relative;min-height:58px;padding:8px 18px;border:2px solid;border-radius:14px;color:#fff;background:#0a1929;box-shadow:0 5px 0 rgba(0,0,0,.6);text-align:left;overflow:hidden}.dr-menu-modes button::after{content:"";position:absolute;inset:0 0 0 66%;background:linear-gradient(120deg,transparent,rgba(255,255,255,.18));pointer-events:none}.dr-menu-modes small,.dr-menu-modes b{display:block}.dr-menu-modes small{font-size:9px;font-weight:900;letter-spacing:.08em;opacity:.84}.dr-menu-modes b{font-size:24px;font-style:italic;line-height:1}.dr-menu-modes .rush{border-color:#ffbf2e;background:linear-gradient(90deg,#7a3d00,#f19b10)}.dr-menu-modes .free{border-color:#38ddff;background:linear-gradient(90deg,#07305c,#087d9b)}.dr-menu-modes .garage{border-color:#ff7638;background:linear-gradient(90deg,#5f1b10,#b44320)}.dr-menu-modes .market{border-color:#35e387;background:linear-gradient(90deg,#073d2a,#0a7650)}
    .dr-menu-leader{min-height:43px;border:2px solid #ffc33b;border-radius:12px;color:#ffdc72;background:#081422;font-size:12px;font-weight:1000;box-shadow:0 4px 0 #5f3800}
    .dr-modes-toast{position:absolute;left:50%;top:50%;z-index:30;min-width:230px;transform:translate(-50%,-8px);padding:12px 15px;border:2px solid #35dcff;border-radius:12px;color:#eaffff;background:#071321;display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;font-size:12px;font-weight:1000;opacity:0;pointer-events:none;transition:.18s ease}.dr-modes-toast img{width:22px;height:22px;object-fit:contain}.dr-modes-toast.show{opacity:1;transform:translate(-50%,0)}
    .dr-daily-modal{position:absolute;z-index:40;left:7%;right:7%;top:28%;padding:22px 18px;border:3px solid #ffb62f;border-radius:22px;color:#fff;background:#081321;box-shadow:0 20px 60px rgba(0,0,0,.75),0 0 28px rgba(255,166,32,.35);text-align:center}.dr-daily-modal[hidden]{display:none}.dr-daily-close{position:absolute;right:10px;top:9px;min-width:56px;height:30px;border:1px solid #ffb62f;border-radius:8px;color:#fff;background:#111c2d;font-size:9px;font-weight:900}.dr-daily-kicker{display:inline-block!important;margin:10px 0 14px!important;padding:10px 16px;border:2px solid #39dcff;border-radius:10px;color:#59e8ff!important;background:#0a263c;font-weight:1000}.dr-daily-kicker.claimed{border-color:#43e481;color:#43e481!important}.dr-daily-content h2{margin:0;color:#ffd44b;font-size:23px}.dr-daily-content p{margin:8px 0 15px;color:#b8c8dc;font-size:14px}.dr-daily-content button{width:100%;min-height:52px;border:0;border-radius:13px;color:#241500;background:#ffbd2d;box-shadow:0 5px 0 #8f5000;font-size:17px;font-weight:1000}.dr-daily-countdown{display:block;color:#44e3ff;font-size:30px;font-variant-numeric:tabular-nums}
    @media (min-width:700px){.dr-modes-ui{left:50%;width:430px;transform:translateX(-50%)}}
  `;
  document.head.appendChild(style);
}
