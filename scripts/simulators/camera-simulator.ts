import mqtt from "mqtt";

const BROKER = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const FARM_ID = "binhdong";
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const client = mqtt.connect(BROKER);

client.on("connect", () => {
  console.log("[camera-simulator] Connected to MQTT broker");
  publish();
  setInterval(publish, INTERVAL_MS);
});

function publish() {
  const data = {
    device_id: "cam-block-A",
    timestamp: new Date().toISOString(),
    event_type: "timelapse",
    image_url: `/storage/timelapse/${FARM_ID}/block-a/${Date.now()}.jpg`,
    gps: { lat: 11.5449, lng: 107.812 },
  };

  const topic = `farm/${FARM_ID}/block-a/camera`;
  client.publish(topic, JSON.stringify(data));
  console.log(`[camera] ${topic}`, data);
}
