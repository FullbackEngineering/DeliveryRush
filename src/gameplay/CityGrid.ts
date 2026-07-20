import Phaser from 'phaser';
import { City } from '@/core/Balance';
import { ThemeDef } from '@/types';
import { Rng } from '@/utils/Rng';
import { mix, Palette } from '@/core/Palette';
import { Direction } from '@/types';

export interface GridNode {
  col: number;
  row: number;
}

/**
 * Procedural Manhattan-grid city. Owns the coordinate math (grid <-> world,
 * right-hand lane offsets) and bakes the static scenery (ground, buildings,
 * roads, lane markings) into a single retained Graphics layer. Dynamic entities
 * (vehicles, markers) are drawn on top by other systems.
 */
export class CityGrid {
  readonly cols = City.cols;
  readonly rows = City.rows;
  readonly block = City.block;
  readonly worldW: number;
  readonly worldH: number;

  private buildings: Array<{ x: number; y: number; w: number; h: number; color: number; th: number }> = [];

  constructor(
    private scene: Phaser.Scene,
    private theme: ThemeDef,
    private rng: Rng,
  ) {
    this.worldW = this.cols * this.block;
    this.worldH = this.rows * this.block;
  }

  // --- Coordinate helpers --------------------------------------------------
  /** World position of an intersection node. */
  nodePos(col: number, row: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(col * this.block, row * this.block);
  }

  inside(col: number, row: number): boolean {
    return col >= 0 && col <= this.cols && row >= 0 && row <= this.rows;
  }

  /** Lane centerline coordinate for a grid line when travelling `dir`. */
  laneCoord(lineIndex: number, dir: Direction): number {
    const base = lineIndex * this.block;
    // right-hand driving offset (see Direction right-vector math)
    switch (dir) {
      case Direction.North:
        return base + City.laneOffset; // x
      case Direction.South:
        return base - City.laneOffset; // x
      case Direction.East:
        return base + City.laneOffset; // y
      case Direction.West:
        return base - City.laneOffset; // y
    }
  }

  clampInterior(node: GridNode, margin = 2): GridNode {
    return {
      col: Phaser.Math.Clamp(node.col, margin, this.cols - margin),
      row: Phaser.Math.Clamp(node.row, margin, this.rows - margin),
    };
  }

  /** A random interior intersection at grid distance [min,max] from (col,row). */
  nodeNear(col: number, row: number, min: number, max: number): GridNode {
    for (let tries = 0; tries < 24; tries++) {
      const dc = this.rng.int(-max, max);
      const dr = this.rng.int(-max, max);
      const d = Math.abs(dc) + Math.abs(dr);
      if (d < min || d > max) continue;
      const n = this.clampInterior({ col: col + dc, row: row + dr });
      if (Math.abs(n.col - col) + Math.abs(n.row - row) >= Math.min(min, 2)) return n;
    }
    return this.clampInterior({ col: col + max, row });
  }

  randomInterior(margin = 3): GridNode {
    return {
      col: this.rng.int(margin, this.cols - margin),
      row: this.rng.int(margin, this.rows - margin),
    };
  }

  worldBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      -this.block,
      -this.block,
      this.worldW + this.block * 2,
      this.worldH + this.block * 2,
    );
  }

  // --- Static rendering ----------------------------------------------------
  render(depth = 0): Phaser.GameObjects.Graphics {
    const t = this.theme;
    const g = this.scene.add.graphics();
    g.setDepth(depth);

    // Ground
    g.fillStyle(t.ground, 1);
    g.fillRect(-this.block, -this.block, this.worldW + this.block * 2, this.worldH + this.block * 2);

    // Building blocks (2 rects each = footprint shadow + body, fakes iso height)
    const rw = City.roadWidth;
    const inset = rw / 2 + 10;
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const x = c * this.block + inset;
        const y = r * this.block + inset;
        const w = this.block - inset * 2;
        const h = this.block - inset * 2;
        const color = this.rng.pick(t.buildingPalette);
        const height = this.rng.range(8, 22);
        this.buildings.push({ x, y, w, h, color, th: height });
        // shadow
        g.fillStyle(0x000000, 0.28);
        g.fillRoundedRect(x + 6, y + height, w, h, 6);
        // body side (darker)
        g.fillStyle(mix(color, Palette.black, 0.35), 1);
        g.fillRoundedRect(x, y, w, h, 6);
        // roof (lighter, raised)
        g.fillStyle(color, 1);
        g.fillRoundedRect(x, y - height, w, h, 6);
        // roof detail
        g.fillStyle(mix(color, Palette.white, 0.18), 0.5);
        g.fillRoundedRect(x + 8, y - height + 8, w - 16, 12, 4);
      }
    }

    // Roads (draw after buildings so asphalt sits above ground; buildings are inset)
    g.fillStyle(t.road, 1);
    for (let r = 0; r <= this.rows; r++) {
      g.fillRect(-this.block, r * this.block - rw / 2, this.worldW + this.block * 2, rw);
    }
    for (let c = 0; c <= this.cols; c++) {
      g.fillRect(c * this.block - rw / 2, -this.block, rw, this.worldH + this.block * 2);
    }

    // Lane dashes (center of each road line)
    const dash = 26;
    const gap = 26;
    g.fillStyle(t.roadLine, 0.7);
    for (let r = 0; r <= this.rows; r++) {
      const y = r * this.block - 2;
      for (let x = 0; x < this.worldW; x += dash + gap) g.fillRect(x, y, dash, 4);
    }
    for (let c = 0; c <= this.cols; c++) {
      const x = c * this.block - 2;
      for (let y = 0; y < this.worldH; y += dash + gap) g.fillRect(x, y, 4, dash);
    }

    // Crosswalks at intersections
    g.fillStyle(0xffffff, 0.12);
    for (let c = 0; c <= this.cols; c++) {
      for (let r = 0; r <= this.rows; r++) {
        g.fillRect(c * this.block - rw / 2, r * this.block - rw / 2, rw, rw);
      }
    }

    return g;
  }
}
