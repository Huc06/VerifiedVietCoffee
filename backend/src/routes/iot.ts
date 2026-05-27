import { FastifyInstance } from "fastify";
import { store } from "../lib/store.js";

interface SensorBody {
  device_id: string;
  timestamp: string;
  farm_id?: string;
  [key: string]: unknown;
}

export async function iotRoutes(app: FastifyInstance) {
  app.post<{ Body: SensorBody }>("/data", async (request, reply) => {
    const body = request.body;
    if (!body.device_id || !body.timestamp) {
      return reply.status(400).send({ error: "device_id and timestamp required" });
    }

    const event = await store.insertEvent({
      farm_id: body.farm_id || "binhdong",
      device_id: body.device_id,
      event_type: "sensor_reading",
      data: body,
      gps_lat: (body.gps as any)?.lat,
      gps_lng: (body.gps as any)?.lng,
      recorded_at: body.timestamp,
    });

    return { status: "received", id: event.id };
  });

  app.post<{ Body: SensorBody }>("/photo", async (request, reply) => {
    const body = request.body;
    if (!body.device_id || !body.timestamp) {
      return reply.status(400).send({ error: "device_id and timestamp required" });
    }

    const event = await store.insertEvent({
      farm_id: body.farm_id || "binhdong",
      device_id: body.device_id,
      event_type: "photo",
      data: body,
      gps_lat: (body.gps as any)?.lat,
      gps_lng: (body.gps as any)?.lng,
      recorded_at: body.timestamp,
    });

    return { status: "received", id: event.id };
  });

  app.post<{ Body: SensorBody & { event_type: string } }>("/event", async (request, reply) => {
    const body = request.body;
    if (!body.device_id || !body.timestamp || !body.event_type) {
      return reply.status(400).send({ error: "device_id, timestamp, event_type required" });
    }

    const event = await store.insertEvent({
      farm_id: body.farm_id || "binhdong",
      device_id: body.device_id,
      event_type: body.event_type,
      data: body,
      gps_lat: (body.gps as any)?.lat,
      gps_lng: (body.gps as any)?.lng,
      recorded_at: body.timestamp,
    });

    return { status: "received", id: event.id };
  });

  app.get<{ Params: { farmId: string } }>("/events/:farmId", async (request) => {
    const events = await store.getEventsByFarm(request.params.farmId);
    return { count: events.length, events };
  });

  app.get<{ Params: { farmId: string } }>("/latest/:farmId", async (request) => {
    const events = await store.getEventsByFarm(request.params.farmId);
    const latest = new Map<string, typeof events[0]>();
    for (const e of events) {
      const existing = latest.get(e.device_id);
      if (!existing || e.recorded_at > existing.recorded_at) {
        latest.set(e.device_id, e);
      }
    }
    return { devices: Object.fromEntries(latest) };
  });

  // GET /iot/telemetry/:farmId — latest soil + weather readings mapped to the
  // operator dashboard's IoTTelemetry shape (live values, no client simulation).
  app.get<{ Params: { farmId: string } }>("/telemetry/:farmId", async (request) => {
    const events = await store.getEventsByFarm(request.params.farmId);
    const latest = new Map<string, (typeof events)[0]>();
    for (const e of events) {
      const existing = latest.get(e.device_id);
      if (!existing || e.recorded_at > existing.recorded_at) latest.set(e.device_id, e);
    }
    const soil = (latest.get("teros12-block-A")?.data ?? {}) as Record<string, unknown>;
    const weather = (latest.get("weather-station-01")?.data ?? {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
    return {
      farm_id: request.params.farmId,
      telemetry: {
        soilMoisture: num(soil.soil_moisture_pct),
        temperature: num(weather.air_temp_c) || num(soil.soil_temp_c),
        humidity: num(weather.humidity_pct),
        ecLevels: num(soil.soil_ec_ds_m),
        parSensor: num(weather.par_umol),
      },
      updated_at:
        latest.get("teros12-block-A")?.recorded_at ??
        latest.get("weather-station-01")?.recorded_at ??
        null,
    };
  });
}
