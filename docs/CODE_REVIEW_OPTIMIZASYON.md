# Delivery Rush — Kod İncelemesi & Optimizasyon Yol Haritası

**Tarih:** 2026-07-20 · **Kapsam:** Sürüş mekaniği, order/teslimat noktaları, tüm
proje code review + optimizasyon adımları. Statik inceleme (kod okuması); yalnız
canlı bildirilen kritik hata için düzeltme uygulandı, geri kalanı planlanmış
adımlardır.

İncelenen sıcak dosyalar: `world/Vehicle3D.ts`, `world/Grid.ts`,
`ui/DriveControls.ts`, `render/ChaseCamera.ts`, `world/Orders3D.ts`,
`systems/RunController.ts`, `systems/JobBoard.ts`, `world/Pois.ts`,
`world/Traffic3D.ts`, `engine/Game.ts`, `core/Balance.ts`, `boot.ts`.

---

## Bölüm 1 — Sürüş Mekaniği

### 1.1 ✅ DÜZELTİLDİ — Gaz "takılı kalıyor" (araç girdisiz hızlanıyor)
**Belirti (kullanıcı):** "Gaza basmasam da hız artmaya devam ediyor."

**Kök neden (kesin):** `Vehicle3D.update` içinde ileri hız YALNIZCA
`if (this.throttle)` dalında artar (`Vehicle3D.ts:155-157`). Diğer tüm yollar
(reverse / coast / çarpışma / crash) hızı azaltır. Dolayısıyla girdisiz hızlanma
= `throttle` bayrağı `true` kilitlenmiş demektir → bir "bırakma" olayı kaçmış.

`DriveControls` bir tuş/pointer basılıyken pencere odağı kaybolursa (alt-tab,
sekme arka plana, uygulama değişimi, dev-tools) gelen `keyup`/`pointerup`
olayını alamıyordu → gaz `true` kalıyordu.

**Uygulanan düzeltme (`ui/DriveControls.ts`):**
- `window` `blur` + `document` `visibilitychange` → tüm hold-kontrolleri koşulsuz
  OFF'a çeken `releaseAll()` (klavye tutuşunu da kapsar; klavye `gasPointer` set
  etmediği için koşulsuz emit şart).
- Gaz/geri/direksiyon pedallarına `lostpointercapture` güvenlik bırakması.
- `destroy()` yeni dinleyicileri temizliyor. `npm run typecheck` PASS.

### 1.2 Coast (bırakınca yavaşça durma) çok uzun — FEEL, öneri
**Belirti:** "Bıraksam bile gitmeye devam ediyor." Bu ayrı ve beklenen bir
davranış: `World.coastDecel = 7 m/s²` ile üst hızdan (27 m/s) ~4 sn / ~50 m
süren uzun bir süzülme var.
**Öneri (feel, kullanıcı kararı):** `Balance.World.coastDecel` 7 → ~11–13 m/s²
yükselt; gaz bırakınca durma daha "tepki verir" hisseder. Alternatif: hafif bir
otomatik fren. Bu bir tuning tercihi — `Balance.ts` tek noktadan, oyun içi feel
ile ayarlanmalı. Kodda değiştirilmedi.

### 1.3 Düşük hızda direksiyon zayıf — FEEL, öneri
`turnFactor = min(1, |speed| / World.turnSpeedRef)` (`Vehicle3D.ts:171`),
`turnSpeedRef = 8 m/s (~29 km/h)`. 8 m/s altında dönüş oranı doğrusal olarak
zayıflar; dar şehir köşelerinde araç yavaşken zor dönüyor gibi gelebilir.
**Öneri:** `turnSpeedRef`'i 5–6'ya çek veya alt sınıra taban ekle
(`max(0.35, turnFactor)`) — yerinde pivot olmadan düşük hız dönüşü iyileşir.

### 1.4 Küçük / kabul edilebilir notlar (hata değil)
- **Geri viteste direksiyon aynı yönde** (`Vehicle3D.ts:172`, magnitude-only).
  Arcade için kabul edilebilir; gerçekçi istenirse geri viteste `steerInput`
  işaretini ters çevir.
- **Çarpışma köşe kesme:** `Grid.resolveRoads` eksen-bazlı iterek düzeltiyor
  (`Grid.ts:94-109`); yüksek hızda bina köşesini hafif kesebilir. Tünelleme yok
  (kare başına ~0.43 m << 12 m yol). Düşük öncelik.
