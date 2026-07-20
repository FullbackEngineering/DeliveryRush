import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Grid } from '@/world/Grid';
import { Rng } from '@/utils/Rng';
import { Decor } from '@/core/Balance';
import { loadGLB } from '@/world/ModelLoader';
import kitLpUrl from '@/assets/models/building_kit_lp.glb?url';
import nyUrl from '@/assets/models/ny_buildings.glb?url';
import schoolUrl from '@/assets/models/school.glb?url';
import { instanced, Xform } from '@/world/CityView';

/** Local visual density; kept out of shared Balance while Claude edits that file. */
const LP_KIT_BUILDING_COUNT = 5;

/**
 * Real-GLB city dressing for SERBEST, layered on top of the procedural
 * `CityView`: a **distant NY skyline** ringing the play area (unreachable, fades
 * into the fog → big-city feel), plus **school landmarks** and **colourful
 * low-poly "kit" buildings** placed on reserved interior plots. All models are
 * loaded async (a frame or two after boot) so they never block the first frame,
 * matte-stylised to sit in the low-poly world, and grounded on the road plane.
 *
 * Flow: construct → `planPlots(poiReserved)` to claim its interior plots and get
 * the combined reserved set for `CityView` (so no procedural box overlaps a
 * landmark) → build `CityView` → `void build()` to stream the GLBs in.
 */
export class CityDecor {
  readonly group = new THREE.Group();

  private landmarkPlots: Array<{ col: number; row: number }> = [];
  private kitPlots: Array<{ col: number; row: number }> = [];

  constructor(private grid: Grid, private rng: Rng) {
    this.buildTransitStops();
  }

