# 🇻🇳 VerifiedVietCoffee — Implementation Plan v3

> **Farm-level traceability cho Specialty Coffee Việt Nam**
> **Scope: từ cây cà phê → nhân xanh (green bean)**
> Version 3.0 — May 2026 · Post-mentor review
> Cardano SEA Hackathon 2026

---

## Thay đổi so với v2 (theo feedback mentor)

| Mục | v2 | v3 (mentor feedback) |
|-----|-----|----------------------|
| **Target** | Nông hộ nhỏ + SME chung | **Specialty coffee farm** (như Bình Đông Farm) |
| **Scope** | Toàn bộ chuỗi tới consumer | **Chỉ farm → nhân xanh** (chưa rang) |
| **Data collection** | Voice recording (AI) | **IoT 5-cluster** (soil/weather/plant/processing/backbone) |
| **Blockchain role** | Core platform | **Plugin cắm vào** — IoT + server là chính |
| **On-chain / Off-chain** | Chưa rõ | **Hybrid 4-tier anchor**: daily Merkle + milestone + weekly media + sustainability |
| **Hash strategy** | Flat SHA-256 | **Merkle tree** — verify single event qua proof |
| **Phân thuốc/dư lượng** | Có trong scope | **Ngoài scope** — bên thứ 3 (lab EU) cấp chứng nhận |
| **EUDR compliance** | Phase 2 | **Phase 1 must-have** — bắt buộc xuất EU sau 30/12/2025 |
| **Sustainability** | Không rõ | **SustainabilityProof struct** trong CIP-68 datum (CO₂e, water, SOM, organic ratio, biodiversity) |
| **Fertilizer "4 đúng"** | Không có | **Track mỗi lần bón** với GPS + load cell + NFC bao + soil NPK |
| **Phase 2** | EUDR export | **Đơn đặt hàng từ Nhà Rang / Coffee Shop** + real IoT deployment |
| **Phase 3** | National hub | **Robot + Agent-to-Agent via Hydra** + carbon credit tokenization |
| **GPS polygon** | Farmer vẽ tay | **Giấy tờ đất + fly camera + Google Map** + Sentinel-2 baseline |
| **Trust layer** | Server wallet | **IoT device attestation (ATECC608A) + VPS riêng** tăng trust |

---

## 1. Hiểu đúng Scope: Specialty Coffee Farm

### Farm tham khảo: Bình Đông Farm (Lâm Đồng)

Bình Đông Farm là ví dụ điển hình cho target customer:
- Specialty coffee farm ở Bảo Lộc, Lâm Đồng, độ cao 900m
- Quy trình khép kín: trồng → thu hoạch → sơ chế → nhân xanh
- Chất lượng theo chuẩn SCA (Specialty Coffee Association)
- Bán cho nhà rang (roaster) trong và ngoài nước

### Scope: Từ cây → nhân xanh — không đi xa hơn

```
CÂY CÀ PHÊ                        NHÂN XANH
  ║                                  ║
  ║  ← VerifiedVietCoffee scope →    ║
  ║                                  ║
  ▼                                  ▼
┌──────┐  ┌──────┐  ┌─────┐  ┌─────┐  ┌──────┐  ┌────────┐
│Trồng │→ │Chăm  │→ │Thu  │→ │Sơ   │→ │Phơi/ │→ │Nhân    │ → [Ngoài scope]
│      │  │sóc   │  │hoạch│  │chế  │  │Sấy   │  │xanh    │ → Rang → Pha
│      │  │      │  │     │  │     │  │      │  │(green) │ → Đóng gói
└──────┘  └──────┘  └─────┘  └─────┘  └──────┘  └────────┘
  IoT       IoT      IoT     Camera    IoT       Lab test
  sensor    sensor   camera   + IoT    sensor    (bên thứ 3)
```

### Quy trình chế biến cà phê: Cherry → Green Bean

Specialty coffee có nhiều phương pháp sơ chế, mỗi cách tạo flavor khác nhau:

**1. Thu hoạch (Harvesting)**
Hái chọn lọc quả chín đỏ. Specialty coffee yêu cầu selective picking — chỉ hái quả chín, không tuốt cả cành.

**2. Phân loại (Sorting/Floating)**
Loại quả xanh, quả hư. Ngâm nước — quả nổi là quả lỗi, vớt bỏ.

**3. Sơ chế (Processing) — 3 phương pháp chính:**
- **Washed (ướt):** Xát vỏ → lên men 12-48h → rửa sạch → phơi/sấy. Cho vị "sạch", chua thanh.
- **Natural (khô):** Phơi nguyên quả 3-4 tuần → tách vỏ. Cho vị ngọt, fruity.
- **Honey (mật ong):** Xát vỏ, giữ lại phần nhầy (mucilage) → phơi → tách. Bình Đông Farm nổi tiếng với Yellow Honey.

**4. Phơi/Sấy khô (Drying)**
Giảm độ ẩm xuống 10-12%. Phơi trên giàn raised bed hoặc sấy máy. Nhiệt độ và thời gian rất quan trọng.

**5. Nghỉ/Ủ (Resting)**
Nhân cà phê nghỉ trong vỏ trấu 1-2 tháng. Giúp ổn định flavor.

**6. Xát vỏ trấu (Hulling)**
Tách vỏ trấu (parchment) → ra nhân xanh.

**7. Phân loại & đánh giá (Grading)**
Phân loại theo kích cỡ, màu sắc, defect. Cupping test theo chuẩn SCA (80+ điểm = specialty grade).

**8. Đóng bao xuất (Packaging)**
Nhân xanh đóng bao GrainPro hoặc jute bag. Sẵn sàng gửi cho roaster.

→ **VerifiedVietCoffee ghi nhận data ở mỗi bước từ 1→8. Lab test (bước 7) do bên thứ 3 thực hiện — mình chỉ nhận kết quả và gắn vào passport.**

---

## 2. Architecture Overview (IoT-first, Cardano as plugin)

