import { FastifyInstance } from "fastify";
import { buildDailyMerkleTree, verifyProof } from "../lib/merkle.js";
import { store } from "../lib/store.js";

export async function blockchainRoutes(app: FastifyInstance) {
  // POST /blockchain/daily-anchor — Build Merkle tree for a farm's day and store
  app.post<{ Body: { farm_id: string; date: string } }>("/daily-anchor", async (request, reply) => {
    const { farm_id, date } = request.body;
    if (!farm_id || !date) {
      return reply.status(400).send({ error: "farm_id and date required" });
    }

    const events = await store.getEventsByFarmAndDate(farm_id, date);
    if (events.length === 0) {
      return reply.status(404).send({ error: "No events found for this date" });
    }

    const { root, proofs } = buildDailyMerkleTree(events);

    const anchor = await store.insertAnchor({
      farm_id,
      anchor_date: date,
      event_count: events.length,
      merkle_root: root,
      status: "pending",
    });

    return {
      anchor_id: anchor.id,
      merkle_root: root,
      event_count: events.length,
      status: "pending",
      proofs,
    };
  });

  // GET /blockchain/anchors/:farmId — List all daily anchors for a farm
  app.get<{ Params: { farmId: string } }>("/anchors/:farmId", async (request) => {
    const anchors = await store.getAnchorsByFarm(request.params.farmId);
    return { anchors };
  });

  // POST /blockchain/verify-event — Verify single event against Merkle root
  app.post<{ Body: { event: Record<string, unknown>; proof: string[]; root: string } }>(
    "/verify-event",
    async (request, reply) => {
      const { event, proof, root } = request.body;
      if (!event || !proof || !root) {
        return reply.status(400).send({ error: "event, proof, root required" });
      }

      const SHA256 = (await import("crypto-js/sha256.js")).default;
      const leaf = SHA256(JSON.stringify(event)).toString();
      const valid = verifyProof(leaf, proof, root);

      return { valid, leaf, root };
    }
  );

  // POST /blockchain/mint-passport — placeholder (actual minting via FE wallet)
  app.post("/mint-passport", async () => {
    return { message: "Use frontend wallet UI to mint. This endpoint is for server-side automation (Phase 2)." };
  });
}
