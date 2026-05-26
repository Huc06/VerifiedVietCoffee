import mqtt from "mqtt";

const BROKER = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const FARM_ID = "binhdong";
const INTERVAL_MS = 15 * 60 * 1000;

const client = mqtt.connect(BROKER);

client.on("connect", () => {
  console.log("[weather-simulator] Connected to MQTT broker");
  publish();
  setInterval(publish, INTERVAL_MS);
});

function publish() {
  const data = {
    device_id: "weather-station-01",
    timestamp: new Date().toISOString(),
    air_temp_c: rand(18, 28),
    humidity_pct: rand(60, 85),
    par_umol: rand(200, 1200),
    rainfall_mm_15min: Math.random() > 0.8 ? rand(0.5, 5) : 0,
    wind_ms: rand(0.5, 3),
  };

  const topic = `farm/${FARM_ID}/station/weather`;
  client.publish(topic, JSON.stringify(data));
  console.log(`[weather] ${topic}`, data);
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}