```
┌─────────────────────────────────────────────────────────────────┐
│                   VERIFIEDVIETCOFFEE v3                          │
│                   "IoT là chính, Cardano là plugin"              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EDGE LAYER (tại farm)                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  IoT Sensors  │  │  Camera       │  │  GPS Module       │   │
│  │  (giả lập MVP)│  │  (fly/fixed)  │  │  + Giấy tờ đất   │   │
│  │               │  │               │  │  + Google Map     │   │
│  │ • Nhiệt độ    │  │ • Thu hoạch   │  │ • Polygon vườn    │   │
│  │ • Độ ẩm       │  │ • Sơ chế      │  │ • Diện tích       │   │
│  │ • Độ ẩm hạt   │  │ • Phơi/sấy   │  │ • Độ cao          │   │
│  │ • Thời tiết   │  │ • Kho bảo quản│  │                   │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬─────────┘   │
│          │                  │                     │             │
│          └──────────────────┼─────────────────────┘             │
│                             │ MQTT / HTTP                       │
│                             ▼                                   │
│  SERVER LAYER                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    VPS (tự host)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Data Ingest │  │ Event Store │  │ Batch Scheduler  │  │   │
│  │  │ (realtime)  │  │ (PostgreSQL)│  │ (cuối ngày gom   │  │   │
│  │  │             │  │             │  │  → on-chain)     │  │   │
│  │  └─────────────┘  └─────────────┘  └────────┬────────┘  │   │
│  └─────────────────────────────────────────────┤────────────┘   │
│                                                │                │
│  BLOCKCHAIN LAYER (plugin)                     │                │
│  ┌─────────────────────────────────────────────▼────────────┐   │
│  │                  CARDANO                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │   │
│  │  │ Aiken    │  │ CIP-68   │  │ OriginateNavio         │  │   │
│  │  │ Contract │  │ NFT      │  │ (anchor pattern)       │  │   │
│  │  └──────────┘  └──────────┘  └────────────────────────┘  │   │
│  │                                                           │   │
│  │  Cuối ngày: batch tất cả events → 1 transaction on-chain │   │
│  │  Chi phí: ~0.2 ADA / ngày / farm (không phải per-event)  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│  FRONTEND LAYER                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  Farm Dashboard│  │  Roaster View │  │  QR Verify Page  │   │
│  │  (Next.js PWA)│  │  (Phase 2)    │  │  (Public)        │   │
│  │  • Event log  │  │  • Order from │  │  • Passport      │   │
│  │  • IoT status │  │    farm       │  │  • On-chain proof│   │
│  │  • Photos     │  │  • Track lot  │  │  • Farm story    │   │
│  │  • Passport   │  │  • DPP verify │  │  • Lab cert      │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
│                                                                 │
│  THIRD PARTY (ngoài scope — chỉ nhận kết quả)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Lab hợp chuẩn EU · SCA Certified · Cupping score       │   │
│  │  → Cấp chứng nhận → Add vào passport (optional data)    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc kiến trúc

**IoT là chính, Cardano là plugin.** Hệ thống phải hoạt động tốt ngay cả khi không có blockchain. Cardano chỉ thêm lớp trust — giống như cắm USB vào laptop.

**Off-chain là 99% data, on-chain là 1% hash.** Mọi data sensor, ảnh, video lưu trên server. Cuối ngày, gom tất cả events thành 1 batch, hash lại, ghi 1 transaction on-chain. Tiết kiệm phí, vẫn tamper-proof.

**Bên thứ 3 làm bên thứ 3.** Phân tích dư lượng, cấp chứng nhận organic, cupping score — đó là việc của lab hợp chuẩn. Mình chỉ nhận kết quả và gắn vào passport. Không pretend mình làm được việc đó.

---

## 3. Tech Stack v3

### Edge / IoT Layer

| Component | Technology | Note |
|-----------|-----------|------|
| **IoT Simulator (MVP)** | Node.js script trên VPS | Giả lập sensor gửi data qua MQTT |
| **Real IoT (Phase 2)** | ESP32 + DHT22 + camera module | Nhiệt độ, độ ẩm, ảnh |
| **Protocol** | MQTT → server | Lightweight cho IoT |
| **Camera** | USB camera / Fly camera | Ảnh thu hoạch, sơ chế |
| **GPS** | Giấy tờ đất + fly camera + Google Map overlay | Polygon vườn chính xác |

### Server Layer

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **VPS** | Hetzner / DigitalOcean | Tự host, tăng trust (không phụ thuộc 1 BaaS) |
| **Database** | PostgreSQL (Supabase hoặc self-host) | Event store + farm data |
| **File Storage** | Supabase Storage / S3-compatible | Ảnh, video từ camera |
| **Batch Scheduler** | Cron job (Node.js) | Cuối ngày gom events → on-chain |
| **API** | Next.js API Routes | Frontend + IoT endpoints |
| **Auth** | Google OAuth (Supabase Auth) | Farm manager login |

### Blockchain Layer (Plugin)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **SDK** | Mesh SDK | Build + submit transactions |
| **Smart Contract** | Aiken | CIP-68 minting policy |
| **NFT Standard** | CIP-68 | Updatable metadata |
| **Framework** | OriginateNavio (anchor pattern) | Cardano Foundation traceability |
| **Node** | Blockfrost API | Managed Cardano node |
| **Wallet** | Server MeshWallet | Headless, auto-sign |
| **Network** | Preprod → Mainnet | Dev → production |

### Frontend Layer

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 15 PWA |
| **UI** | Tailwind + shadcn/ui |
| **Maps** | Leaflet.js + Google Maps overlay |
| **QR** | qrcode.react |
| **i18n** | next-intl (VI/EN) |

---

## 4. Off-chain vs On-chain — Chia rõ ràng

```
┌─────────────────────────────────────────────────────────────┐
│                     OFF-CHAIN (Server/VPS)                   │
│                                                              │
│  Lưu TẤT CẢ data thô:                                       │
│  • IoT readings: nhiệt độ, độ ẩm, mỗi 15 phút             │
│  • Ảnh: thu hoạch, sơ chế, phơi, kho (full resolution)     │
│  • GPS polygon: full GeoJSON coordinates                     │
│  • Events: harvest, processing, drying, hulling              │
│  • Lab results: cupping score, moisture %, defect count      │
│  • Metadata: farm profile, lot info, timestamps              │
│                                                              │
│  → Dung lượng lớn, query nhanh, update được                 │
│  → Accessible qua API cho dashboard + verify page            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Cuối ngày: hash all events
                           │ → 1 transaction
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     ON-CHAIN (Cardano)                        │
│                                                              │
│  Lưu CHỈ hashes + metadata tối thiểu:                        │
│                                                              │
│  CIP-68 Reference NFT Datum:                                 │
│  {                                                           │
│    farm_id:         "binhdong_farm"                           │
│    lot_id:          "LD-2026-0427"                            │
│    variety:         "Robusta"                                │
│    processing:      "Yellow Honey"                           │
│    harvest_date:    1729900800                                │
│    events_hash:     "sha256:9c4a1f..."   ← hash ngày hôm đó│
│    photos_hash:     "sha256:21be90..."   ← hash bundle ảnh  │
│    gps_hash:        "sha256:d47e08..."   ← hash polygon     │
│    sca_score:       84                   ← từ lab (optional) │
│    lab_cert_hash:   "sha256:..."         ← hash chứng nhận  │
│    metadata_ver:    1                                        │
│  }                                                           │
│                                                              │
│  → Nhỏ gọn, tamper-proof, verify bằng cách so hash          │
│  → ~0.2 ADA per transaction (per ngày, không per event)      │
└─────────────────────────────────────────────────────────────┘

