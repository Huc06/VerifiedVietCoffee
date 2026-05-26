import { FastifyInstance } from "fastify";

export async function iotRoutes(app: FastifyInstance) {
  // POST /iot/data — Ingest sensor readings
  app.post("/data", async (request, reply) => {
    // TODO: validate + insert into iot_events
    return { status: "received" };
  });

  // POST /iot/photo — Ingest camera photos
  app.post("/photo", async (request, reply) => {
    return { status: "received" };
  });

  // POST /iot/event — Manual farm events (milestone)
  app.post("/event", async (request, reply) => {
    return { status: "received" };
  });
}
