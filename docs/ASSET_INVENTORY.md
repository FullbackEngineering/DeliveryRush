# Yeni Asset Envanteri — 20 Temmuz 2026

Bu katalog yalnızca 20 Temmuz 2026 tarihinde `export_assets/` altına eklenen ve görevde
adı verilen yedi GLB dosyasını kapsar. Değerler `@gltf-transform/core` ile GLB yapısı
okunarak çıkarılmıştır. Üçgen sayısı primitive index sayısından, vertex sayısı
`POSITION` accessor toplamından hesaplanmıştır.

## Özet

| Asset | Boyut | Üçgen | Vertex | Mesh / materyal | Skin / animasyon | Önerilen şerit |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Delivery scooter | 163.8 KiB | 3.874 | 3.451 | 9 / 4 | 0 / 0 | **Claude** |
| Low-poly building | 317.7 KiB | 4.353 | 8.230 | 7 / 6 | 0 / 0 | **Codex** |
| Phone-walking man | 66.7 KiB | 1.479 | 1.309 | 8 / 6 | 0 / 0 | **Codex** |
| Male 03 A | 86.8 KiB | 1.128 | 2.256 | 1 / 1 | 0 / 0 | **Codex** |
| Male people pack | 703.9 KiB | 27.317 | 16.059 | 8 / 1 | 0 / 0 | **Codex** |
| Freebie low-poly people | 731.3 KiB | 4.349 | 13.036 | 22 / 1 | 0 / 0 | **Codex** |
| Free sample people pack | 5.20 MiB | 14.514 | 29.392 | 15 / 2 | 8 / 1 | **Codex**, seçili figür çıkarılırsa |

## 1. Delivery scooter

- **Dosya:** `export_assets/vehicle/delivery_scooter.glb`
- **Dosya boyutu:** 167.740 byte / 163.8 KiB
- **Geometri:** 3.874 üçgen, 3.451 vertex, 9 mesh ve 9 primitive
- **Materyal:** 4 adet (`body`, `Material.002`, `tyre`, `axel`)
- **İskelet/animasyon:** Skin yok, animasyon yok
- **Node sayısı:** 21
- **Ana node adları:** `Sketchfab_model`, `root`, `GLTF_SceneRootNode`, `body_0`,
  `front_sheild_1`, `box_2`, `box_cap_3`, `small_light_4`, `suspention_5`,
  `tyre-1_6`, `tyre-2_7`, `handle_8`
- **Mesh adları:** `Object_0`–`Object_8`
- **Mesh dağılımı:** Gövde 1.134 üçgen; ön shield 376; kutu 234; kutu kapağı 78;
  ışık 76; süspansiyon 152; iki lastik 540'ar; gidon 744 üçgen.
- **Nedir:** Arkasında teslimat kutusu bulunan, ayrı lastik/gidon/gövde parçalarına
  sahip düşük poligonlu kurye scooter'ı.
- **Oyunda önerilen kullanım:** Playable araç roster'ı, garaj önizlemesi ve
  `Vehicle3D` sürüş modeli. İkinci seçenek olarak kaldırımlarda statik park edilmiş
  scooter prop'u olabilir.
- **Şerit kararı:** **Claude.** Araç roster'ı, garaj, `Vehicle3D` ve araç modeli
  pipeline'ı Claude'un şerididir. Codex bu asseti entegre etmeyecek ve optimize
  edilmiş playable model üretmeyecektir.

## 2. Low-poly building

- **Dosya:** `export_assets/building/low_poly_building.glb`
- **Dosya boyutu:** 325.308 byte / 317.7 KiB
- **Geometri:** 4.353 üçgen, 8.230 vertex, 7 mesh ve 7 primitive
- **Materyal:** 6 adet
- **İskelet/animasyon:** Skin yok, animasyon yok
- **Node sayısı:** 18
- **Ana node adları:** `Sketchfab_model`, `2417a00bfae1461ba687a0b1038014f1.fbx`,
  `RootNode`, `Object014`–`Object020`
- **Mesh adları:** `Object014_15 - Default6_0`, `Object015_17 - Default_0`,
  `Object016_16 - Defaultghj_0`, `Object017_17 - Default_0`,
  `Object018_06 - Default_0`, `Object019_04_0`, `Object020_15 - Default_0`
- **Mesh dağılımı:** 60, 2, 1.211, 2.814, 66, 166 ve 34 üçgenlik yedi parça.
- **Nedir:** Renkli cephe detaylarına sahip tek bir stilize, düşük poligonlu kent binası.
- **Oyunda önerilen kullanım:** `CityDecor` içindeki daha önce devre dışı bırakılan
  kit bina katmanının yerine geçecek gerçek kit varyantı. SERBEST şehrinde ayrılmış
  plot'lara döndürülmüş ve farklı ölçeklerde yerleştirilebilir; gerekirse RUSH için
  de seyrek varyant olarak kullanılabilir.
- **Şerit kararı:** **Codex.** `CityView` / `CityDecor` görsel şehir katmanına aittir.

## 3. Low-poly man taking phone while walking