VERIFY FLOW:
1. Quét QR → load off-chain data từ server
2. Load on-chain datum từ Cardano (qua Blockfrost)
3. Hash off-chain data → so sánh với on-chain hash
4. Nếu khớp → ✅ Data chưa bị sửa
5. Nếu không khớp → ❌ Data đã bị thay đổi
```

---

## 5. GPS Polygon: 3 nguồn kết hợp

Mentor gợi ý không chỉ dùng GPS điện thoại mà kết hợp nhiều nguồn:

| Nguồn | Cách dùng | Độ chính xác |
|-------|----------|-------------|
| **Giấy tờ đất** | Scan/chụp sổ đỏ, bản đồ địa chính → extract boundary | Chính xác pháp lý |
| **Fly camera (drone)** | Bay chụp orthophoto vườn → auto-detect boundary | Rất cao (cm-level) |
| **Google Map overlay** | Farmer/staff vẽ polygon trên nền Google Satellite | Dễ dùng, ~3m accuracy |

**MVP approach:** Google Map overlay (dễ nhất). Upload ảnh giấy tờ đất làm reference. Phase 2 thêm drone mapping.

---

## 6. IoT Data Collection — Chi tiết thiết bị & chiến lược anchor

### 6.1 Vì sao IoT thay vì voice recording

Mentor feedback: voice recording có lỗ hổng — nông dân có thể nói sai, nói nhầm, hoặc quên ghi. IoT device ghi tự động, không cần con người can thiệp. Sensor đo nhiệt độ/độ ẩm liên tục. Camera chụp tự động khi có sự kiện. Data đáng tin hơn.

Với specialty coffee farm (không phải nông hộ nhỏ), farm đã có cơ sở hạ tầng tốt hơn — có điện, có wifi, có nhân viên kỹ thuật. IoT device hoàn toàn khả thi.

### 6.2 Phân lớp thiết bị theo vòng đời cây cà phê

Cây cà phê specialty có vòng đời ~7 tháng từ ra hoa → thu hoạch. Mỗi giai đoạn cần loại sensor khác nhau. Chia thành 5 cụm thiết bị:

#### A. Cụm đất & vùng rễ (Root zone) — "cây ăn uống thế nào"

| Thiết bị | Mục đích | Gợi ý sản phẩm | Giá tham khảo |
|---------|---------|---------------|----------------|
| Soil moisture (capacitive) | Độ ẩm đất, tránh úng/khô | METER TEROS 10, DFRobot SEN0308 | $15–$120 |
| Soil temperature | Nhiệt độ rễ, dự báo ra hoa | DS18B20 waterproof probe | $3–$8 |
| Soil EC | Độ dẫn điện → dinh dưỡng hòa tan | METER TEROS 12 (3-in-1) | $200 |
| Soil pH | pH 5.0–6.5 lý tưởng cho cà phê | Atlas Scientific EZO pH, DFRobot Gravity pH | $40–$200 |
| NPK sensor | Dinh dưỡng N-P-K | JXCT 7-in-1 NPK (RS485 Modbus) | $80–$150 |

→ Khuyến nghị: **TEROS 12** làm anchor sensor (1 thiết bị đo cả 3 chỉ số chuẩn academic) + pH/NPK ở vài điểm sample.

#### B. Cụm vi khí hậu vườn (Microclimate)

| Thiết bị | Vì sao cần cho cà phê | Gợi ý sản phẩm |
|---------|----------------------|----------------|
| Air temp + RH | 18–24°C tối ưu, >30°C ức chế ra hoa | SHT31, BME280, DHT22 |
| PAR / Solar radiation | Cà phê dưới tán → đo lượng ánh sáng | Apogee SQ-500, LI-COR LI-190R |
| Rain gauge tipping bucket | Lượng mưa quyết định "blossom shower" | Davis 7852, Misol WH-SP-RG |
| Leaf wetness sensor | Cảnh báo bệnh nấm gỉ sắt (rust) | METER PHYTOS 31 |
| Anemometer | Gió mạnh làm rụng quả | Davis Vantage Vue |

→ Option đóng gói: **Davis Vantage Pro2** (~$700) hoặc DIY ESP32 + SHT31 + BME280 + rain gauge (~$80).

#### C. Cụm theo dõi cây (Plant-level) — bằng chứng "growth" mạnh nhất

1. **Time-lapse camera cố định** — Reolink Argus PT solar hoặc ESP32-CAM, chụp 1 ảnh/giờ ở mỗi block. Ghép thành video → bằng chứng visual lá non → ra hoa → đậu quả → chín đỏ.
2. **Dendrometer** (Ecomatik DD-S, ~$300/cây) — đo đường kính thân vài µm/ngày. Deploy mẫu vài cây đại diện.
3. **Drone NDVI multispectral** — DJI Mavic 3 Multispectral hoặc MicaSense RedEdge, bay 2–4 tuần/lần. Bản đồ NDVI/NDRE theo thời gian — proof "khoa học" mạnh nhất cho buyer specialty.

#### D. Cụm chế biến (Cherry → green bean)

| Bước | Sensor | Lý do |
|-----|--------|------|
| Phân loại nổi | Camera AI counting | Đếm quả lỗi |
| Cân lô | Load cell HX711 + ESP32 | Yield ratio cherry/parchment/green |
| Lên men (Washed/Honey) | pH probe + thermocouple | pH 4.0–4.5 optimal; 18–22°C |
| Phơi raised bed | SHT31 + hood RH | Moisture giảm đều đến 10–12% |
| Nhân xanh kho | HOBO MX2301 logger | Resting 1–2 tháng ổn định |
| Đo ẩm nhân cuối | AgraTronix MT-PRO / Sinar AP6060 | Chốt 10.5–11.5% trước đóng bao |

#### E. Backbone hạ tầng

- **MCU**: ESP32-S3 (WiFi+BLE) cho khu có wifi; **LoRa** (Heltec WiFi LoRa 32) cho block vườn xa (LoRaWAN range 2–10km).
- **Gateway**: Raspberry Pi 4 chạy Mosquitto MQTT + ChirpStack (LoRa) tại nhà điều hành farm.
- **Connectivity**: LoRaWAN (TheThingsNetwork free) ở vườn, 4G LTE backup ở gateway.
- **Power**: solar panel 20W + LiFePO4 18650 (chịu nóng tốt hơn LiPo).
- **Protocol**: MQTT. Topic schema: `farm/{farm_id}/{zone}/{sensor_type}`.

### 6.3 Chiến lược anchor — Hybrid 3-tier

#### So sánh các pattern

| Pattern | Latency | Chi phí ADA/tháng | Tamper window | Phù hợp |
|--------|--------|------------------|---------------|--------|
| Per-event | Tức thời | ~6 ADA × số sensor | 0 | Không khả thi |
| Hourly anchor | ≤1h | ~144 ADA/farm | 1h | Overkill |
| **Daily anchor** | ≤24h | ~6 ADA/farm | 24h | ✅ Sensor data |
| Weekly anchor | ≤7 ngày | ~0.8 ADA/farm | 7 ngày | Ảnh, drone scan |
| **Milestone-based** | Tức thời | ~10–20 tx/lot | 0 cho milestone | ✅ Event quan trọng |
| Hydra Head (Phase 3) | Giây | ~0 | 0 | Micropayment + agent |

#### Hybrid 3-tier (recommended)

```
Tier 1 — SENSOR STREAM (high frequency, low value)
  IoT readings 15 phút/lần → Merkle tree (PostgreSQL)
  Daily anchor: 1 tx/ngày/farm, lưu Merkle root
  Chi phí: ~0.2 ADA/ngày
  Verify: reading đơn lẻ qua Merkle proof

Tier 2 — MILESTONE EVENTS (low frequency, high value)
  Thu hoạch / Kết thúc lên men / Đóng bao
  Anchor NGAY khi xảy ra, update CIP-68 datum
  Chi phí: ~0.5 ADA/milestone × 6–8 milestone/lot

Tier 3 — MEDIA BUNDLES (weekly)
  Time-lapse photo + drone NDVI scan
  Bundle → IPFS CID hoặc S3 hash, anchor 1 tuần/lần
  Chi phí: ~0.05 ADA/tuần
```

(Tier 4 — Sustainability anchor — xem section 7.)

### 6.4 Merkle tree thay vì flat hash

Nâng cấp `events_hash = sha256(all events)` → **Merkle root**:

- Với SHA-256 phẳng: chứng minh 1 reading thật → phải lộ toàn bộ events của ngày.
- Với Merkle tree: chỉ cần lộ log₂(N) hashes. 96 readings/ngày → 7 hashes đủ.

```ts
// src/lib/iot/merkle.ts
function buildDailyMerkleRoot(events: IotEvent[]): {
  root: string;
  leaves: { id: string; hash: string; proof: string[] }[];
}
```

Lưu Merkle proof per event vào DB. Khi verify: server trả `event + proof[]`, frontend hash bottom-up so với root on-chain.

### 6.5 Milestone events nên anchor tức thời

Anchor ngay (không chờ cuối ngày) các sự kiện định nghĩa "lot":

1. **Lot khai sinh** — bắt đầu thu hoạch block N → mint CIP-68 NFT
2. **Kết thúc thu hoạch** — chốt trọng lượng cherry
3. **Bắt đầu / kết thúc lên men** — pH + temp logs hash
4. **Đạt moisture 11%** — kết thúc phơi/sấy
5. **Hulled** — cân nhân xanh, yield ratio (typical 5–7 kg cherry → 1 kg green bean)
6. **Lab cert received** — update SCA score vào datum
7. **Sealed** — đóng bao GrainPro, finalize, status = "ready"

Mỗi milestone = 1 tx Update CIP-68 datum.

### 6.6 Mapping giai đoạn cây → on-chain proof

```
GIAI ĐOẠN CÂY        IOT DATA                  ON-CHAIN ANCHOR
─────────────────────────────────────────────────────────────
Pre-flowering        Soil moisture trend       Daily Merkle
(khô hạn kích thích) Air temp 18-24°C          + Weekly photo

