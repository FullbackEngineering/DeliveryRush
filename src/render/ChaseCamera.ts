import * as THREE from 'three';
import { damp } from '@/utils/MathUtils';
import { World } from '@/core/Balance';

/**
 * Low-angle 3D chase camera: rides behind and above the car, looking ahead down
 * the road. Position and aim are exponentially smoothed so turns feel fluid, and
 * the rig eases back / higher as speed rises for a sense of speed.
 */
export class ChaseCamera {
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private started = false;

  // Tunables (meters).
  distance = World.cam.dist;
  height = World.cam.height;
  lookAhead = World.cam.lookAhead;
  lookHeight = World.cam.lookHeight;
  private readonly followLambda = 6;

  constructor(private camera: THREE.PerspectiveCamera) {}

  /** @param p car position; @param yaw car heading; @param speed01 0..1 */
  update(dt: number, p: THREE.Vector3, yaw: number, speed01: number): void {
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const back = this.distance + speed01 * 4; // pull back at speed
    const high = this.height + speed01 * 2;

    const targetPos = new THREE.Vector3(
      p.x - fwd.x * back,
      high,
      p.z - fwd.z * back,
    );
    const targetLook = new THREE.Vector3(
      p.x + fwd.x * this.lookAhead,
      this.lookHeight,
      p.z + fwd.z * this.lookAhead,
    );

    if (!this.started) {
      this.pos.copy(targetPos);
      this.look.copy(targetLook);
      this.started = true;
    } else {
      this.pos.x = damp(this.pos.x, targetPos.x, this.followLambda, dt);
      this.pos.y = damp(this.pos.y, targetPos.y, this.followLambda, dt);
      this.pos.z = damp(this.pos.z, targetPos.z, this.followLambda, dt);
      this.look.x = damp(this.look.x, targetLook.x, this.followLambda, dt);
      this.look.y = damp(this.look.y, targetLook.y, this.followLambda, dt);
      this.look.z = damp(this.look.z, targetLook.z, this.followLambda, dt);
    }

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