  /** Lightweight bus stops and route signs along SERBEST's wide avenues. */
  private buildTransitStops(): void {
    const furniture: Xform[] = [];
    for (let c = this.grid.avenueEvery; c < this.grid.cols; c += this.grid.avenueEvery) {
      for (let r = 2; r < this.grid.rows; r += 4) {
        const side = (r / 2) % 2 === 0 ? 1 : -1;
        const x = c * this.grid.block + side * (this.grid.halfAt(c) + 2.2);
        const z = r * this.grid.block + this.grid.block * 0.32;
        furniture.push({ x, y: 1.65, z, sx: 0.32, sy: 3.0, sz: 5.4, color: 0x5f7186 });
        furniture.push({ x, y: 3.3, z, sx: 2.2, sy: 0.25, sz: 5.7, color: 0x263448 });
        furniture.push({ x: x - side * 1.8, y: 1.8, z: z + 3.5, sx: 0.18, sy: 3.6, sz: 0.18, color: 0x3d4b5e });
        furniture.push({ x: x - side * 1.8, y: 3.25, z: z + 3.5, sx: 1.1, sy: 0.9, sz: 0.18, color: 0x35d58b });
      }
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.group.add(
      instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.68, metalness: 0.12 }), furniture),
    );
  }

  /**
   * Claim `Decor.landmarkCount` + `Decor.kitCount` interior plots not already
   * taken by POIs, and return `taken ∪ claimed` for `CityView`'s `reserved` param
   * so those plots render as bare sidewalk (the GLB landmark sits there instead).
   */
  planPlots(taken: ReadonlySet<string>): Set<string> {
    const free: Array<{ col: number; row: number }> = [];
    for (let c = 1; c < this.grid.cols - 1; c++) {
      for (let r = 1; r < this.grid.rows - 1; r++) {
        if (this.grid.plotRect(c, r) && !taken.has(`${c},${r}`)) free.push({ col: c, row: r });
      }
    }
    this.rng.shuffle(free);

    const combined = new Set<string>(taken);
    const take = (n: number, into: Array<{ col: number; row: number }>): void => {
      while (into.length < n && free.length) {
        const cell = free.pop()!;
        const key = `${cell.col},${cell.row}`;
        if (combined.has(key)) continue;
        into.push(cell);
        combined.add(key);
      }
    };
    take(Decor.landmarkCount, this.landmarkPlots);
    take(LP_KIT_BUILDING_COUNT, this.kitPlots);
    return combined;
  }

  /** World XZ centres of the placed landmark + kit plots (playtest/debug helper). */
  plotCenters(): { kit: Array<{ x: number; z: number }>; school: Array<{ x: number; z: number }> } {
    const toC = (p: { col: number; row: number }) => {
      const r = this.grid.plotRect(p.col, p.row)!;
      return { x: r.cx, z: r.cz };
    };
    return { kit: this.kitPlots.map(toC), school: this.landmarkPlots.map(toC) };
  }

  /** Stream in all three GLB asset layers (skyline + landmarks + kit). */
  async build(): Promise<void> {
    await Promise.all([this.buildSkyline(), this.buildLandmarks(), this.buildKit()]);
  }

  // --- NY skyline ring -------------------------------------------------------
  // The skyline is a distant, unreachable backdrop, so instead of dozens of live
  // clones (hundreds of draw calls) we bake every cluster's geometry into world
  // space and merge it into ONE mesh with a single flat silhouette material — a
  // dark downtown ring for ~1 draw call, which reads great through the fog.
  private async buildSkyline(): Promise<void> {
    let src: THREE.Group;
    try { src = await loadGLB(nyUrl); } catch { return; }
    const tpl = prepare(src, { targetY: Decor.skylineHeight, cast: false });
    tpl.updateMatrixWorld(true);
    const g = this.grid;
    const off = g.block * Decor.skylineOffsetBlocks;
    const n = Decor.skylinePerEdge;

    const placements: Array<{ x: number; z: number; ry: number }> = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      // Long axis of the cluster runs ALONG each edge (ry aligns local Z to the edge).
      placements.push({ x: t * g.worldW, z: -off, ry: Math.PI / 2 });           // south
      placements.push({ x: t * g.worldW, z: g.worldD + off, ry: Math.PI / 2 }); // north
      placements.push({ x: -off, z: t * g.worldD, ry: 0 });                     // west
      placements.push({ x: g.worldW + off, z: t * g.worldD, ry: 0 });           // east
    }

    const parts: THREE.BufferGeometry[] = [];
    const placeM = new THREE.Matrix4();
    const full = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const tv = new THREE.Vector3();
    const pv = new THREE.Vector3();
    for (const pl of placements) {
      placeM.compose(pv.set(pl.x, 0, pl.z), q.setFromEuler(e.set(0, pl.ry + this.rng.range(-0.15, 0.15), 0)), one);
      tpl.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const src = m.geometry.getAttribute('position');
        if (!src) return;
        // Transform each vertex to world space via getX/Y/Z (Vector3.fromBufferAttribute
        // DEQUANTISES meshopt-normalised int16 positions) into a fresh float buffer —
        // applying a matrix straight onto the raw normalised int array clamps it to
        // ±1 and collapses the whole cluster to the origin.
        full.multiplyMatrices(placeM, m.matrixWorld);
        const out = new Float32Array(src.count * 3);
        for (let i = 0; i < src.count; i++) {
          tv.fromBufferAttribute(src, i).applyMatrix4(full);
          out[i * 3] = tv.x; out[i * 3 + 1] = tv.y; out[i * 3 + 2] = tv.z;
        }
        let g: THREE.BufferGeometry = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
        if (m.geometry.index) { g.setIndex(m.geometry.index.clone()); g = g.toNonIndexed(); }
        g.computeVertexNormals();
        parts.push(g);
      });
    }
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) return;

    const mesh = new THREE.Mesh(
      merged,
      // `fog: false` so the ring stays a crisp backdrop on the horizon from anywhere
      // in the city instead of dissolving into the distance fog like the near blocks.
      new THREE.MeshStandardMaterial({ color: 0x59668a, roughness: 0.92, metalness: 0.0, fog: false }),
    );
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.group.add(mesh);
  }

  // --- School landmarks ------------------------------------------------------
  private async buildLandmarks(): Promise<void> {
    let src: THREE.Group;
    try { src = await loadGLB(schoolUrl); } catch { return; }
    for (const { col, row } of this.landmarkPlots) {
      const plot = this.grid.plotRect(col, row);
      if (!plot) continue;
      const foot = Math.min(plot.w, plot.d) * 0.94;
      const m = prepare(src, { targetXZ: foot, cast: true });
      m.position.set(plot.cx, 0, plot.cz);
      m.rotation.y = this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      this.group.add(m);
    }
  }

  // --- Colourful low-poly kit buildings (disabled — see Decor.kitCount) -------
  private async buildKit(): Promise<void> {
    if (!this.kitPlots.length) return;
    let src: THREE.Group;
    try { src = await loadGLB(kitLpUrl); } catch { return; }
    const parts = prepareInstancedBuilding(src);
    for (const { geometry, material } of parts) {
      const mesh = new THREE.InstancedMesh(geometry, material, this.kitPlots.length);
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const euler = new THREE.Euler();
      const scale = new THREE.Vector3();
      this.kitPlots.forEach(({ col, row }, index) => {
        const plot = this.grid.plotRect(col, row);
        if (!plot) return;
        const footprint = Math.min(plot.w, plot.d) * this.rng.range(0.78, 0.92);
        const yaw = this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
        matrix.compose(
          position.set(plot.cx, 0, plot.cz),
          rotation.setFromEuler(euler.set(0, yaw, 0)),
          scale.setScalar(footprint),
        );
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }
}

interface BuildingPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/**
 * Bake the optimized GLB hierarchy and normalize its footprint to one metre.
 * One InstancedMesh is created per source material group, so five buildings cost
 * the same draw count as one rather than cloning seven mesh objects per plot.
 */
function prepareInstancedBuilding(model: THREE.Group): BuildingPart[] {
  model.updateMatrixWorld(true);
  const parts: BuildingPart[] = [];
  const bounds = new THREE.Box3();
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const geometry = floatGeometry(mesh.geometry, mesh.matrixWorld);
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox!);
    const styled = material.clone() as THREE.MeshStandardMaterial;
    if (styled.isMeshStandardMaterial) {
      styled.roughness = Math.max(styled.roughness, 0.72);
      styled.metalness = Math.min(styled.metalness, 0.08);
      styled.envMapIntensity = 0.3;
    }
    parts.push({ geometry, material: styled });
  });
  if (!parts.length || bounds.isEmpty()) return [];

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size); bounds.getCenter(center);
  const normalize = 1 / Math.max(size.x, size.z, 0.001);
  const transform = new THREE.Matrix4()
    .makeTranslation(-center.x, -bounds.min.y, -center.z)
    .premultiply(new THREE.Matrix4().makeScale(normalize, normalize, normalize));
  for (const part of parts) {
    part.geometry.applyMatrix4(transform);
    part.geometry.computeBoundingSphere();
  }
  return parts;
}