Blossom shower       Rainfall ≥20mm event      Milestone "FLOWERING"
(ra hoa đồng loạt)   + Timelapse ảnh hoa

Cherry development   PAR, temp, NDVI scan      Weekly bundle
(6-7 tháng)          Soil EC + leaf wetness    Daily Merkle

Ripening             Drone NDVI red shift      Weekly NDVI anchor
(chín đỏ)            Camera color analysis

Harvest              Weight + GPS + photos     Milestone "HARVEST"

Processing           pH/temp bồn lên men       Milestone /stage
(washed/honey/nat)   Drying RH/temp logs

Resting              Storage temp/RH           Daily Merkle

Hulling & Grading    Final moisture %          Milestone "GREEN_BEAN"
                     Yield ratio

Lab cert             SCA score, defects        Update datum
```

### 6.7 MVP Simulator approach

Cho hackathon, simulator generate đúng schema thiết bị thật để Phase 2 swap dễ:

```
┌──────────────────────────────────────────────────────┐
│  3 simulator scripts (Node.js, concurrent)            │
│                                                       │
│  soil-simulator.ts — 1 reading/15 phút:              │
│  {                                                    │
│    device_id: "teros12-block-A",                      │
│    timestamp: "2026-05-25T10:30:00Z",                 │
│    soil_moisture_pct: 45.1,                           │
│    soil_temp_c: 22.3,                                 │
│    soil_ec_ds_m: 1.2,                                 │
│    soil_ph: 5.8                                       │
│  }                                                    │
│                                                       │
│  weather-simulator.ts — 1 reading/15 phút:           │
│  {                                                    │
│    device_id: "weather-station-01",                   │
│    air_temp_c: 24.5,                                  │
│    humidity_pct: 72.3,                                │
│    par_umol: 850,                                     │
│    rainfall_mm_15min: 0.0,                            │
│    wind_ms: 1.2                                       │
│  }                                                    │
│                                                       │
│  camera-simulator.ts — 1 ảnh/giờ mỗi zone:           │
│  {                                                    │
│    device_id: "cam-block-A",                          │
│    event_type: "timelapse",                           │
│    image_url: "/storage/timelapse/...",               │
│    gps: { lat: 11.5449, lng: 107.8120 }              │
│  }                                                    │
└──────────────────────────┬───────────────────────────┘
                           │ MQTT / HTTP POST
                           ▼
┌──────────────────────────────────────────────────────┐
│  Server Ingest API → PostgreSQL → Merkle tree         │
│  Cuối ngày: cron → Merkle root → 1 tx on-chain       │
│  Khi có milestone: instant tx update CIP-68 datum    │
└──────────────────────────────────────────────────────┘
```

**Realistic data**: dùng dataset thật từ Lâm Đồng (OpenWeather historical) làm baseline + noise — không random thuần.

**Demo flow cho judge**:
1. Tua nhanh 7 ngày (1 giờ thật = 1 ngày)
2. Cuối mỗi "ngày" → cron tạo Merkle root → submit Preprod
3. Trigger 1 milestone "HARVEST" giữa demo → tx thứ 2 lên ngay
4. QR scan → verify timeline + Merkle proof ✅

**Phase 2 swap path**: thay simulator bằng ESP32 firmware publish cùng MQTT topic schema → server không đổi.

### 6.8 Risk & lưu ý

- **GPS spoofing**: ESP32 + GPS module không chống spoofing. Phase 2 cân nhắc **RTK GNSS** (u-blox ZED-F9P). MVP kết hợp hash giấy tờ đất + drone orthophoto.
- **Device attestation**: ESP32 + secure element **ATECC608A** (~$1) ký data trước khi gửi. Public key device lưu on-chain → verify data đến từ đúng thiết bị registered.
- **Connectivity loss**: vườn Lâm Đồng có thể mất sóng. Buffer local trên gateway (SQLite) + replay khi reconnect.
- **Anchor timing**: tránh 23:59 local (Cardano congestion). Schedule 02:00–04:00 UTC offset cho ổn định.

---

## 7. Sustainability & Compliance Layer

Để đáp ứng "thị trường nhập khẩu khó tính" (EU specialty buyer, EUDR, Rainforest Alliance), VerifiedVietCoffee cần chứng minh quá trình trồng là **bền vững và thân thiện môi trường** — không greenwashing. Mọi metric phải có data source IoT/lab/satellite + hash on-chain.

### 7.1 6 nhóm bằng chứng cần thiết

| Nhóm | Chuẩn quốc tế tham chiếu | Câu hỏi cần trả lời on-chain |
|------|--------------------------|------------------------------|
| **Không phá rừng** | EUDR (EU Reg 2023/1115, hiệu lực 30/12/2025) | Vườn này có trên đất rừng sau 31/12/2020? |
| **Phân bón "4 đúng"** | Rainforest Alliance 2020, 4R Nutrient Stewardship | Bón đúng loại/lượng/lúc/chỗ — proof? |
| **Giảm phát thải GHG** | GHG Protocol Product, ISO 14067, SBTi FLAG | kg CO₂e / kg nhân xanh? |
| **Quản lý nước** | Alliance for Water Stewardship | Nước tưới + nước thải đã xử lý? |
| **Sức khỏe đất** | EU Organic 834/2007, Regenerative Organic | SOM tăng hay giảm theo năm? |
| **Đa dạng sinh học** | Bird Friendly (Smithsonian), Shade-grown | Có shade tree, có wildlife? |

### 7.2 EUDR Compliance — BẮT BUỘC để xuất EU sau 30/12/2025

Đây là phần quan trọng nhất. Sau 30/12/2025, EU bắt buộc mọi lô cà phê nhập phải có Due Diligence Statement (DDS) chứng minh không phá rừng.

| Data | Nguồn | Tần suất |
|------|------|---------|
| GPS polygon vườn (>4 ha bắt buộc polygon, <4 ha có thể point) | Section 5 | One-time |
| Hansen Global Forest Change baseline 2020 | UMD/Google Earth Engine API (free) | Annual check |
| Sentinel-2 time-series 2020→nay | Copernicus Open Hub (free, 10m resolution) | Quarterly |
| Forest baseline hash | Hash ảnh vệ tinh 2020 cho polygon | One-time, anchor on-chain |
| Annual drone orthophoto | Section 5 | 1x/năm |

→ Output: **EUDR Due Diligence Statement PDF** + hash anchor on-chain. Khi customs EU kiểm tra → quét QR → verify hash khớp.

### 7.3 Fertilizer Management "4 đúng" — proof định lượng

Phần "trái tim" theo mentor: ghi nhận MỖI LẦN bón phân:

| Thiết bị | Đo gì | Nguyên tắc |
|---------|------|-----------|
| GPS-tagged spreader (mobile app + GPS) | Vị trí + diện tích bón | **Đúng chỗ** |
| Load cell trên xe rải / bình phun | Khối lượng phân/lần | **Đúng lượng** |
| NFC/QR tag trên bao phân | Loại phân (NPK, organic, slow-release) + lô + nhà cung cấp | **Đúng loại** + truy nguyên |
| Soil NPK sensor trước/sau bón | EC, N-P-K trong đất | Tối ưu lần sau |
| Weather forecast API | Không bón khi sắp mưa to (rửa trôi) | **Đúng lúc** |

Event schema mỗi lần bón phân:
```json
{
  "event_type": "fertilizer_application",
  "lot_id": "LD-2026-0427",
  "zone": "block-A",
  "timestamp": "2026-05-25T06:30:00Z",
  "fertilizer_type": "bio_organic",
  "product_code": "QR_FERT_VN_2026_001",
  "amount_kg": 25.5,
  "method": "broadcast",
  "gps_track": [[lat, lng, t], ...],
  "soil_npk_before": { "n": 12, "p": 8, "k": 15, "ec": 1.2 },
  "weather": { "rain_forecast_24h_mm": 0 },
  "operator_id": "worker_05"
}
```

→ Vào daily Merkle anchor (Tier 1). Cuối vụ ra báo cáo "đã bón X kg, Y% hữu cơ, Z% slow-release" có verify được.

### 7.4 GHG Emissions — Carbon footprint per kg green bean

| Nguồn phát thải | Cách đo | Thiết bị |
|----------------|--------|---------|
| N₂O từ phân đạm | IPCC Tier 1 (1% of N applied) hoặc đo thực | Flux chamber academic hoặc tính từ log phân bón |
| CO₂ điện (sấy, bơm, xay) | Smart meter | Shelly EM, IoTaWatt |
| CO₂ dầu diesel (xe, máy nổ) | Fuel log + GPS tracker | Manual log |
| CH₄ wastewater washed | Lượng nước thải × hệ số IPCC | Flow meter |
| Carbon sequestration (shade tree) | Drone đếm + DBH sample | Drone NDVI + manual sample |

→ Output: **kg CO₂e / kg green bean** theo ISO 14067. Lưu datum: `co2e_per_kg_int10` (× 10 for fixed point, e.g., `245` = 2.45).

### 7.5 Water Management

| Data | Thiết bị |
|------|---------|
| Nước tưới (m³) | Flow meter Sensus iPerl trên ống chính |
| Nước sơ chế washed (m³) | Flow meter trên bồn xát vỏ + lên men |
| pH/COD nước thải | Atlas Scientific pH + DO sensor, hoặc lab test |
| Tỷ lệ tái sử dụng | Tính = nước thu hồi / tổng dùng |

→ Honey/Natural process tiêu thụ ít nước hơn Washed → tự nó là sustainability advantage cho specialty.

### 7.6 Soil Health (SOM — Soil Organic Matter)

- **Lab test 2 lần/năm**: gửi mẫu đất tới Eurofins/SGS đo SOM, Carbon Organic, CEC.
- **In-field proxy**: NDVI drone + soil EC trend → indirect indicator.
- **Anchor**: lab cert hash + SOM% theo năm → vẽ chart "soil improving YoY".

### 7.7 Biodiversity (Phase 2+)

- **AudioMoth bioacoustic sensor** (~$80): ghi âm 24/7, AI phân tích đếm số loài chim/côn trùng → Bird Friendly proof.
- **Camera trap** (Bushnell): ghi nhận wildlife.
- **Shade canopy %** từ drone: > 40% = đạt Bird Friendly threshold.

### 7.8 Sustainability Anchor Strategy — Tier 4

Mở rộng anchor strategy section 6.3 thêm tier 4:

```
Tier 4 — SUSTAINABILITY ANCHOR (per-season + on-event)

  Mỗi lần bón phân     → vào daily Merkle (Tier 1)
  Lab test result      → milestone tx ngay (Tier 2)
  EUDR DDS report      → milestone tx khi generate (1x/lot)
  Annual soil test     → milestone tx khi có kết quả
  Season summary       → 1 tx cuối vụ, update sustainability field của datum

  Chi phí: ~5-10 tx/lot/năm, ~3 ADA/lot/năm
