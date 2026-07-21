import * as THREE from 'three';
import { TrafficRules } from '@/core/Balance';
import { Grid } from '@/world/Grid';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type RoadAxis = 'x' | 'z';
export type SignalColor = 'green' | 'amber' | 'red';

export class TrafficSignals {
  // Trafik ışıkları ağını yönetir, yeşil/amber/kırmızı döngüsü kontrol eder
  readonly housings: THREE.InstancedMesh;
  readonly lenses: THREE.InstancedMesh;

  private timer = 0;
  private colorZ: SignalColor = 'green';
  private colorX: SignalColor = 'red';
  private approaches: Array<{ axis: RoadAxis; matrix: THREE.Matrix4 }> = [];

  get vertical(): SignalColor { return this.colorZ; }
  get horizontal(): SignalColor { return this.colorX; }

  // Başlatır, trafik ışıklarını ve konutlarını inşa eder
  constructor(grid: Grid) {
    const built = this.build(grid);
    this.housings = built.housings;
    this.lenses = built.lenses;
    this.refresh();
  }

  // Trafik ışık döngüsünü sıfırlar
  reset(): void {
    this.timer = 0;
    this.colorZ = 'green';
    this.colorX = 'red';
    this.refresh();
  }

  // Trafik ışık döngüsünü ilerletir, renk değişimini işler
  update(dt: number): void {
    const green = TrafficRules.greenSeconds;
    const amber = TrafficRules.amberSeconds;
    const allRed = TrafficRules.allRedSeconds;
    const halfCycle = green + amber + allRed;
    const cycle = halfCycle * 2;
    this.timer = (this.timer + dt) % cycle;
    const t = this.timer;
    let z: SignalColor = 'red';
    let x: SignalColor = 'red';
    if (t < green) z = 'green';
    else if (t < green + amber) z = 'amber';
    else if (t >= halfCycle && t < halfCycle + green) x = 'green';
    else if (t >= halfCycle + green && t < halfCycle + green + amber) x = 'amber';
    if (z !== this.colorZ || x !== this.colorX) {
      this.colorZ = z;
      this.colorX = x;
      this.refresh();
    }
  }

  // Belirtilen yol ekseninin trafik ışık rengini döndürür
  colorFor(axis: RoadAxis): SignalColor {
    return axis === 'z' ? this.colorZ : this.colorX;
  }

  // Trafik ışıkları konutlarını ve lenslerini inşa eder
  private build(grid: Grid): { housings: THREE.InstancedMesh; lenses: THREE.InstancedMesh } {
    const pole = new THREE.CylinderGeometry(0.11, 0.14, 3.7, 6);
    pole.translate(0, 1.85, 0);
    const head = new THREE.BoxGeometry(0.62, 1.55, 0.34);
    head.translate(0, 3.65, 0);
    const housingGeometry = mergeGeometries([pole, head], false)!;
    pole.dispose(); head.dispose();

    const approaches: Array<{ axis: RoadAxis; x: number; z: number; yaw: number }> = [];
    const block = grid.block;
    for (let c = 1; c < grid.cols; c++) {
      for (let r = 1; r < grid.rows; r++) {
        const ix = c * block;
        const iz = r * block;
        const sideX = grid.halfAt(c) + 0.9;
        const sideZ = grid.halfAt(r) + 0.9;
        const stopX = grid.halfAt(c) + TrafficRules.stopBuffer;
        const stopZ = grid.halfAt(r) + TrafficRules.stopBuffer;
        approaches.push(
          { axis: 'z', x: ix - sideX, z: iz - stopZ, yaw: Math.PI },
          { axis: 'z', x: ix + sideX, z: iz + stopZ, yaw: 0 },
          { axis: 'x', x: ix - stopX, z: iz + sideZ, yaw: -Math.PI / 2 },
          { axis: 'x', x: ix + stopX, z: iz - sideZ, yaw: Math.PI / 2 },
        );
      }
    }

    const housings = new THREE.InstancedMesh(
      housingGeometry,
      new THREE.MeshStandardMaterial({ color: 0x27313c, roughness: 0.76, metalness: 0.18 }),
      approaches.length,
    );
    const lensGeometry = new THREE.SphereGeometry(0.19, 8, 6);
    const lenses = new THREE.InstancedMesh(
      lensGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      approaches.length * 3,
    );
    const base = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3(1, 1, 1);
    approaches.forEach((approach, index) => {
      base.compose(position.set(approach.x, 0, approach.z), rotation.setFromEuler(euler.set(0, approach.yaw, 0)), scale);
      housings.setMatrixAt(index, base);
      this.approaches.push({ axis: approach.axis, matrix: base.clone() });
      [4.15, 3.65, 3.15].forEach((y, lens) => {
        local.makeTranslation(0, y, 0.2);
        lenses.setMatrixAt(index * 3 + lens, new THREE.Matrix4().multiplyMatrices(base, local));
      });
    });
    housings.instanceMatrix.needsUpdate = true;
    lenses.instanceMatrix.needsUpdate = true;
    housings.frustumCulled = false;
    lenses.frustumCulled = false;
    return { housings, lenses };
  }

  // Lens renklerini mevcut döngü durumuna göre günceller
  private refresh(): void {
    const active = {
      red: new THREE.Color(0xff334c),
      amber: new THREE.Color(0xffb020),
      green: new THREE.Color(0x2ee88b),
    } as const;
    const dim = {
      red: new THREE.Color(0x35131a),
      amber: new THREE.Color(0x352b16),
      green: new THREE.Color(0x123522),
    } as const;
    const colors: SignalColor[] = ['red', 'amber', 'green'];
    this.approaches.forEach((approach, signal) => {
      const shown = this.colorFor(approach.axis);
      colors.forEach((color, lens) => this.lenses.setColorAt(signal * 3 + lens, color === shown ? active[color] : dim[color]));
    });
    if (this.lenses.instanceColor) this.lenses.instanceColor.needsUpdate = true;
  }
}