- **Kamera bina içinden geçebilir** (çarpışma yok, `ChaseCamera.ts`). Düşük
  öncelik.
- **Trafik çarpışma mesafesi** `trafficHitDist = 3.4 m` merkez-merkez oldukça
  sıkı (araçlar 5.8×2.4 m). Adalet/feel için oyun içi ayarlanmalı.

---

## Bölüm 2 — Order / Teslimat Noktaları

**Genel sonuç: sağlam. Yapısal hata bulunmadı.**

### RUSH (`world/Orders3D.ts`)
- Order'lar kavşaklara (grid node) spawn oluyor; yollar üzerinde olduğundan
  `Nav.reachM = 13 m` ile ulaşılabilir. ✓
- Timer/expiry doğru: `current` NULL'lanmadan önce beacon'lar gizleniyor ve
  event `current = null`'dan SONRA emit ediliyor (`Orders3D.ts:213-219`,
  `238-242`) — eski "expiry soft-lock" hatası burada yok. ✓
- `pickNode` mesafe garantisini clamp sonrası tekrar kontrol ediyor + fallback
  var (`Orders3D.ts:248-261`). ✓
- **dt birimi doğru:** `RunController.update` saniye alıp `orders.update(dt*1000)`
  ile ms veriyor; `Orders3D.update` ms bekliyor (`RunController.ts:61`). ✓

### SERBEST (`systems/JobBoard.ts`, `world/Pois.ts`)
- POI'ler plot'un yol-cephesi kenarına `PoiSpawn.edgeInset = 6 m` içeri
  yerleşiyor; araç yol koridorunda kaldığı için merkez yerine kenar seçimi
  ulaşılabilirliği garantiliyor (`Pois.ts:107-120`). ✓
- Ekonomi doğru: `net = pay - penalty`, penalty `penaltyBase (= pay)` ile
  sınırlı → **net asla negatif olmuyor**, coin eksiye düşmez (`JobBoard.ts:199-216`). ✓
- Stop-to-order durum makinesi histerezisli (dismiss-lock, zone giriş/çıkış)
  temiz kurgulanmış (`JobBoard.ts:170-197`). ✓

### Bulgular (düşük öncelik)
- **B2-1 (robustness):** `refresh()` hem source hem dest POI ister; 18 POI
  `POI_DEFS`'ten rastgele seçilirken teorik olarak "hepsi source" / "hepsi dest"
  gelirse hiç iş üretilmez (`JobBoard.ts:61-64`). Olasılık çok düşük ama
  garanti yok. **Adım:** yerleştirmede en az 1 source + 1 dest garanti et.
- **B2-2 (UX):** Aktif işin hedefi bir source POI iken hem "pickup" hem
  "stop-to-order paneli" aynı anda tetiklenebilir. Sert hata değil; istenirse
  aktif iş varken stop-panelini bastır.
- Not: `playtest:free-orders`'ın ara sıra "source'a otomatik sür" adımında
  takılması order hatası DEĞİL — polis takibinin test sürücüsünü saptırması
  (bkz. `DEVELOPMENT_STATUS.md`). Testte polisi devre dışı bırakmak yeterli.

---

## Bölüm 3 — Komple Proje Code Review

### 3.1 Mimari (güçlü yanlar)
- Event-bus ile gevşek bağlı sistemler; `Balance.ts` tek tuning noktası;
  `Profile` tek mutasyon noktası; servis arayüzü soyutlaması. Temiz.
- Şehir/trafik/dekor `InstancedMesh` ile çiziliyor → düşük draw call (RUSH ~25,
  SERBEST ~35). İyi.
- Her mod tam sayfa reload ile boot ediyor → sahne teardown karmaşası ve bus
  dinleyici sızıntısı pratikte yok.

### 3.2 Correctness / Robustness bulguları
| # | Dosya | Bulgu | Öncelik |
|---|---|---|---|
| C1 | `ui/DriveControls.ts` | Stuck-throttle (odak kaybı) — **DÜZELTİLDİ** | ~~P0~~ ✅ |
| C2 | `systems/JobBoard.ts` | source/dest garantisi yok (B2-1) | P2 |
| C3 | `render/ChaseCamera.ts` | Kamera bina çarpışması yok | P3 |
| C4 | `world/Grid.ts` | Köşe kesme (eksen-bazlı eject) | P3 |

### 3.3 Performans / Optimizasyon adımları (öncelik sıralı)