```

Workflow per lot:
1. Bắt đầu vụ → mint NFT với `sustainability = empty`
2. Trong vụ → fertilizer apps + sensor data → daily Merkle
3. Drone scan quý → satellite hash anchor
4. Cuối vụ → tính season metrics → update full sustainability struct
5. Lab cert về → update certifications list
6. Lot sealed → final datum freeze, generate EUDR DDS

### 7.9 Sustainability Passport UI (buyer view)

Trong `verify/[lotId]/page.tsx`, thêm section riêng:

```
┌─────────────────────────────────────────────┐
│  🌱 Sustainability Profile                   │
├─────────────────────────────────────────────┤
│  Carbon footprint:    2.45 kg CO₂e/kg  ✓   │
│  Water usage:         180 L/kg          ✓   │
│  Organic input:       65%               ✓   │
│  Soil organic matter: 3.5% ↑ (+0.3 YoY) ✓   │
│  Shade canopy:        42%               ✓   │
│  Bird species (audio): 23                   │
│                                             │
│  Certifications:                            │
│  • Rainforest Alliance 2024  [verify hash] │
│  • EU Organic               [verify hash] │
│  • EUDR-compliant           [view DDS]    │
│                                             │
│  All metrics: hash 9c4a1f...                │
│  → On-chain tx: a8d3...  [view on explorer] │
└─────────────────────────────────────────────┘
```

Mỗi số đều verify được on-chain bằng cách so hash off-chain data với hash trong datum.

---

## 8. Phased Roadmap (Redesigned)

### Phase 1 — MVP Hackathon (4-6 tuần)

**Mục tiêu:** Giả lập IoT devices → server với Merkle tree → daily anchor + milestone anchor → QR verify với sustainability passport

| Task | Difficulty | Approach |
|------|-----------|---------|
| Next.js project setup + PWA | Easy | create-next-app |
| 3 IoT simulator scripts (soil/weather/camera) | Easy | Realistic data từ Lâm Đồng dataset |
| Fertilizer application logger (mobile-friendly form) | Easy | Manual entry với GPS + photo |
| Server ingest API + MQTT broker | Medium | POST + Mosquitto (Docker) |
| PostgreSQL event store + Merkle tree builder | Medium | Supabase + merkletreejs |
| Daily Merkle anchor cron (Tier 1) | Hard | Node-cron + Mesh SDK |
| Milestone instant anchor (Tier 2) | Medium | Trigger từ farm dashboard |
| Aiken CIP-68 contract với SustainabilityProof | Hard | Datum + 4 actions (Mint/UpdateEvents/UpdateSustainability/UpdateLab) |
| EUDR check stub (mock Hansen API) | Easy | Sinh DDS PDF giả lập |
| Sustainability metrics compute (giả lập số) | Medium | Tính từ fertilizer log + sensor |
| Farm dashboard (events, IoT, fertilizer, sustainability) | Medium | Next.js + Recharts |
| QR code generation | Easy | qrcode.react |
| Public verify page với Merkle proof check | Medium | Blockfrost + frontend hash verify |
| Sustainability passport UI | Medium | Buyer-facing tab |
| VPS deployment (tăng trust) | Easy | Hetzner/DO + Docker Compose |

**Key files:**
```
scripts/simulators/                       ← 3 IoT simulators
src/app/api/iot/data/route.ts             ← Sensor data ingest
src/app/api/sustainability/fertilizer/    ← "4 đúng" logging
src/app/api/eudr/dds/                     ← DDS generation
src/lib/iot/merkle.ts                     ← Merkle tree + proofs
src/lib/blockchain/daily-anchor.ts        ← Tier 1 cron
src/lib/blockchain/milestone-anchor.ts    ← Tier 2 instant
src/lib/blockchain/sustainability-anchor.ts ← Tier 4 season
src/lib/sustainability/carbon-calc.ts     ← ISO 14067
aiken/validators/coffee_passport.ak       ← Smart contract với SustainabilityProof
src/app/[locale]/farm/page.tsx            ← Farm dashboard
src/app/[locale]/verify/[id]/page.tsx     ← QR verify + sustainability tab
```

**Deliverable:** Demo end-to-end: 3 simulators → Merkle tree → daily anchor + 1 milestone anchor + 1 sustainability anchor → QR scan với 3 tab (Timeline / Passport / Sustainability). 1 farm, 1 lot, 7 ngày tua nhanh.

---

### Phase 2 — Ordering & Marketplace (post-hackathon)

**Mục tiêu:** Nhà rang / coffee shop đặt hàng trực tiếp từ farm có profile specialty

| Feature | Description |
|---------|-------------|
| Farm profile (public) | Trang giới thiệu farm: vùng trồng, độ cao, giống, processing, SCA score |
| Lot catalog | Danh sách nhân xanh available, kèm passport on-chain |
| Order from farm | Nhà rang gửi order request → farm confirm → track shipment |
| DPP transfer | NFT passport chuyển cho buyer khi giao hàng |
| Lab cert integration | Upload chứng nhận từ lab EU → gắn vào passport |
| Real IoT deployment | ESP32 + sensors thật tại farm pilot |
| EUDR DDS export | Data export cho doanh nghiệp xuất khẩu EU |

**Business model:** Farm trả subscription hoặc per-passport fee. Nhà rang trả premium cho cà phê có passport.

---

### Phase 3 — Agent-to-Agent & Hydra (vision)

**Mục tiêu:** Robot tự trồng cà phê, IoT device tự giao dịch, agent-to-agent marketplace

| Feature | Description | Cardano Tech |
|---------|-------------|-------------|
| IoT micropayments | Sensor device tự pay cho data storage | Hydra Head (Layer 2) |
| Agent ordering | AI agent của nhà rang tự tìm + đặt hàng từ farm agent | Hydra + Plutus |
| Automated QC | Camera AI tự phân loại quả chín/xanh | Edge AI + on-chain proof |
| Robot farming | Robot tự thu hoạch, tự ghi nhận on-chain | IoT + Hydra micropayments |
| Cross-farm aggregation | Nhiều farm gom lô qua Hydra head | Hydra state channels |

Hydra Head protocol cho phép near-instant, near-zero-fee transactions off-chain, rồi settle lên mainchain. Phù hợp cho IoT data liên tục và micropayments giữa các agent.

---

## 9. Smart Contract v3 (Aiken)

### Datum — gọn hơn, IoT + sustainability-focused

```aiken
// aiken/lib/veriviet/types.ak

