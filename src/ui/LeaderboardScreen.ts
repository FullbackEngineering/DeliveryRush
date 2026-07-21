import leaderboardArtUrl from '@/assets/ui/kopernik/kopernik-leaderboard-bg.webp?url';
import avatarArtUrl from '@/assets/ui/kopernik/kopernik-avatar.webp?url';
import coinIconUrl from '@/assets/ui/kopernik/coin-icon.webp?url';
import { Profile } from '@/managers/ProfileStore';
import { Services } from '@/services/ServiceLocator';
import { getKopernikLeaderboard } from '@/services/gametegra/gametegra';
import type { LeaderboardEntry, LeaderboardScope } from '@/services/interfaces';

export type LeaderboardCategory = 'coins' | 'rush' | 'deliveries';

const CATEGORIES: Array<{ id: LeaderboardCategory; label: string }> = [
  { id: 'coins', label: 'EN ÇOK' },
  { id: 'rush', label: 'RUSH TEK SEFER' },
  { id: 'deliveries', label: 'EN ÇOK DELIVERY' },
];

export class LeaderboardScreen {
  private readonly root: HTMLDivElement;
  private category: LeaderboardCategory = 'coins';
  private entries: LeaderboardEntry[] = [];
  private loading = false;
  private requestId = 0;

  constructor(mount: HTMLElement, private readonly onClose: () => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-leaderboard';
    this.root.addEventListener('click', this.onClick);
    mount.appendChild(this.root);
    this.render();
    void this.load('coins');
  }

  destroy(): void { this.root.removeEventListener('click', this.onClick); this.root.remove(); }

  private readonly onClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || !this.root.contains(target)) return;
    if (target.dataset.action === 'close') return this.onClose();
    if (target.dataset.action === 'category') {
      const category = target.dataset.category as LeaderboardCategory;
      if (CATEGORIES.some((entry) => entry.id === category)) void this.load(category);
    }
  };

  private async load(category: LeaderboardCategory): Promise<void> {
    this.category = category;
    this.loading = true;
    const requestId = ++this.requestId;
    this.render();
    const profile = Profile.get();
    const playerScore = category === 'coins' ? profile.coins
      : category === 'rush' ? profile.bestRushCoins : profile.totalDeliveries;
    const scope: LeaderboardScope = category === 'coins' ? 'global' : category === 'rush' ? 'weekly' : 'friends';
    const boardId = category === 'coins' ? 'coins' : category === 'rush' ? 'rush_coins' : 'deliveries';
    const live = await getKopernikLeaderboard(boardId, profile.name, playerScore);
    const raw = live ?? await Services.leaderboard.getBoard(scope, playerScore);
    if (requestId !== this.requestId) return;
    this.entries = raw.map((entry) => ({
      ...entry,
      score: live !== null ? entry.score
        : category === 'deliveries' ? Math.max(0, Math.round(entry.score / 10000))
          : category === 'rush' ? Math.max(0, Math.round(entry.score / 1000)) : entry.score,
    }));
    this.loading = false;
    this.render();
  }

  private render(): void {
    const podium = this.entries.slice(0, 3);
    const rest = this.entries.slice(3, 12);
    this.root.innerHTML = `
      <div class="dr-leaderboard__art" aria-hidden="true"></div>
      <main class="dr-leaderboard__ui">
        <header>
          <button class="dr-leaderboard__back" data-action="close" aria-label="Menüye dön">GERİ</button>
          <div class="dr-leaderboard__brand"><small>KOPERNİK</small><b>LİDERLİK</b></div>
          <div class="dr-leaderboard__season">SEZON<b>07</b></div>
        </header>
        <nav class="dr-leaderboard__tabs" aria-label="Liderlik kategorileri">
          ${CATEGORIES.map((entry) => `<button class="${entry.id === this.category ? 'selected' : ''}"
            data-action="category" data-category="${entry.id}">${entry.id === 'coins' ? `<img src="${coinIconUrl}" alt="coin">` : ''}${entry.label}</button>`).join('')}
        </nav>
        <section class="dr-leaderboard__board" aria-busy="${this.loading}">
          ${this.loading ? '<div class="dr-leaderboard__loading">SIRALAMA YÜKLENİYOR…</div>' : `
            <div class="dr-leaderboard__podium">${podium.map((entry, index) => renderPodium(entry, index)).join('')}</div>
            <div class="dr-leaderboard__rows">${rest.map(renderRow).join('')}</div>
          `}
        </section>
      </main>`;
  }
}

function renderPodium(entry: LeaderboardEntry, index: number): string {
  const rank = index + 1;
  return `<article class="dr-podium rank-${rank} ${entry.isPlayer ? 'player' : ''}">
    <div class="dr-avatar"><img src="${avatarArtUrl}" alt=""></div><b>${rank}</b>
    <span>${escapeHtml(entry.isPlayer ? 'SEN' : entry.name)}</span><strong>${formatScore(entry.score)}</strong>
  </article>`;
}

function renderRow(entry: LeaderboardEntry): string {
  return `<div class="dr-leaderboard__row ${entry.isPlayer ? 'player' : ''}">
    <b>${entry.isPlayer ? 'SEN' : entry.rank}</b><div class="dr-row-avatar"><img src="${avatarArtUrl}" alt=""></div>
    <span>${escapeHtml(entry.isPlayer ? 'KOPERNİK_SEN' : entry.name)}</span><strong>${formatScore(entry.score)}</strong>
  </div>`;
}

