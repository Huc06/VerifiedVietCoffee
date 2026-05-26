import { FastifyInstance } from "fastify";
import { store } from "../lib/store.js";
import { buildDailyMerkleTree } from "../lib/merkle.js";

export async function verifyRoutes(app: FastifyInstance) {
  // GET /verify/:farmId/:date — Get passport data + Merkle proof for a day
  app.get<{ Params: { farmId: string; date: string } }>("/:farmId/:date", async (request, reply) => {
    const { farmId, date } = request.params;

    const events = await store.getEventsByFarmAndDate(farmId, date);
    const anchors = await store.getAnchorsByFarm(farmId);
    const anchor = anchors.find((a) => a.anchor_date === date);

    if (events.length === 0) {
      return reply.status(404).send({ error: "No data for this farm/date" });
    }

    const { root, proofs } = buildDailyMerkleTree(events);

    return {
      farm_id: farmId,
      date,
      event_count: events.length,
      merkle_root: root,
      anchor: anchor || null,
      events,
      proofs,
    };
  });

  // GET /verify/:farmId — Overview of farm's events and anchors
  app.get<{ Params: { farmId: string } }>("/:farmId", async (request) => {
    const events = await store.getEventsByFarm(request.params.farmId);
    const anchors = await store.getAnchorsByFarm(request.params.farmId);

    return {
      farm_id: request.params.farmId,
      total_events: events.length,
      anchors,
    };
  });
}