type CoffeePassportDatum {
  farm_id: ByteArray,
  lot_id: ByteArray,
  variety: ByteArray,              // "Robusta", "Arabica"
  processing: ByteArray,           // "Washed", "Natural", "Honey"
  harvest_timestamp: Int,

  // Hashes of off-chain data (verify by comparing)
  daily_events_merkle_root: ByteArray,  // Merkle root of all IoT events
  photos_hash: ByteArray,               // SHA-256 of photo bundle
  gps_polygon_hash: ByteArray,          // SHA-256 of GeoJSON

  // Optional: lab results (added later by update action)
  sca_score: Int,                  // 0-100, 0 = chưa có
  lab_cert_hash: ByteArray,        // SHA-256 of lab certificate

  // Sustainability proof (updatable per-season)
  sustainability: SustainabilityProof,

  metadata_version: Int,
  extra: Data,
}

type SustainabilityProof {
  // EUDR
  forest_baseline_hash: ByteArray,       // hash ảnh vệ tinh 2020 cho polygon
  eudr_dds_hash: ByteArray,              // Due Diligence Statement PDF hash
  deforestation_risk_score: Int,         // 0-100, càng thấp càng tốt

  // Fertilizer "4 đúng"
  fertilizer_log_hash: ByteArray,        // hash log toàn vụ
  organic_input_ratio_pct: Int,          // % hữu cơ trong tổng phân bón
  synthetic_n_kg_per_ha: Int,            // kg N tổng hợp/ha

  // Carbon footprint (ISO 14067)
  co2e_per_kg_int10: Int,                // kg CO2e × 10 / kg green bean
  co2_calc_method: ByteArray,            // "ISO_14067_TIER1"

  // Water
  water_l_per_kg: Int,                   // lít nước / kg green bean
  wastewater_treated: Bool,

  // Soil health
  som_pct_int10: Int,                    // SOM% × 10 (e.g., 35 = 3.5%)
  soil_test_lab_hash: ByteArray,

  // Biodiversity
  shade_canopy_pct: Int,
  bird_species_count: Int,               // từ AudioMoth nếu có
  biodiversity_audit_hash: ByteArray,

  // Third-party certifications
  certifications: List<CertRef>,
}

type CertRef {
  cert_type: ByteArray,                  // "EU_ORGANIC", "RAINFOREST_ALLIANCE", "4C", "BIRD_FRIENDLY"
  issuer: ByteArray,
  cert_hash: ByteArray,
  expires_at: Int,
}

type PassportAction {
  Mint
  UpdateEvents                     // Daily merkle root update
  UpdateSustainability             // Season summary update
  UpdateLab                        // Add lab cert + SCA score
  Burn
}
```

### Tại sao gọn hơn v2?

v2 lưu quá nhiều business data trong datum (enterprise_id, program_name, farmer_count). v3 chỉ lưu hashes + sustainability metrics định lượng — vì datum on-chain nên càng nhỏ càng tốt (ít phí hơn). Mọi data chi tiết ở off-chain, link bằng hash.

---

## 10. Database Schema v3

```sql
-- Farm & lots
CREATE TABLE farms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES auth.users(id),
  name            TEXT NOT NULL,            -- "Bình Đông Farm"
  province        TEXT,                     -- "Lâm Đồng"
  altitude_m      INT,
  gps_polygon     JSONB,                   -- GeoJSON
  land_doc_url    TEXT,                     -- Scan giấy tờ đất
  drone_map_url   TEXT,                     -- Orthophoto (Phase 2)
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  variety         TEXT,                     -- Robusta, Arabica
  processing      TEXT,                     -- Washed, Natural, Honey
  harvest_date    DATE,
  weight_kg       DECIMAL,
  sca_score       INT,                     -- From lab (optional)
  status          TEXT DEFAULT 'growing',
  -- growing → harvested → processing → drying → resting → hulled → graded → ready
  nft_token_name  TEXT,
  nft_tx_hash     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- IoT events (off-chain store)
CREATE TABLE iot_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  lot_id          UUID REFERENCES lots(id),
  device_id       TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  -- 'sensor_reading', 'photo', 'harvest', 'processing',
  -- 'drying', 'hulling', 'grading', 'packaging'
  data            JSONB NOT NULL,           -- Sensor values or event data
  photo_url       TEXT,
  gps_lat         DECIMAL(9,6),
  gps_lng         DECIMAL(9,6),
  recorded_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Daily on-chain anchors
CREATE TABLE daily_anchors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  anchor_date     DATE NOT NULL,
  event_count     INT,
  events_hash     TEXT NOT NULL,            -- SHA-256 of day's events
  photos_hash     TEXT,
  tx_hash         TEXT,                     -- Cardano tx hash
  status          TEXT DEFAULT 'pending',
  -- pending → submitted → confirmed
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(farm_id, anchor_date)
);

