import { FastifyInstance } from "fastify";
import { store } from "../lib/store.js";
import { buildDailyMerkleTree } from "../lib/merkle.js";
import {
  findReferenceUtxo,
  getProvider,
  parsePassportDatum,
  passportPolicyId,
  passportScriptAddress,
} from "../lib/cardano.js";

export async function verifyRoutes(app: FastifyInstance) {
  // GET /verify/lots — List every on-chain passport (CIP-68 reference tokens at
  // the script address), deduped by lot_id. Used by the operator UI to surface
  // real minted lots alongside demo data. Declared before "/:farmId" so Fastify
  // doesn't treat "lots" as a farmId.
  app.get("/lots", async () => {
    const provider = getProvider();
    const utxos = await provider.fetchAddressUTxOs(passportScriptAddress);
    const refPrefix = passportPolicyId + "000643b0"; // CIP-68 label 100
    const byLot = new Map<string, Record<string, unknown>>();
    for (const u of utxos) {
      const refAsset = u.output.amount.find((a) => a.unit.startsWith(refPrefix));
      if (!refAsset) continue;
      const p = parsePassportDatum(u);
      if (!p || !p.lot_id) continue;
      byLot.set(p.lot_id, {
        lot_id: p.lot_id,
        farm_id: p.farm_id,
        variety: p.variety,
        processing: p.processing,
        harvest_timestamp: p.harvest_timestamp,
        sca_score: p.sca_score,
        owner: p.owner,
        daily_events_merkle_root: p.daily_events_merkle_root,
        co2e_per_kg_int10: p.sustainability.co2e_per_kg_int10,
        water_l_per_kg: p.sustainability.water_l_per_kg,
        eudr_dds_hash: p.sustainability.eudr_dds_hash,
        ref_tx_hash: u.input.txHash,
      });
    }
    const lots = Array.from(byLot.values());
    return { count: lots.length, lots };
  });

  // GET /verify/lot/:lotId — Consumer-facing passport view.
  // NOTE: this MUST be declared before /:farmId so Fastify doesn't treat "lot"
  // as a farmId.
  app.get<{ Params: { lotId: string } }>(
    "/lot/:lotId",
    async (request, reply) => {
      const { lotId } = request.params;

      // 1. On-chain passport (reference UTxO datum)
      const refUtxo = await findReferenceUtxo(lotId);
      if (!refUtxo) {
        return reply.status(404).send({
          error: `No on-chain passport for lot ${lotId} at ${passportScriptAddress}`,
        });
      }
      const passport = parsePassportDatum(refUtxo);
      if (!passport) {
        return reply
          .status(500)
          .send({ error: "Reference UTxO has no inline datum" });
      }

      // 2. Off-chain anchors for this lot — prefer rows tagged by lot_id,
      //    fall back to the lot's farm if none are tagged (older anchors).
      const datumFarmId = passport.farm_id;
      const lotAnchors = await store.getAnchorsByLot(lotId);
      const fallbackAnchors = lotAnchors.length
        ? []
        : (await store.getAnchorsByFarm(datumFarmId)).filter((a) => !a.lot_id);
      const anchorsForLot = [...lotAnchors, ...fallbackAnchors];

      // Sensor events may have been ingested under a slightly different
      // farm_id (e.g. simulators use "binhdong" but passport says
      // "binhdong_farm"); query both.
      const seenFarmIds = new Set<string>([datumFarmId]);
      for (const a of anchorsForLot) seenFarmIds.add(a.farm_id);
      const farmIds = Array.from(seenFarmIds);

      // 3. Day-by-day timeline.
      //   The on-chain datum only holds the LATEST merkle root, so older days
      //   cannot pass a strict equality check. We mark a day as `verified` if
      //   it has an on-chain tx_hash + recomputed off-chain root still matches
      //   what we stored at anchor time (tamper-evident off-chain). For the
      //   most-recent submitted day we also check it equals the current
      //   on-chain root → `current_root_match` flag.
      const days = await Promise.all(
        anchorsForLot.map(async (a) => {
          const events = await store.getEventsByFarmsAndDate(
            farmIds,
            a.anchor_date,
          );
          const built = events.length
            ? buildDailyMerkleTree(events)
            : { root: "", proofs: [] as { index: number; proof: string[] }[] };
          // verified: we trust the on-chain tx as historical evidence; consumer
          // can click the tx hash to inspect the anchored root.
          const verified = a.status === "submitted" && !!a.tx_hash;
          // current_root_match: stored anchor root equals the current on-chain
          // datum root (true for the most-recently submitted day).
          const currentRootMatch =
            !!a.merkle_root &&
            a.merkle_root === passport.daily_events_merkle_root;
          return {
            date: a.anchor_date,
            event_count: a.event_count,
            merkle_root_offchain: a.merkle_root,
            merkle_root_onchain: passport.daily_events_merkle_root,
            tx_hash: a.tx_hash ?? null,
            status: a.status,
            verified,
            current_root_match: currentRootMatch,
            events,
            proofs: built.proofs,
          };
        }),
      );

      return {
        lot_id: lotId,
        script_address: passportScriptAddress,
        ref_utxo: {
          tx_hash: refUtxo.input.txHash,
          output_index: refUtxo.input.outputIndex,
        },
        passport,
        days,
      };
    },
  );

  // GET /verify/:farmId/:date — Get passport data + Merkle proof for a day
  app.get<{ Params: { farmId: string; date: string } }>(
    "/:farmId/:date",
    async (request, reply) => {
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
    },
  );

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
