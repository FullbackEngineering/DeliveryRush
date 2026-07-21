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

  // WebGL renderer'ını başlatır, gölgelendirme türünü cihaza uygun seçer.
  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // Cap DPR: retina phones would otherwise render 3× the pixels for no visible gain.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Shadows: PCFSoftShadowMap takes several depth-texture samples per
    // shadowed fragment (a soft-shadow blur pass) — cheap on desktop/console
    // GPUs but a real per-frame cost on weak mobile GPUs. Detect "low-end"
    // with a simple, synchronous heuristic (no WebGL capability probing
    // needed): a coarse pointer (touchscreen — i.e. a phone/tablet, not a
    // desktop with a mouse/trackpad) combined with few logical CPU cores
    // (budget SoCs report low `hardwareConcurrency`; a touchscreen with
    // plenty of cores is usually a decent modern tablet, so that combo is
    // NOT penalized). On a hit, fall back to BasicShadowMap — a single
    // hard-edged sample, much cheaper than the soft PCF blur — instead of
    // disabling shadows outright. Capable devices (desktop, or a touchscreen
    // with plenty of cores) keep full soft-shadow quality.
    const isLowEndDevice =
      (window.matchMedia?.('(pointer: coarse)').matches ?? false) &&
      (navigator.hardwareConcurrency || 4) <= 4;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = isLowEndDevice ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 5000);
    this.resize();

    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
  }

  /** Register a per-frame update (dt in seconds, capped). */
  // Her kare için çalıştırılacak güncelleme işlevini kaydeder.
  onUpdate(fn: (dt: number) => void): void {
    this.updateFns.push(fn);
  }

  // Render döngüsünü başlatır, animasyon istekleri başlamaz.
  start(): void {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  // Render döngüsünü durdurur, istenen animasyon çerçevesini iptal eder.
  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // Pencere boyutuna uygun renderer ve kamera boyutlarını günceller.
  private resize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  // Her kareyi işler: güncelleme işlevlerini çalıştırır, sahneyi render eder, FPS hesaplar.
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

  // Render döngüsünü durdurur, olay dinleyicilerini temizler, GPU kaynaklarını serbest bırakır.
  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    window.visualViewport?.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
