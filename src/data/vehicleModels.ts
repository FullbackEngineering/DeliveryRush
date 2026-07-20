import carUrl from '@/assets/models/car_murphy.glb?url';
import scooterUrl from '@/assets/models/scooter.glb?url';

/**
 * Per-vehicle 3D model + how `world/ModelLoader.prepareVehicle` should prepare it.
 * Kept next to the `?url` asset imports (out of the Phaser-free `types/`/`data/`
 * value files) so a vehicle can ship a distinct mesh — the starter is a real
 * delivery scooter (with a procedural rider), the rest use the shared car GLB.
 */
export interface VehicleModelSpec {
  url: string;
  /** Length in meters the model is scaled to (longest horizontal side). */
  targetLength: number;
  /** Extra Y spin so the model's nose ends on local +Z (the travel direction). */
  extraYaw: number;
  /** Drop broken/degenerate meshes by name (inflate bounds / cause float). */
  dropMeshes?: RegExp;
  /** Attach the procedural seated courier (scooters have no rider mesh). */
  rider: boolean;
  /** Recolour the paint to the vehicle's `bodyColor` — only for GLBs that keep a
   *  `/body/i` material (the scooter keeps its own livery). */
  tintBody: boolean;
}

/** Shared low-poly car (Murphy) — sport / super / hyper. */
const CAR: VehicleModelSpec = {
  url: carUrl,
  targetLength: 5.8,
  extraYaw: Math.PI,
  dropMeshes: /numberplate_front/i,
  rider: false,
  tintBody: true,
};

/** Starter "City Scooter": the real delivery-scooter GLB + a procedural courier. */
const SCOOTER: VehicleModelSpec = {
  url: scooterUrl,
  targetLength: 2.2,
  extraYaw: Math.PI, // GLB front is -Z (headlight/front wheel) → flip to +Z
  rider: true,
  tintBody: false,
};

const BY_ID: Record<string, VehicleModelSpec> = {
  starter: SCOOTER,
};

/** Model spec for a vehicle id (defaults to the shared car). */
export function modelFor(id: string): VehicleModelSpec {
  return BY_ID[id] ?? CAR;
}
