import * as THREE from 'three';
import { loadGLB, prepareVehicle } from '@/world/ModelLoader';
import { modelFor } from '@/data/vehicleModels';
import { VehicleDef } from '@/types';
import { Garage } from '@/core/Balance';

/**
 * The Garage screen's showroom centrepiece: the selected car slowly rotating on
 * a platform, reusing the shared `game`/`scene` (lights + PMREM environment
 * already set up in `boot.ts`). `setCar` (re)builds the model tinted in the
 * vehicle's `bodyColor`, disposing the previous one so switching cars never
 * leaks geometry/materials/textures. `update` spins the holder each frame.
 */
export class CarPreview {
  readonly group = new THREE.Group();
  private holder = new THREE.Group();
  private car: THREE.Group | null = null;
  /** Bumped on every `setCar` call so a late-resolving load from a superseded
   *  call can detect it's stale and no-op instead of racing the current one. */
  private reqId = 0;

  // Sahne katmanını ve döner tutucuyu kurar, platforma ekler
  constructor(scene: THREE.Scene) {
    this.group.add(makePlatform());
    this.group.add(this.holder);
    scene.add(this.group);
  }

  // Aracı yükler, boyuyor ve sahneye ekler; öncekini temizler
  async setCar(def: VehicleDef): Promise<void> {
    const myReq = ++this.reqId;
    const spec = modelFor(def.id);
    const src = await loadGLB(spec.url).catch(() => null);
    if (myReq !== this.reqId) return; // a newer setCar() already won the race
    this.disposeCar();
    if (!src) return; // offline/harness fallback — leave an empty platform
    const carGroup = prepareVehicle(src, {
      targetLength: spec.targetLength,
      extraYaw: spec.extraYaw,
      bodyColor: spec.tintBody ? def.bodyColor : undefined,
      contactShadow: true,
      dropMeshes: spec.dropMeshes,
      rider: spec.rider,
      riderColor: def.accentColor,
    });
    this.car = carGroup;
    this.holder.add(carGroup);
  }

  // Aracı Y etrafında döndürür (her kareyi açı hızıyla)
  update(dt: number): void {
    this.holder.rotation.y += dt * Garage.spinSpeed;
  }

  // Aracı ve grup kaynaklarını temizler
  dispose(): void {
    this.disposeCar();
    this.group.parent?.remove(this.group);
  }

  // Saklanan aracın geometrisini ve materyallerini serbest bırakır
  private disposeCar(): void {
    if (!this.car) return;
    const dead = this.car;
    this.holder.remove(dead);
    dead.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else if (mat) disposeMaterial(mat);
    });
    this.car = null;
  }
}

// Materyali ve sahip olduğu dokuları serbest bırakır
function disposeMaterial(mat: THREE.Material): void {
  const m = mat as unknown as Record<string, unknown>;
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
    (m[key] as THREE.Texture | undefined)?.dispose?.();
  }
  mat.dispose();
}

// Gösteri platformu: düşük disk ve yumuşak parlayan halka
function makePlatform(): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(Garage.platformRadius, Garage.platformRadius, Garage.platformHeight, 48),
    new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.85, metalness: 0.1 }),
  );
  disc.position.y = Garage.platformHeight / 2;
  disc.receiveShadow = true;
  g.add(disc);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Garage.platformRadius * 0.97, 0.045, 8, 64),
    new THREE.MeshStandardMaterial({
      color: 0x5aa9ff, emissive: 0x1b4a8a, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.2,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = Garage.platformHeight + 0.01;
  g.add(ring);

  return g;
}
