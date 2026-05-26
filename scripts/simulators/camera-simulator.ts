const API_URL = process.env.API_URL || "http://localhost:4000";
const FARM_ID = "binhdong";
const INTERVAL_MS = 10_000; // 10s for demo (real: 1 hour)

async function publish() {
  const data = {
    farm_id: FARM_ID,
    device_id: "cam-block-A",
    timestamp: new Date().toISOString(),
    event_type: "timelapse",
    image_url: `/storage/timelapse/${FARM_ID}/block-a/${Date.now()}.jpg`,
    gps: { lat: 11.5449, lng: 107.812 },
  };

  try {
    const res = await fetch(`${API_URL}/iot/photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    console.log(`[camera] ${data.timestamp}`, "→", json.status);
  } catch (e: any) {
    console.error("[camera] Failed:", e.message);
  }
}

console.log(`[camera-simulator] Sending to ${API_URL} every ${INTERVAL_MS / 1000}s`);
publish();
setInterval(publish, INTERVAL_MS);
