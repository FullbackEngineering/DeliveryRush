# Delivery Rush — Proje Taraması & Konsolide Plan

**Tarih:** 2026-07-20 · **Yapan:** Opus (tam kod taraması) · **Kapsam:** tüm `src/`
reachability analizi, kod temizliği, SOLID, mevcut plan/döküman durumu, ve kalan
işlerin önceliklendirilmiş planı. Kalan kodlama **Sonnet ajanlarına** devredilecek
(boot.ts / Balance.ts / EventBus.ts **Opus lane'inde kalır**).

> Bu doküman `DEVELOPMENT_STATUS.md` + `CODE_REVIEW_OPTIMIZASYON.md`'yi konsolide
> eder ve **canlı durumu** yansıtır. Bir çelişki olursa bu dosya kazanır.

---

## 0 — En kritik bulgu: dökümanlar ölü mimariyi anlatıyor

`index.html` → `src/boot.ts` (Three.js 3D). Ama üç rehber döküman hâlâ **silinmiş
2D Phaser** oyununu anlatıyor:
- `CLAUDE.md` — "Stack: Phaser 3.90", `Vehicle.setThrottle`, `TextureFactory`,
  `AudioManager`, `scenes/` orkestratörü → **hepsi ölü**.
- `AGENTS.md` — aynı bayat Phaser tarifi (Codex bunu okuyor).
- `DEVELOPMENT_STATUS.md` — "REMAINING" planı ölü `GameScene.resolveCards()`,
  `CityGrid`, `OrderSystem`'e atıf yapıyor; artık geçersiz.

**Sonuç:** yeni bir oturum (veya Codex) yanlış zihinsel modelle başlıyor. Bu, ölü
kod temizliğiyle **aynı anda** düzeltilmeli. → İş A.

---

## 1 — Reachability taraması (kanıt)

`boot.ts`'ten geçişli import izlendi (`tmp/reach2.mjs`):

- **CANLI: 40 dosya** — temiz 3D oyun (`world/*`, `render/`, `engine/`, canlı
  `ui/*`, `systems/{RunController,JobBoard,Shop,RunState}`, `data/`, `types/`,
  `core/{Balance,EventBus,Palette}`, `managers/`, `services/`, `utils/{Rng,MathUtils}`).
- **ÖLÜ: 23 dosya · ~2971 satır · kod tabanının %28'i** — `boot.ts`'ten hiç
  ulaşılmıyor, sadece `tsc` derliyor ve repo'yu kirletiyor:
  `main.ts`, `scenes/*` (7 dosya), `gameplay/*` (Vehicle/CityGrid/TrafficSystem),
  `systems/OrderSystem.ts`, `ui/{ControlPad,ControlPadHtml,UiKit}.ts`,
  `core/{TextureFactory,SceneKeys}.ts`, `data/{cards,themes}.ts`,
  `audio/AudioManager.ts`, `effects/Effects.ts`, `input/Haptics.ts`,
  `utils/ObjectPool.ts`.
- **`phaser` importları YALNIZCA bu 23 ölü dosyada** → ölü katman gidince
  `package.json`'dan `phaser` bağımlılığı tamamen kaldırılabilir (kurulum + tsc hızı).
- `src/vite-env.d.ts` reachability'de "ölü" görünür ama ambient tip beyanıdır
  (`import.meta.env`) — **KALMALI**.

### Canlı kod temizliği (iyi durumda)
- TODO/FIXME/HACK yok; sadece 3 meşru `console.warn` (asset-fallback).
- ~11 `as unknown as`/any — çoğu `window as unknown as Record` harness-hook kalıbı, kabul edilebilir.

### Ölü Balance blokları (`core/Balance.ts`)
Canlı kodda 0 referanslı bloklar: **`City`, `Vehicle`, `Camera`, `Difficulty`**
(muhtemelen `Design`, `Juice`, kısmen `Scoring`). Canlı: `World`, `TrafficRules`,
`Nav`, `Econ`, `Police`, `VehicleFeel`, `Garage`, `Decor`, `PoiSpawn`, `RUSH/FREE_CITY`,
`Run`. → Yanlış blok düzenleme riski. Her blok tek tek doğrulanıp kaldırılmalı.

---

## 2 — Mevcut planların durumu

| Plan / Faz | Durum |
|---|---|
| 3D rewrite (Phase 1–5, 60sn loop) | ✅ Bitti, doğrulandı |
| Mod split (Rush/Serbest) + config-driven şehir | ✅ Bitti |
| Bina çarpışması (`Grid.resolveRoads`) | ✅ Bitti |
| Açık dünya order/JobBoard/cüzdan (`OPEN_WORLD_ORDERS_PLAN.md`) | ✅ Bitti |
| Garage/car gallery (`GARAGE_GALLERY_PLAN.md`) | ✅ Bitti, doğrulandı |
| Police / hız cezası (Phase 2, `PHASE_2_3_...`) | ✅ Bitti |
| Vehicle juice / tekerlek-direksiyon (Phase 3) | ✅ Bitti |
| Market / Shop | ✅ Bitti |
| Şehir dekoru (NY skyline + okullar) | ✅ Bitti |
| Stuck-throttle güvenlik fix'i (CODE_REVIEW §1.1) | ✅ Bitti (commit edilmedi) |
| Scooter starter aracı + prosedürel kurye | ⚠️ Kod tamam (commit edilmedi); **kurye çok küçük/kötü** (kullanıcı bildirdi) |
| **Audio (3D)** | ❌ **YOK** — 3D oyun tamamen sessiz; `AudioManager` ölü Phaser sürümü |
| Tutorial (CODE_REVIEW Bölüm 4) | ❌ Planlı, yapılmadı |
| Meta ekranlar (Missions/Leaderboard/Season/Profile/Customization) | ❌ Stub |

---

## 3 — Konsolide İş Planı (önceliklendirilmiş)

Her iş: **[Lane]** (Opus = boot/Balance/EventBus/mimari; Sonnet = izole dosya),
risk, ve doğrulama.

### İŞ A — Ölü kod temizliği + döküman gerçeği  · P0 · en yüksek kaldıraç
- **A1** [Sonnet] 23 ölü dosyayı `src/legacy/` altına taşı (silme yerine, bazıları —
  audio/haptics/effects/pool — 3D'ye ileride uyarlanabilir referans). `tsconfig`'e
  `exclude: ["src/legacy"]` ekle → tsc artık derlemesin. `boot.ts`'in hiçbirine
  atıf yapmadığını `grep`'le doğrula.
- **A2** [Opus] `package.json`'dan `phaser` bağımlılığını kaldır (yalnız legacy import
  ediyordu). `npm run build` + `typecheck` PASS.
- **A3** [Opus] `Balance.ts` ölü bloklarını (`City`/`Vehicle`/`Camera`/`Difficulty`
  ± `Design`/`Juice`) blok-blok doğrulayıp kaldır; başa "3D aktif / 2D ölü" notu.
- **A4** [Opus] `CLAUDE.md`, `AGENTS.md`, `DEVELOPMENT_STATUS.md`'yi **canlı 3D
  mimariye** göre yeniden yaz (bu doküman kaynak). Bayat "Phaser/TextureFactory"
  tarifini sil.
- **Doğrulama:** `typecheck` + `build` PASS; bundle küçülür.

### İŞ B — Canlı kod SOLID / temizlik  · P1
- **B1** [Opus] `boot.ts` (383 sat.) God-modül: routing + 4-mod kompozisyon +
  harness + asset preload + modül-global state. Mod kompozisyonunu `modes/{rush,
  free,garage,market}.ts`'e çıkar; `boot.ts` ince router+preload olarak kalsın
  (kompozisyon kökü, ama tek sorumlu). **Dikkatli — tek entegrasyon noktası.**
- **B2** [Sonnet] `world/Traffic3D.ts` (781 sat., en büyük canlı dosya) — pooling +
  AI + çarpışma + yaya + render karışık. SRP için sorumlulukları böl (önce
  değerlendir, sonra ayır).
- **B3** [Sonnet] `ui/FreeHud.ts` (557 sat.) — büyük DOM HUD; okunabilirlik için
  parçalara böl + B'deki per-kare DOM yazımını (bkz. C2) burada çöz.

### İŞ C — Performans  · P1/P2
- **C1** [Sonnet] `render/ChaseCamera.ts` — `update()` her kare 3 `new THREE.Vector3`
  (satır 26/30/35) yaratıyor. Sınıf-alanı temp vektörlere çevir. **Onaylandı.**
- **C2** [Sonnet] `FreeHud.setSpeed` + `Hud` per-kare DOM yazımı — değer değişmediyse
  atla / ~5–10 Hz throttle.
- **C3** [Sonnet] `Traffic3D` `needsUpdate` bayrakları her kare tüm instanced mesh'ler
  için set ediliyor — aktif araç yoksa atla.
- **C4** [Opus] Bundle kod-bölme: `startRush/Free/Garage/Market`'i dinamik `import()`
  ile ayrı chunk'lara böl; `car_cop.glb` (1.7 MB) yalnız Serbest'te yüklensin.
- **C5** [Opus] Araç GLB'sini yalnız 4 tekerlek node'u ayrı, gövde birleşik olacak
  şekilde re-export et (~62 draw → ~10 hedef; wheels-separate re-export regresyonu).
- **C6** [Sonnet] Mobil gölge maliyeti: `PCFSoftShadowMap` çözünürlük/araç sayısı
  sınırla veya düşük-uç Profile ayarıyla kapat.

### İŞ D — Gameplay boşlukları / correctness  · P2
- **D1** [Opus] **Scooter kurye düzeltmesi** — `makeCourierRider` figürü aşırı küçük/
  kötü (kullanıcı bildirdi). Boyut/oran/poz düzelt + `garage.mjs`'in starter renk
  assertion'ını güncelle (scooter `tintBody:false`, artık `/body/i` boyanmıyor).
  Görsel → tarayıcıda doğrula. **(Feel-first: Opus lane.)**
- **D2** [Opus] **Audio (YOK)** — 3D oyun sessiz. WebAudio manager'ı 3D'ye uyarla/
  yeniden yaz (motor gürültüsü hız-perdeli, pickup/deliver/kombo/crash/siren). Bus
  dinleyici. Legacy `AudioManager` referans olarak var.
- **D3** [Sonnet] `JobBoard.refresh()` en az 1 source + 1 dest garanti et (B2-1;
  düşük olasılık ama garanti yok).

### İŞ E — Yeni özellikler (planlardan)  · P3
- **E1** [Sonnet] Yeni-oyuncu tutorial'ı (CODE_REVIEW Bölüm 4: S0–S5 RUSH, persistans,
  timer freeze). Yeni `ui/Tutorial.ts`; `tutorialSeen` + SaveManager migration.
- **E2** [Sonnet] Kalan meta ekranlar (Missions / Leaderboard / Season / Profile /
  Customization) — veriler/servisler zaten var.

---

## 4 — Önerilen sıra + Sonnet devri

1. **İŞ A** (temizlik + döküman) — önce; zemini temizler, riski düşük.
2. **C1 + C2 + C3 + D3** — küçük, izole, yüksek kaldıraçlı Sonnet paketi (paralel).
3. **B1 (boot refactor, Opus)** — A sonrası, dikkatli.
4. **D1 (scooter, Opus) + D2 (audio)**.
5. **C4/C5 (bundle+araç, Opus) → B2/B3 → E** kalanları.

**Lane kuralı:** Sonnet ajanları `boot.ts` / `Balance.ts` / `EventBus.ts`'e
dokunmaz; entegrasyon Opus'ta. Codex ayrı lane'de (yeni dosya ekler; Market + şehir
canlandırma + asset export) — `CODEX_WORK_LOG.md`.