/** Rebuild quantized meshopt attributes as floats before applying world matrices. */
function floatGeometry(source: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
  const positions = new Float32Array(position.count * 3);
  const normals = normal ? new Float32Array(normal.count * 3) : null;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(matrix);
    positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    if (normal && normals) {
      n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
      normals[i * 3] = n.x; normals[i * 3 + 1] = n.y; normals[i * 3 + 2] = n.z;
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const uv = source.getAttribute('uv');
  if (uv) geometry.setAttribute('uv', uv.clone());
  if (source.index) geometry.setIndex(source.index.clone());
  return geometry;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _c = new THREE.Vector3();

interface PrepOpts {
  /** Scale so the model's height becomes this many metres. */
  targetY?: number;
  /** Scale so the model's larger horizontal side becomes this many metres. */
  targetXZ?: number;
  cast?: boolean;
  /** Drop meshes whose name matches (e.g. a demo ground plane). */
  strip?: RegExp;
}

/**
 * Clone a loaded GLB into a game-ready static prop: optional mesh stripping,
 * matte-stylised materials (tamed metalness/reflections so photoreal buildings
 * sit in the low-poly world), uniformly scaled to a target size, centred on X/Z
 * and grounded at y=0. Returns a fresh holder Group each call (geometry/material
 * are shared via clone(true), so re-placing is cheap).
 */
function prepare(src: THREE.Object3D, opts: PrepOpts): THREE.Group {
  const model = src.clone(true);
  const drop: THREE.Object3D[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (opts.strip && opts.strip.test(o.name)) { drop.push(o); return; }
    m.castShadow = !!opts.cast;
    m.receiveShadow = false;
    const style = (mat: THREE.Material): THREE.Material => {
      const s = mat.clone() as THREE.MeshStandardMaterial;
      if (s.isMeshStandardMaterial) {
        s.metalness = Math.min(s.metalness, 0.2);
        s.roughness = Math.max(s.roughness, 0.7);
        s.envMapIntensity = 0.4;
      }
      return s;
    };
    m.material = Array.isArray(m.material) ? m.material.map(style) : style(m.material);
  });
  drop.forEach((o) => o.removeFromParent());

  _box.setFromObject(model);
  _box.getSize(_size);
  let scale = 1;
  if (opts.targetY) scale = opts.targetY / (_size.y || 1);
  else if (opts.targetXZ) scale = opts.targetXZ / (Math.max(_size.x, _size.z) || 1);
  model.scale.setScalar(scale);

  _box.setFromObject(model);
  _box.getCenter(_c);
  model.position.x -= _c.x;
  model.position.z -= _c.z;
  model.position.y -= _box.min.y;

  const holder = new THREE.Group();
  holder.add(model);
  return holder;
}
