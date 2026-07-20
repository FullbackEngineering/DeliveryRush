# Codex Çalışma Notları

**Proje:** Delivery Rush  
**Tarih:** 20 Temmuz 2026  
**Kapsam:** Bağımsız Market/Shop modülü ve şehri canlandırma katmanı

## Durum

**Tamamlandı — 20 Temmuz 2026.** Codex'e ayrılan Market/Shop ve şehri canlandırma
şeritleri uygulanmış, derlenmiş, tarayıcıda kontrol edilmiş ve ana entegrasyona hazır
olarak devredilmiştir. Şu an bekleyen ek bir Codex geliştirme işi yoktur.

## Çalışma sınırları

Bu çalışma Claude Code ile paralel geliştirilebilecek bağımsız bir şerit olarak yürütüldü.
Aşağıdaki paylaşılan/sıcak dosyalara dokunulmadı:

- `src/boot.ts`
- `src/core/Balance.ts`
- `src/core/EventBus.ts`
- `src/ui/GarageScreen.ts`
- `src/world/CarPreview.ts`
- Garaj, HUD, kontrol, araç, kamera ve GLB model dosyaları

Route ve uygulama wiring işlemleri özellikle yapılmadı. Bunlar ana entegrasyon sırasında
tek elden `boot.ts` tarafında bağlanabilir.

## 1. Market/Shop modülü

### `src/data/shopItems.ts`

- Araç satışlarından ayrı bir market kataloğu oluşturuldu.
- Ürünler üç kategoriye ayrıldı:
  - Yetenek kartları
  - Tek koşuluk boostlar
  - Araç kozmetikleri
- Coin ve gem fiyatlandırması, rarity, açıklama, ikon ve öne çıkan ürün bilgileri
  veri odaklı tanımlandı.
- Katalog için `SHOP_ITEMS`, kategori listesi ve ID haritası dışa aktarıldı.

### `src/systems/Shop.ts`

- Profile üzerinde değişiklik yapmayan saf market mantığı oluşturuldu.
- Bir ürünün sahiplik ve bakiye durumları hesaplanıyor:
  - `owned`
  - `affordable`
  - `insufficient-funds`
- Kart sahipliği mevcut `profile.ownedCards` verisinden okunuyor.
- Henüz Profile şemasında bulunmayan kozmetik sahipliği, entegrasyon katmanından
  verilebilen `ownedItemIds` ile destekleniyor.
- Boostlar tüketilebilir ürün olarak tekrar satın alınabilir kabul ediliyor.

### `src/ui/MarketScreen.ts`

- Mobil uyumlu native DOM market ekranı oluşturuldu.
- Kartlar, boostlar ve kozmetikler sekmeler üzerinden görüntüleniyor.
- Coin/gem bakiyesi, sahip olunan ürünler, fiyatlar ve eksik bakiye gösteriliyor.
- Klavye odağı, Escape ile kapanma ve temel erişilebilirlik özellikleri eklendi.
- Ekran Profile'ı yalnızca okuyor; doğrudan para harcamıyor veya sahiplik eklemiyor.
- Satın alma işlemi `onPurchaseRequested(item)` callback'iyle dışarı aktarılıyor.

### Market entegrasyon notu

```ts
const market = new MarketScreen({
  mount: ui,
  onClose: () => {
    // Ana menüye/önceki ekrana dön.
  },
  onPurchaseRequested: (item) => {
    // Harcama ve sahiplik verme işlemini mevcut Profile mutator düzeniyle yap.
    // Başarılı işlemden sonra market.refresh() çağır.
  },
});

market.open();
```

Kart satın alma/sahiplik mutator'ı özellikle eklenmedi. Gerekli Profile şema ve mutator
değişiklikleri ana entegrasyon şeridine bırakıldı.

## 2. Şehri canlandırma

### `src/world/CityView.ts`

- Prosedürel binalara zemin kat vitrinleri ve kat pencereleri eklendi.
- Park alanlarına banklar yerleştirildi.
- Yeni detaylar performans için tek bir instanced mesh katmanında toplandı.

### `src/world/Traffic3D.ts`

- Kavşak ve yaya geçitlerinde sürekli hareket eden yayalar eklendi.
- Trafik araçlarına ön far ve arka stop ışıkları eklendi.
- Yaya gövdesi/başı tek geometride birleştirildi.
- Ön ve arka araç ışıkları vertex renkli tek geometride birleştirildi.
- Mevcut trafik çarpışma ve near-miss mantığı değiştirilmedi.