-- Lab certifications (from third party)
CREATE TABLE lab_certs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id          UUID REFERENCES lots(id),
  lab_name        TEXT,                     -- "SGS Vietnam"
  cert_type       TEXT,                     -- "SCA Cupping", "EU Organic", "RAINFOREST_ALLIANCE"
  score           INT,
  cert_doc_url    TEXT,                     -- PDF upload
  cert_hash       TEXT,                     -- SHA-256 of cert document
  issued_at       DATE,
  expires_at      DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Fertilizer applications ("4 đúng" tracking)
CREATE TABLE fertilizer_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id           UUID REFERENCES farms(id),
  lot_id            UUID REFERENCES lots(id),
  applied_at        TIMESTAMPTZ NOT NULL,
  fertilizer_type   TEXT,                   -- 'synthetic_npk', 'bio_organic', 'compost', 'slow_release'
  product_code      TEXT,                   -- QR/NFC code từ bao phân
  supplier          TEXT,
  amount_kg         DECIMAL,
  zone              TEXT,
  method            TEXT,                   -- 'broadcast', 'fertigation', 'foliar'
  gps_track         JSONB,                  -- GPS path khi rải
  soil_npk_before   JSONB,                  -- {n, p, k, ec, ph}
  soil_npk_after    JSONB,                  -- đo 1-2 tuần sau (nullable)
  weather_snapshot  JSONB,
  operator_id       TEXT,
  photo_url         TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Season sustainability metrics (computed end-of-season)
CREATE TABLE sustainability_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id                 UUID REFERENCES farms(id),
  lot_id                  UUID REFERENCES lots(id),
  metric_period           TEXT,             -- 'season_2026', 'monthly_2026_05'
  co2e_kg_per_kg_bean     DECIMAL,
  water_l_per_kg_bean     DECIMAL,
  organic_input_ratio_pct DECIMAL,
  synthetic_n_kg_per_ha   DECIMAL,
  som_pct                 DECIMAL,
  shade_canopy_pct        DECIMAL,
  bird_species_count      INT,
  source_data_hash        TEXT,             -- Merkle root of underlying data
  on_chain_tx_hash        TEXT,
  computed_at             TIMESTAMPTZ DEFAULT now()
);

-- EUDR compliance (anti-deforestation)
CREATE TABLE eudr_compliance (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id                   UUID REFERENCES farms(id),
  polygon_hash              TEXT,
  baseline_year             INT DEFAULT 2020,
  baseline_satellite_hash   TEXT,           -- Sentinel-2 2020 composite
  latest_satellite_hash     TEXT,
  hansen_check_result       JSONB,          -- raw result from Google Earth Engine
  deforestation_detected    BOOLEAN DEFAULT FALSE,
  risk_score                INT,            -- 0-100
  dds_pdf_url               TEXT,           -- Due Diligence Statement
  dds_hash                  TEXT,
  on_chain_tx_hash          TEXT,
  generated_at              TIMESTAMPTZ DEFAULT now()
);

-- IoT device registry (for attestation)
CREATE TABLE iot_devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  device_id       TEXT UNIQUE NOT NULL,     -- e.g., 'teros12-block-A'
  device_type     TEXT,                     -- 'soil', 'weather', 'camera', 'scale'
  model           TEXT,                     -- 'METER_TEROS_12', 'ESP32_DIY'
  zone            TEXT,
  public_key      TEXT,                     -- ATECC608A public key (Phase 2)
  registered_at   TIMESTAMPTZ DEFAULT now(),
  last_seen_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'active'
);
```

---

## 11. API Routes v3

### IoT & Events

| Method | Route | Description | Source |
|--------|-------|-------------|--------|
| POST | `/api/iot/data` | Ingest sensor readings | IoT device |
| POST | `/api/iot/photo` | Ingest camera photos | IoT camera |
| POST | `/api/iot/event` | Manual farm events (harvest, processing milestone) | Farm staff |
| POST | `/api/iot/device/register` | Register new IoT device + public key | Farm manager |
| GET | `/api/farm/:id/events` | List events for farm | Dashboard |
| GET | `/api/farm/:id/iot` | Latest IoT readings | Dashboard |
| GET | `/api/farm/:id/iot/merkle-proof/:eventId` | Get Merkle proof for single event | Verifier |

### Lot & Lab

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/lot` | Create/update lot |
| POST | `/api/lot/:id/lab-cert` | Attach lab certification |
| GET | `/api/qr/:lotId` | Generate QR image |

### Sustainability

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/sustainability/fertilizer` | Log fertilizer application ("4 đúng") |
| GET | `/api/sustainability/fertilizer/:farmId` | List fertilizer history |
| POST | `/api/sustainability/metrics/compute` | Compute season summary (CO₂e, water, SOM…) |
| GET | `/api/sustainability/metrics/:lotId` | Get sustainability metrics for lot |
| POST | `/api/eudr/check` | Run Hansen/Sentinel-2 deforestation check |
| POST | `/api/eudr/dds/generate/:lotId` | Generate Due Diligence Statement PDF |
| GET | `/api/eudr/dds/:lotId` | Download DDS PDF |

### Blockchain

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/blockchain/daily-anchor` | Tier 1: Merkle root → on-chain (cron) |
| POST | `/api/blockchain/milestone-anchor` | Tier 2: instant milestone update |
| POST | `/api/blockchain/weekly-media-anchor` | Tier 3: photo/drone bundle |
| POST | `/api/blockchain/sustainability-anchor` | Tier 4: season summary update |
| POST | `/api/blockchain/mint-passport` | Mint CIP-68 NFT for lot |
| GET | `/api/blockchain/verify/:token` | Verify on-chain + compare hash |

