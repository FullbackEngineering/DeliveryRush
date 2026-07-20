import Phaser from 'phaser';
import { Design } from '@/core/Balance';
import { Palette } from '@/core/Palette';
import { Scenes } from '@/core/SceneKeys';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { MainMenuScene } from '@/scenes/MainMenuScene';
import { GameScene } from '@/scenes/GameScene';
import { HudScene } from '@/scenes/HudScene';
import { ResultsScene } from '@/scenes/ResultsScene';
import { GarageScene } from '@/scenes/GarageScene';
import { Audio } from '@/audio/AudioManager';
import { initHaptics } from '@/input/Haptics';
import { bus } from '@/core/EventBus';

/**
 * Application entry point. Wires the Phaser game (portrait, mobile-first, FIT
 * scaling) and boots the scene graph. Global, scene-agnostic managers (audio,
 * haptics) are initialized once here.
 */
Audio.init();
initHaptics();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: Palette.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: Design.width,
    height: Design.height,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  fps: { target: 60, min: 30 },
  disableContextMenu: true,
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameScene,
    HudScene,
    ResultsScene,
    GarageScene,
  ],
};

const game = new Phaser.Game(config);

// Remove the HTML loading label once Phaser takes over.
game.events.once(Phaser.Core.Events.READY, () => {
  document.getElementById('loading')?.remove();
});

// Keep the canvas + input hit-test bounds correct when the mobile browser UI
// (URL bar) shows/hides and changes the visual viewport. Without this the canvas
// bounds go stale and touches register offset from where you actually tapped.
const refreshScale = () => game.scale.refresh();
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => window.setTimeout(refreshScale, 250));
window.visualViewport?.addEventListener('resize', refreshScale);
window.visualViewport?.addEventListener('scroll', refreshScale);

// Expose for quick debugging in dev.
if (import.meta.env?.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, { game, bus });
}

export default game;
void Scenes;
