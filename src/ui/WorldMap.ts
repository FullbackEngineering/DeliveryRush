import * as THREE from 'three';
import { Grid } from '@/world/Grid';

export type WorldMapMarkerKind = 'player' | 'traffic' | 'police' | 'poi' | 'pickup' | 'dropoff';

export interface WorldMapMarker {
  x: number;
  z: number;
  yaw?: number;
  kind: WorldMapMarkerKind;
  color?: string;
  label?: string;
}

export interface WorldMapSnapshot {
  player: WorldMapMarker;
  markers?: readonly WorldMapMarker[];
  /** Optional world-space route drawn below markers. */
  route?: readonly { x: number; z: number }[];
}

export interface WorldMapOptions {
  mount: HTMLElement;
  scene: THREE.Scene;
  grid: Grid;
  /** Dynamic semantic overlay. The 3D scene itself is always rendered exactly. */
  getSnapshot?: () => WorldMapSnapshot;
  /** Cheap player position getter used for smooth map panning between marker refreshes. */
  getCenter?: () => { x: number; z: number };
  size?: number;
  /** Expensive static-scene cache refresh. Set to 0 to capture only once. */
  worldUpdateHz?: number;
  /** Cheap player/target overlay refresh. */
  overlayUpdateHz?: number;
  ariaLabel?: string;
  /** `embedded` fills an existing HUD slot; `rush` uses the built-in fixed placement. */
  placement?: 'embedded' | 'rush';
  /** Player-centred visible radius in world metres. */
  viewRadiusM?: number;
}

/**
 * Exact top-down live view of the active Three.js world.
 *
 * Unlike a symbolic grid minimap, this renders the SAME scene graph through an
 * orthographic camera, so RUSH/SERBEST roads, avenue widths, buildings, decor,
 * signals, vehicles and beacons match the playable world automatically. A tiny
 * 2D overlay keeps the player/targets readable at phone minimap sizes.
 *
 * Integration contract (kept intentionally small): instantiate once after the
 * mode's world is assembled, then call `update(dt)` from that mode's update loop.
 */
export class WorldMap {
  readonly element: HTMLDivElement;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.OrthographicCamera;
  private readonly worldCanvas: HTMLCanvasElement;
  private readonly worldCtx: CanvasRenderingContext2D;
  private readonly cacheCanvas: HTMLCanvasElement;
  private readonly cacheCtx: CanvasRenderingContext2D;
  private readonly overlay: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver | null;
  private readonly worldInterval: number;
  private readonly overlayInterval: number;
  private readonly visualInterval = 1 / 30;
  private worldElapsed = 0;
  private overlayElapsed = 0;
  private visualElapsed = 0;
  private cssSize: number;
  private mapTime = 0;
  private snapshot: WorldMapSnapshot | null = null;
  private displayCenter = { x: 0, z: 0 };
  private captureMinX = 0;
  private captureMinZ = 0;
  private captureSpan = 1;
  private cacheReady = false;
  private destroyed = false;