- **Dosya:** `export_assets/people/low_poly_man_taking_phone_while_walking.glb`
- **Dosya boyutu:** 68.268 byte / 66.7 KiB
- **Geometri:** 1.479 üçgen, 1.309 vertex, 8 mesh ve 8 primitive
- **Materyal:** 6 adet
- **İskelet/animasyon:** Skin yok, animasyon yok; yürüyüş pozu mesh'e bake edilmiş
- **Node sayısı:** 26
- **Ana node adları:** `Sketchfab_model`, `f04bdc31ff4d40d6b9bc5b84702c16d1.fbx`,
  `RootNode`, `Line008`, `Line005`, `Object008`, `Object007`, `Object006`,
  `Object005`, `Object002`, `Object001`
- **Mesh adları:** `Line008_06 - Default_0`, `Line005_07 - Default_0`,
  `Object008_02 - Default_0`, `Object007_03 - Default_0`,
  `Object006_02 - Default_0`, `Object005_06 - Default_0`,
  `Object002_05 - Default_0`, `Object001_04 - Default_0`
- **Nedir:** Telefona bakarken adım atan erkek figürü; statik yürüyüş pozu sayesinde
  iskelet animasyonu olmadan ambient hareket için uygundur.
- **Oyunda önerilen kullanım:** Parçaları tek geometride birleştirildikten sonra
  `Traffic3D` yaya varyantlarından biri. Aynı mesh farklı yön, faz ve hızlarla
  instancing yapılarak kaldırımlarda kullanılabilir.
- **Şerit kararı:** **Codex.** Ambient yaya katmanı `Traffic3D` şeridindedir.

## 4. Low-poly male 03 A

- **Dosya:** `export_assets/people/low_poly_male_03_a.glb`
- **Dosya boyutu:** 88.872 byte / 86.8 KiB
- **Geometri:** 1.128 üçgen, 2.256 vertex, 1 mesh ve 1 primitive
- **Materyal:** 1 adet (`palette`)
- **İskelet/animasyon:** Skin yok, animasyon yok
- **Node sayısı:** 5
- **Node adları:** `Sketchfab_model`, `male_03_a.fbx`, `RootNode`, `male_03_a`,
  `male_03_a_palette_0`
- **Mesh adı:** `male_03_a_palette_0`
- **Nedir:** Tek mesh, palet dokulu, nötr pozlu düşük poligonlu erkek figürü.
- **Oyunda önerilen kullanım:** Hazır tek-mesh yapısı nedeniyle en düşük entegrasyon
  riskli yaya varyantı; kaldırımlarda yürüyen veya durakta bekleyen vatandaş.
- **Şerit kararı:** **Codex.** Ambient yaya katmanı.

## 5. Low-poly people pack — male

- **Dosya:** `export_assets/people/low_poly_people_pack_male.glb`
- **Dosya boyutu:** 720.816 byte / 703.9 KiB
- **Geometri:** 27.317 üçgen, 16.059 vertex, 8 mesh ve 8 primitive
- **Materyal:** 1 adet
- **İskelet/animasyon:** Skin yok, animasyon yok
- **Node sayısı:** 19
- **Ana node adları:** `Sketchfab_model`, `7f5d8e2586454abb90d96ab409e86d40.fbx`,
  `RootNode`, `1`–`8`, `1__0`–`8__0`
- **Mesh adları ve üçgenleri:** `1__0` 4.164; `2__0` 4.332; `3__0` 3.194;
  `4__0` 3.592; `5__0` 2.527; `6__0` 2.929; `7__0` 2.846; `8__0` 3.733.
- **Nedir:** Sekiz ayrı erkek figürden oluşan statik insanlar paketi.
- **Oyunda önerilen kullanım:** Yakın kamera için daha detaylı özel NPC veya POI
  çalışanı. Ambient kalabalık için üçgen maliyeti freebie paketinden belirgin yüksek;
  tüm paket yerine gerekirse yalnız en hafif `5__0` çıkarılmalı.
- **Şerit kararı:** **Codex**, fakat varsayılan kalabalık kaynağı olarak önerilmez.

## 6. Freebie — low-poly people

- **Dosya:** `export_assets/people/freebie_-_lowpoly_people.glb`
- **Dosya boyutu:** 748.852 byte / 731.3 KiB
- **Geometri:** 4.349 üçgen, 13.036 vertex, 22 mesh ve 22 primitive
- **Materyal:** 1 adet
- **İskelet/animasyon:** Skin yok, animasyon yok
- **Node sayısı:** 47
- **Figür node/mesh adları:** `Woman01`–`Woman10`, `Man01`–`Man10` ve karşılık gelen
  `Woman##_0057D0_0` / `Man##_0057D0_0` mesh'leri
- **Yardımcı mesh'ler:** `Box1_0057D0_0`, `Box2_0057D0_0`
- **Figür üçgen aralığı:** 154–274 üçgen. Örnekler: `Woman05` 154,
  `Woman08` 202, `Man03` 160, `Man08` 174, `Man09` 274.
