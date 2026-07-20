import * as THREE from 'three';

/**
 * Minimal Three.js engine core for the Delivery Rush rewrite: owns the renderer,
 * scene, perspective camera, resize handling, and a delta-timed render loop with
 * an FPS meter. Game systems register per-frame callbacks via `onUpdate`.
 *
 * Deliberately thin — rendering plumbing only. Gameplay (city, vehicle, traffic,
 * orders) and UI live in higher layers. Replaces the Phaser renderer, whose
 * per-frame vector city redraw tanked mobile FPS.
 */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  /** Smoothed frames-per-second (updated ~2×/sec). */
  fps = 0;

  private raf = 0;
  private last = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private readonly updateFns: Array<(dt: number) => void> = [];

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // Cap DPR: retina phones would otherwise render 3× the pixels for no visible gain.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 5000);
    this.resize();

    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
  }

  /** Register a per-frame update (dt in seconds, capped). */
  onUpdate(fn: (dt: number) => void): void {
    this.updateFns.push(fn);
  }

  start(): void {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private resize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private tick = (t: number): void => {
    const dt = Math.min((t - this.last) / 1000, 0.05);
    this.last = t;

    for (const fn of this.updateFns) fn(dt);
    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    window.visualViewport?.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
