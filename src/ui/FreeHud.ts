import { bus, GameEvent } from '@/core/EventBus';
import { Job, Poi } from '@/types';
import { JobBoard, JobResult } from '@/systems/JobBoard';
import { Grid } from '@/world/Grid';
import { Profile } from '@/managers/ProfileStore';
import { hex } from '@/core/Palette';
import { formatNumber } from '@/utils/MathUtils';
import { FREE_HUD_TEMPLATE, injectFreeHudStyle, rowHtml, stopRowHtml } from './FreeHud.templates';

/**
 * The whole SERBEST (free-roam) chrome as an HTML/CSS overlay in `#ui`: the top
 * bar (badge · job-board button · speed · wallet · menu), an always-on minimap,
 * the 📋 job-board slide-up sheet, the active-job card with its countdown, and
 * floating +pay/−penalty reward text. Pure bus-listener + `JobBoard` reader — it
 * owns no gameplay state of its own (mirrors `ui/Hud.ts`'s role for RUSH).
 */
export class FreeHud {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private handlers: Array<[string, (...a: any[]) => void]> = [];

  private mapCtx: CanvasRenderingContext2D;
  /** Actual rendered CSS px size of the minimap square (measured post-layout —
   * the CSS box is `clamp(96px,28vw,128px)`, so this varies by viewport). */
  private mapSize = 128;
  private mapAcc = 0;
  private mapT = 0;
  private lastVx = 0;
  private lastVz = 0;
  private lastYaw = 0;
  private currentStopPoi: Poi | null = null;

  // Per-frame write caches (setSpeed/setActiveTimer are driven by the vehicle
  // update loop and JobTimer, both firing every frame): skip DOM writes that
  // wouldn't visibly change anything.
  private lastSpeedShown = -1;
  private lastActiveFrac = -1;
  private lastActiveUrgent = false;
  private lastActiveLate = false;

