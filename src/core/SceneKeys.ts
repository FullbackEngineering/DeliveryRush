/** Canonical scene keys, referenced everywhere instead of magic strings. */
export const Scenes = {
  Boot: 'Boot',
  Preload: 'Preload',
  MainMenu: 'MainMenu',
  Game: 'Game',
  HUD: 'HUD',
  Results: 'Results',
  Garage: 'Garage',
} as const;

export type SceneKey = (typeof Scenes)[keyof typeof Scenes];
