import { FastifyInstance } from "fastify";
import { store, type Lot } from "../lib/store.js";

export async function lotRoutes(app: FastifyInstance) {
  // POST /lot — Create a lot
  app.post<{ Body: Partial<Lot> }>("/", async (request, reply) => {
    const body = request.body ?? {};
    if (!body.variety && !body.nft_token_name) {
      return reply
        .status(400)
        .send({ error: "at least variety or nft_token_name required" });
    }
    const lot = await store.insertLot({
      farm_id: body.farm_id,
      variety: body.variety,
      processing: body.processing,
      harvest_date: body.harvest_date,
      weight_kg: body.weight_kg,
      sca_score: body.sca_score,
      status: body.status ?? "growing",
      nft_token_name: body.nft_token_name,
      nft_tx_hash: body.nft_tx_hash,
    });
    return { lot };
  });

  // GET /lot — List recent lots
  app.get("/", async () => {
    const lots = await store.listLots();
    return { count: lots.length, lots };
  });

  // GET /lot/:id — Lot detail (by UUID)
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const lot = await store.getLot(request.params.id);
    if (!lot) return reply.status(404).send({ error: "Lot not found" });
    return { lot };
  });

  // PATCH /lot/:id — Update status / NFT info / scores
  app.patch<{ Params: { id: string }; Body: Partial<Lot> }>(
    "/:id",
    async (request, reply) => {
      const lot = await store.updateLot(request.params.id, request.body ?? {});
      if (!lot) return reply.status(404).send({ error: "Lot not found" });
      return { lot };
    },
  );
}
