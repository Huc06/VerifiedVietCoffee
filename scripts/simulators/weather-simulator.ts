const API_URL = process.env.API_URL || "http://localhost:4000";
const FARM_ID = "binhdong";
const INTERVAL_MS = 5_000;

async function publish() {
  const data = {
    farm_id: FARM_ID,
    device_id: "weather-station-01",
    timestamp: new Date().toISOString(),
    air_temp_c: rand(18, 28),
    humidity_pct: rand(60, 85),
    par_umol: rand(200, 1200),
    rainfall_mm_15min: Math.random() > 0.8 ? rand(0.5, 5) : 0,
    wind_ms: rand(0.5, 3),
  };

  try {
    const res = await fetch(`${API_URL}/iot/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    console.log(`[weather] ${data.timestamp}`, data.air_temp_c + "°C", data.humidity_pct + "%", "→", json.status);
  } catch (e: any) {
    console.error("[weather] Failed:", e.message);
  }
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

console.log(`[weather-simulator] Sending to ${API_URL} every ${INTERVAL_MS / 1000}s`);
publish();
setInterval(publish, INTERVAL_MS);
