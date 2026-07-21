import {
  IAdsService,
  IAnalyticsService,
  ICloudSaveService,
  ILeaderboardService,
} from '@/services/interfaces';
import {
  MockAdsService,
  MockAnalyticsService,
  MockCloudSaveService,
  MockLeaderboardService,
} from '@/services/mock/MockServices';

/**
 * Minimal service locator. Gameplay/UI ask the locator for a service by role and
 * receive whatever implementation was registered — mocks today, real backends
 * later — without any call-site changes.
 */
// Sahte hizmet implementasyonlarını başlatır.
class ServiceLocatorImpl {
  leaderboard: ILeaderboardService = new MockLeaderboardService();
  cloudSave: ICloudSaveService = new MockCloudSaveService();
  ads: IAdsService = new MockAdsService();
  analytics: IAnalyticsService = new MockAnalyticsService();
}

export const Services = new ServiceLocatorImpl();
