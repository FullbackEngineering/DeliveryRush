import {
  AdPlacement,
  IAdsService,
  IAnalyticsService,
  ICloudSaveService,
  ILeaderboardService,
  LeaderboardEntry,
  LeaderboardScope,
} from '@/services/interfaces';

/** Deterministic fake leaderboard so the UI has believable data offline. */
export class MockLeaderboardService implements ILeaderboardService {
  private readonly names = [
    'FastMan', 'KuryeKral', 'Speedy', 'RoadRunner', 'DeliveryKing', 'TurboKurye',
    'NightRider', 'PizzaPro', 'RushHour', 'ComboQueen', 'DriftLord', 'ZoomZoom',
  ];

  // Ofline test için sahte adları başlatır.
  async submitScore(_name: string, _score: number): Promise<void> {
    // no-op in mock
  }

  // Kapsamına göre sahte sıralama listesi oluşturur ve oyuncunun puanını ekler.
  async getBoard(scope: LeaderboardScope, playerScore: number): Promise<LeaderboardEntry[]> {
    const seed = scope === 'weekly' ? 1.4 : scope === 'friends' ? 0.6 : 1;
    const entries: LeaderboardEntry[] = this.names.map((name, i) => ({
      rank: 0,
      name,
      country: 'TR',
      score: Math.round((1_300_000 - i * 90_000) * seed),
    }));
    entries.push({ rank: 0, name: 'You', score: playerScore, isPlayer: true });
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => (e.rank = i + 1));
    return entries.slice(0, 12);
  }
}

/** Cloud save backed by localStorage (stands in for a real cloud backend). */
export class MockCloudSaveService implements ICloudSaveService {
  private readonly key = 'dr_cloud_save';
  // localStorage'ı bulut kaydı alanı olarak başlatır.
  isAvailable(): boolean {
    return true;
  }
  // localStorage'dan kaydedilmiş profili yükler.
  async load(): Promise<string | null> {
    return localStorage.getItem(this.key);
  }
  // Profili localStorage'a kaydeder.
  async save(blob: string): Promise<void> {
    localStorage.setItem(this.key, blob);
  }
}

/** Always-ready ad that "succeeds" after a short simulated wait. */
export class MockAdsService implements IAdsService {
  // Her zaman reklam gösterilmeye hazır olduğunu döndürür.
  isReady(_placement: AdPlacement): boolean {
    return true;
  }
  // Kısa bir gecikme sonra başarıyla tamamlanan sahte reklam gösterir.
  async show(_placement: AdPlacement): Promise<{ completed: boolean }> {
    await new Promise((r) => setTimeout(r, 400));
    return { completed: true };
  }
}

/** Console-only analytics stub. */
export class MockAnalyticsService implements IAnalyticsService {
  // Geliştirme modunda olayları konsolda hata ayıkla olarak yazar.
  track(event: string, props?: Record<string, unknown>): void {
    if (import.meta.env?.DEV) console.debug('[analytics]', event, props ?? {});
  }
}
