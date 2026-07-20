# Gerçek Dünya Haritası — Entegrasyon Notu

`src/ui/WorldMap.ts`, sembolik bir yol şeması çizmez. Aktif Three.js sahnesini ikinci
bir ortografik kamerayla tam tepeden render eder. Bu nedenle aşağıdakiler oyunla aynı
sahne verisinden gelir:

- normal yollar ve geniş avenue'lar,
- gerçek bina yerleşimleri, parklar, POI yapıları ve SERBEST dekoru,
- trafik araçları, trafik ışıkları ve polis,
- RUSH pickup/dropoff beacon'ları,
- oyuncu aracı ve dünyadaki diğer görünür nesneler.

Üstteki hafif Canvas katmanı yalnız küçük telefon görünümünde oyuncu ile hedefin kolay
okunması içindir. Dünya geometrisinin yerine geçmez.

## Ortak kullanım

```ts
import { WorldMap } from '@/ui/WorldMap';

const map = new WorldMap({
  mount: mapHost,
  scene,
  grid,
  size: 136,
  updateHz: 10,
  getSnapshot: () => ({
    player: {
      x: vehicle.x,
      z: vehicle.z,
      yaw: vehicle.yaw,
      kind: 'player',
    },
  }),
});

game.onUpdate((dt) => map.update(dt));
```

`mapHost`, HUD içinde haritanın bulunacağı kapsayıcıdır. `WorldMap` kendi öğesini bu
kapsayıcıya ekler; global konumlandırma dayatmaz.

## RUSH hedef katmanı

`Orders3D.current` varsa aktif node dünya koordinatına çevrilerek snapshot'a eklenir:

```ts
getSnapshot: () => {
  const order = orders.current;
  const node = order ? (order.pickedUp ? order.dropoff : order.pickup) : null;
  const target = node ? grid.nodePos(node.col, node.row) : null;
  return {
    player: { x: vehicle.x, z: vehicle.z, yaw: vehicle.yaw, kind: 'player' },
    markers: target ? [{
      ...target,
      kind: order!.pickedUp ? 'dropoff' : 'pickup',
      label: order!.kind,
    }] : [],
  };
},
```

## SERBEST hedef/POI katmanı

`PoiSystem.list` doğrudan POI marker'larına dönüştürülür. Aktif `JobBoard` hedefi
pickup/dropoff rengiyle ayrıca işaretlenir. Trafik ve polis marker dizisine kopyalanmak
zorunda değildir; gerçek 3D nesneleri zaten üstten sahne render'ında görünür.

```ts
getSnapshot: () => {
  const job = board.active;
  const target = job ? (job.state === 'toPickup' ? job.source : job.dest) : null;
  return {
    player: { x: vehicle.x, z: vehicle.z, yaw: vehicle.yaw, kind: 'player' },
    markers: [
      ...pois.list.map((p) => ({ x: p.x, z: p.z, kind: 'poi' as const })),
      ...(target ? [{
        x: target.x,
        z: target.z,
        kind: job!.state === 'toPickup' ? 'pickup' as const : 'dropoff' as const,
        label: target.name,
      }] : []),
    ],
  };
},
```

## Performans sınırları

- Varsayılan yenileme: `10 Hz`; ana oyun 60 FPS akışından bağımsız olarak throttle edilir.
- Harita varsayılanı `136×136 CSS px`; DPR en fazla `1.5` olur.
- Harita renderer'ında antialias ve gölgeler kapalıdır.
- Modül yeni bir WebGL context kullanır. Entegrasyon sonrası hedef telefonlarda GPU bellek
  ve FPS tekrar ölçülmelidir; düşük cihaz profili gerekirse `updateHz: 6` kullanılabilir.
- Mod değişimi ileride sayfa yenilemeden yapılırsa `map.destroy()` çağrılmalıdır.

## Şerit sınırı

Bu hazırlıkta `src/boot.ts`, mevcut HUD'lar, `Balance.ts` ve `EventBus.ts`
değiştirilmedi. RUSH ve SERBEST map host/mount wiring'i entegrasyon şeridinde yapılmalıdır.
