/**
 * Full-screen mode picker shown at boot (over the 3D sky). Two big cards:
 * RUSH (the 60-second delivery sprint) and SERBEST (the large open city). Picking
 * one navigates to `?mode=rush` / `?mode=free` and reloads — so each mode boots a
 * clean world with no teardown gymnastics. Native DOM = crisp text + perfect touch.
 */
export class ModeSelect {
  private root: HTMLElement;

  // Mod seçim ekranını kurar ve mod seçim butonlarına listener ekler.
  constructor(parent: HTMLElement, onPick: (mode: 'rush' | 'free' | 'garage' | 'market') => void) {
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'dr-modes';
    this.root.innerHTML = TEMPLATE;
    parent.appendChild(this.root);

    const pick = (mode: 'rush' | 'free' | 'garage' | 'market') => {
      this.root.classList.add('leaving');
      setTimeout(() => onPick(mode), 140);
    };
    (this.root.querySelector('.dr-mode-rush') as HTMLElement)
      .addEventListener('click', () => pick('rush'));
    (this.root.querySelector('.dr-mode-free') as HTMLElement)
      .addEventListener('click', () => pick('free'));
    (this.root.querySelector('.dr-mode-garage') as HTMLElement)
      .addEventListener('click', () => pick('garage'));
    (this.root.querySelector('.dr-mode-market') as HTMLElement)
      .addEventListener('click', () => pick('market'));
  }

  // DOM'u kaldırır.
  destroy(): void {
    this.root.remove();
  }
}

const TEMPLATE = `
  <div class="dr-modes-inner">
    <div class="dr-brand">
      <div class="dr-brand-title">DELIVERY&nbsp;RUSH</div>
      <div class="dr-brand-sub">Bir mod seç</div>
    </div>
    <div class="dr-mode-list">
      <button class="dr-mode-card dr-mode-rush">
        <div class="dr-mode-icon">⏱️</div>
        <div class="dr-mode-text">
          <div class="dr-mode-name">RUSH</div>
          <div class="dr-mode-desc">60 saniyede kaç teslimat? Kombo yap, süreyi uzat.</div>
        </div>
        <div class="dr-mode-go">▶</div>
      </button>
      <button class="dr-mode-card dr-mode-free">
        <div class="dr-mode-icon">🌆</div>
        <div class="dr-mode-text">
          <div class="dr-mode-name">SERBEST ŞEHİR</div>
          <div class="dr-mode-desc">Geniş açık şehir + otobanlar. Serbest sür — sipariş panosu &amp; ekonomi yolda.</div>
        </div>
        <div class="dr-mode-go">▶</div>
      </button>
      <button class="dr-mode-card dr-mode-garage">
        <div class="dr-mode-icon">🚗</div>
        <div class="dr-mode-text">
          <div class="dr-mode-name">GARAJ</div>
          <div class="dr-mode-desc">Araç galerisi — araçları incele, yükselt, seç.</div>
        </div>
        <div class="dr-mode-go">▶</div>
      </button>
      <button class="dr-mode-card dr-mode-market">
        <div class="dr-mode-icon">🛒</div>
        <div class="dr-mode-text">
          <div class="dr-mode-name">MARKET</div>
          <div class="dr-mode-desc">Kart, boost &amp; kozmetik — coin ve 💎 ile alışveriş.</div>
        </div>
        <div class="dr-mode-go">▶</div>
      </button>
    </div>
    <div class="dr-modes-foot">Geliştirme sürümü · daha fazlası geliyor</div>
  </div>`;

// Mod seçim ekranı CSS stillerini document'e enjekte eder.
let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
    .dr-modes { position: fixed; inset: 0; z-index: 12; display: flex; align-items: center;
      justify-content: center; padding: 24px; pointer-events: auto;
      background: radial-gradient(120% 90% at 50% 0%, rgba(20,40,70,0.35), rgba(6,10,20,0.86) 70%);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #e6edf7;
      transition: opacity .18s ease; }
    .dr-modes.leaving { opacity: 0; }
    .dr-modes * { box-sizing: border-box; }
    .dr-modes-inner { width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 22px; }

    .dr-brand { text-align: center; }
    .dr-brand-title { font-weight: 900; font-size: 40px; letter-spacing: 0.04em; line-height: 1;
      background: linear-gradient(180deg,#ffe08a,#ffb347); -webkit-background-clip: text;
      background-clip: text; color: transparent; text-shadow: 0 6px 26px rgba(255,170,60,0.25); }
    .dr-brand-sub { margin-top: 8px; font-size: 14px; letter-spacing: 0.28em; text-transform: uppercase;
      color: #8ea3c2; font-weight: 700; }

    .dr-mode-list { display: flex; flex-direction: column; gap: 14px; }
    .dr-mode-card { display: flex; align-items: center; gap: 14px; text-align: left; width: 100%;
      border: 1px solid rgba(130,160,210,0.22); border-radius: 20px; padding: 18px 16px; cursor: pointer;
      color: #e6edf7; background: linear-gradient(180deg, rgba(24,33,52,0.92), rgba(14,20,34,0.92));
      box-shadow: 0 14px 34px rgba(0,0,0,0.45); -webkit-tap-highlight-color: transparent;
      transition: transform .08s ease, box-shadow .12s ease, border-color .12s ease; }
    .dr-mode-card:active { transform: translateY(3px) scale(0.995); }
    .dr-mode-rush { border-left: 5px solid #37d67a; }
    .dr-mode-rush:hover { border-color: rgba(55,214,122,0.5); box-shadow: 0 16px 40px rgba(55,214,122,0.18); }
    .dr-mode-free { border-left: 5px solid #5aa9ff; }
    .dr-mode-free:hover { border-color: rgba(90,169,255,0.5); box-shadow: 0 16px 40px rgba(90,169,255,0.18); }
    .dr-mode-garage { border-left: 5px solid #ffd54a; }
    .dr-mode-garage:hover { border-color: rgba(255,213,74,0.5); box-shadow: 0 16px 40px rgba(255,213,74,0.18); }
    .dr-mode-market { border-left: 5px solid #b58cff; }
    .dr-mode-market:hover { border-color: rgba(181,140,255,0.5); box-shadow: 0 16px 40px rgba(181,140,255,0.18); }
    .dr-mode-icon { font-size: 40px; width: 60px; height: 60px; flex: 0 0 60px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); }
    .dr-mode-text { flex: 1; min-width: 0; }
    .dr-mode-name { font-weight: 900; font-size: 22px; letter-spacing: 0.02em; }
    .dr-mode-desc { font-size: 13px; color: #9fb0c9; margin-top: 3px; line-height: 1.35; }
    .dr-mode-go { font-size: 18px; color: #64748b; flex: 0 0 auto; }

    .dr-modes-foot { text-align: center; font-size: 11px; letter-spacing: 0.12em; color: #5b6b83;
      text-transform: uppercase; }
  `;
  document.head.appendChild(s);
}
