import * as THREE from 'three';
import { Grid } from '@/world/Grid';
import { Order } from '@/types';
import { Rng } from '@/utils/Rng';
import { ORDER_KINDS } from '@/data/orderKinds';
import { Scoring, Nav } from '@/core/Balance';
import { Palette } from '@/core/Palette';
import { clamp } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';
import { NavArrow } from '@/world/NavArrow';

export type OrderEvent = 'none' | 'pickup' | 'deliver' | 'expire';

let beamTex: THREE.CanvasTexture | null = null;
// Işın dokusu oluşturur: tabanda parlak, kenarlardan solarlanmış
function makeBeamTexture(): THREE.CanvasTexture {
  if (beamTex) return beamTex;
  const w = 64, h = 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const vg = ctx.createLinearGradient(0, h, 0, 0); // bottom → top
  vg.addColorStop(0, 'rgba(255,255,255,0.95)');
  vg.addColorStop(0.5, 'rgba(255,255,255,0.32)');
  vg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  const hg = ctx.createLinearGradient(0, 0, w, 0); // soft side edges
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(0.5, 'rgba(0,0,0,1)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);
  beamTex = new THREE.CanvasTexture(c);
  beamTex.colorSpace = THREE.SRGBColorSpace;
  return beamTex;
}

export class Beacon3D {
  // Başlatır, halka ışını ve mücevheri oluşturur
  readonly group = new THREE.Group();
  private ring: THREE.Mesh;
  private beam: THREE.Sprite;
  private gem: THREE.Mesh;
  private sparks: THREE.Points;
  private sparkPositions: THREE.BufferAttribute;
  private t = Math.random() * Math.PI * 2;

  constructor() {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(4, 5.7, 40), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.12;

    this.beam = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeBeamTexture(), color: 0xffffff, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.beam.scale.set(5, 46, 1);
    this.beam.position.y = 23;

    this.gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(2, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7,
        roughness: 0.3, metalness: 0.2, flatShading: true,
      }),
    );
    this.gem.position.y = 5;

    const sparkCount = 10;
    const positions = new Float32Array(sparkCount * 3);
    this.sparkPositions = new THREE.BufferAttribute(positions, 3);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', this.sparkPositions);
    this.sparks = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        color: 0xffffff, size: 0.9, transparent: true, opacity: 0.9,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      }),
    );

    this.group.add(this.ring, this.beam, this.gem, this.sparks);
    this.group.visible = false;
  }

  // İşaret konumunu ve rengini ayarlar, gösterilir
  set(x: number, z: number, color: number): void {
    this.group.position.set(x, 0, z);
    const col = new THREE.Color(color);
    (this.ring.material as THREE.MeshBasicMaterial).color.copy(col);
    (this.beam.material as THREE.SpriteMaterial).color.copy(col);
    const gm = this.gem.material as THREE.MeshStandardMaterial;
    gm.color.copy(col);
    gm.emissive.copy(col);
    (this.sparks.material as THREE.PointsMaterial).color.copy(col);
    this.group.visible = true;
  }

  // İşareti gizler
  hide(): void {
    this.group.visible = false;
  }

  // İşareti günceller, parçacık sistemini canlandırır
  update(dt: number): void {
    if (!this.group.visible) return;
    this.t += dt;
    const pulse = 1 + Math.sin(this.t * 3) * 0.16;
    this.ring.scale.setScalar(pulse);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + (Math.sin(this.t * 3) + 1) / 2 * 0.4;
    this.gem.rotation.y += dt * 1.8;
    this.gem.position.y = 5 + Math.sin(this.t * 2) * 0.8;
    // Orbiting motes make the target visible between traffic and buildings while
    // staying one tiny Points draw call (no particle system dependency).
    for (let i = 0; i < this.sparkPositions.count; i++) {
      const a = this.t * (0.65 + (i % 3) * 0.12) + (i / this.sparkPositions.count) * Math.PI * 2;
      const radius = 2.2 + (i % 4) * 0.55;
      this.sparkPositions.setXYZ(
        i,
        Math.cos(a) * radius,
        2.2 + (i % 5) * 1.15 + Math.sin(a * 1.7) * 0.45,
        Math.sin(a) * radius,
      );
    }
    this.sparkPositions.needsUpdate = true;
  }
}

export class Orders3D {
  // Aktif teslimatı yönetir, işaret ve okları gösterir, zamanlayıcı tutar
  readonly group = new THREE.Group();
  current: Order | null = null;

  private nextId = 1;
  private timer = 0;
  private timeLimit = 20;

  private pickup = new Beacon3D();
  private drop = new Beacon3D();
  private arrow = new NavArrow();

