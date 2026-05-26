# Giải thích Source Code chi tiết

---

## 1. Backend Server (`backend/src/server.ts`)

```ts
const app = Fastify({ logger: true });       // Tạo Fastify instance, bật logging
await app.register(cors, { origin: true });  // Cho phép FE gọi API cross-origin

// Đăng ký route groups theo prefix
await app.register(iotRoutes, { prefix: "/iot" });           // /iot/data, /iot/photo, /iot/event
await app.register(lotRoutes, { prefix: "/lot" });           // /lot, /lot/:id
await app.register(blockchainRoutes, { prefix: "/blockchain" }); // /blockchain/mint-passport, ...
await app.register(verifyRoutes, { prefix: "/verify" });     // /verify/:lotId

app.get("/health", async () => ({ status: "ok" }));  // Endpoint kiểm tra server sống
await app.listen({ port, host: "0.0.0.0" });         // Listen tất cả interfaces
```

**Vai trò:** Entry point của backend. Gom tất cả routes, bật CORS cho FE gọi, listen port 4000.

---

## 2. IoT Routes (`backend/src/routes/iot.ts`)

```ts
app.post("/data", ...)   // Nhận sensor readings từ mqtt-consumer hoặc direct POST
app.post("/photo", ...)  // Nhận ảnh từ camera simulator
app.post("/event", ...)  // Nhận manual events (harvest, processing milestone)
```

**Vai trò:** API endpoints nhận data từ IoT devices. Hiện tại là skeleton (TODO), sẽ implement validate + insert vào bảng `iot_events` trong Supabase.

---

## 3. Merkle Tree (`backend/src/lib/merkle.ts`)

```ts
export function buildDailyMerkleTree(events: IotEvent[]) {
  // 1. Hash mỗi event thành 1 leaf
  const leaves = events.map((e) => SHA256(JSON.stringify(e)).toString());

  // 2. Build Merkle tree từ tất cả leaves
  const tree = new MerkleTree(leaves, SHA256);

  // 3. Lấy root hash (sẽ ghi on-chain)
  const root = tree.getHexRoot();

  // 4. Tạo proof cho từng event (để verify riêng lẻ sau)
  const proofs = events.map((_, i) => ({
    index: i,
    proof: tree.getHexProof(leaves[i]),
  }));

  return { root, leaves, proofs, tree };
}
```

**Vai trò:** Cuối ngày, gom tất cả IoT events → build Merkle tree → lấy root hash ghi 1 transaction lên Cardano. Khi cần verify 1 event cụ thể, chỉ cần event đó + proof (7 hashes) + root on-chain → không cần lộ toàn bộ data.

**Ví dụ:** 96 readings/ngày → 1 Merkle root on-chain. Verify 1 reading chỉ cần 7 hashes (log₂96 ≈ 7).

---

## 4. MQTT Consumer (`scripts/mqtt-consumer.ts`)

```ts
// Kết nối MQTT broker
const client = mqtt.connect(BROKER);

// Subscribe tất cả topic bắt đầu bằng "farm/"
client.subscribe("farm/#");

// Khi nhận message:
client.on("message", async (topic, message) => {
  const data = JSON.parse(message.toString());

  // Parse topic: "farm/binhdong/block-a/soil" → farmId, zone, sensorType
  const [, farmId, zone, sensorType] = topic.split("/");

  // Ghi vào PostgreSQL (Supabase)
  await supabase.from("iot_events").insert({
    farm_id: farmId,
    device_id: data.device_id,
    event_type: sensorType === "camera" ? "photo" : "sensor_reading",
    data,                          // Toàn bộ JSON gốc
    gps_lat: data.gps?.lat,
    gps_lng: data.gps?.lng,
    recorded_at: data.timestamp,
  });
});
```

**Vai trò:** Bridge giữa MQTT và Database. Chạy persistent, lắng nghe mọi message từ IoT devices → parse → lưu DB. Đây là process chạy 24/7 trên VPS.

---

## 5. Soil Simulator (`scripts/simulators/soil-simulator.ts`)

```ts
// Kết nối MQTT broker (giống ESP32 thật sẽ làm)
const client = mqtt.connect(BROKER);

// Mỗi 15 phút, publish 1 reading
setInterval(publish, 15 * 60 * 1000);

function publish() {
  const data = {
    device_id: "teros12-block-A",          // Giả lập sensor TEROS 12
    timestamp: new Date().toISOString(),
    soil_moisture_pct: rand(35, 55),       // Độ ẩm đất 35-55%
    soil_temp_c: rand(18, 26),             // Nhiệt độ đất 18-26°C
    soil_ec_ds_m: rand(0.8, 1.8),          // Độ dẫn điện
    soil_ph: rand(5.2, 6.2),              // pH đất (lý tưởng cho cà phê)
  };

  // Publish lên topic chuẩn
  client.publish(`farm/binhdong/block-a/soil`, JSON.stringify(data));
}
```

**Vai trò:** Giả lập sensor đất TEROS 12 tại Bình Đông Farm. Data range realistic theo climate Lâm Đồng (900m altitude). Phase 2 thay bằng ESP32 firmware publish cùng topic schema → server không đổi gì.

---

## 6. Data Flow tổng thể

```
Simulator (giả lập ESP32)
    │
    │ MQTT publish: "farm/binhdong/block-a/soil"
    ▼
Mosquitto Broker (Docker)
    │
    │ MQTT subscribe: "farm/#"
    ▼
MQTT Consumer → INSERT vào PostgreSQL (iot_events table)
    │
    │ Cuối ngày (cron)
    ▼
Merkle Tree Builder → root hash
    │
    │ 1 transaction
    ▼
Cardano Preprod (CIP-68 datum update)
    │
    │ QR scan
    ▼
Verify Page: hash off-chain data → so sánh root on-chain → ✅/❌
```

---

## 7. Aiken Contract (`aiken/validators/coffee_passport.ak`)

```aiken
validator coffee_passport {
  mint(action, _ctx) {
    // Chỉ cho phép Mint hoặc Burn NFT
    when action is {
      Mint -> True    // Tạo passport mới cho lot
      Burn -> True    // Hủy passport
      _ -> False
    }
  }

  spend(datum, action, _ctx) {
    // Cho phép update datum khi có action hợp lệ
    when action is {
      UpdateEvents -> True          // Cập nhật Merkle root hàng ngày
      UpdateSustainability -> True  // Cập nhật metrics cuối vụ
      UpdateLab -> True             // Thêm lab cert + SCA score
      _ -> False
    }
  }
}
```

**Vai trò:** Smart contract CIP-68 trên Cardano. Kiểm soát ai được mint/burn NFT passport và update datum. Hiện tại logic đơn giản (always True) — sẽ thêm signature check sau.

---

## 8. Docker Compose

```yaml
mosquitto:       # MQTT broker — nhận/route messages giữa simulators và consumer
backend:         # Fastify API — FE gọi vào đây
mqtt-consumer:   # Persistent process bridge MQTT → DB
simulator:       # 3 scripts giả lập IoT devices
```

**1 lệnh `docker compose up`** → chạy toàn bộ stack local.
