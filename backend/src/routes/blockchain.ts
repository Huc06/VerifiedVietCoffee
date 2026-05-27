import { FastifyInstance } from "fastify";
import { buildDailyMerkleTree, verifyProof } from "../lib/merkle.js";
import { store } from "../lib/store.js";
import {
  getOracleAddress,
  getOraclePkh,
  passportScriptAddress,
  setupOracleCollateral,
  submitUpdateEvents,
  submitUpdateLab,
  submitUpdateSustainability,
  type SustainabilityInput,
} from "../lib/cardano.js";

export async function blockchainRoutes(app: FastifyInstance) {
  // POST /blockchain/daily-anchor — Build Merkle tree for a farm's day and store
  app.post<{
    Body: { farm_id: string; date: string; lot_id?: string };
  }>("/daily-anchor", async (request, reply) => {
    const { farm_id, date, lot_id } = request.body;
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
      lot_id,
      anchor_date: date,
      event_count: events.length,
      merkle_root: root,
      status: "pending",
    });

    return {
      anchor_id: anchor.id,
      lot_id,
      merkle_root: root,
      event_count: events.length,
      status: "pending",
      proofs,
    };
  });

  // POST /blockchain/submit-anchor — Spend reference UTxO with UpdateEvents redeemer
  // Body: { anchor_id, lot_id? }
  // If lot_id is omitted, the anchor row must already have it.
  app.post<{ Body: { anchor_id: string; lot_id?: string } }>(
    "/submit-anchor",
    async (request, reply) => {
      const { anchor_id, lot_id } = request.body;
      if (!anchor_id) {
        return reply.status(400).send({ error: "anchor_id required" });
      }

      const anchor = await store.getAnchor(anchor_id);
      if (!anchor) {
        return reply.status(404).send({ error: "Anchor not found" });
      }
      const targetLotId = lot_id ?? anchor.lot_id;
      if (!targetLotId) {
        return reply
          .status(400)
          .send({ error: "lot_id required (not present on anchor row)" });
      }

      // Lookup oracle row + log submission as pending
      const oraclePkh = await getOraclePkh();
      const oracleRow = await store.findOracleByPkhKind(oraclePkh, "events");
      if (!oracleRow) {
        return reply.status(400).send({
          error:
            `No 'events' oracle registered for pkh ${oraclePkh}. ` +
            `Run temp/seed_oracle.sql with this oracle's address.`,
        });
      }

      const submission = await store.insertOracleSubmission({
        oracle_id: oracleRow.id,
        lot_id: undefined, // lots.id is UUID; we use TEXT lot_id from CIP-68
        farm_id: anchor.farm_id,
        action: "UpdateEvents",
        payload_hash: anchor.merkle_root,
        status: "pending",
      });

      try {
        const { txHash } = await submitUpdateEvents(
          targetLotId,
          anchor.merkle_root,
        );
        await Promise.all([
          store.markAnchorSubmitted(anchor.id, txHash, "submitted"),
          store.updateOracleSubmission(submission.id, {
            tx_hash: txHash,
            status: "submitted",
          }),
        ]);
        return {
          anchor_id: anchor.id,
          lot_id: targetLotId,
          tx_hash: txHash,
          merkle_root: anchor.merkle_root,
          status: "submitted",
        };
      } catch (err: any) {
        const msg = err?.message || String(err);
        await store.updateOracleSubmission(submission.id, {
          status: "failed",
          error_message: msg,
        });
        request.log.error({ err }, "submit-anchor failed");
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // POST /blockchain/submit-lab — Set SCA score + lab cert hash on-chain
  app.post<{
    Body: { lot_id: string; sca_score: number; lab_cert_hash?: string };
  }>("/submit-lab", async (request, reply) => {
    const { lot_id, sca_score, lab_cert_hash } = request.body;
    if (!lot_id || sca_score === undefined) {
      return reply.status(400).send({ error: "lot_id and sca_score required" });
    }
    const oraclePkh = await getOraclePkh();
    const oracleRow = await store.findOracleByPkhKind(oraclePkh, "lab");
    const submission = oracleRow
      ? await store.insertOracleSubmission({
          oracle_id: oracleRow.id,
          farm_id: undefined,
          action: "UpdateLab",
          payload_hash: lab_cert_hash || `sca:${sca_score}`,
          status: "pending",
        })
      : null;
    try {
      const { txHash } = await submitUpdateLab(
        lot_id,
        sca_score,
        lab_cert_hash || "",
      );
      if (submission)
        await store.updateOracleSubmission(submission.id, {
          tx_hash: txHash,
          status: "submitted",
        });
      return { lot_id, tx_hash: txHash, status: "submitted" };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (submission)
        await store.updateOracleSubmission(submission.id, {
          status: "failed",
          error_message: msg,
        });
      request.log.error({ err }, "submit-lab failed");
      return reply.status(500).send({ error: msg });
    }
  });

  // POST /blockchain/submit-sustainability — Set sustainability metrics on-chain
  app.post<{ Body: { lot_id: string } & SustainabilityInput }>(
    "/submit-sustainability",
    async (request, reply) => {
      const { lot_id, ...metrics } = request.body;
      if (!lot_id) {
        return reply.status(400).send({ error: "lot_id required" });
      }
      const oraclePkh = await getOraclePkh();
      const oracleRow = await store.findOracleByPkhKind(
        oraclePkh,
        "sustainability",
      );
      const submission = oracleRow
        ? await store.insertOracleSubmission({
            oracle_id: oracleRow.id,
            farm_id: undefined,
            action: "UpdateSustainability",
            payload_hash:
              metrics.eudr_dds_hash || `co2e:${metrics.co2e_per_kg ?? "?"}`,
            status: "pending",
          })
        : null;
      try {
        const { txHash } = await submitUpdateSustainability(lot_id, metrics);
        if (submission)
          await store.updateOracleSubmission(submission.id, {
            tx_hash: txHash,
            status: "submitted",
          });
        return { lot_id, tx_hash: txHash, status: "submitted" };
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (submission)
          await store.updateOracleSubmission(submission.id, {
            status: "failed",
            error_message: msg,
          });
        request.log.error({ err }, "submit-sustainability failed");
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // GET /blockchain/anchors/:farmId — List all daily anchors for a farm
  app.get<{ Params: { farmId: string } }>("/anchors/:farmId", async (request) => {
    const anchors = await store.getAnchorsByFarm(request.params.farmId);
    return { anchors };
  });

  // GET /blockchain/oracle — Return oracle pubkey hash + address (for seeding + funding)
  app.get("/oracle", async () => {
    const address = await getOracleAddress();
    const pkh = await getOraclePkh();
    return { address, payment_pkh: pkh, script_address: passportScriptAddress };
  });

  // POST /blockchain/setup-collateral — Send 5 ADA from oracle to itself so
  // subsequent script txs have a clean pure-ADA UTxO for collateral.
  app.post("/setup-collateral", async (_request, reply) => {
    try {
      const { txHash } = await setupOracleCollateral();
      return { tx_hash: txHash, status: "submitted" };
    } catch (err: any) {
      return reply.status(500).send({ error: err?.message || String(err) });
    }
  });

  // POST /blockchain/verify-event — Verify single event against Merkle root
  app.post<{
    Body: { event: Record<string, unknown>; proof: string[]; root: string };
  }>("/verify-event", async (request, reply) => {
    const { event, proof, root } = request.body;
    if (!event || !proof || !root) {
      return reply.status(400).send({ error: "event, proof, root required" });
    }

    const SHA256 = (await import("crypto-js/sha256.js")).default;
    const leaf = SHA256(JSON.stringify(event)).toString();
    const valid = verifyProof(leaf, proof, root);

    return { valid, leaf, root };
  });

  // POST /blockchain/mint-passport — placeholder (actual minting via FE wallet)
  app.post("/mint-passport", async () => {
    return {
      message:
        "Use frontend wallet UI to mint. This endpoint is for server-side automation (Phase 2).",
    };
  });
}