### Public Verify

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/verify/:lotId` | Full passport data (off-chain) |
| GET | `/api/verify/:lotId/sustainability` | Sustainability profile + hash check |
| GET | `/api/verify/:lotId/timeline` | Growth timeline (IoT + photos) |

---

## 12. Folder Structure v3

```
verifiedvietcoffee/
├── aiken/
│   ├── aiken.toml
│   ├── lib/veriviet/types.ak
│   ├── validators/coffee_passport.ak
│   └── plutus.json
│
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  # Landing
│   │   │   ├── farm/
│   │   │   │   ├── page.tsx              # Farm dashboard
│   │   │   │   ├── events/page.tsx       # Event log + IoT
│   │   │   │   ├── lots/page.tsx         # Lot management
│   │   │   │   ├── lots/[id]/page.tsx    # Lot detail + passport
│   │   │   │   ├── plot/page.tsx         # GPS polygon
│   │   │   │   └── settings/page.tsx     # Farm profile
│   │   │   └── verify/
│   │   │       └── [lotId]/page.tsx      # Public passport verify
│   │   │
│   │   └── api/
│   │       ├── iot/
│   │       │   ├── data/route.ts
│   │       │   ├── photo/route.ts
│   │       │   ├── event/route.ts
│   │       │   └── device/register/route.ts
│   │       ├── farm/route.ts
│   │       ├── lot/route.ts
│   │       ├── sustainability/
│   │       │   ├── fertilizer/route.ts
│   │       │   └── metrics/route.ts
│   │       ├── eudr/
│   │       │   ├── check/route.ts
│   │       │   └── dds/route.ts
│   │       ├── blockchain/
│   │       │   ├── daily-anchor/route.ts
│   │       │   ├── milestone-anchor/route.ts
│   │       │   ├── weekly-media-anchor/route.ts
│   │       │   ├── sustainability-anchor/route.ts
│   │       │   ├── mint-passport/route.ts
│   │       │   └── verify/route.ts
│   │       ├── lab-cert/route.ts
│   │       └── qr/route.ts
│   │
│   ├── components/
│   │   ├── farm/
│   │   │   ├── IoTDashboard.tsx          # Realtime sensor readings
│   │   │   ├── EventTimeline.tsx         # Farm event log
│   │   │   ├── LotCard.tsx              # Lot summary
│   │   │   ├── GPSPlotMap.tsx           # Polygon + Google overlay
│   │   │   ├── PhotoGallery.tsx         # Camera captures
│   │   │   └── MintPassportButton.tsx   # One-click mint
│   │   ├── verify/
│   │   │   ├── PassportViewer.tsx       # Full passport display
│   │   │   ├── HashVerifier.tsx         # On-chain vs off-chain compare
│   │   │   └── FarmStory.tsx            # Visual farm narrative
│   │   └── shared/
│   │       ├── BottomNav.tsx
│   │       └── LanguageToggle.tsx
│   │
│   ├── lib/
│   │   ├── blockchain/
│   │   │   ├── daily-anchor.ts          # Tier 1: Merkle root → submit tx
│   │   │   ├── milestone-anchor.ts      # Tier 2: instant milestone update
│   │   │   ├── weekly-media-anchor.ts   # Tier 3: photo/drone bundle
│   │   │   ├── sustainability-anchor.ts # Tier 4: season summary update
│   │   │   ├── mint-passport.ts         # CIP-68 mint
│   │   │   ├── verify-passport.ts       # On-chain query + Merkle proof check
│   │   │   └── server-wallet.ts         # MeshWallet headless
│   │   ├── iot/
│   │   │   ├── ingest.ts                # Data validation + store
│   │   │   ├── merkle.ts                # Build Merkle tree + proofs
│   │   │   └── attestation.ts           # Device signature verify (Phase 2)
│   │   ├── sustainability/
│   │   │   ├── fertilizer-log.ts        # "4 đúng" event recording
│   │   │   ├── carbon-calc.ts           # ISO 14067 CO2e calculation
│   │   │   ├── water-calc.ts            # Water usage aggregation
│   │   │   ├── soil-trend.ts            # SOM YoY tracking
│   │   │   └── season-summary.ts        # End-of-season metric compute
│   │   ├── eudr/
│   │   │   ├── hansen-check.ts          # Google Earth Engine API
│   │   │   ├── sentinel-check.ts        # Copernicus Sentinel-2 API
│   │   │   └── dds-generator.ts         # DDS PDF generation
│   │   └── utils/
│   │       ├── gps.ts
│   │       └── qr.ts
│   │
│   └── types/
│       ├── farm.ts
│       ├── lot.ts
│       ├── iot.ts
│       ├── sustainability.ts
│       ├── eudr.ts
│       └── passport.ts
│
├── scripts/
│   ├── simulators/
│   │   ├── soil-simulator.ts            # TEROS 12: moisture+temp+EC+pH
│   │   ├── weather-simulator.ts         # Air temp, RH, PAR, rain
│   │   ├── camera-simulator.ts          # Time-lapse photos per zone
│   │   └── fertilizer-simulator.ts      # Random "4 đúng" application events
│   ├── daily-anchor-cron.ts             # Cron: build Merkle → tx
│   ├── weekly-media-anchor-cron.ts      # Cron: bundle photos/drone → tx
│   ├── eudr-quarterly-check.ts          # Cron: Sentinel-2 deforestation check
│   └── season-summary-job.ts            # Compute sustainability metrics
│
├── supabase/
│   └── migrations/
│       ├── 001_farms.sql
│       ├── 002_lots_and_events.sql
│       ├── 003_anchors_and_certs.sql
│       ├── 004_fertilizer_and_sustainability.sql
│       ├── 005_eudr_compliance.sql
│       └── 006_iot_devices.sql
│
└── docker-compose.yml                   # VPS: server + simulators + MQTT broker
```

---

## 13. Specialty Coffee Market Context

Thị trường specialty coffee toàn cầu đạt khoảng 111.5 tỷ USD năm 2025, dự kiến tăng trưởng 10.8% CAGR tới 2033. Consumer ngày càng quan tâm tới ethically sourced, sustainably produced coffee. Các chứng nhận Fair Trade, Rainforest Alliance, organic trở thành tiêu chuẩn khi chọn mua.

**Cơ hội cho VerifiedVietCoffee:** Specialty coffee buyer (nhà rang, quán specialty) sẵn sàng trả premium cho cà phê có truy xuất rõ ràng, có câu chuyện farm, có proof on-chain. VerifiedVietCoffee biến farm data thành competitive advantage.

---

## Summary v3

**Scope gọn:** Farm → nhân xanh. Không lan sang rang, pha, bán lẻ.

**IoT-first, 5-cluster device layering:** Soil (TEROS 12) + Microclimate (weather station) + Plant-level (time-lapse + drone NDVI) + Processing (load cell, pH, moisture) + Backbone (ESP32/LoRa + RPi gateway). MVP giả lập bằng 3 Node.js simulators publish MQTT đúng schema device thật để Phase 2 swap dễ.

**Cardano là plugin, Hybrid 4-tier anchor:**
- **Tier 1** Daily Merkle root (sensor stream, ~0.2 ADA/ngày)
- **Tier 2** Milestone instant (harvest, fermentation, sealed)
- **Tier 3** Weekly media bundle (photos, drone NDVI)
- **Tier 4** Sustainability anchor (per-season + on-event, ~3 ADA/lot/năm)

**Merkle tree thay flat hash:** Verify 1 reading chỉ cần log₂(N) hashes, không lộ toàn bộ events.

**Sustainability layer (đáp ứng thị trường khó tính):**
- **EUDR compliance** (bắt buộc EU sau 30/12/2025): polygon + Hansen baseline 2020 + Sentinel-2 quarterly → DDS PDF + on-chain hash
- **Fertilizer "4 đúng"**: log mỗi lần bón với GPS + load cell + NFC bao phân + soil NPK before/after
- **GHG footprint**: kg CO₂e/kg green bean theo ISO 14067
- **Water, SOM, biodiversity**: flow meter, lab test 2x/năm, AudioMoth (Phase 2)
- Tất cả lưu trong `SustainabilityProof` struct của CIP-68 datum

**Chia rõ on/off-chain:** Off-chain lưu hết (sensor data, photos, fertilizer log, lab cert PDF). On-chain chỉ lưu hashes + sustainability metrics định lượng (số nhỏ, fixed-point integer).

**Lab là bên thứ 3:** Không pretend làm QC. Lab hợp chuẩn EU (Eurofins/SGS) cấp chứng nhận, mình chỉ gắn vào passport qua hash.

**3 phases rõ ràng:** MVP (3 simulators + 4-tier anchor + sustainability passport) → Ordering marketplace (nhà rang đặt hàng từ farm có DDS) → Agent-to-agent + Hydra + carbon credit tokenization.

---

> **Next:** Bắt đầu implement Phase 1 MVP? Suggest order:
> 1. Aiken contract với `SustainabilityProof` + Merkle root
> 2. 3 IoT simulators + Mosquitto MQTT + Postgres ingest
> 3. Merkle builder + daily anchor cron (Tier 1)
> 4. Farm dashboard với IoT + fertilizer log form
> 5. Milestone anchor (Tier 2) + EUDR DDS stub
> 6. QR verify page với 3 tab (Timeline / Passport / Sustainability)
> 7. Sustainability metrics compute + Tier 4 anchor
