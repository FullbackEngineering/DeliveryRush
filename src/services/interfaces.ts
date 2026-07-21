/**
 * Service interfaces for systems that will eventually talk to a backend.
 * Per the design brief, networking is NEVER hard-coded: gameplay depends only
 * on these interfaces, and we register mock implementations for now. Swapping in
 * real HTTP/websocket implementations later requires zero gameplay changes.
 */

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  country?: string;
  isPlayer?: boolean;
}

export type LeaderboardScope = 'global' | 'country' | 'friends' | 'weekly';

export interface ILeaderboardService {
  // Oyuncunun puanını sıralama sistemine gönderir.
  submitScore(name: string, score: number): Promise<void>;
  // Belirtilen kapsam (global/ülke/arkadaş/haftalık) için sıralama listesini döndürür.
  getBoard(scope: LeaderboardScope, playerScore: number): Promise<LeaderboardEntry[]>;
}

export interface ICloudSaveService {
  // Bulut kaydı hizmetinin mevcut olup olmadığını döndürür.
  isAvailable(): boolean;
  // Buluttan kaydedilmiş profil verisini yükler, yoksa null döndürür.
  load(): Promise<string | null>;
  // Profil verisini buluta kaydeder.
  save(blob: string): Promise<void>;
}

export type AdPlacement = 'reward_double' | 'reward_continue' | 'reward_daily';

export interface IAdsService {
  // Belirtilen yerleştirmede reklam gösterilmeye hazır olup olmadığını kontrol eder.
  isReady(placement: AdPlacement): boolean;
  // Reklamı gösterir, tamamlanıp tamamlanmadığını döndürür.
  show(placement: AdPlacement): Promise<{ completed: boolean }>;
}

export interface IAnalyticsService {
  // Oyun olayını (isteğe bağlı özelliklerle) analitiklere gönderir.
  track(event: string, props?: Record<string, unknown>): void;
}
