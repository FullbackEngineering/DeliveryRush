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
  size?: number;
  updateHz?: number;
  ariaLabel?: string;
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
  private readonly overlay: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver | null;
  private readonly interval: number;
  private elapsed = Infinity;
  private cssSize: number;
  private mapTime = 0;
  private destroyed = false;

  constructor(private readonly options: WorldMapOptions) {
    injectStyle();
    this.cssSize = options.size ?? 136;
    this.interval = 1 / Math.max(1, options.updateHz ?? 10);

    this.element = document.createElement('div');
    this.element.className = 'dr-world-map';
    this.element.style.setProperty('--dr-map-size', `${this.cssSize}px`);
    this.element.setAttribute('role', 'img');
    this.element.setAttribute('aria-label', options.ariaLabel ?? 'Şehrin canlı haritası');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.className = 'dr-world-map__world';

    this.overlay = document.createElement('canvas');
    this.overlay.className = 'dr-world-map__overlay';
    this.ctx = this.overlay.getContext('2d')!;
    this.element.append(this.renderer.domElement, this.overlay);
    options.mount.appendChild(this.element);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
    this.camera.up.set(0, 0, -1); // north / world -Z stays at the top
    this.fitWholeWorld();
    this.syncBackingSize();

    this.observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => this.syncBackingSize());
    this.observer?.observe(this.element);
  }

  /** Render at the configured low frequency; safe to call every game frame. */
  update(dt: number): void {
    if (this.destroyed) return;
    this.mapTime += Math.max(0, dt);
    this.elapsed += Math.max(0, dt);
    if (this.elapsed < this.interval) return;
    this.elapsed %= this.interval;
    this.render();
  }

  /** Force an immediate map refresh (useful after async decor/models arrive). */
  render(): void {
    if (this.destroyed || !this.element.isConnected) return;
    this.fitWholeWorld();

    // Fog tuned for the chase camera would wash out a camera hundreds of metres
    // above the city. Temporarily remove it only for this renderer/pass.
    const fog = this.options.scene.fog;
    this.options.scene.fog = null;
    try {
      this.renderer.render(this.options.scene, this.camera);
    } finally {
      this.options.scene.fog = fog;
    }
    this.drawOverlay();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer?.disconnect();
    this.renderer.dispose();
    this.element.remove();
  }

  private fitWholeWorld(): void {
    const { grid } = this.options;
    const padding = Math.max(grid.block * 0.12, 8);
    const span = Math.max(grid.worldW, grid.worldD) + padding * 2;
    const half = span * 0.5;
    this.camera.left = -half;
    this.camera.right = half;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.near = 0.1;
    this.camera.far = Math.max(5000, grid.buildMaxH + 2000);
    this.camera.position.set(grid.worldW * 0.5, grid.buildMaxH + 1000, grid.worldD * 0.5);
    this.camera.lookAt(grid.worldW * 0.5, 0, grid.worldD * 0.5);
    this.camera.updateProjectionMatrix();
  }

  private syncBackingSize(): void {
    const measured = this.element.getBoundingClientRect().width;
    this.cssSize = Math.max(1, measured || this.cssSize);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.cssSize, this.cssSize, false);
    this.overlay.width = Math.round(this.cssSize * dpr);
    this.overlay.height = Math.round(this.cssSize * dpr);
    this.overlay.style.width = `${this.cssSize}px`;
    this.overlay.style.height = `${this.cssSize}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.elapsed = Infinity;
  }

  private worldToMap(x: number, z: number): { x: number; y: number } {
    const { grid } = this.options;
    const padding = Math.max(grid.block * 0.12, 8);
    const span = Math.max(grid.worldW, grid.worldD) + padding * 2;
    const offsetX = (span - grid.worldW) * 0.5;
    const offsetZ = (span - grid.worldD) * 0.5;
    return {
      x: ((x + offsetX) / span) * this.cssSize,
      y: ((z + offsetZ) / span) * this.cssSize,
    };
  }

  private drawOverlay(): void {
    const ctx = this.ctx;
    const size = this.cssSize;
    ctx.clearRect(0, 0, size, size);
    const snapshot = this.options.getSnapshot?.();
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
    this.drawMarker({ ...snapshot.player, kind: 'player' });
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
      height: var(--dr-map-size); overflow: hidden; border-radius: 20px;
      background: #202a36; border: 2px solid rgba(190,210,235,.34);
      box-shadow: 0 8px 24px rgba(0,0,0,.42), inset 0 0 0 1px rgba(255,255,255,.05);
      pointer-events: none; contain: strict; }
    .dr-world-map__world, .dr-world-map__overlay { position: absolute; inset: 0;
      display: block; width: 100%; height: 100%; pointer-events: none; }
    .dr-world-map__overlay { z-index: 1; }
  `;
  document.head.appendChild(style);
}