function formatScore(value: number): string { return new Intl.NumberFormat('tr-TR').format(value); }
function escapeHtml(value: string): string {
  const span = document.createElement('span'); span.textContent = value; return span.innerHTML;
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = `
    .dr-leaderboard { position:fixed; inset:0; z-index:90; overflow:hidden; pointer-events:auto; color:#fff;
      background:#06101f; font-family:system-ui,-apple-system,"Segoe UI",sans-serif; }
    .dr-leaderboard * { box-sizing:border-box; }
    .dr-leaderboard__art { position:absolute; inset:0; background:url("${leaderboardArtUrl}") center/cover no-repeat;
      filter:brightness(.58) saturate(.88); transform:scale(1.02); }
    .dr-leaderboard__ui { position:absolute; inset:0; display:flex; flex-direction:column; gap:10px;
      padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 12px); }
    .dr-leaderboard button { cursor:pointer; -webkit-tap-highlight-color:transparent; }
    .dr-leaderboard header { display:grid; grid-template-columns:48px 1fr 48px; align-items:center; gap:8px; }
    .dr-leaderboard__back { width:44px; height:44px; border:2px solid #35dfff; border-radius:11px; color:#e7fcff;
      background:#071827; font-size:8px; font-weight:1000; }
    .dr-leaderboard__brand { text-align:center; line-height:.95; text-shadow:0 3px 0 #000; }
    .dr-leaderboard__brand small,.dr-leaderboard__brand b { display:block; font-weight:1000; }
    .dr-leaderboard__brand small { color:#ffc433; font-size:14px; letter-spacing:.12em; }
    .dr-leaderboard__brand b { color:#45dbff; font-size:29px; }
    .dr-leaderboard__season { display:grid; place-items:center; min-height:44px; border:2px solid #2cd9ff;
      border-radius:9px; color:#7deaff; background:#071827; font-size:7px; font-weight:900; }
    .dr-leaderboard__season b { display:block; color:#fff; font-size:17px; }
    .dr-leaderboard__tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
    .dr-leaderboard__tabs button { min-height:42px; padding:4px; border:2px solid #287ca4; border-radius:8px;
      color:#8ccee9; background:#071827; font-size:9px; font-weight:1000; }
    .dr-leaderboard__tabs button{display:flex;align-items:center;justify-content:center;gap:4px}.dr-leaderboard__tabs button img{width:19px;height:19px;object-fit:contain}
    .dr-leaderboard__tabs button.selected { border-color:#ffc32d; color:#251600; background:#ffc32d; }
    .dr-leaderboard__board { flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden;
      padding:10px; border:3px solid #2787b2; border-radius:17px; background:#071321;
      box-shadow:0 12px 34px rgba(0,0,0,.62); }
    .dr-leaderboard__loading { margin:auto; color:#42dcff; font-size:13px; font-weight:1000; }
    .dr-leaderboard__podium { display:grid; grid-template-columns:1fr 1.12fr 1fr; align-items:end; gap:6px;
      min-height:190px; padding:6px 2px 0; border-bottom:2px solid #80551a; }
    .dr-podium { display:flex; flex-direction:column; align-items:center; min-width:0; padding:7px 4px;
      border:2px solid #4b677f; border-radius:12px 12px 0 0; background:#122238; text-align:center; }
    .dr-podium.rank-1 { order:2; min-height:174px; border-color:#ffbd2e; background:#3a260b; }
    .dr-podium.rank-2 { order:1; min-height:145px; }.dr-podium.rank-3 { order:3; min-height:132px; border-color:#db7431; }
    .dr-avatar { display:grid; place-items:center; width:58px; height:58px; overflow:hidden;border:3px solid #39dfff;
      border-radius:18px; background:#0b2940; }
    .dr-avatar img,.dr-row-avatar img{width:100%;height:100%;object-fit:cover}
    .rank-1 .dr-avatar { width:66px; height:66px; border-color:#ffc733; color:#ffd968; background:#38260d; }
    .rank-3 .dr-avatar { border-color:#f07a38; color:#ffad7d; }.dr-podium > b { margin-top:5px; color:#ffd241; font-size:25px; }
    .dr-podium span { width:100%; overflow:hidden; color:#e5eef8; font-size:9px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }
    .dr-podium strong { margin-top:4px; color:#ffc938; font-size:10px; }
    .dr-leaderboard__rows { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding-top:6px; }
    .dr-leaderboard__row { display:grid; grid-template-columns:34px 32px 1fr auto; align-items:center; gap:7px;
      min-height:43px; padding:3px 7px; border-bottom:1px solid #29425b; font-size:11px; }
    .dr-leaderboard__row > b { color:#cdd7e3; }.dr-row-avatar { display:grid; place-items:center; width:28px; height:28px;overflow:hidden;
      border:2px solid #35d9ff; border-radius:8px; background:#0b2940; }
    .dr-leaderboard__row span { overflow:hidden; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }
    .dr-leaderboard__row strong { color:#ffca32; font-size:11px; }.dr-leaderboard__row.player {
      margin:3px 0; border:2px solid #35e3ff; border-radius:9px; color:#c9f8ff; background:#0b3045; }
  `;
  document.head.appendChild(style);
}