**P1 — Ölçülebilir kazanç, düşük risk**
1. **Per-frame vektör allocation'ı kaldır** (`render/ChaseCamera.ts:26,30,35`):
   `update()` her karede 3 `new THREE.Vector3()` yaratıyor → GC baskısı. Sınıf
   alanı olarak reuse edilen temp vektörlere çevir. (Hem RUSH hem SERBEST'te
   her kare çalışıyor.)
2. **Bundle kod bölme (code-splitting)** — `boot.ts` başta her şeyi statik import
   ediyor; build 709 kB tek JS + `car_murphy.glb` (1.7 MB) + `car_cop.glb`
   (1.7 MB) uyarısı veriyor. **Adım:** mod-özel modülleri dinamik `import()` ile
   yükle:
   - GARAJ ve MARKET araç/kop/trafik modellerini yüklememeli (şu an cop yalnız
     free'de preload ediliyor — iyi; ama bundle hâlâ tek parça).
   - `startRush` / `startFree` / `startGarage` / `startMarket`'i ayrı chunk'lara
     böl → ilk paint ve mod açılışı hızlanır.
3. **`car_cop.glb` (1.7 MB)** yalnız SERBEST'te gerekli — dinamik import ile
   RUSH/GARAJ/MARKET yükünden çıkar.

**P2 — Mobil GPU**
4. **Gölge maliyeti:** `PCFSoftShadowMap` + `shadowMap.enabled` (`engine/Game.ts:31-32`)
   mobilde pahalı. Gölge haritası çözünürlüğünü düşür, gölge alan araç sayısını
   sınırla veya düşük-uç cihazda gölgeyi kapat (Profile ayarı ile).
5. **Her-kare DOM yazımı:** `FreeHud.setSpeed` her kare km/h yazıyor
   (`boot.ts:188`). Değer değişmediyse atla / ~5 Hz'e throttle et.
6. **Trafik `needsUpdate` bayrakları** her kare tüm instanced mesh'ler için
   set ediliyor (`Traffic3D.ts:296-300`) — aktif araç yoksa atlanabilir.

**P3 — Temizlik / bakım**
7. **Ölü Phaser (2D) katmanı:** 3D rewrite sonrası kullanılmayan dosyalar hâlâ
   derleniyor ve repoda kafa karıştırıyor: `scenes/*`, `gameplay/Vehicle.ts`,
   `gameplay/CityGrid.ts`, `gameplay/TrafficSystem.ts`, `systems/OrderSystem.ts`,
   `ui/ControlPad.ts`, `ui/ControlPadHtml.ts`, `ui/UiKit.ts`,
   `core/TextureFactory.ts` (ve muhtemelen `audio/*`, `effects/*`, `scenes`).
   `boot.ts` bunları import etmiyor → Vite tree-shake ile bundle'a girmiyorlar,
   ama `tsconfig` derliyor. **Adım:** `legacy/` altına taşı veya sil; `boot.ts`'i
   gerçek referans olarak `grep` ile doğrula.
8. **`Balance.ts` ölü tuning blokları:** `Vehicle`, `City`, `Camera`, `Traffic`,
   `Difficulty` (ve kısmen `Scoring`) 2D-Phaser içindi; 3D oyun `World`,
   `TrafficRules`, `Nav`, `Econ`, `Police`, `VehicleFeel`, `Garage` kullanıyor.
   Tuning yaparken yanlış blok değiştirme riski. **Adım:** ölü blokları
   `Legacy2D` altında grupla veya kaldır; başlığa "3D aktif / 2D ölü" notu.
9. **`git` deposu:** `.git` yeniden init edildi, `book-of-game` (nested git),
   `node_modules`, `dist`, `*.glb.bak` `.gitignore`'da. Netlify + Vercel config
   hazır.

### 3.4 Önerilen aksiyon sırası
- **P0:** ✅ Stuck-throttle (tamam).
- **P1 (bir sonraki tur, kullanıcı onayıyla):** ChaseCamera alloc reuse (#1),
  coast/turn feel ayarı (1.2/1.3, oyun içi), bundle kod bölme (#2/#3).
- **P2:** mobil gölge (#4), HUD/trafik per-kare (#5/#6), JobBoard garanti (B2-1).
- **P3:** ölü Phaser/Balance temizliği (#7/#8), kamera & köşe (#C3/#C4).

---

## Bölüm 4 — Yeni Oyuncu Tutorial'ı (plan)

**Hedef:** İlk kez giren oyuncuya kontrolleri (direksiyon sürükle + GAZ tut) ve
temel döngüyü (oku takip et → 📦 al → adrese götür → teslim et → kombo) rahatsız
etmeden, bağlamsal ve atlanabilir biçimde öğretmek. Mobil arcade standardı:
zorunlu değil, kısa, ilk-oturuma özel.

### 4.1 Deneyim akışı (event-güdümlü durum makinesi)
RUSH ilk açılışta (birincil onboarding). Adımlar bus olaylarını dinleyip
ilerler; her adım ilgili kontrolü "spotlight" ile vurgular:

| Adım | Mesaj | Vurgu | İlerleme koşulu |
|---|---|---|---|
| S0 | "Kurye olmaya hazır mısın?" [Başla] [Atla] | — | Buton |
| S1 | "GAZ'a basılı tut → ilerle" | Gaz pedalı | `SpeedChanged` kmh > 15, ~1 sn |
| S2 | "Direksiyonu sürükle → yön ver" | Direksiyon | `ControlSteerAxis` \|axis\|>0.3 |
| S3 | "Oku takip et, 📦 paketi al" | Nav ok + beacon | `OrderPickedUp` |
| S4 | "Adrese götür, teslim et!" | Yeşil beacon | `OrderDelivered` |
| S5 | "Kombo! Arka arkaya teslim = çarpan 🔥" | Kombo rozeti | 2.5 sn / dokun → biter |

Bitişte `Profile.markTutorialSeen()`; koşu normal devam eder.

### 4.2 Zamanlayıcı kilidi (adalet)
Tutorial sırasında oyuncu acele hissetmesin: `RunController`'a
`freezeTimer(bool)` ekle; S0–S3 arası koşu saati donuk, ilk pickup'ta (S3→S4)
çözülür. Alternatif: tutorial'ı 3-2-1 countdown'dan ÖNCE ayrı bir `intro`
fazında çalıştır.

### 4.3 Mimari (mevcut desenlere uyumlu)
- **Persistans:** `PlayerProfile.tutorialSeen: boolean` (default `false`);
  `SaveManager` sürüm migration bump; tek mutasyon `Profile.markTutorialSeen()`
  → `ProfileChanged` emit.
- **Tetik:** `boot.ts::startRush` içinde `if (!Profile.get().tutorialSeen) new Tutorial(ui)`.
- **Yeni dosya `ui/Tutorial.ts`:** native DOM overlay (FreeHud/Hud deseni). Kök
  `pointer-events: none` — spotlight altındaki gerçek kontrol basılabilir kalır
  (index.html'deki katman kuralına uyar); yalnız [Atla]/[Devam] butonları
  `auto`. Bus dinler, adım ilerletir, `bus.off` ile temizler.
- **Spotlight:** karartılmış tam-ekran + hedef kontrol konumunda "delik" (radial
  mask / clip) + kaption balonu + pulsing halka. Hedef koordinatları
  DriveControls/HUD element `getBoundingClientRect()`'inden alınır.
- **Tekrar oynatma:** Ayarlar veya menüde "Tutorial'ı tekrar göster" →
  `tutorialSeen=false`. İsteğe bağlı kalıcı "?" yardım butonu.

### 4.4 SERBEST için ikinci mini-coach (opsiyonel, P2)
Free moda ilk girişte tek coach-mark: "Bir mekâna yaklaş ve DUR → sipariş al"
(`StopZoneEnter` olayında). Ayrı bayrak `freeTutorialSeen`.

### 4.5 Kapsam / öncelik
- **P1 (çekirdek):** S0–S5 RUSH tutorial + persistans + timer freeze.
- **P2:** SERBEST mini-coach, "tekrar göster", lokalize metinler.
- **Dokunulacak dosyalar:** yeni `ui/Tutorial.ts`; `types/index.ts`
  (+`tutorialSeen`), `managers/SaveManager.ts` (migration),
  `managers/ProfileStore.ts` (`markTutorialSeen`), `systems/RunController.ts`
  (`freezeTimer`), `boot.ts` (tetik). Gameplay/fizik değişmez.

---

**Uygulanan değişiklik (bu tur):** `src/ui/DriveControls.ts` — stuck-throttle
güvenlik bırakması (§1.1). `npm run typecheck` PASS. Diğer tüm maddeler
(Bölüm 1.2+ , 2, 3, 4 dahil) planlanmış adımlardır; kod değiştirilmedi.
