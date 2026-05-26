import { FastifyInstance } from "fastify";

export async function lotRoutes(app: FastifyInstance) {
  // POST /lot — Create lot
  app.post("/", async (request, reply) => {
    return { status: "created" };
  });

  // GET /lot/:id — Get lot detail
  app.get("/:id", async (request, reply) => {
    return { status: "ok" };
  });

  // POST /lot/:id/milestone — Trigger milestone
  app.post("/:id/milestone", async (request, reply) => {
    return { status: "milestone_triggered" };
  });
}
