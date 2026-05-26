import {
  applyCborEncoding,
  stringToHex,
  CIP68_100,
  CIP68_222,
  mConStr0,
  metadataToCip68,
} from "@meshsdk/core";
import { bech32 } from "bech32";
import type { Data } from "@meshsdk/core";
import blueprint from "@/app/data/coffee-passport.json";

const compiledCode = blueprint.validators[0].compiledCode;

// Script CBOR for use in transactions
export const scriptCbor = applyCborEncoding(compiledCode);

// Script hash / Policy ID — directly from the Aiken blueprint
export const passportPolicyId = blueprint.validators[0].hash;

// Enterprise script address on Preprod (no staking credential)
// Header byte: 0x70 (testnet script-only) + 28-byte script hash
function buildScriptAddress(scriptHash: string, networkId: number): string {
  const header = networkId === 0 ? "70" : "71";
  const bytes = Buffer.from(header + scriptHash, "hex");
  const words = bech32.toWords(bytes);
  const prefix = networkId === 0 ? "addr_test" : "addr";
  return bech32.encode(prefix, words, 120);
}

export const passportScriptAddress = buildScriptAddress(passportPolicyId, 0);

// -- Redeemer constructors --

// Mint handler redeemers (MintAction)
export const mintPassportRedeemer: Data = mConStr0([]); // MintPassport
export const burnPassportRedeemer: Data = { alternative: 1, fields: [] }; // BurnPassport

// Spend handler redeemers (SpendAction)
export const updateEventsRedeemer: Data = mConStr0([]); // UpdateEvents
export const updateSustainabilityRedeemer: Data = {
  alternative: 1,
  fields: [],
}; // UpdateSustainability
export const updateLabRedeemer: Data = { alternative: 2, fields: [] }; // UpdateLab

// -- CIP-68 token name helpers --

export function passportTokenName(lotId: string) {
  return stringToHex(lotId);
}

export function referenceTokenName(lotId: string) {
  return CIP68_100(passportTokenName(lotId));
}

export function userTokenName(lotId: string) {
  return CIP68_222(passportTokenName(lotId));
}

// -- Datum builder --

export interface PassportDatumParams {
  farmId: string;
  lotId: string;
  variety: string;
  processing: string;
  harvestTimestamp: number;
  ownerPubKeyHash: string;
}

/**
 * Build the initial CoffeePassportDatum for minting.
 * All hash fields start empty; sustainability fields start at 0.
 */
export function buildInitialDatum(params: PassportDatumParams): Data {
  const emptySustainability: Data = {
    alternative: 0,
    fields: [
      "", // forest_baseline_hash
      "", // eudr_dds_hash
      0, // deforestation_risk_score
      "", // fertilizer_log_hash
      0, // organic_input_ratio_pct
      0, // synthetic_n_kg_per_ha
      0, // co2e_per_kg_int10
      "", // co2_calc_method
      0, // water_l_per_kg
      0, // wastewater_treated (Bool: 0 = False)
      0, // som_pct_int10
      "", // soil_test_lab_hash
      0, // shade_canopy_pct
      0, // bird_species_count
      "", // biodiversity_audit_hash
      [], // certifications (empty list)
    ],
  };

  return {
    alternative: 0,
    fields: [
      params.farmId,
      params.lotId,
      params.variety,
      params.processing,
      params.harvestTimestamp,
      "", // daily_events_merkle_root (empty initially)
      "", // photos_hash
      "", // gps_polygon_hash
      0, // sca_score (0 = not yet available)
      "", // lab_cert_hash
      emptySustainability,
      1, // metadata_version
      params.ownerPubKeyHash,
    ],
  };
}

/**
 * Build CIP-68 inline datum metadata for the reference token.
 */
export function buildCip68Metadata(params: PassportDatumParams) {
  return metadataToCip68({
    name: `Coffee Passport: ${params.lotId}`,
    farm: params.farmId,
    lot: params.lotId,
    variety: params.variety,
    processing: params.processing,
    harvest_date: new Date(params.harvestTimestamp * 1000).toISOString(),
    standard: "VerifiedVietCoffee v3",
  });
}
