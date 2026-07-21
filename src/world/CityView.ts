import * as THREE from 'three';
import { Rng } from '@/utils/Rng';
import { Grid } from '@/world/Grid';

/** One instanced transform (+ optional per-instance color). Exported so other
 * instanced-mesh builders (e.g. `world/Pois.ts` POI landmarks) can share it. */
export interface Xform {
  x: number; y: number; z: number;
  ry?: number; sx?: number; sy?: number; sz?: number; color?: number;
}

// Transform listesinden tek InstancedMesh oluşturur
export function instanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  xs: Xform[],
  opts: { cast?: boolean; receive?: boolean } = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, xs.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const col = new THREE.Color();
  let anyColor = false;
  xs.forEach((x, i) => {
    p.set(x.x, x.y, x.z);
    q.setFromEuler(e.set(0, x.ry ?? 0, 0));
    s.set(x.sx ?? 1, x.sy ?? 1, x.sz ?? 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    if (x.color !== undefined) { mesh.setColorAt(i, col.setHex(x.color)); anyColor = true; }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (anyColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = !!opts.cast;
  mesh.receiveShadow = !!opts.receive;
  return mesh;
}

// Rengi siyaha doğru faktörle koyulaştırır
export function darken(hex: number, f: number): number {
  const r = Math.round(((hex >> 16) & 0xff) * f);
  const g = Math.round(((hex >> 8) & 0xff) * f);
  const b = Math.round((hex & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

/**
 * Static 3D city, built once as a handful of instanced meshes (perf: ~1 draw
 * each). The dark ground plane IS the asphalt; sidewalk plots are drawn on top of
 * it, sized to fit between each road's half-width — so wide avenues automatically
 * appear as broad gaps. Warm low-poly buildings with rooftops, sidewalk trees,
 * dashed lane lines, zebra crossings, and streetlights sell the street.
 */
export class CityView {
  readonly group = new THREE.Group();

  // Şehir tasviri oluşturur, yer ve bina sistemini hazırlar
  constructor(grid: Grid, rng: Rng, reserved?: ReadonlySet<string>) {
    this.buildGround(grid);
    this.buildBlocks(grid, rng, reserved);
    this.buildRoadMarkings(grid);
    this.buildStreetlights(grid);
  }

  // Zemin (asfalt) 3D mesh'ini oluşturur
  private buildGround(grid: Grid): void {
    const block = grid.block;
    const pad = block * 3;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(grid.worldW + pad, grid.worldD + pad),
      new THREE.MeshStandardMaterial({ color: 0x2e343d, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(grid.centerX - block / 2, 0, grid.centerZ - block / 2);
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  // Şehir bloklarını (binalar, çatılar, ağaçlar) oluşturur
  private buildBlocks(grid: Grid, rng: Rng, reserved?: ReadonlySet<string>): void {
    const plots: Xform[] = [];
    const buildings: Xform[] = [];
    const roofs: Xform[] = [];
    const trunks: Xform[] = [];
    const leaves: Xform[] = [];
    const streetDetails: Xform[] = [];

    const palette = [0xd9c3a0, 0xcbb389, 0xe6cfa4, 0xbfa47a, 0xb6bcc6, 0x9aa1ab, 0xc98f6a, 0xcfd4da, 0xbd8a6b];
    const leafCols = [0x3f8f4f, 0x4fa15a, 0x357a44, 0x5aa863];

    for (let c = 0; c < grid.cols; c++) {
      for (let r = 0; r < grid.rows; r++) {
        const plot = grid.plotRect(c, r);
        if (!plot) continue; // an avenue ate this plot
        const { cx: px, cz: pz, w: pw, d: pd } = plot;

        plots.push({ x: px, y: 0.25, z: pz, sx: pw, sy: 0.5, sz: pd });

        // A POI landmark owns this plot instead of a random building (SERBEST).
        if (reserved?.has(`${c},${r}`)) continue;

        const park = rng.chance(0.14);
        if (!park) {
          const bw = Math.max(6, pw - 6 - rng.range(0, Math.min(10, pw * 0.25)));
          const bd = Math.max(6, pd - 6 - rng.range(0, Math.min(10, pd * 0.25)));
          const bh = rng.range(grid.buildMinH, grid.buildMaxH);
          const bx = px + rng.range(-2.5, 2.5);
          const bz = pz + rng.range(-2.5, 2.5);
          const color = rng.pick(palette);
          buildings.push({ x: bx, y: 0.5 + bh / 2, z: bz, sx: bw, sy: bh, sz: bd, color });
          const rh = rng.range(1.8, 4.5);
          roofs.push({
            x: bx + rng.range(-2, 2), y: 0.5 + bh + rh / 2, z: bz + rng.range(-2, 2),
            sx: bw * rng.range(0.35, 0.6), sy: rh, sz: bd * rng.range(0.35, 0.6),
            color: darken(color, 0.72),
          });

          // Street-level colour and lit windows keep otherwise efficient box
          // buildings from reading as an empty model city. They remain instanced:
          // the whole layer is three draw calls regardless of block count.
          if (rng.chance(0.48)) {
            const frontZ = bz - bd / 2 - 0.08;
            const accent = rng.pick([0xf97355, 0x31c48d, 0x4f9cf9, 0xf2b84b, 0xb574e8]);
            streetDetails.push({
              x: bx + rng.range(-bw * 0.18, bw * 0.18), y: 1.7, z: frontZ,
              sx: Math.min(bw * 0.48, 10), sy: 2.3, sz: 0.22, color: accent,
            });
          }
          const floorCount = Math.min(4, Math.max(1, Math.floor((bh - 4) / 5)));
          for (let floor = 0; floor < floorCount; floor++) {
            const wy = 5 + floor * 5;
            if (wy > bh - 1.5) break;
            streetDetails.push({ x: bx - bw * 0.22, y: wy, z: bz - bd / 2 - 0.1, sx: 2.1, sy: 1.2, sz: 0.16, color: 0xffe4a3 });
            streetDetails.push({ x: bx + bw * 0.22, y: wy, z: bz - bd / 2 - 0.1, sx: 2.1, sy: 1.2, sz: 0.16, color: 0xffe4a3 });
          }
        } else {
          // Tiny park furniture gives the green gaps a purpose and a human scale.
          streetDetails.push({ x: px, y: 0.9, z: pz - pd * 0.18, sx: 3.8, sy: 0.45, sz: 0.9, color: 0x725038 });
          streetDetails.push({ x: px, y: 1.45, z: pz - pd * 0.56 / 2, sx: 3.8, sy: 1.3, sz: 0.3, color: 0x725038 });
        }

        const treeCount = park ? 2 : rng.chance(0.28) ? 1 : 0;
        for (let t = 0; t < treeCount; t++) {
          const sx = rng.chance(0.5) ? 1 : -1;
          const sz = rng.chance(0.5) ? 1 : -1;
          const tx = px + sx * pw * rng.range(0.28, 0.42);
          const tz = pz + sz * pd * rng.range(0.28, 0.42);
          trunks.push({ x: tx, y: 0.5 + 1.4, z: tz });
          const fs = rng.range(0.85, 1.25);
          leaves.push({ x: tx, y: 0.5 + 3.2, z: tz, sx: fs, sy: fs, sz: fs, color: rng.pick(leafCols) });
        }
      }
    }

    const box = new THREE.BoxGeometry(1, 1, 1);
    this.group.add(
      instanced(box, new THREE.MeshStandardMaterial({ color: 0x8b93a1, roughness: 1 }), plots, { receive: true }),
      instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.92 }), buildings, { cast: true, receive: true }),
      instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.95 }), roofs, { cast: true }),
      instanced(
        new THREE.CylinderGeometry(0.34, 0.46, 2.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 }),
        trunks,
      ),
      instanced(
        new THREE.IcosahedronGeometry(2.2, 0),
        new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
        leaves,
        { cast: true },
      ),
      instanced(
        box,
        new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.04 }),
        streetDetails,
        { cast: true },
      ),
    );
  }

  // Yol işaretlemelerini (merkezde çizgiler + zebra geçişleri) inşa eder
  private buildRoadMarkings(grid: Grid): void {
    const block = grid.block;
    // Skip markings near an intersection so crossings stay clean (uses that line's width).
    const nearCross = (v: number): boolean => {
      const line = Math.round(v / block);
      return Math.abs(v - line * block) < grid.halfAt(line) + 3;
    };

    const yellow: Xform[] = [];
    const white: Xform[] = [];
    const period = 9;

    // Vertical roads: dashes running along Z.
    for (let c = 0; c <= grid.cols; c++) {
      const x = c * block;
      const avenue = grid.isAvenue(c);
      const laneOff = grid.halfAt(c) * 0.5;
      for (let z = period / 2; z < grid.worldD; z += period) {
        if (nearCross(z)) continue;
        yellow.push({ x, y: 0.06, z });
        if (avenue) { white.push({ x: x - laneOff, y: 0.06, z }); white.push({ x: x + laneOff, y: 0.06, z }); }
      }
    }
    // Horizontal roads: dashes running along X.
    for (let r = 0; r <= grid.rows; r++) {
      const z = r * block;
      const avenue = grid.isAvenue(r);
      const laneOff = grid.halfAt(r) * 0.5;
      for (let x = period / 2; x < grid.worldW; x += period) {
        if (nearCross(x)) continue;
        yellow.push({ x, y: 0.06, z, ry: Math.PI / 2 });
        if (avenue) { white.push({ x, y: 0.06, z: z - laneOff, ry: Math.PI / 2 }); white.push({ x, y: 0.06, z: z + laneOff, ry: Math.PI / 2 }); }
      }
    }
    const dashGeo = new THREE.BoxGeometry(0.5, 0.02, 3.6);
    this.group.add(
      instanced(dashGeo, new THREE.MeshBasicMaterial({ color: 0xf4cf57 }), yellow),
      instanced(dashGeo, new THREE.MeshBasicMaterial({ color: 0xdfe6f0 }), white),
    );

    // Zebra crossings on the four approaches of each interior street intersection
    // (skip avenue intersections — they're too wide for a tidy crossing).
    const stripes: Xform[] = [];
    const n = 5;
    const gap = 2.3;
    for (let c = 1; c < grid.cols; c++) {
      for (let r = 1; r < grid.rows; r++) {
        if (grid.isAvenue(c) || grid.isAvenue(r)) continue;
        const cx = c * block;
        const cz = r * block;
        const off = grid.roadHalf + 1.6;
        for (const side of [1, -1]) {
          for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) / 2) * gap;
            stripes.push({ x: cx + spread, y: 0.07, z: cz + side * off });
            stripes.push({ x: cx + side * off, y: 0.07, z: cz + spread, ry: Math.PI / 2 });
          }
        }
      }
    }
    this.group.add(instanced(
      new THREE.BoxGeometry(1.0, 0.02, 2.8),
      new THREE.MeshBasicMaterial({ color: 0xd7deea }),
      stripes,
    ));
  }

  // Sokak lambalarını kavşak köşelerine yerleştirir
  private buildStreetlights(grid: Grid): void {
    const block = grid.block;
    const poles: Xform[] = [];
    const lamps: Xform[] = [];
    for (let c = 1; c < grid.cols; c++) {
      for (let r = 1; r < grid.rows; r++) {
        if ((c + r) % 2 !== 0) continue;
        const cx = c * block + grid.halfAt(c) + 1.4;
        const cz = r * block + grid.halfAt(r) + 1.4;
        poles.push({ x: cx, y: 0.5 + 3, z: cz });
        lamps.push({ x: cx - 1.2, y: 0.5 + 5.9, z: cz - 1.2 });
      }
    }
    this.group.add(
      instanced(
        new THREE.BoxGeometry(0.24, 6, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x424b5c, roughness: 0.6, metalness: 0.3 }),
        poles,
        { cast: true },
      ),
      instanced(
        new THREE.BoxGeometry(1.7, 0.4, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffdd88, emissiveIntensity: 0.9, roughness: 0.5 }),
        lamps,
      ),
    );
  }
}