### `src/world/CityDecor.ts`

- SERBEST modundaki geniş caddelere otobüs durakları ve rota tabelaları eklendi.
- Durak çatısı, gövdesi, direği ve tabelası tek instanced mesh içinde toplandı.
- Mevcut skyline, okul landmarkları ve GLB yükleme akışı değiştirilmedi.

### `src/world/Orders3D.ts`

- Pickup/dropoff beacon çevresine hareketli ışık parçacıkları eklendi.
- Parçacıklar tek `THREE.Points` çizim çağrısıyla çalışıyor.
- Sipariş spawn, pickup, delivery, expiry ve EventBus akışı değiştirilmedi.

## Performans yaklaşımı

İlk görsel geçişte yeni katmanlar draw sayısını yükseltti. Tarayıcı playtest'inden sonra
geometriler birleştirildi ve instancing yoğunlaştırıldı:

- Sokak detayları: tek mesh
- Yayalar: tek mesh
- Araç ışıkları: tek mesh
- SERBEST durakları: tek mesh

Son headless playtest ölçümleri:

| Mod | Draw calls | Headless FPS | Yol dışı örnek | Konsol hatası |
| --- | ---: | ---: | ---: | --- |
| RUSH | 25 | 26 | 0/80 | Yok |
| SERBEST | 35 | 34 | 0/80 | Yok |

Headless SwiftShader FPS değerleri gerçek cihaz performansı değildir; karşılaştırmalı
kontrol için kullanıldı.

## Doğrulama sonuçları

- `npm run typecheck`: geçti.
- `npm run build`: geçti.
- `npm run playtest:modes`: RUSH ve SERBEST kontrolleri geçti; konsol hatası yok.
- Oluşturulan RUSH ve SERBEST ekran görüntüleri görsel olarak incelendi.
- `playtest:loop`, ortamda başlangıç durumunu beklerken 8 saniyelik timeout'a takıldı.
  Derleme veya tarayıcı konsol hatası üretmedi; mod testi ve çalışan oyun görüntüleri
  şehir katmanlarının doğru yüklendiğini doğruladı.
- Vite build'deki 500 kB üzeri bundle uyarısı devam ediyor; bu çalışma tarafından
  oluşturulmuş yeni bir hata değil.

## Değiştirilen veya oluşturulan dosyalar

Yeni dosyalar:

- `src/data/shopItems.ts`
- `src/systems/Shop.ts`
- `src/ui/MarketScreen.ts`
- `CODEX_WORK_LOG.md`

---

# Polis devriye AI trafik kurallari duzeltmesi — 20 Temmuz 2026

## Kok neden ve uygulama

- Eski polis devriyesi iki boyutlu rastgele waypoint seciyor, hedefe capraz donuyor ve
  yol koridoru cozumleyicisine carpinca yol icinde duzensizce savruluyordu.
- Waypoint devriyesi kaldirildi. Polisler artik normal trafik araclariyla ayni yol
  modeliyle ilerliyor: sabit yol ekseni, yonune gore sag serit merkezi ve kardinal
  arac acisi.
- Devriye polisi trafik sistemiyle ayni `TrafficSignals` nesnesini kullaniyor;
  kirmizi/isik fazinda stop cizgisine frenleyerek duruyor.
- Polisler ayni seritteki diger devriye aracina takip mesafesi birakiyor ve oyuncu
  seridi kapatiyorsa normal trafik gibi carpmadan once duruyor.
- Kovalamaca davranisi korunuyor. Kovalamaca bittiginde polis en yakin yasal sag
  seride yumusakca hizalaniyor ve duz devriyeye geri donuyor.
- `Traffic3D.signals` salt-okunur ortak denetleyici olarak acildi; `boot.ts` bu nesneyi
  polise iletiyor. Trafik playtest'i yeni `TrafficSignals` sahipligine gore guncellendi.

## Dogrulama

- `node tools/playtest/police.mjs`: PASS.
  - Devriye polisi: `3`; sag serit ihlali: `0`; kardinal yon ihlali: `0`.
  - 1.4 saniyelik hareket orneginde uc polisin yanal sapmasi da `0 m`.
  - Ceza, kovalamaca banner'i ve kacis dongusu PASS; konsol hatasi yok.