- **Nedir:** On kadın ve on erkek olmak üzere yirmi çok düşük poligonlu statik figür;
  ambient kalabalık için incelenen paketler arasındaki en iyi geometri bütçesine sahip.
- **Oyunda önerilen kullanım:** Paketten 2–4 figür ayrı GLB'lere çıkarılıp her biri
  tek mesh olarak optimize edilmeli. Önerilen ilk seçki: `Woman05`, `Woman08`,
  `Man03`, `Man08`. Her varyant ayrı `InstancedMesh` grubuyla çoklanabilir.
- **Şerit kararı:** **Codex.** Ana ambient yaya kaynağı olarak seçildi.

## 7. Low-poly people free sample pack

- **Dosya:** `export_assets/people/low_poly_people_free_sample_pack.glb`
- **Dosya boyutu:** 5.447.480 byte / 5.20 MiB
- **Geometri:** 14.514 üçgen, 29.392 vertex, 15 mesh ve 15 primitive
- **Materyal:** 2 adet
- **İskelet/animasyon:** 8 skin, 1 animasyon (`Take 001`)
- **Node sayısı:** 385; büyük bölümünü sekiz karakterin rig/bone hiyerarşisi oluşturur
- **Karakter mesh adları:** `casual_Female_G_peopleColorsFam_0`,
  `casual_Female_K__peopleColorsFam_0`, `casual_Male_G_peopleColorsFam_0`,
  `casual_Male_K_peopleColors_0`, `Doctor_Male_B_peopleColors_0`,
  `elder_Female_A_peopleColors_0`, `little_boy_B_peopleColors_0`,
  `police_Female_A_peopleColors_0`
- **Aksesuar mesh'leri:** `acc_hair_punkin__peopleColorsFam_0`,
  `acc_intelect_glasses_peopleColors_0`, `boxphone_peopleColors_0`,
  `stetho_peopleColors_0`, `acc_intelect_glasses001_peopleColors_0`,
  `hair_oldLady_peopleColors_0`, `hair_peopleColors_0`
- **Nedir:** Sekiz rigli karakter, aksesuarlar ve ortak animasyon içeren kapsamlı örnek
  insanlar paketi.
- **Oyunda önerilen kullanım:** Paket bütünüyle oyuna alınmamalı. İleride özel POI
  karakteri gerekirse yalnız tek figür, pozu bake edilerek, skin/animasyon ve gereksiz
  aksesuarlar atılarak çıkarılabilir. Mevcut ambient yaya ihtiyacı için 731 KiB'lik
  freebie paketi daha ucuz ve daha uygundur.
- **Şerit kararı:** **Codex** ancak bu görevde entegrasyon için seçilmedi; kaynak
  katalogda tutulacak, 5.20 MiB paket bundle'a eklenmeyecek.

## Entegrasyon kararı

- **Yaya kaynağı:** `freebie_-_lowpoly_people.glb` içinden dört hafif figür:
  `Woman05`, `Woman08`, `Man03`, `Man08`.
- **İkincil yaya adayı:** Tek mesh hazır olduğu için `low_poly_male_03_a.glb`;
  görsel seçki kontrolünde gerekirse dört figürden birinin yerine kullanılabilir.
- **Bina kaynağı:** `low_poly_building.glb`, optimize edilmiş yeni bir kit bina GLB'si.
- **Kullanılmayacak paket:** `low_poly_people_free_sample_pack.glb` bütünüyle alınmayacak.
- **Claude'a bırakılan:** `delivery_scooter.glb`; playable araç veya garaj bağlantısı
  yapılmayacak.

## Entegrasyon sonrası görsel seçim güncellemesi

İlk katalog seçkisindeki dört `freebie` figürü ayrı GLB'lere çıkarılıp optimize edildi
ve tarayıcıda denendi. Kaynak paket bütün figürleri tek mavi materyalle verdiği için
oyunda renkli vatandaş yerine mavi maket gibi göründüler. Bu nedenle runtime seçkisi
görsel kontrolden sonra aşağıdaki iki daha güçlü figürle değiştirildi:

- `low_poly_man_taking_phone_while_walking.glb` →
  `src/assets/models/ped_phone_walk.glb` — 13.33 KiB, tek mesh, yürüyüş pozu ve
  çok renkli palet.
- `low_poly_male_03_a.glb` → `src/assets/models/ped_male03.glb` — 26.10 KiB,
  tek mesh ve renkli palet.

Bu seçim iki figür şartını karşılar, yaya katmanını iki instanced draw'da tutar ve
5.20 MiB rigli örnek paketi bundle dışında bırakır. Freebie'den çıkarılan dört mavi
değerlendirme çıktısı görsel seçimden sonra `src/assets/models/` altından silindi;
uygulama koduna ve Vite production bundle'ına girmez.

Nihai bina çıktısı `src/assets/models/building_kit_lp.glb` dosyasıdır: 43.60 KiB.
Runtime'da kaynak materyal grupları iki `InstancedMesh` olarak paylaşılır; beş bina
yerleşimi toplam iki draw kullanır.