  // Başlatır, işaret ve ok sistemini kurar
  constructor(private grid: Grid, private rng: Rng) {
    this.group.add(this.pickup.group, this.drop.group, this.arrow.group);
  }

  get remainingFraction(): number {
    return this.timeLimit > 0 ? clamp(this.timer / this.timeLimit, 0, 1) : 0;
  }
  get remainingTime(): number {
    return Math.max(0, this.timer);
  }

  // Oyuncunun yakınına yeni sipariş oluşturur
  spawn(px: number, pz: number, vipChance: number, timeLimit: number): Order {
    const pc = clamp(Math.round(px / this.grid.block), 1, this.grid.cols - 1);
    const pr = clamp(Math.round(pz / this.grid.block), 1, this.grid.rows - 1);
    const pickup = this.pickNode(pc, pr, 2, 5);
    const dropoff = this.pickNode(pickup.col, pickup.row, 3, 7);
    const kind = this.rng.pick(ORDER_KINDS);
    const vip = this.rng.chance(vipChance);
    const distBlocks = Math.abs(pickup.col - dropoff.col) + Math.abs(pickup.row - dropoff.row);
    const baseReward = Scoring.baseReward + distBlocks * Scoring.distanceBonus + (vip ? 60 : 0);

    this.current = {
      id: this.nextId++,
      kind: kind.label,
      icon: kind.emoji,
      baseReward,
      vip,
      pickup,
      dropoff,
      timeLimit,
      pickedUp: false,
    };
    this.timeLimit = timeLimit;
    this.timer = timeLimit;

    const pp = this.grid.nodePos(pickup.col, pickup.row);
    this.pickup.set(pp.x, pp.z, vip ? Palette.gold : kind.color);
    this.drop.hide();
    this.arrow.setColor(vip ? Palette.gold : Palette.orange);

    bus.emit(GameEvent.OrderSpawned, this.current);
    return this.current;
  }

  // Zamanlayıcı ve animasyonları günceller, olayları rapor eder
  update(dtMs: number, px: number, pz: number, yaw: number): OrderEvent {
    const dt = dtMs / 1000;
    this.pickup.update(dt);
    this.drop.update(dt);
    if (!this.current) {
      this.arrow.hide();
      return 'none';
    }

    this.timer -= dt;
    bus.emit(GameEvent.OrderTimer, this.remainingFraction, this.remainingTime);
    if (this.timer <= 0) {
      const expired = this.current;
      this.hideAll();
      this.current = null;
      bus.emit(GameEvent.OrderExpired, expired);
      return 'expire';
    }

    const node = this.current.pickedUp ? this.current.dropoff : this.current.pickup;
    const target = this.grid.nodePos(node.col, node.row);
    const dist = Math.hypot(target.x - px, target.z - pz);

    if (dist > Nav.arrowHideM) this.arrow.point(px, pz, yaw, target.x, target.z, dt);
    else this.arrow.hide();

    if (dist < Nav.reachM) {
      if (!this.current.pickedUp) {
        this.current.pickedUp = true;
        this.pickup.hide();
        const dp = this.grid.nodePos(this.current.dropoff.col, this.current.dropoff.row);
        this.drop.set(dp.x, dp.z, Palette.green);
        this.arrow.setColor(Palette.green);
        bus.emit(GameEvent.OrderPickedUp, this.current);
        return 'pickup';
      }
      const done = this.current;
      this.hideAll();
      this.current = null;
      bus.emit(GameEvent.OrderDelivered, done);
      return 'deliver';
    }
    return 'none';
  }

  // Belirtilen aralıkta blok mesafeli yol düğümü seçer
  private pickNode(col: number, row: number, min: number, max: number): { col: number; row: number } {
    for (let tries = 0; tries < 24; tries++) {
      const dc = this.rng.int(-max, max);
      const dr = this.rng.int(-max, max);
      const md = Math.abs(dc) + Math.abs(dr);
      if (md < min || md > max) continue;
      const c = clamp(col + dc, 1, this.grid.cols - 1);
      const r = clamp(row + dr, 1, this.grid.rows - 1);
      if (Math.abs(c - col) + Math.abs(r - row) >= min) return { col: c, row: r };
    }
    // Fallback: step `min` along the axis with the most room.
    const c = clamp(col + (col < this.grid.cols / 2 ? min : -min), 1, this.grid.cols - 1);
    return { col: c, row };
  }

  // Tüm işaret ve okları gizler
  private hideAll(): void {
    this.pickup.hide();
    this.drop.hide();
    this.arrow.hide();
  }

  // Tüm siparişleri temizler, durumu sıfırlar
  reset(): void {
    this.hideAll();
    this.current = null;
    this.timer = 0;
  }
}
