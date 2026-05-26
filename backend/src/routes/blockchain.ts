import { FastifyInstance } from "fastify";

export async function blockchainRoutes(app: FastifyInstance) {
  // POST /blockchain/mint-passport
  app.post("/mint-passport", async (request, reply) => {
    return { status: "minted" };
  });

  // POST /blockchain/daily-anchor
  app.post("/daily-anchor", async (request, reply) => {
    return { status: "anchored" };
  });

  // POST /blockchain/milestone-anchor
  app.post("/milestone-anchor", async (request, reply) => {
    return { status: "anchored" };
  });
}