  // SERBEST modu HUD DOM'unu, minimap'i ve event listener'larını kurar.
  constructor(
    parent: HTMLElement,
    private board: JobBoard,
    private grid: Grid,
    private poisList: Poi[],
    onMenu: () => void,
  ) {
    injectFreeHudStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-free';
    this.root.innerHTML = FREE_HUD_TEMPLATE;
    parent.appendChild(this.root);

    const q = (sel: string) => this.root.querySelector(sel) as HTMLElement;
    this.els = {
      speed: q('.dr-free-speed b'),
      speedPill: q('.dr-free-speed'),
      chaseBanner: q('.dr-chase-banner'),
      wallet: q('.dr-free-wallet span'),
      jobsBtn: q('.dr-free-jobs-btn'),
      menu: q('.dr-free-menu'),
      boardRoot: q('.dr-job-board'),
      boardBackdrop: q('.dr-job-board-backdrop'),
      boardClose: q('.dr-job-board-close'),
      boardList: q('.dr-job-board-list'),
      activeCard: q('.dr-job-active'),
      activeIcon: q('.dr-job-active-icon'),
      activeTitle: q('.dr-job-active-title'),
      activeSub: q('.dr-job-active-sub'),
      activeBarFill: q('.dr-job-active-bar > i'),
      cancelBtn: q('.dr-job-cancel'),
      floatLayer: q('.dr-free-float-layer'),
      stopHint: q('.dr-stop-hint'),
      stopPanel: q('.dr-stop-panel'),
      stopBackdrop: q('.dr-stop-backdrop'),
      stopClose: q('.dr-stop-close'),
      stopIcon: q('.dr-stop-icon'),
      stopTitle: q('.dr-stop-title'),
      stopNote: q('.dr-stop-note'),
      stopList: q('.dr-stop-list'),
    };

    const mapCanvas = q('.dr-free-map') as HTMLCanvasElement;
    // The wrap is sized by CSS `clamp(96px,28vw,128px)`; measure the actual
    // rendered box so the canvas backing store (and drawMap's coordinate space)
    // match the on-screen size exactly (crisp, correctly scaled at any viewport).
    this.mapSize = mapCanvas.getBoundingClientRect().width || this.mapSize;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    mapCanvas.width = this.mapSize * dpr;
    mapCanvas.height = this.mapSize * dpr;
    this.mapCtx = mapCanvas.getContext('2d')!;
    this.mapCtx.scale(dpr, dpr);

    this.els.menu.addEventListener('click', (e) => { e.preventDefault(); onMenu(); });
    this.els.jobsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.els.boardRoot.classList.contains('open') ? this.closeBoard() : this.openBoard();
    });
    this.els.boardBackdrop.addEventListener('click', () => this.closeBoard());
    this.els.boardClose.addEventListener('click', (e) => { e.preventDefault(); this.closeBoard(); });
    this.els.cancelBtn.addEventListener('click', (e) => { e.preventDefault(); this.board.cancel(); });
    this.els.stopBackdrop.addEventListener('click', () => this.board.closeStop());
    this.els.stopClose.addEventListener('click', (e) => { e.preventDefault(); this.board.closeStop(); });

    this.on(GameEvent.CoinsChanged, (c: number) => this.setCoins(c));
    this.on(GameEvent.JobsRefreshed, () => {
      if (this.els.boardRoot.classList.contains('open')) this.renderOffered();
      if (this.currentStopPoi) this.renderStopRows();
    });
    this.on(GameEvent.JobAccepted, (job: Job) => this.showActive(job));
    this.on(GameEvent.JobPickedUp, (job: Job) => this.updateActiveSub(job));
    this.on(GameEvent.JobTimer, (_job: Job, seconds: number, fraction: number) => this.setActiveTimer(seconds, fraction));
    this.on(GameEvent.JobDelivered, (_job: Job, r: JobResult) => this.onDelivered(r));
    this.on(GameEvent.JobFailed, () => this.hideActive());

    // Stop-to-order (primary interaction): drive up to a source POI and stop.
    this.on(GameEvent.StopZoneEnter, () => this.els.stopHint.classList.add('show'));
    this.on(GameEvent.StopZoneExit, () => this.els.stopHint.classList.remove('show'));
    this.on(GameEvent.StopOrderOpen, (poi: Poi) => this.openStop(poi));
    this.on(GameEvent.StopOrderClose, () => this.closeStopPanel());

    // Police / speeding / fines.
    this.on(GameEvent.Speeding, (over: boolean) => this.els.speedPill.classList.toggle('over', over));
    this.on(GameEvent.PoliceFine, (amount: number, reason: string) => {
      const why = reason === 'crash' ? 'kaza' : 'hız';
      this.floatText(`🚨 -${amount} 🪙 (${why})`, '#ef4444');
    });
    this.on(GameEvent.ChaseStarted, () => this.els.chaseBanner.classList.add('show'));
    this.on(GameEvent.ChaseEnded, () => this.els.chaseBanner.classList.remove('show'));

    this.setCoins(Profile.get().coins);
    this.drawMap();
  }

  // Hız göstergesini km/h cinsinden günceller.
  setSpeed(kmh: number): void {
    if (kmh === this.lastSpeedShown) return;
    this.lastSpeedShown = kmh;
    this.els.speed.textContent = String(kmh);
  }

  // Minimap'i araç dünya pozisyonuyla günceller (~12fps'le throttled).
  updateMap(dt: number, vx: number, vz: number, vyaw: number): void {
    this.lastVx = vx;
    this.lastVz = vz;
    this.lastYaw = vyaw;
    this.mapT += dt;
    this.mapAcc += dt;
    if (this.mapAcc < 1 / 12) return;
    this.mapAcc = 0;
    this.drawMap();
  }

  // Event bus dinleyicilerini temizler ve DOM'u kaldırır.
  destroy(): void {
    for (const [evt, fn] of this.handlers) bus.off(evt, fn);
    this.handlers = [];
    this.root.remove();
  }

  // Event bus dinleyicisi ekler ve temizlik için kayıt tutar.
  private on(evt: string, fn: (...a: any[]) => void): void {
    bus.on(evt, fn);
    this.handlers.push([evt, fn]);
  }

  // --- Wallet ----------------------------------------------------------------
  // Cüzdan coin sayısını günceller.
  private setCoins(c: number): void {
    this.els.wallet.textContent = formatNumber(c);
  }

  // --- Job board sheet ---------------------------------------------------------
  // İş panosu sheet'ini açar ve mevcut işleri gösterir.
  private openBoard(): void {
    this.renderOffered();
    this.els.boardRoot.classList.add('open');
  }
  // İş panosu sheet'ini kapatır.
  private closeBoard(): void {
    this.els.boardRoot.classList.remove('open');
  }

  // Sunulan işleri panosu listesine işler.
  private renderOffered(): void {
    const jobs = this.board.offered;
    const hasActive = !!this.board.active;
    this.els.boardList.classList.toggle('disabled', hasActive);
    this.els.boardList.innerHTML = jobs.length
      ? jobs.map(rowHtml).join('')
      : `<div class="dr-job-empty">Şu an teklif yok, birazdan yenilenecek…</div>`;
    this.els.boardList.querySelectorAll<HTMLElement>('[data-job-id]').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.board.active) return;
        const id = Number(el.dataset.jobId);
        if (this.board.accept(id)) { this.renderOffered(); this.closeBoard(); }
      });
    });
  }

  // --- Stop-to-order panel (primary interaction) --------------------------------
  // Stop-to-order panelini açar ve durak noktasındaki işleri gösterir.
  private openStop(poi: Poi): void {
    this.currentStopPoi = poi;
    this.els.stopHint.classList.remove('show');
    this.els.stopIcon.textContent = poi.emoji;
    this.els.stopTitle.textContent = poi.name;
    this.renderStopRows();
    this.els.stopPanel.classList.add('open');
  }

  // Durak noktasındaki işleri listeler (CSS satırlar herhangi bir sayıda scroll eder).
  private renderStopRows(): void {
    if (!this.currentStopPoi) return;
    // Rows are CSS-native and scroll, so we no longer clamp to a fixed slot count.
    // A modest cap keeps the panel tidy; the global job board still holds the rest.
    const orders = this.board.ordersAt(this.currentStopPoi).slice(0, 8);
    const hasActive = !!this.board.active;
    this.els.stopNote.classList.toggle('show', hasActive);
    this.els.stopList.classList.toggle('disabled', hasActive);
    this.els.stopList.innerHTML = orders.length
      ? orders.map(stopRowHtml).join('')
      : `<div class="dr-job-empty">Şu an sipariş yok, birazdan yenilenecek…</div>`;
    this.els.stopList.querySelectorAll<HTMLElement>('[data-job-id]').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.board.active) return;
        const id = Number(el.dataset.jobId);
        this.board.accept(id); // emits StopOrderClose itself on success
      });
    });
  }

  // Stop-to-order panelini kapatır.
  private closeStopPanel(): void {
    this.currentStopPoi = null;
    this.els.stopPanel.classList.remove('open');
  }

  // --- Active job card ---------------------------------------------------------
  // Aktif işi kartda gösterir (pickup/deliver durumuna göre).
  private showActive(job: Job): void {
    this.els.activeIcon.textContent = job.kind.emoji;
    this.els.activeTitle.textContent = `${job.special ? '⭐ ' : ''}${job.source.name} → ${job.dest.name}`;
    this.updateActiveSub(job);
    this.els.activeCard.classList.remove('urgent', 'late');
    this.els.activeCard.classList.add('show');
    this.lastActiveFrac = -1;
    this.lastActiveUrgent = false;
    this.lastActiveLate = false;
  }

  // Aktif iş subtitle'ı (al/teslim) ve durumunu günceller.
  private updateActiveSub(job: Job): void {
    const toPickup = job.state === 'toPickup';
    this.els.activeSub.textContent = toPickup
      ? `Al · ${job.source.name}`
      : `Teslim et · ${job.dest.name} · +${job.pay} 🪙`;
    this.els.activeCard.classList.toggle('delivering', !toPickup);
  }

  // Aktif iş saydown progress bar'ını ve aciliyet durumunu günceller.
  private setActiveTimer(seconds: number, fraction: number): void {
    const frac = Math.round(Math.max(0, fraction) * 1000);
    if (frac !== this.lastActiveFrac) {
      this.lastActiveFrac = frac;
      this.els.activeBarFill.style.transform = `scaleX(${frac / 1000})`;
    }
    const urgent = seconds <= 5 && seconds >= 0;
    if (urgent !== this.lastActiveUrgent) {
      this.lastActiveUrgent = urgent;
      this.els.activeCard.classList.toggle('urgent', urgent);
    }
    const late = seconds < 0;
    if (late !== this.lastActiveLate) {
      this.lastActiveLate = late;
      this.els.activeCard.classList.toggle('late', late);
    }
  }

  // İş teslim edilince ödül float text'i gösterir.
  private onDelivered(r: JobResult): void {
    this.hideActive();
    this.floatText(`+${r.pay} 🪙`, '#37d67a');
    if (r.penalty > 0) setTimeout(() => this.floatText(`-${r.penalty} 🪙`, '#ef4444'), 260);
  }

  // Aktif iş kartını gizler.
  private hideActive(): void {
    this.els.activeCard.classList.remove('show');
  }

  // Animeli kayan metin üretir ve gösterir.
  private floatText(text: string, color: string): void {
    const el = document.createElement('div');
    el.className = 'dr-free-float';
    el.textContent = text;
    el.style.color = color;
    this.els.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // --- Minimap -------------------------------------------------------------
  // Şehrin canlı minimap görünümünü çizer (yollar, POI'ler, oyuncu, hedef).
  private drawMap(): void {
    const ctx = this.mapCtx;
    const S = this.mapSize;
    const grid = this.grid;
    const toX = (x: number) => (x / grid.worldW) * S;
    const toY = (z: number) => (z / grid.worldD) * S;
    ctx.clearRect(0, 0, S, S);

    // Avenues only (bright/thick); normal streets omitted for legibility at this size.
    ctx.strokeStyle = 'rgba(190,210,235,0.32)';
    ctx.lineWidth = 2;
    for (let c = 0; c <= grid.cols; c++) {
      if (!grid.isAvenue(c)) continue;
      const x = toX(c * grid.block);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
    }
    for (let r = 0; r <= grid.rows; r++) {
      if (!grid.isAvenue(r)) continue;
      const y = toY(r * grid.block);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
    }

    const active = this.board.active;
    const targetPoi = active ? (active.state === 'toPickup' ? active.source : active.dest) : null;

    // Thin dashed line from the player to the active target (drawn under the dots).
    if (targetPoi) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = active!.state === 'toPickup' ? 'rgba(245,165,36,0.55)' : 'rgba(55,214,122,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(toX(this.lastVx), toY(this.lastVz));
      ctx.lineTo(toX(targetPoi.x), toY(targetPoi.z));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // POI dots — dim by default; the active job's source/dest pulse larger + bright.
    const pulse = 1.1 + Math.sin(this.mapT * 4) * 0.6;
    for (const p of this.poisList) {
      const x = toX(p.x), y = toY(p.z);
      const isTarget = targetPoi && targetPoi.id === p.id;
      if (isTarget) {
        ctx.fillStyle = active!.state === 'toPickup' ? '#f5a524' : '#37d67a';
        ctx.beginPath(); ctx.arc(x, y, 3.4 + pulse, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = hex(p.color);
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Player triangle, nose pointing at its heading.
    const px = toX(this.lastVx), py = toY(this.lastVz);
    const fx = Math.sin(this.lastYaw), fz = Math.cos(this.lastYaw);
    const perpX = fz, perpY = -fx;
    const L = 6.5, B = 3.6, W = 3.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px + fx * L, py + fz * L);
    ctx.lineTo(px - fx * B + perpX * W, py - fz * B + perpY * W);
    ctx.lineTo(px - fx * B - perpX * W, py - fz * B - perpY * W);
    ctx.closePath();
    ctx.fill();
  }
}
