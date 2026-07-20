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
  submitScore(name: string, score: number): Promise<void>;
  getBoard(scope: LeaderboardScope, playerScore: number): Promise<LeaderboardEntry[]>;
}

export interface ICloudSaveService {
  isAvailable(): boolean;
  load(): Promise<string | null>;
  save(blob: string): Promise<void>;
}

export type AdPlacement = 'reward_double' | 'reward_continue' | 'reward_daily';

export interface IAdsService {
  isReady(placement: AdPlacement): boolean;
  show(placement: AdPlacement): Promise<{ completed: boolean }>;
}

export interface IAnalyticsService {
  track(event: string, props?: Record<string, unknown>): void;
}
