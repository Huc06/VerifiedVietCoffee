const API_URL = process.env.API_URL || "http://localhost:4000";
const FARM_ID = "binhdong";
const INTERVAL_MS = 5_000; // 5s for demo (real: 15 min)

async function publish() {
  const data = {
    farm_id: FARM_ID,
    device_id: "teros12-block-A",
    timestamp: new Date().toISOString(),
    soil_moisture_pct: rand(35, 55),
    soil_temp_c: rand(18, 26),
    soil_ec_ds_m: rand(0.8, 1.8),
    soil_ph: rand(5.2, 6.2),
  };

  try {
    const res = await fetch(`${API_URL}/iot/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    console.log(`[soil] ${data.timestamp}`, data.soil_moisture_pct + "%", data.soil_temp_c + "°C", "→", json.status);
  } catch (e: any) {
    console.error("[soil] Failed:", e.message);
  }
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

console.log(`[soil-simulator] Sending to ${API_URL} every ${INTERVAL_MS / 1000}s`);
publish();
setInterval(publish, INTERVAL_MS);