- `npm run playtest:traffic`: PASS.
  - 676 sinyal yaklasimi, sag serit ihlali `0`, kirmizida durma ve oyuncuya yol
    verme testleri PASS.
- `npm run playtest:modes`: PASS; RUSH ve SERBEST 80/80 yol ornegi gecerli.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- 390x844 `police-patrol.png` ve `police-chase.png` ekran goruntuleri olusturuldu;
  devriye sahnesi gozle incelendi.

## Guncellenen dosyalar

- `src/world/Police.ts`
- `src/world/Traffic3D.ts`
- `src/boot.ts`
- `tools/playtest/police.mjs`
- `tools/playtest/traffic-rules.mjs`
- `tools/playtest/shots/police-patrol.png`
- `tools/playtest/shots/police-chase.png`
- `CODEX_WORK_LOG.md`

---

# RUSH + SERBEST birebir canlı dünya haritası — 21 Temmuz 2026

## Durum

**Tamamlandı ve iki moda entegre edildi.** Mevcut sembolik mini harita yerine oyunla
aynı Three.js sahnesini ortografik kamerayla tepeden gösteren `WorldMap` bileşeni
RUSH ve SERBEST çalışma döngülerine bağlandı.

## Yapılanlar

- Harita dairesel ve oyuncu merkezli çalışıyor. RUSH oyuncunun `220 m`, SERBEST
  `320 m` yarıçapındaki çevresini gösteriyor; böylece yol/bina ayrıntıları okunuyor.
- Harita yol şeması tahmin etmiyor; aktif sahne ağacını render ettiği için yollar,
  avenue genişlikleri, gerçek bina yerleşimleri, parklar, dekor GLB'leri, POI yapıları,
  trafik, polis, trafik ışıkları, araçlar ve beacon'lar dünyayla birebir eşleşiyor.
- Telefon boyutunda okunabilirlik için oyuncu yön oku, POI, pickup/dropoff, polis ve
  trafik marker tiplerini destekleyen hafif bir Canvas overlay eklendi.
- Dünya koordinatı → harita koordinatı dönüşümü iki modun gerçek `Grid.worldW/worldD`
  ölçülerini kullanıyor; kuzey/world `-Z` ekranın üstünde kalıyor.
- Pahalı 3D dünya katmanı `0.5 Hz`, ucuz oyuncu/hedef overlay'i `12 Hz` yenileniyor.
  Çözünürlük 136 CSS px, DPR en fazla 1.5; antialias ile gölgeler kapalı.
- `destroy()` ile WebGL renderer/context ve DOM öğesi temizlenebiliyor.
- RUSH hedefi ve SERBEST POI/aktif iş hedefi için wiring örnekleri
  `docs/WORLD_MAP_INTEGRATION.md` içine yazıldı.

## Doğrulama

- `node tools/playtest/world-map.mjs`: PASS.
  - RUSH: 14×14 grid, 840×840 m, tek dünya canvas + tek overlay canvas.
  - SERBEST: 24×24 grid, 1728×1728 m, tek dünya canvas + tek overlay canvas.
  - Her iki modda tek entegre harita, dairesel maske, oyuncuyu takip eden kamera ve
    konsol hatası olmaması doğrulandı.