  constructor(private readonly options: WorldMapOptions) {
    injectStyle();
    this.cssSize = options.size ?? 136;
    this.worldInterval = options.worldUpdateHz && options.worldUpdateHz > 0
      ? 1 / Math.max(0.2, options.worldUpdateHz)
      : Infinity;
    this.overlayInterval = 1 / Math.max(1, options.overlayUpdateHz ?? 12);
    this.worldElapsed = this.worldInterval;
    this.overlayElapsed = this.overlayInterval;
    this.visualElapsed = this.visualInterval;
    const initialCenter = options.getCenter?.()
      ?? options.getSnapshot?.().player
      ?? { x: options.grid.centerX, z: options.grid.centerZ };
    this.displayCenter = { x: initialCenter.x, z: initialCenter.z };

    this.element = document.createElement('div');
    this.element.className = 'dr-world-map';
    if (options.placement) this.element.classList.add(`dr-world-map--${options.placement}`);
    this.element.style.setProperty(
      '--dr-map-size',
      options.placement === 'rush' ? 'clamp(104px,28vw,136px)' : `${this.cssSize}px`,
    );
    this.element.setAttribute('role', 'img');
    this.element.setAttribute('aria-label', options.ariaLabel ?? 'Şehrin canlı haritası');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.className = 'dr-world-map__source';

    this.worldCanvas = document.createElement('canvas');
    this.worldCanvas.className = 'dr-world-map__world';
    this.worldCtx = this.worldCanvas.getContext('2d', { alpha: false })!;
    this.cacheCanvas = document.createElement('canvas');
    this.cacheCtx = this.cacheCanvas.getContext('2d', { alpha: false })!;

    this.overlay = document.createElement('canvas');
    this.overlay.className = 'dr-world-map__overlay';
    this.ctx = this.overlay.getContext('2d')!;
    this.element.append(this.worldCanvas, this.overlay);
    options.mount.appendChild(this.element);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
    this.camera.up.set(0, 0, -1); // north / world -Z stays at the top
    this.fitLocalView();
    this.syncBackingSize();
    this.captureWorld();
    this.refreshVisuals(true);

    this.observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.syncBackingSize());
    this.observer?.observe(this.element);
  }

  /** Render at the configured low frequency; safe to call every game frame. */
  update(dt: number): void {
    if (this.destroyed) return;
    this.mapTime += Math.max(0, dt);
    const safeDt = Math.max(0, dt);
    this.worldElapsed += safeDt;
    this.overlayElapsed += safeDt;
    this.visualElapsed += safeDt;
    const target = this.options.getCenter?.() ?? this.snapshot?.player;
    if (target) {
      const follow = 1 - Math.exp(-safeDt * 16);
      this.displayCenter.x += (target.x - this.displayCenter.x) * follow;
      this.displayCenter.z += (target.z - this.displayCenter.z) * follow;
    }
    if (this.worldElapsed >= this.worldInterval) {
      this.worldElapsed = 0;
      this.captureWorld();
    }
    if (this.overlayElapsed >= this.overlayInterval) {
      this.overlayElapsed = 0;
      this.snapshot = this.options.getSnapshot?.() ?? null;
    }
    if (this.visualElapsed >= this.visualInterval) {
      this.visualElapsed = 0;
      this.refreshVisuals();
    }
  }

  /** Force an immediate map refresh (useful after async decor/models arrive). */
  render(): void {
    if (this.destroyed || !this.element.isConnected) return;
    const target = this.options.getCenter?.() ?? this.options.getSnapshot?.().player;
    if (target) this.displayCenter = { x: target.x, z: target.z };
    this.snapshot = this.options.getSnapshot?.() ?? null;
    if (!this.cacheReady) this.captureWorld();
    this.refreshVisuals(true);
  }

  private captureWorld(): void {
    if (this.destroyed || !this.element.isConnected) return;
    const grid = this.options.grid;
    const padding = this.viewRadius();
    this.captureSpan = Math.max(grid.worldW, grid.worldD) + padding * 2;
    this.captureMinX = grid.centerX - this.captureSpan * 0.5;
    this.captureMinZ = grid.centerZ - this.captureSpan * 0.5;
    const half = this.captureSpan * 0.5;
    const cacheSize = Math.min(1024, Math.max(512, Math.ceil(Math.max(grid.worldW, grid.worldD) * 0.6)));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(cacheSize, cacheSize, false);
    this.camera.left = -half;
    this.camera.right = half;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.position.set(grid.centerX, grid.buildMaxH + 1000, grid.centerZ);
    this.camera.lookAt(grid.centerX, 0, grid.centerZ);
    this.camera.updateProjectionMatrix();

    // Fog tuned for the chase camera would wash out a camera hundreds of metres
    // above the city. Temporarily remove it only for this renderer/pass.
    const fog = this.options.scene.fog;
    this.options.scene.fog = null;
    try {
      this.renderer.render(this.options.scene, this.camera);
      this.cacheCanvas.width = cacheSize;
      this.cacheCanvas.height = cacheSize;
      this.cacheCtx.drawImage(this.renderer.domElement, 0, 0, cacheSize, cacheSize);
      this.cacheReady = true;
    } finally {
      this.options.scene.fog = fog;
    }
    this.fitLocalView();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer?.disconnect();
    this.renderer.dispose();
    this.element.remove();
  }

  private fitLocalView(): void {
    const { grid } = this.options;
    const radius = this.viewRadius();
    const center = this.displayCenter;
    this.camera.left = -radius;
    this.camera.right = radius;
    this.camera.top = radius;
    this.camera.bottom = -radius;
    this.camera.near = 0.1;
    this.camera.far = Math.max(5000, grid.buildMaxH + 2000);
    this.camera.position.set(center.x, grid.buildMaxH + 1000, center.z);
    this.camera.lookAt(center.x, 0, center.z);
    this.camera.updateProjectionMatrix();
  }

  private syncBackingSize(): void {
    const measured = this.element.getBoundingClientRect().width;
    this.cssSize = Math.max(1, measured || this.cssSize);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.worldCanvas.width = Math.round(this.cssSize * dpr);
    this.worldCanvas.height = Math.round(this.cssSize * dpr);
    this.worldCanvas.style.width = `${this.cssSize}px`;
    this.worldCanvas.style.height = `${this.cssSize}px`;
    this.worldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.overlay.width = Math.round(this.cssSize * dpr);
    this.overlay.height = Math.round(this.cssSize * dpr);
    this.overlay.style.width = `${this.cssSize}px`;
    this.overlay.style.height = `${this.cssSize}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.worldElapsed = this.worldInterval;
    this.overlayElapsed = this.overlayInterval;
    this.visualElapsed = this.visualInterval;
  }

  private worldToMap(x: number, z: number, center = this.displayCenter): { x: number; y: number } {
    const radius = this.viewRadius();
    const span = radius * 2;
    return {
      x: ((x - center.x + radius) / span) * this.cssSize,
      y: ((z - center.z + radius) / span) * this.cssSize,
    };
  }

  private viewRadius(): number {
    return Math.max(40, this.options.viewRadiusM ?? Math.min(this.options.grid.worldW, this.options.grid.worldD) * 0.22);
  }

  private refreshVisuals(force = false): void {
    if (!this.cacheReady) return;
    // Keep the diagnostic camera position in sync without rebuilding its
    // projection matrix; the visible map now pans by cropping the static cache.
    this.camera.position.x = this.displayCenter.x;
    this.camera.position.z = this.displayCenter.z;
    const radius = this.viewRadius();
    const sx = ((this.displayCenter.x - radius - this.captureMinX) / this.captureSpan) * this.cacheCanvas.width;
    const sy = ((this.displayCenter.z - radius - this.captureMinZ) / this.captureSpan) * this.cacheCanvas.height;
    const sourceSize = (radius * 2 / this.captureSpan) * this.cacheCanvas.width;
    this.worldCtx.fillStyle = '#202a36';
    this.worldCtx.fillRect(0, 0, this.cssSize, this.cssSize);
    this.worldCtx.imageSmoothingEnabled = true;
    this.worldCtx.imageSmoothingQuality = 'high';
    this.worldCtx.drawImage(
      this.cacheCanvas,
      sx, sy, sourceSize, sourceSize,
      0, 0, this.cssSize, this.cssSize,
    );
    this.drawOverlay(force ? (this.options.getSnapshot?.() ?? this.snapshot) : this.snapshot);
  }

  private drawOverlay(snapshot: WorldMapSnapshot | null): void {
    const ctx = this.ctx;
    const size = this.cssSize;
    ctx.clearRect(0, 0, size, size);
    if (!snapshot) return;

    if (snapshot.route && snapshot.route.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      snapshot.route.forEach((point, index) => {
        const p = this.worldToMap(point.x, point.z);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    for (const marker of snapshot.markers ?? []) this.drawMarker(marker);
    this.drawMarker({ ...snapshot.player, ...this.displayCenter, kind: 'player' });

    // Compact scale reference: the line represents one quarter of the visible diameter.
    const scaleM = Math.round(this.viewRadius() / 2 / 10) * 10;
    const scalePx = size * 0.25;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, size - 12); ctx.lineTo(10 + scalePx, size - 12); ctx.stroke();
    ctx.font = '700 8px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${scaleM} m`, 10, size - 16);
    ctx.restore();
  }

  private drawMarker(marker: WorldMapMarker): void {
    const ctx = this.ctx;
    const p = this.worldToMap(marker.x, marker.z);
    if (p.x < -8 || p.x > this.cssSize + 8 || p.y < -8 || p.y > this.cssSize + 8) return;
    const color = marker.color ?? markerColor(marker.kind);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-(marker.yaw ?? 0));
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(5,10,18,.9)';
    ctx.lineWidth = 1.4;
    if (marker.kind === 'player') {
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(-4.5, -4.5);
      ctx.lineTo(4.5, -4.5);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (marker.kind === 'traffic' || marker.kind === 'police') {
      ctx.fillRect(-1.8, -3.2, 3.6, 6.4);
      ctx.strokeRect(-1.8, -3.2, 3.6, 6.4);
    } else {
      const pulse = marker.kind === 'pickup' || marker.kind === 'dropoff'
        ? 1 + (Math.sin(this.mapTime * 5) + 1) * 0.8
        : 0;
      ctx.beginPath(); ctx.arc(0, 0, 3 + pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    if (marker.label) {
      ctx.save();
      ctx.font = '700 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(5,10,18,.9)';
      ctx.fillStyle = '#fff';
      ctx.strokeText(marker.label, p.x, p.y - 6);
      ctx.fillText(marker.label, p.x, p.y - 6);
      ctx.restore();
    }
  }
}

function markerColor(kind: WorldMapMarkerKind): string {
  if (kind === 'player') return '#ffffff';
  if (kind === 'traffic') return '#f5c451';
  if (kind === 'police') return '#4f9cff';
  if (kind === 'pickup') return '#f5a524';
  if (kind === 'dropoff') return '#37d67a';
  return '#a9c7e8';
}

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = `
    .dr-world-map { --dr-map-size: 136px; position: relative; box-sizing: border-box; width: var(--dr-map-size);
      height: var(--dr-map-size); overflow: hidden; border-radius: 50%;
      background: #202a36; border: 2px solid rgba(190,210,235,.34);
      box-shadow: 0 8px 24px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.05);
      pointer-events: none; contain: strict; }
    .dr-world-map__world, .dr-world-map__overlay { position: absolute; inset: 0;
      display: block; width: 100%; height: 100%; pointer-events: none; }
    .dr-world-map__overlay { z-index: 1; }
    .dr-world-map--embedded { width: 100%; height: 100%; border: 0; border-radius: 50%; }
    .dr-world-map--rush { position: fixed; right: 12px;
      top: calc(env(safe-area-inset-top,0px) + 160px); z-index: 5; }
  `;
  document.head.appendChild(style);
}
