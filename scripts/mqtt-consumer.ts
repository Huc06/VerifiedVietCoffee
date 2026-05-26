import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const BROKER = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = mqtt.connect(BROKER);

client.on("connect", () => {
  console.log("[mqtt-consumer] Connected, subscribing to farm/#");
  client.subscribe("farm/#");
});

client.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const [, farmId, zone, sensorType] = topic.split("/");

    const { error } = await supabase.from("iot_events").insert({
      farm_id: farmId,
      device_id: data.device_id,
      event_type: sensorType === "camera" ? "photo" : "sensor_reading",
      data,
      gps_lat: data.gps?.lat,
      gps_lng: data.gps?.lng,
      recorded_at: data.timestamp,
    });

    if (error) console.error("[mqtt-consumer] DB error:", error.message);
    else console.log(`[mqtt-consumer] Stored: ${topic}`);
  } catch (e) {
    console.error("[mqtt-consumer] Parse error:", e);
  }
});