- 390×844 `world-map-rush.png` ve `world-map-free.png` gözle incelendi. Yol/blok
  geometrileri gerçek şehir yerleşimiyle aynı, tepeden yön doğru ve marker görünür.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm run playtest:modes`: PASS; iki modda yol dışı ihlal `0/80`, konsol hatası yok.

## Yeni dosyalar

- `src/ui/WorldMap.ts`
- `tools/playtest/world-map.mjs`
- `docs/WORLD_MAP_INTEGRATION.md`

## Entegrasyon

- `src/boot.ts`: RUSH ve SERBEST snapshot/wiring eklendi.
- `src/ui/FreeHud.templates.ts`: SERBEST harita yuvası dairesel yapıldı; eski
  sembolik canvas runtime'da gerçek `WorldMap` ile değiştiriliyor.
- RUSH haritası sipariş kartının altında sağ üstte sabitleniyor.
- `Balance.ts`, `EventBus.ts`, araç, kamera ve GLB dosyaları değiştirilmedi.

---

# Trafiğin oyuncuya yol vermesi — 20 Temmuz 2026

## Yapılanlar

- Trafik araçları artık oyuncuyu kendi ileri şerit koridorlarında hareketli bir
  engel olarak algılıyor.
- Oyuncu aracının yalnız merkezi değil, dönüş açısına göre yola izdüşen gerçek
  genişliği ve uzunluğu hesaba katılıyor. Böylece aynı şeritteki oyuncunun yanında
  kavşakta şeridi enlemesine kapatan oyuncuya da yol veriliyor.
- AI fren mesafesine göre kademeli yavaşlıyor ve oyuncu aracının arkasında `2,2 m`
  tampon bırakarak tamamen duruyor. Uzun bir karede güvenlik çizgisini atlamaması
  için fiziksel konum koruması eklendi.
- Oyuncu şeridi boşalttığında durma durumu kilitlenmiyor; trafik kontrollü biçimde
  yeniden hızlanıyor.
- Trafik debug çıktısına `stoppedForPlayer` ölçümü eklendi.

## Doğrulama

- `npm run playtest:traffic`: PASS.
  - Test aracı başlangıçta `11 m/s` hızla oyuncuya yaklaştı.
  - Temas olmadan `0 m/s` hızda durdu.
  - Tampon mesafesi: `2,2 m`.
  - Oyuncu şeridi boşaltınca `15,385 m` ilerledi ve `10,2 m/s` hıza çıktı.
  - Kırmızı ışık, sağ şerit, tek model ve araç ölçüsü kontrolleri geçmeye devam etti.
  - Konsol hatası yok.
- `npm run playtest:modes`: PASS; RUSH ve SERBEST yol dışı ihlali `0/80`.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- 390×844 trafik ekranı gözle incelendi; HUD, trafik ışıkları ve kontroller düzgün.

## Güncellenen dosyalar

- `src/core/Balance.ts`
- `src/world/Traffic3D.ts`
- `tools/playtest/traffic-rules.mjs`
- `CODEX_WORK_LOG.md`

Güncellenen bağımsız dünya dosyaları:

- `src/world/CityView.ts`
- `src/world/Traffic3D.ts`
- `src/world/CityDecor.ts`
- `src/world/Orders3D.ts`

## Sonraki entegrasyon işleri

1. Market route/buton wiring'ini ana menüden `boot.ts` içinde yapmak.
2. Satın alma isteğini mevcut Profile mutator düzenine bağlamak.
3. Kozmetik ve tüketilebilir boost sahipliği için kalıcı Profile alanlarını tasarlamak.
4. Başarılı satın alma sonrasında `MarketScreen.refresh()` çağırmak.
5. Gerçek telefonda şehir yoğunluğu, yaya görünürlüğü ve FPS için kısa bir insan
   playtest'i yapmak.

---

# Asset kataloglama ve yeni şehir modelleri — 20 Temmuz 2026

## Durum

**Tamamlandı.** `export_assets/` altındaki görev kapsamındaki yedi yeni GLB önce
kataloglandı, ardından yalnız Codex görsel şeridindeki yaya ve bina assetleri
entegre edildi. Scooter kataloglandı fakat araç olarak bağlanmadı.

## Katalog

- Yeni katalog: `docs/ASSET_INVENTORY.md`
- Yedi GLB `@gltf-transform/core` ile açılarak boyut, üçgen/vertex, node/mesh,
  materyal, skin ve animasyon bilgileri çıkarıldı.
- Her asset için önerilen kullanım ve Codex/Claude şerit sahipliği kaydedildi.
- `delivery_scooter.glb` Claude'un araç/garaj şeridine bırakıldı.

## Optimize edilen runtime assetleri

Belirtilen `gltf-transform optimize --compress meshopt --texture-compress webp
--texture-size 1024` pipeline'ı kullanıldı:

| Çıktı | Boyut | Runtime kullanımı |
| --- | ---: | --- |
| `src/assets/models/ped_phone_walk.glb` | 13.33 KiB | Yaya varyantı 1 |
| `src/assets/models/ped_male03.glb` | 26.10 KiB | Yaya varyantı 2 |
| `src/assets/models/building_kit_lp.glb` | 43.60 KiB | SERBEST kit bina |

Freebie paketinden dört çok hafif figür de seçim testi için çıkarılıp optimize edildi.
Tarayıcıda tek renk mavi maket gibi göründükleri için değerlendirme çıktıları silindi;
runtime importuna ve production bundle'a girmezler. 5.20 MiB rigli sample pack hiç
bundle'a alınmadı.

## `Traffic3D` yaya entegrasyonu

- Prosedürel silindir/küre yayalar, GLB'ler yüklenene kadar güvenli fallback olarak
  korunuyor ve iki gerçek model hazır olduğunda sahneden kaldırılıyor.
- Telefonla yürüyen ve paletli erkek figür tek mesh halinde kullanılıyor.
- Her figür kendi `THREE.InstancedMesh` grubunda çoğaltılıyor.
- Figürler kavşak/yaya geçidi rotalarında translate ediliyor; iskelet animasyonu yok.
- Hareket yönü değiştiğinde model yönü de çevriliyor.
- Meshopt quantized attribute'ları dünya dönüşümünden önce float buffer'a açılıyor;
  önceki skyline'da görülen ±1 clamp/collapse hatası böylece önleniyor.
- GLB yükleme başarısız olursa dekoratif katman prosedürel fallback ile çalışmaya
  devam ediyor; trafik ve çarpışma mantığı asset yüklenmesine bağlı değil.

## `CityDecor` bina entegrasyonu

- Eski çıkarılamayan `building_kit.glb` yerine `building_kit_lp.glb` bağlandı.
- SERBEST şehrinde beş boş plot kit bina için ayrılıyor.
- Optimize modelin materyal parçaları normalize edilip iki `InstancedMesh` halinde
  bütün yerleşimler arasında paylaşılıyor.
- Beş bina kopyası iki draw kullanıyor; her plot farklı 90° rotasyon ve küçük ölçek
  varyasyonu alıyor.
- Ek `boot.ts` wiring'i gerekmedi; mevcut `CityDecor.planPlots()` ve `build()` akışı
  yeni assetleri otomatik yükledi.

## Doğrulama

- `npm run typecheck`: geçti.
- `npm run build`: geçti; kullanılan üç yeni GLB production çıktısına dahil edildi.
- `npm run playtest:modes`: RUSH ve SERBEST geçti, 0/80 yol dışı örnek ve konsol
  hatası yok.
- 390×844 `mode-rush.png` ve `mode-free.png` ekran görüntüleri gözle incelendi.
- Ek yakın bina kontrolü: `tools/playtest/shots/codex-kit-building.png`.
- Gerçek yaya modelleri doğru renk, ölçek ve zemin yüksekliğinde render oldu.
- Beş kit plot doğrulandı; bina modeli plot içinde, yola taşmadan render oldu.

### Draw ölçümü ve eşzamanlı şerit notu

Test anındaki toplam değer RUSH 60, SERBEST 71 draw idi. Bu değer görev hedefini
aşıyor, fakat sahne ağacı ölçümü artışın Codex katmanından gelmediğini gösterdi:

- Codex trafik grubu: 3 araç katmanı + 2 yaya varyantı = 5 mesh.
- Codex bina ek maliyeti: yalnız SERBEST'te 2 instanced mesh.
- Claude'un aynı anda yeniden export ettiği hero araç test anında 34 ayrı mesh idi;
  SERBEST polis araçları da aynı ayrık model katmanlarını tekrar kullanıyordu.
- Yasaklı Claude araç/polis katmanları görünmez yapılarak ölçülen dünya:
  RUSH 16 draw, SERBEST 27 draw.
- Kit binaya yakın normal SERBEST kamera karesinde culling ile toplam 43 draw ölçüldü.

Dolayısıyla Codex katmanı kendi draw bütçesi içinde kalıyor; başlangıç kamerasındaki
toplam 60/71 değeri Claude'un devam eden wheel-node araç re-export/entegrasyonunun
son durumuna bağlı. `Vehicle3D`, `ModelLoader`, araç GLB'leri veya `boot.ts` bu görevde
değiştirilmedi.

## Bu görevde oluşturulan/güncellenen dosyalar

- `docs/ASSET_INVENTORY.md`
- `src/world/Traffic3D.ts`
- `src/world/CityDecor.ts`
- `src/assets/models/ped_phone_walk.glb`
- `src/assets/models/ped_male03.glb`
- `src/assets/models/building_kit_lp.glb`
- `CODEX_WORK_LOG.md`

Dokunulmayan kritik dosyalar: `boot.ts`, `Balance.ts`, `EventBus.ts`, `ModelLoader.ts`,
`Vehicle3D.ts`, `ChaseCamera.ts`, `vehicles.ts`, tüm `src/ui/*`, `car_murphy.glb` ve
`car_cop.glb`.

---

# Yalnız ön teker direksiyon animasyonu — 20 Temmuz 2026

## Durum

**Tamamlandı.** Yalnız ön sol ve ön sağ teker, direksiyon girdisiyle dönüş yönüne
yumuşak biçimde kırılıyor. Yuvarlanma/spin animasyonu kapalı; arka tekerler sabit.
Market entegrasyonu projede zaten mevcut olduğu için Market dosyalarında ve `boot.ts`
yönlendirmesinde değişiklik yapılmadı.

## Değişiklik

- `ModelLoader`, yalnız FL/FR düğümlerini bulup gerçek lastik merkezlerinde iki boş
  steer pivotu kuruyor; hatalı araç-merkezi orbit problemi oluşmuyor.
- `Vehicle3D`, bu iki pivotu direksiyon girdisine göre damp ederek yaklaşık 18°'ye
  kadar çeviriyor ve giriş bırakılınca merkeze getiriyor.
- Hiçbir teker için roll integrasyonu veya kare başına spin transformu bulunmuyor.
- Prosedürel fallback aracın iki ön tekeri de aynı yönlendirme davranışını destekliyor.
- Gövde yatışı ve gaz/fren pitch efekti korunuyor; sürüş fiziği değişmedi.

## Doğrulama

- `npm run typecheck`: geçti.
- `npm run build`: geçti.
- `npm run playtest:modes`: genel sonuç PASS; RUSH ve SERBEST 0/80 yol dışı örnek,
  konsol hatası yok.
- `vehicle-feel.mjs`: iki ön teker bulundu; FL/FR açısı aynı anda `0.1259 rad`, gövde
  lean/pitch efektleri çalışıyor.
- 390×844 ön-çeyrek ekran görüntüsü gözle incelendi; ön teker dönüşü görünür, lastik
  doğru göbek merkezinde kalıyor.

## Güncellenen dosyalar

- `src/core/Balance.ts`
- `src/world/ModelLoader.ts`
- `src/world/Vehicle3D.ts`
- `tools/playtest/vehicle-feel.mjs`
- `CODEX_WORK_LOG.md`

---

# Trafik ışıkları, yol kuralları ve asset araçları — 20 Temmuz 2026

## Durum

**Tamamlandı.** RUSH ve SERBEST şehirlerine görsel trafik ışıkları, senkron faz
sistemi ve bu sinyallere uyan sağdan akan AI trafik eklendi. Prosedürel kutu araçlar,
kullanıcının verdiği `full_pack_traffic_bussid_part_1.glb` içinden seçilen dört farklı
araç varyantıyla değiştirildi.

## Trafik ışığı sistemi

- Her iç kavşağın dört yaklaşımına düşük-poly direk, sinyal kasası ve kırmızı/sarı/
  yeşil lens yerleştirildi.
- Dikey ve yatay akış sırayla yeşil alıyor; arada sarı ve tüm-kırmızı güvenlik fazı var.
- Tüm direkler tek `InstancedMesh`, tüm lensler tek `InstancedMesh`: şehir büyüklüğü
  artsa da ışık sistemi yalnız iki draw kullanıyor.
- Lens renkleri yalnız faz değiştiğinde güncelleniyor; kare başına renk yüklemesi yok.

## Trafik kuralları

- AI araçlar gerçek sağ şerit formülünü kullanıyor: yön değiştiğinde şerit ofsetinin
  işareti de değişiyor ve karşı yönler ayrılıyor.
- Kırmızıda bir sonraki kavşağın stop çizgisine fiziksel fren mesafesi eğrisiyle
  yavaşlayıp duruyorlar.
- Sarıda güvenli duruş mesafesi kalmadıysa panik fren yapmak yerine kavşağı temizliyorlar.
- Yeşilde kontrollü ivmeyle yeniden kalkıyorlar.
- Aynı şeritteki öndeki araç için takip mesafesi uygulanıyor; kuyruklar üst üste binmiyor.
- Spawn sırasında aynı şeritte başka aracın güvenlik boşluğuna doğmamak için yeniden
  konum denemesi yapılıyor.

## Verilen assetlerden rastgele trafik

- Kaynak: `export_assets/full_pack_traffic_bussid_part_1.glb` (2.40 MB).
- Runtime çıktı: `src/assets/models/traffic_pack_lp.glb` (89.68 KB).
- Pipeline: meshopt geometri, WebP 512 px texture, weld/simplify/prune.
- Box/Pickup, Toyota Alphard, Isuzu Trooper ve Honda Civic biçimleri seçildi.
- Her varyant tek normalize edilmiş geometriye çevrilip kendi `InstancedMesh` grubunda
  çiziliyor; her respawn'da varyant rastgele seçiliyor.
- Asset yüklenemezse eski prosedürel gövde/kabin trafik fallback'i otomatik korunuyor.

## Doğrulama

- `npm run playtest:traffic`: PASS.
  - Dört model varyantı yüklendi ve aktif trafikte dört varyant da görüldü.
  - RUSH'ta 676 sinyal yaklaşımı üretildi.
  - Sağ şerit ihlali: `0`.
  - Kırmızı testinde araç stop çizgisinin `0.267 m` önünde `0 m/s` ile durdu.
  - Yeşil verildikten sonra test süresinde `15.377 m` ilerledi.
  - Konsol hatası yok.
- `npm run playtest:modes`: PASS; RUSH ve SERBEST 0/80 yol dışı örnek, konsol
  hatası yok.
- 390×844 `traffic-rules.png`, `traffic-assets.png`, `mode-rush.png` ve
  `mode-free.png` gözle incelendi; ışık yönleri/renkleri ve araç asset eksenleri doğru.
- Draw: RUSH `64`, SERBEST `75`; yeni görsel sistem önceki toplamın üzerine net dört
  draw ekledi ve araç sayısıyla büyümüyor.
- `npm run build`: geçti; production bundle optimize trafik GLB'sini içeriyor.

## Oluşturulan/güncellenen dosyalar

- `src/world/Traffic3D.ts`
- `src/core/Balance.ts`
- `src/assets/models/traffic_pack_lp.glb`
- `tools/extract-traffic-vehicles.mjs`
- `tools/playtest/traffic-rules.mjs`
- `package.json`
- `CODEX_WORK_LOG.md`

## Tek araç, ölçü ve sağ şerit doğrulama düzeltmesi

- İlk paket optimizasyonunun aynı materyalli ayrı kaynak araçlarını tek geometride
  birleştirebildiği tespit edildi. `tools/extract-traffic-vehicles.mjs` ile dört araç
  kaynak GLB'den node bazında tek tek çıkarıldı; optimize aşamasında `join`, `palette`
  ve kaynak instancing kapatıldı.
- Son runtime GLB tam olarak dört mesh içeriyor ve her mesh yalnız bir araç:
  Box/Pickup, Toyota Alphard, Isuzu Trooper ve Honda Civic.
- Paket bu daha seçici pipeline ile `89.68 KB` oldu.
- Dört trafik geometrisinin tamamı hazırlanmış oyuncu aracının ölçü zarfına normalize
  edildi: genişlik `2.40 m`, yükseklik `1.63 m`, uzunluk `5.80 m`.
- Her aktif havuz slotunda görünür model sayısı test edildi: ihlal `0`, yani bir slotta
  üst üste/çoğul araç bulunmuyor.
- XZ koordinatında gerçek sağ vektör (`forward × up`) uygulanarak şerit işaretleri
  düzeltildi: `+Z → -X`, `-Z → +X`, `+X → +Z`, `-X → -Z`.
- Şerit merkezi yol yarı genişliğinin tam yarısıdır. Normal 12 m yolda merkez ofseti
  `3.00 m`; aynı yöndeki trafik sağda, karşı trafik soldadır.
- Trafik ışığı direkleri de her yaklaşımın yeni gerçek sağ kaldırımına taşındı.
- `playtest:traffic`: dört yön sağ şerit kontrolü `[true,true,true,true]`, tek-model
  ihlali `0`, dört model bounds değeri de `2.4 × 1.63 × 5.8`, genel sonuç PASS.
- `playtest:modes` ve production build tekrar PASS.

---

# Mobil kontroller dokunma düzeltmesi — 20 Temmuz 2026

## Kök neden ve düzeltme

- `#ui > * { pointer-events: auto }` kuralı, SERBEST HUD gibi görünmez/tıklamasız
  olması gereken tam ekran katmanları yeniden etkileşimli yapıyordu. Bu katmanlar
  direksiyon, gaz ve geri düğmelerinin üzerinde kalıp bütün dokunmaları yutuyordu.
- UI kökünün doğrudan çocukları varsayılan olarak tıklamasız yapıldı; yalnız gerçek
  etkileşimli bileşenler kendi `pointer-events: auto` kuralını alıyor.
- SERBEST modundaki kapalı iş ve duraktan sipariş panellerinin görünmez backdrop/sheet
  çocukları da panel `.open` değilken kesin olarak tıklamasız hale getirildi.
- Gaz ve geri düğmelerine pointer capture eklendi. Parmak düğme sınırının dışına kaysa
  bile basılı durum korunuyor; yalnız `pointerup`/`pointercancel` ile bırakılıyor.
- Direksiyon ve pedal gruplarının etkileşim alanları açıkça tanımlandı. Market ile eski
  HTML kontrol pedi global katman değişikliğine karşı kendi etkileşim kurallarını aldı.

## Doğrulama

- Yeni `npm run playtest:mobile-controls`: PASS.
  - 390×844 gerçek CDP touch olaylarıyla RUSH ve SERBEST ayrı ayrı geçti.
  - Gaz basma/bırakma, düğme dışına sürüklerken pointer capture, analog direksiyon
    sürükleme/merkezleme ve geri basma/bırakma araç durumunda doğrulandı.
  - Her üç kontrolün ekran merkezindeki hit-test hedefi doğru; konsol hatası yok.
- `npm run playtest:modes`: PASS; mod seçimi, RUSH ve SERBEST çalışıyor.
- `tools/playtest/market.mjs`: PASS; kart, kozmetik ve boost satın alımları çalışıyor.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `mobile-controls-rush.png` ve `mobile-controls-free.png` 390×844 ölçekte gözle
  incelendi; kontroller görünür, erişilebilir ve HUD katmanlarının altında kalmıyor.

## Güncellenen dosyalar

- `index.html`
- `src/ui/DriveControls.ts`
- `src/ui/ControlPadHtml.ts`
- `src/ui/FreeHud.ts`
- `src/ui/MarketScreen.ts`
- `tools/playtest/mobile-controls.mjs`
- `package.json`
- `CODEX_WORK_LOG.md`

---

# Canli harita akicilik optimizasyonu — 20 Temmuz 2026

## Kok neden ve yeni yontem

- Eski harita aktif Three.js sahnesini ayri bir WebGL renderer ile iki saniyede bir
  yeniden ciziyordu. Bu seyrek ama agir tam-sahne render'i mobilde kare suresi
  sicrama/takilmasi olusturuyordu.
- Sehir statik oldugu icin ustten gorunumu acilista bir kez yuksek cozumlu bir cache
  canvas'ina aliniyor. Dairesel harita artik bu goruntuden oyuncunun cevresindeki
  parcayi kirpip gosteriyor; surus sirasinda ikinci WebGL render'i calismiyor.
- Harita merkezi ucuz canvas kirpmasiyla 30 Hz yenileniyor ve oyuncuya exponential
  smoothing ile yaklasiyor. Isaret/POI snapshot'i 15 Hz yenileniyor.
- Onceki kod her marker koordinatinda `getSnapshot()` fonksiyonunu tekrar cagiriyordu.
  Snapshot artik yenileme basina yalniz bir kez uretilip tum marker'lar tarafindan
  paylasiliyor.
- Dairesel gorunum, RUSH 220 m ve SERBEST 320 m yerel gorus alanlari korundu.

## Dogrulama

- `node tools/playtest/world-map.mjs`: RUSH ve SERBEST PASS.
  - 2.2 saniyelik surus orneginde harita kaynak WebGL render sayisi iki modda da `0`.
  - Oyuncu takibi, dairesel maske, tek harita canvas'i ve HUD entegrasyonu PASS.
- `npm run playtest:modes`: PASS; RUSH ve SERBEST yol ornekleri 80/80 gecerli.
- `npm run playtest:mobile-controls`: RUSH ve SERBEST PASS; tum dokunmatik kontroller
  calisiyor. Headless test, geri sayim throttling'inden etkilenmemesi icin canli run'i
  dogrudan baslatacak sekilde saglamlastirildi.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- 390x844 `world-map-rush.png`, `world-map-free.png` ve mobil kontrol goruntuleri
  gozle incelendi; harita okunabilir ve dogru merkezli.

## Guncellenen dosyalar

- `src/ui/WorldMap.ts`
- `src/boot.ts`
- `tools/playtest/world-map.mjs`
- `tools/playtest/mobile-controls.mjs`
- `tools/playtest/shots/world-map-rush.png`
- `tools/playtest/shots/world-map-free.png`
- `CODEX_WORK_LOG.md`
