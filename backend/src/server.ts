import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";

import { iotRoutes } from "./routes/iot.js";
import { lotRoutes } from "./routes/lot.js";
import { blockchainRoutes } from "./routes/blockchain.js";
import { verifyRoutes } from "./routes/verify.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Routes
await app.register(iotRoutes, { prefix: "/iot" });
await app.register(lotRoutes, { prefix: "/lot" });
await app.register(blockchainRoutes, { prefix: "/blockchain" });
await app.register(verifyRoutes, { prefix: "/verify" });

// Health check
app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT) || 4000;
await app.listen({ port, host: "0.0.0.0" });
console.log(`Server running on port ${port}`);
