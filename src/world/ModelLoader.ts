import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Loads and prepares the real low-poly vehicle GLBs (exported from Sketchfab,
 * optimised offline via `gltf-transform` → meshopt geometry + 1k WebP textures,
 * ~1.6 MB each). One shared loader with the meshopt decoder wired; results are
 * cached so a model's bytes are parsed once and cloned per vehicle.
 */
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const cache = new Map<string, Promise<THREE.Group>>();

/** Load a GLB once; resolves to its root scene (SHARED — clone before adding to the world). */
export function loadGLB(url: string): Promise<THREE.Group> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Group>((resolve, reject) => {
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
    cache.set(url, p);
  }
  return p;
}

export interface VehicleModelOpts {
  /** Desired car length in metres (mapped to the longest horizontal side). */
  targetLength: number;
  /** Extra spin about Y (radians) to put the model's nose on local +Z. */
  extraYaw?: number;
  /** Recolour the paint (material name matching /body/i) to fit the palette. */
  bodyColor?: number;
  /** Tame photoreal PBR so the car sits in the matte low-poly world. */
  metalnessCap?: number;      // default 0.35
  roughnessFloor?: number;    // default 0.55
  envMapIntensity?: number;   // default 0.45
  /** Soft round contact shadow blob under the car (grounds it cheaply). */
  contactShadow?: boolean;
  /** Remove meshes whose name matches (e.g. broken/degenerate geometry that
   *  otherwise inflates the bounding box and makes the car float). */
  dropMeshes?: RegExp;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _c = new THREE.Vector3();

/**
 * Turn a raw loaded GLB scene into a game-ready vehicle template: uniformly scaled
 * to `targetLength`, its longer horizontal axis aligned to Z (the nose axis),
 * wheels grounded at y=0, centred on X/Z. Materials are cloned and toned down so
 * the photoreal car reads as part of the matte low-poly city (less chrome, calmer
 * reflections, palette-tinted paint). Returns a fresh Group each call.
 */
export function prepareVehicle(src: THREE.Object3D, opts: VehicleModelOpts): THREE.Group {
  const metalCap = opts.metalnessCap ?? 0.35;
  const roughFloor = opts.roughnessFloor ?? 0.55;
  const envInt = opts.envMapIntensity ?? 0.45;

  const model = src.clone(true);
  const drop: THREE.Object3D[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (opts.dropMeshes && opts.dropMeshes.test(o.name)) { drop.push(o); return; }
    m.castShadow = true;
    m.receiveShadow = false;
    // Clone materials (source is shared/cached) and stylise toward the world.
    // Preserve single-vs-array shape — a single-material mesh handed an array
    // would render nothing (no geometry groups to map the array onto).
    const stylise = (mat: THREE.Material): THREE.Material => {
      const std = mat.clone() as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        std.metalness = Math.min(std.metalness, metalCap);
        std.roughness = Math.max(std.roughness, roughFloor);
        std.envMapIntensity = envInt;
        if (opts.bodyColor != null && /body/i.test(std.name)) std.color.setHex(opts.bodyColor);
      }
      return std;
    };
    m.material = Array.isArray(m.material) ? m.material.map(stylise) : stylise(m.material);
  });
  drop.forEach((o) => o.removeFromParent());

  _box.setFromObject(model);
  _box.getSize(_size);
  const horiz = Math.max(_size.x, _size.z) || 1;
  model.scale.setScalar(opts.targetLength / horiz);

  // Orient the longer horizontal axis along Z, then any manual nose flip.
  _box.setFromObject(model);
  _box.getSize(_size);
  if (_size.x > _size.z) model.rotation.y += Math.PI / 2;
  if (opts.extraYaw) model.rotation.y += opts.extraYaw;

  // Recentre on X/Z and rest the wheels on the ground.
  _box.setFromObject(model);
  _box.getCenter(_c);
  model.position.x -= _c.x;
  model.position.z -= _c.z;
  model.position.y -= _box.min.y;

  const holder = new THREE.Group();
  holder.add(model);

  if (opts.contactShadow) {
    _box.setFromObject(model);
    _box.getSize(_size);
    holder.add(makeContactShadow(_size.x * 1.15, _size.z * 1.05));
  }
  return holder;
}

export interface FrontWheelHandles {
  fl?: THREE.Object3D;
  fr?: THREE.Object3D;
}

const FRONT_WHEEL_RE = /wheel\w*_(fl|fr)\b/i;

/**
 * Adds one steering pivot at the actual centre of each front tyre. Some exported
 * GLBs keep wheel-node origins at the car origin, so rotating those nodes directly
 * makes the tyres orbit the body. Only two empty groups are added; wheels never
 * receive roll animation.
 */
export function makeFrontWheelSteerPivots(root: THREE.Object3D): FrontWheelHandles {
  const candidates: FrontWheelHandles = {};
  root.traverse((node) => {
    const match = FRONT_WHEEL_RE.exec(node.name);
    if (!match) return;
    const key = match[1].toLowerCase() as keyof FrontWheelHandles;
    if (!candidates[key]) candidates[key] = node;
  });

  const handles: FrontWheelHandles = {};
  root.updateMatrixWorld(true);
  for (const key of ['fl', 'fr'] as const) {
    const wheel = candidates[key];
    const parent = wheel?.parent;
    if (!wheel || !parent) continue;

    const bounds = new THREE.Box3().setFromObject(wheel);
    if (bounds.isEmpty()) continue;
    const worldCenter = bounds.getCenter(new THREE.Vector3());

    const pivot = new THREE.Group();
    pivot.name = `${wheel.name}_SteerPivot`;
    pivot.position.copy(parent.worldToLocal(worldCenter.clone()));
    parent.add(pivot);
    parent.updateMatrixWorld(true);
    pivot.attach(wheel);
    handles[key] = pivot;
  }
  return handles;
}

/** A cheap radial-gradient dark disc laid flat just above the road — a fake shadow. */
function makeContactShadow(w: number, d: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.renderOrder = 1;
  return mesh;
}
