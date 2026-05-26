import mqtt from "mqtt";

const BROKER = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const FARM_ID = "binhdong";
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const client = mqtt.connect(BROKER);

client.on("connect", () => {
  console.log("[soil-simulator] Connected to MQTT broker");
  publish();
  setInterval(publish, INTERVAL_MS);
});

function publish() {
  const data = {
    device_id: "teros12-block-A",
    timestamp: new Date().toISOString(),
    soil_moisture_pct: rand(35, 55),
    soil_temp_c: rand(18, 26),
    soil_ec_ds_m: rand(0.8, 1.8),
    soil_ph: rand(5.2, 6.2),
  };

  const topic = `farm/${FARM_ID}/block-a/soil`;
  client.publish(topic, JSON.stringify(data));
  console.log(`[soil] ${topic}`, data);
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}
