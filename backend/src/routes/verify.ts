import { FastifyInstance } from "fastify";

export async function verifyRoutes(app: FastifyInstance) {
  // GET /verify/:lotId — Full passport data
  app.get("/:lotId", async (request, reply) => {
    return { status: "ok" };
  });

  // GET /verify/:lotId/merkle-proof/:eventId
  app.get("/:lotId/merkle-proof/:eventId", async (request, reply) => {
    return { status: "ok" };
  });
}
