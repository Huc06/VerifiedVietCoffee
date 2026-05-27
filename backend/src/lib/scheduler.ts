import { store } from "./store.js";

// Periodic IoT ingest — the in-process equivalent of running the
// scripts/simulators/* against /iot/data + /iot/photo, so the backend keeps
// telemetry flowing on its own without a separate script.
//
// Config (env):
//   ENABLE_IOT_SIM      "false" to disable (default: enabled)
//   IOT_SIM_INTERVAL_MS  tick interval in ms (default: 60000 = 1 minute)
//   SIM_FARM_ID          farm id to attribute readings to (default: binhdong)

const FARM_ID = process.env.SIM_FARM_ID || "binhdong";
const INTERVAL_MS = Number(process.env.IOT_SIM_INTERVAL_MS) || 60_000;
const ENABLED = (process.env.ENABLE_IOT_SIM ?? "true").toLowerCase() !== "false";

const rand = (min: number, max: number) =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;

// One ingest cycle: soil + weather sensor readings and a timelapse photo,
// matching the payloads the standalone simulators send.
async function ingestOnce(): Promise<void> {
  const timestamp = new Date().toISOString();

  const soil = {
    farm_id: FARM_ID,
    device_id: "teros12-block-A",
    timestamp,
    soil_moisture_pct: rand(35, 55),
    soil_temp_c: rand(18, 26),
    soil_ec_ds_m: rand(0.8, 1.8),
    soil_ph: rand(5.2, 6.2),
  };
  const weather = {
    farm_id: FARM_ID,
    device_id: "weather-station-01",
    timestamp,
    air_temp_c: rand(18, 28),
    humidity_pct: rand(60, 85),
    par_umol: rand(200, 1200),
    rainfall_mm_15min: Math.random() > 0.8 ? rand(0.5, 5) : 0,
    wind_ms: rand(0.5, 3),
  };
  const camera = {
    farm_id: FARM_ID,
    device_id: "cam-block-A",
    timestamp,
    event_type: "timelapse",
    image_url: `/storage/timelapse/${FARM_ID}/block-a/${Date.now()}.jpg`,
    gps: { lat: 11.5449, lng: 107.812 },
  };

  await Promise.all([
    store.insertEvent({
      farm_id: FARM_ID,
      device_id: soil.device_id,
      event_type: "sensor_reading",
      data: soil,
      recorded_at: timestamp,
    }),
    store.insertEvent({
      farm_id: FARM_ID,
      device_id: weather.device_id,
      event_type: "sensor_reading",
      data: weather,
      recorded_at: timestamp,
    }),
    store.insertEvent({
      farm_id: FARM_ID,
      device_id: camera.device_id,
      event_type: "photo",
      data: camera,
      gps_lat: camera.gps.lat,
      gps_lng: camera.gps.lng,
      recorded_at: timestamp,
    }),
  ]);
}

type Logger = { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void };

export function startIotScheduler(log?: Logger): void {
  if (!ENABLED) {
    log?.info("[scheduler] IoT auto-ingest disabled (ENABLE_IOT_SIM=false)");
    return;
  }
  log?.info(
    `[scheduler] IoT auto-ingest every ${INTERVAL_MS / 1000}s for farm "${FARM_ID}"`,
  );
  // Fire once on boot, then on the interval.
  ingestOnce().catch((e) => log?.error(e, "[scheduler] initial ingest failed"));
  const timer = setInterval(() => {
    ingestOnce().catch((e) => log?.error(e, "[scheduler] ingest failed"));
  }, INTERVAL_MS);
  // Don't keep the process alive solely for the timer.
  timer.unref?.();
}
