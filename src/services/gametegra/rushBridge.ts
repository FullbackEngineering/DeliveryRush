import { bus, GameEvent } from '@/core/EventBus';
import {
  isHost,
  vibrate,
  loadHighscore,
  saveHighscore,
  submitScore,
  getTopScore,
  showInterstitial,
  report,
} from './gametegra';

/**
 * RUSH ↔ Gametegra "Game Over" bridge — the standard platform package applied
 * to every game (vibration · high score · leaderboard · ads · analytics),
 * wired purely as a bus subscriber so it never touches gameplay code. Everything
 * is host-gated: outside the SuperApp it's an inert no-op.
 */

interface RunSummary {
  coins: number;
  deliveries: number;
  score: number;
  bestStreak: number;
}

let lastScore = 0;
let installed = false;

// RUSH koşu bitişini dinleyip Gametegra game-over paketini bağlar (bir kez).
export function installRushGametegra(): void {
  if (installed) return;
  installed = true;
  bus.on(GameEvent.RunEnd, (s: RunSummary) => {
    void onGameOver(s);
  });
}

// Koşu bitince: titreşim + rekor + lider tablosu + analitik (hepsi host varsa).
async function onGameOver(s: RunSummary): Promise<void> {
  lastScore = s.score;
  if (!isHost()) return; // SuperApp yok — gönderilecek bir şey yok

  vibrate(); // tam olarak bir kez
  report('level_complete', { level: s.deliveries, score: s.score });

  const [prevBest, submit] = await Promise.all([loadHighscore(), submitScore(s.score)]);

  const isNewBest = prevBest === null || s.score > prevBest;
  if (isNewBest) {
    // Skoru gerçekten yaptı — saklama başarısız olsa bile raporla.
    report('new_high_score', { score: s.score, previousBest: prevBest ?? 0 });
    await saveHighscore(s.score);
  }

  const newBest = prevBest === null ? s.score : Math.max(prevBest, s.score);
  const top = await getTopScore(submit.ownerId);
  // İlk oyununda "rekorun" satırını gösterme (önceki kayıt yoksa null geç).
  injectResultsExtras(prevBest !== null ? newBest : null, top);
}

// Sonuç kartına 'en yüksek skorun' ve lider-tablosu satırını enjekte eder.
function injectResultsExtras(best: number | null, top: { score: number; isMe: boolean } | null): void {
  const card = document.querySelector('.dr-results-card');
  if (!card) return;
  let box = card.querySelector<HTMLElement>('.dr-gt-extra');
  if (!box) {
    box = document.createElement('div');
    box.className = 'dr-gt-extra';
    box.style.cssText = 'margin:-4px 0 16px;font-size:12px;color:#9fb0c9;line-height:1.6;';
    const actions = card.querySelector('.dr-r-actions');
    if (actions) card.insertBefore(box, actions);
    else card.appendChild(box);
  }
  const lines: string[] = [];
  if (best != null) lines.push(`🏆 En Yüksek Skorun: <b style="color:#ffd54a">${best}</b>`);
  if (top) lines.push(`👥 En yüksek ${top.score} puan yapıldı${top.isMe ? ' (sen)' : ''}`);
  box.innerHTML = lines.join('<br>');
  box.style.display = lines.length ? 'block' : 'none';
}

// "Tekrar oyna"yı sarar: (host varsa) geçiş reklamı göster, 'retry' raporla, sonra devam et.
export function wrapRushRetry(retry: () => void): () => void {
  return () => {
    report('retry', { previousScore: lastScore });
    if (!isHost()) {
      retry();
      return;
    }
    void showInterstitial('rush_retry').finally(() => retry());
  };
}
