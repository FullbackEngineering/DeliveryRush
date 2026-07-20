import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';

/** First scene. Configures input and hands off to Preload. Deliberately tiny. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(Scenes.Boot);
  }

  create(): void {
    this.input.addPointer(2); // support multi-touch for the 3-button pad
    this.scene.start(Scenes.Preload);
  }
}
