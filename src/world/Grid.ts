import { CityConfig, RUSH_CITY } from '@/core/Balance';

/**
 * City layout in meters. The ground is the XZ plane, Y up. Roads run along the
 * grid lines (x = c*block, z = r*block); building plots sit in the cells between
 * them. Some grid lines are **wide avenues** (arterials) — `halfAt()` reports each
 * line's half-width so collision, plots, and markings all respect it.
 */
export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly block: number;
  readonly roadWidth: number;
  readonly avenueWidth: number;
  readonly avenueEvery: number;
  readonly buildMinH: number;
  readonly buildMaxH: number;
  readonly worldW: number;
  readonly worldD: number;
  /** Half the *base* street width — the default corridor half-extent. */
  readonly roadHalf: number;

  constructor(readonly cfg: CityConfig = RUSH_CITY) {
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.block = cfg.block;
    this.roadWidth = cfg.roadWidth;
    this.avenueWidth = cfg.avenueWidth;
    this.avenueEvery = cfg.avenueEvery;
    this.buildMinH = cfg.buildMinH;
    this.buildMaxH = cfg.buildMaxH;
    this.worldW = cfg.cols * cfg.block;
    this.worldD = cfg.rows * cfg.block;
    this.roadHalf = cfg.roadWidth / 2;
  }

  get centerX(): number { return (this.cols * this.block) / 2; }
  get centerZ(): number { return (this.rows * this.block) / 2; }

  /** True if the grid line at index `line` is a wide arterial avenue. */
  isAvenue(line: number): boolean {
    return this.avenueEvery > 0 && line % this.avenueEvery === 0;
  }

  /** Half-width of the road on the grid line at index `line`. */
  halfAt(line: number): number {
    return (this.isAvenue(line) ? this.avenueWidth : this.roadWidth) / 2;
  }

  /** World XZ of a road intersection. */
  nodePos(col: number, row: number): { x: number; z: number } {
    return { x: col * this.block, z: row * this.block };
  }

  /**
   * The sidewalk/building plot rectangle for block (col,row) — fits between the
   * inner edges of its four bounding roads (avenue-aware via `halfAt`). Shared by
   * `CityView` (random buildings) and `PoiSystem` (POI landmarks) so they always
   * agree on where a plot sits. Returns null if an avenue ate the whole plot.
   */
  plotRect(
    col: number,
    row: number,
  ): { x0: number; x1: number; z0: number; z1: number; cx: number; cz: number; w: number; d: number } | null {
    const block = this.block;
    const x0 = col * block + this.halfAt(col);
    const x1 = (col + 1) * block - this.halfAt(col + 1);
    const z0 = row * block + this.halfAt(row);
    const z1 = (row + 1) * block - this.halfAt(row + 1);
    const w = x1 - x0;
    const d = z1 - z0;
    if (w < 8 || d < 8) return null;
    return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, w, d };
  }

  /** Clamp a position to stay inside the outer ring road. */
  clampX(x: number, margin = this.block * 0.5): number {
    return Math.max(margin, Math.min(this.worldW - margin, x));
  }
  clampZ(z: number, margin = this.block * 0.5): number {
    return Math.max(margin, Math.min(this.worldD - margin, z));
  }

  /**
   * Building collision for the Manhattan grid. Roads run along the grid lines; the
   * cells between them are solid building blocks. A position is "on road" if it lies
   * within the relevant line's half-width of a vertical OR horizontal line. If it
   * strays into a block interior (both axes off-road), push it back out to the nearest
   * road edge — a smooth wall-slide along the building face rather than passing through.
   *
   * @param margin extra inset kept between the car centre and the building face.
   * @returns corrected {x,z} and whether a correction happened (to scrub speed).
   */
  resolveRoads(x: number, z: number, margin = 0): { x: number; z: number; hit: boolean } {
    const colLine = Math.round(x / this.block);
    const rowLine = Math.round(z / this.block);
    const halfX = this.halfAt(colLine) - margin;
    const halfZ = this.halfAt(rowLine) - margin;
    const dx = x - colLine * this.block;
    const dz = z - rowLine * this.block;
    const onV = Math.abs(dx) <= halfX;
    const onH = Math.abs(dz) <= halfZ;
    if (onV || onH) return { x, z, hit: false };
    // Inside a block: eject along whichever axis is the shorter push to a road edge.
    const penV = Math.abs(dx) - halfX;
    const penH = Math.abs(dz) - halfZ;
    if (penV <= penH) return { x: colLine * this.block + Math.sign(dx) * halfX, z, hit: true };
    return { x, z: rowLine * this.block + Math.sign(dz) * halfZ, hit: true };
  }
}
