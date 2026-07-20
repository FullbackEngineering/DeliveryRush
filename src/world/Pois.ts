import * as THREE from 'three';
import { Grid } from '@/world/Grid';
import { Rng } from '@/utils/Rng';
import { Poi } from '@/types';
import { POI_DEFS, PoiDef } from '@/data/pois';
import { Nav, PoiSpawn } from '@/core/Balance';
import { instanced, darken, Xform } from '@/world/CityView';
import { Beacon3D } from '@/world/Orders3D';
import { clamp } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';

const ICON_SIZE = 128;
const iconCache = new Map<string, THREE.CanvasTexture>();

/** Emoji → billboard sprite texture (cached per glyph, shared across markers). */
function iconTexture(emoji: string): THREE.CanvasTexture {
  let tex = iconCache.get(emoji);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = ICON_SIZE;
  c.height = ICON_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.font = `${Math.round(ICON_SIZE * 0.64)}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, ICON_SIZE / 2, ICON_SIZE / 2 + ICON_SIZE * 0.05);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  iconCache.set(emoji, tex);
  return tex;
}

/**
 * Points of Interest for SERBEST: fixed restaurant/cafe/cargo (pickup) and
 * home/office (drop-off) buildings placed on their own reserved plots (see
 * `Grid.plotRect` + `CityView`'s `reserved` param — no overlap with random
 * buildings). Every POI is always dimly visible (landmark + billboarded emoji
 * icon + a soft ground ring) so the city reads as full of places; the active
 * job's current target additionally gets a bright pulsing `Beacon3D` (the same
 * look RUSH uses for its single order). A second, dimmer beacon pulses on
 * whichever source POI the player is approaching-but-still-moving toward, cued
 * by `JobBoard`'s stop-to-order zone events (`GameEvent.StopZoneEnter/Exit`) —
 * the "🛑 drive up and stop to order" world hint.
 */
export class PoiSystem {
  readonly group = new THREE.Group();
  list: Poi[] = [];
  /** `"col,row"` plot keys occupied by a POI — pass to `new CityView(grid, rng, reserved)`. */
  reserved = new Set<string>();

  private icons: THREE.Sprite[] = [];
  private target = new Beacon3D();
  private hint = new Beacon3D();
  private t = 0;

  constructor() {
    this.group.add(this.target.group, this.hint.group);
    bus.on(GameEvent.StopZoneEnter, this.onHintEnter);
    bus.on(GameEvent.StopZoneExit, this.onHintExit);
  }

  private onHintEnter = (poi: Poi): void => {
    this.hint.set(poi.x, poi.z, poi.color);
  };
  private onHintExit = (): void => {
    this.hint.hide();
  };

  /** Drop bus subscriptions (world teardown — not currently invoked since mode
   * switches reload the page, but kept for correctness/future in-place resets). */
  destroy(): void {
    bus.off(GameEvent.StopZoneEnter, this.onHintEnter);
    bus.off(GameEvent.StopZoneExit, this.onHintExit);
  }

  /** Scatter `count` POIs across the grid's interior, spaced apart, each on its
   * own reserved plot. Call once, before building `CityView` with `this.reserved`. */
  place(grid: Grid, rng: Rng, count: number = PoiSpawn.count): void {
    const candidates: Array<{ col: number; row: number }> = [];
    for (let c = 1; c < grid.cols - 1; c++) {
      for (let r = 1; r < grid.rows - 1; r++) {
        if (grid.plotRect(c, r)) candidates.push({ col: c, row: r });
      }
    }
    rng.shuffle(candidates);

    const chosen: Array<{ col: number; row: number }> = [];
    for (const cell of candidates) {
      if (chosen.length >= count) break;
      const tooClose = chosen.some(
        (o) => Math.abs(o.col - cell.col) + Math.abs(o.row - cell.row) < PoiSpawn.minGapCells,
      );
      if (tooClose) continue;
      chosen.push(cell);
    }

    const bodies: Xform[] = [];
    const awnings: Xform[] = [];
    const rings: Xform[] = [];

    let id = 1;
    for (const cell of chosen) {
      const plot = grid.plotRect(cell.col, cell.row);
      if (!plot) continue;
      const def: PoiDef = rng.pick(POI_DEFS);

      // Snap to a road-facing edge of the plot (not the block's geometric centre —
      // `Vehicle3D`/`Grid.resolveRoads` confines cars to road corridors, and the
      // centre sits a full `block/2` from the nearest road, always outside
      // `Nav.reachM`). `EDGE_INSET` keeps the marker just inside the plot, close
      // enough that a car legally on the adjacent road is within pickup range.
      const edge = rng.pick(['n', 's', 'e', 'w'] as const);
      let mx = plot.cx;
      let mz = plot.cz;
      if (edge === 'n') mz = plot.z0 + PoiSpawn.edgeInset;
      else if (edge === 's') mz = plot.z1 - PoiSpawn.edgeInset;
      else if (edge === 'w') mx = plot.x0 + PoiSpawn.edgeInset;
      else mx = plot.x1 - PoiSpawn.edgeInset;
      mx = clamp(mx, plot.x0 + 1, plot.x1 - 1);
      mz = clamp(mz, plot.z0 + 1, plot.z1 - 1);

      const poi: Poi = {
        id: id++,
        type: def.type,
        name: def.name,
        emoji: def.emoji,
        color: def.color,
        isSource: def.isSource,
        col: cell.col,
        row: cell.row,
        x: mx,
        z: mz,
      };
      this.list.push(poi);
      this.reserved.add(`${cell.col},${cell.row}`);

      const bw = Math.max(5, Math.min(plot.w, plot.d, 9));
      const bh = 6.5;
      bodies.push({ x: mx, y: 0.5 + bh / 2, z: mz, sx: bw, sy: bh, sz: bw, color: def.color });
      awnings.push({
        x: mx, y: 0.5 + bh + 0.3, z: mz,
        sx: bw + 1.6, sy: 0.5, sz: bw + 1.6, color: darken(def.color, 0.55),
      });
      rings.push({ x: mx, y: 0.1, z: mz, color: def.color });

      const icon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: iconTexture(def.emoji), transparent: true, depthWrite: false, opacity: 0.92,
      }));
      icon.scale.set(6.4, 6.4, 1);
      icon.position.set(mx, 9.2, mz);
      this.icons.push(icon);
      this.group.add(icon);
    }

    const box = new THREE.BoxGeometry(1, 1, 1);
    const ringGeo = new THREE.RingGeometry(3.6, 5.2, 28);
    ringGeo.rotateX(-Math.PI / 2); // lie flat; ry is irrelevant for a circular ring
    this.group.add(
      instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.85 }), bodies, { cast: true, receive: true }),
      instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.9 }), awnings, { cast: true }),
      instanced(
        ringGeo,
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
        rings,
      ),
    );
  }

  /** Nearest POI to (x,z), optionally filtered (e.g. `p => p.isSource`). */
  nearest(x: number, z: number, filter?: (p: Poi) => boolean): Poi | null {
    let best: Poi | null = null;
    let bestD = Infinity;
    for (const p of this.list) {
      if (filter && !filter(p)) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  /** The POI within arrival range (`Nav.reachM`) of (x,z), if any. */
  reachAt(x: number, z: number): Poi | null {
    for (const p of this.list) {
      if (Math.hypot(p.x - x, p.z - z) <= Nav.reachM) return p;
    }
    return null;
  }

  /** Show/hide the bright active-target beacon (reused `Beacon3D` styling) at a POI. */
  highlightTarget(poi: Poi | null, color: number): void {
    if (poi) this.target.set(poi.x, poi.z, color);
    else this.target.hide();
  }

  update(dt: number): void {
    this.t += dt;
    this.target.update(dt);
    this.hint.update(dt);
    // Gentle bob so the "always visible, dim" icons still read as alive.
    for (let i = 0; i < this.icons.length; i++) {
      this.icons[i].position.y = 9.2 + Math.sin(this.t * 1.3 + i) * 0.4;
    }
  }
}
