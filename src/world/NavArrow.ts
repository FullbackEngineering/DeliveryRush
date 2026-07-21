import * as THREE from 'three';

/**
 * A flat "guide" arrow painted on the road just ahead of the car, rotating to
 * point at the active target. Because it lies flat in the ground plane, the angled
 * chase camera always reads it as a clear direction — it never presents a
 * cross-section blob the way a floating 3D arrow does when it faces the camera.
 *
 * Extracted from `world/Orders3D.ts` (RUSH) so SERBEST's `JobBoard`-driven nav
 * can reuse the exact same look/behaviour.
 */
export class NavArrow {
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  private t = 0;

  // Navigasyon okunu oluşturur, yön gösterimi için hazırlar
  constructor() {
    // Arrow polygon pointing -Y in shape space (becomes +Z once laid flat).
    const s = new THREE.Shape();
    s.moveTo(0, -3);
    s.lineTo(2, -0.4);
    s.lineTo(0.85, -0.4);
    s.lineTo(0.85, 3);
    s.lineTo(-0.85, 3);
    s.lineTo(-0.85, -0.4);
    s.lineTo(-2, -0.4);
    s.lineTo(0, -3);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), this.mat);
    this.mesh.rotation.x = -Math.PI / 2; // lay flat (shape -Y → world +Z)
    this.group.add(this.mesh);
    this.group.scale.setScalar(0.85);
    this.group.visible = false;
  }

  // Ok rengini değiştirir
  setColor(color: number): void {
    this.mat.color.setHex(color);
  }

  // Aracın önüne yerleştirilir, hedefe doğru yönelir ve pulsuz eder
  point(carX: number, carZ: number, carYaw: number, targetX: number, targetZ: number, dt: number): void {
    this.t += dt;
    const ahead = 9;
    this.group.position.set(carX + Math.sin(carYaw) * ahead, 0.22, carZ + Math.cos(carYaw) * ahead);
    this.group.rotation.y = Math.atan2(targetX - carX, targetZ - carZ);
    this.mat.opacity = 0.68 + (Math.sin(this.t * 5) + 1) / 2 * 0.32;
    this.group.visible = true;
  }

  // Oku gizler
  hide(): void {
    this.group.visible = false;
  }
}
