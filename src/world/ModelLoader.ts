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

// GLB'yi yükler, sahne kez önbelleğe alındı (paylaşılmış, klonla)
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
  /** Attach a procedural seated courier on top — scooters/bikes ship no rider
   *  mesh, so an empty saddle would look wrong. Placed from the model's bounds. */
  rider?: boolean;
  /** Jacket colour for the procedural rider (default: courier red). */
  riderColor?: number;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _c = new THREE.Vector3();
const COURIER_RIDER_SCALE = 1.35;

// GLB sahnesi oyun aracına dönüştürülür: ölçek, oryantasyon, malzeme
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

  // Seated courier on top (the model's front is now +Z after `extraYaw`, so the
  // rider faces +Z and reaches forward to the handlebar). Seat point is derived
  // from the prepared model's bounds so it scales with `targetLength`.
  if (opts.rider) {
    _box.setFromObject(model);
    _box.getSize(_size);
    const seatY = _size.y * 0.36;
    const seatZ = -_size.z * 0.03;
    const rider = makeCourierRider(opts.riderColor ?? 0xef4444, seatY, seatZ);
    rider.name = 'CourierRider';
    rider.scale.setScalar(COURIER_RIDER_SCALE);
    // Scale around the hips instead of the holder origin so the courier stays
    // planted on the saddle while the whole body grows to a believable size.
    rider.position.set(0, seatY * (1 - COURIER_RIDER_SCALE), seatZ * (1 - COURIER_RIDER_SCALE));
    holder.add(rider);
  }
  return holder;
}

// Oturmuş kuryeyi kutulardan oluşturur, araç üzerine yerleştirir
function makeCourierRider(jacketColor: number, seatY: number, seatZ: number): THREE.Group {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.7, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171b24, roughness: 0.6, metalness: 0.1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a070, roughness: 0.85, metalness: 0 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2c3140, roughness: 0.8, metalness: 0.05 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x223047, roughness: 0.25, metalness: 0.4 });

  const add = (w: number, h: number, d: number, mat: THREE.Material,
    x: number, y: number, z: number, rx = 0): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
  };

  const y = seatY, z = seatZ;
  add(0.42, 0.26, 0.44, pants, 0, y, z);                       // hips
  add(0.16, 0.15, 0.42, pants, -0.12, y - 0.02, z + 0.28, 0.08); // L thigh (forward)
  add(0.16, 0.15, 0.42, pants, 0.12, y - 0.02, z + 0.28, 0.08);  // R thigh
  add(0.13, 0.40, 0.13, dark, -0.14, y - 0.28, z + 0.46, -0.30); // L shin → footboard
  add(0.13, 0.40, 0.13, dark, 0.14, y - 0.28, z + 0.46, -0.30);  // R shin
  add(0.44, 0.52, 0.30, jacket, 0, y + 0.32, z + 0.04, 0.20);    // torso (leaning fwd)
  add(0.13, 0.13, 0.46, jacket, -0.24, y + 0.34, z + 0.26, 0.18); // L arm → bars
  add(0.13, 0.13, 0.46, jacket, 0.24, y + 0.34, z + 0.26, 0.18);  // R arm
  add(0.12, 0.12, 0.12, dark, -0.24, y + 0.30, z + 0.50);        // L glove
  add(0.12, 0.12, 0.12, dark, 0.24, y + 0.30, z + 0.50);         // R glove
  add(0.19, 0.20, 0.20, skin, 0, y + 0.64, z + 0.14);           // head
  add(0.26, 0.24, 0.26, dark, 0, y + 0.70, z + 0.12);           // helmet
  add(0.22, 0.08, 0.06, visor, 0, y + 0.68, z + 0.25);          // visor
  return g;
}

export interface FrontWheelHandles {
  fl?: THREE.Object3D;
  fr?: THREE.Object3D;
}

const FRONT_WHEEL_RE = /wheel\w*_(fl|fr)\b/i;

// Ön tekerlek dönüş pivotlarını lastik merkezine yerleştirir
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

// Ucuz radyal degradeli gölge diski, araç altına yerleştirilir
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
