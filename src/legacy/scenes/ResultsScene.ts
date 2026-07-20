import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';
import { Palette, hex } from '@/core/Palette';
import { Button, makePanel } from '@/ui/UiKit';
import { formatNumber } from '@/utils/MathUtils';
import { Profile } from '@/managers/ProfileStore';
import { Services } from '@/services/ServiceLocator';
import { Effects } from '@/effects/Effects';
import { sfx } from '@/audio/AudioManager';

interface Summary {
  coins: number;
  deliveries: number;
  score: number;
  bestStreak: number;
}

/** End-of-run results with score, rewards, and retry/menu/double-coins actions. */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super(Scenes.Results);
  }

  create(data: Summary): void {
    const { width, height } = this.scale;
    const summary: Summary = {
      coins: data?.coins ?? 0,
      deliveries: data?.deliveries ?? 0,
      score: data?.score ?? 0,
      bestStreak: data?.bestStreak ?? 0,
    };
    const isHigh = summary.score >= Profile.get().highScore && summary.score > 0;
    const fx = new Effects(this);

    this.add.rectangle(width / 2, height / 2, width, height, Palette.bgDeep, 0.85);
    fx.confetti(width / 2, height * 0.28);
    sfx('levelup');

    this.add.text(width / 2, height * 0.16, 'TESLİMAT BİTTİ', { fontFamily: 'Arial Black, sans-serif', fontSize: '52px', color: hex(Palette.green) }).setOrigin(0.5).setStroke(hex(Palette.bgDeep), 8);

    if (isHigh) {
      this.add.text(width / 2, height * 0.23, '★ YENİ REKOR! ★', { fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: hex(Palette.gold) }).setOrigin(0.5);
    }

    makePanel(this, width / 2, height * 0.45, 520, 380, { radius: 26 });
    const rows: Array<[string, string, number]> = [
      ['SKOR', formatNumber(summary.score), Palette.text],
      ['TESLİMAT', String(summary.deliveries), Palette.blue],
      ['EN İYİ KOMBO', 'x' + Math.max(1, summary.bestStreak), Palette.purple],
      ['KAZANILAN COIN', formatNumber(summary.coins), Palette.gold],
    ];
    rows.forEach(([label, value, color], i) => {
      const y = height * 0.33 + i * 66;
      this.add.text(width / 2 - 230, y, label, { fontFamily: 'Arial', fontSize: '26px', color: hex(Palette.textDim) }).setOrigin(0, 0.5);
      this.add.text(width / 2 + 230, y, value, { fontFamily: 'Arial Black, sans-serif', fontSize: '32px', color: hex(color) }).setOrigin(1, 0.5);
    });

    // Double coins (rewarded ad mock)
    const dbl = new Button(this, width / 2, height * 0.63, 520, 88, 'COINLERI 2X YAP (Reklam)', { color: Palette.orange, fontSize: 28, icon: '🎬', onClick: async () => {
      dbl.setEnabled(false);
      const res = await Services.ads.show('reward_double');
      if (res.completed) {
        Profile.addCoins(summary.coins);
        fx.floatText(width / 2, height * 0.5, `+${formatNumber(summary.coins)}`, Palette.gold, 48);
        sfx('coin');
        dbl.setText('ALINDI ✓');
      }
    } });

    new Button(this, width / 2 - 140, height * 0.75, 250, 96, 'TEKRAR', { color: Palette.green, fontSize: 34, icon: '🔁', onClick: () => this.scene.start(Scenes.Game) });
    new Button(this, width / 2 + 140, height * 0.75, 250, 96, 'MENÜ', { color: Palette.blue, fontSize: 34, icon: '🏠', onClick: () => this.scene.start(Scenes.MainMenu) });
  }
}
