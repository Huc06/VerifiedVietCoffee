import {
  MeshWallet,
  BlockfrostProvider,
  MeshTxBuilder,
  applyCborEncoding,
  resolvePaymentKeyHash,
} from "@meshsdk/core";
import type { UTxO, Data } from "@meshsdk/core";
import { parseDatumCbor } from "@meshsdk/core-cst";
import { bech32 } from "bech32";
import blueprint from "../data/coffee-passport.json" with { type: "json" };

// ---- Network ----
// 0 = testnet (preview/preprod), 1 = mainnet
const NETWORK_ID: 0 | 1 =
  (process.env.CARDANO_NETWORK_ID as "0" | "1") === "1" ? 1 : 0;

// ---- Contract constants (mirrored from frontend/app/lib/coffee-passport.ts) ----
const compiledCode = blueprint.validators[0].compiledCode;
export const scriptCbor = applyCborEncoding(compiledCode);
export const passportPolicyId = blueprint.validators[0].hash;

function buildScriptAddress(scriptHash: string, networkId: 0 | 1): string {
  const header = networkId === 0 ? "70" : "71";
  const bytes = Buffer.from(header + scriptHash, "hex");
  const words = bech32.toWords(bytes);
  const prefix = networkId === 0 ? "addr_test" : "addr";
  return bech32.encode(prefix, words, 120);
}

export const passportScriptAddress = buildScriptAddress(
  passportPolicyId,
  NETWORK_ID,
);

// CIP-68 reference token name (label 100 = 000643b0)
export function referenceTokenName(lotId: string): string {
  const hexLot = Buffer.from(lotId, "utf8").toString("hex");
  return `000643b0${hexLot}`;
}

// Redeemers (must match Aiken validator constructors)
export const updateEventsRedeemer: Data = { alternative: 0, fields: [] };
export const updateSustainabilityRedeemer: Data = {
  alternative: 1,
  fields: [],
};
export const updateLabRedeemer: Data = { alternative: 2, fields: [] };

// ---- Lazy oracle singleton ----
let _provider: BlockfrostProvider | null = null;
let _wallet: MeshWallet | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export function getProvider(): BlockfrostProvider {
  if (!_provider) {
    _provider = new BlockfrostProvider(requireEnv("BLOCKFROST_API_KEY"));
  }
  return _provider;
}

export async function getOracleWallet(): Promise<MeshWallet> {
  if (_wallet) return _wallet;

  const provider = getProvider();
  const mnemonic = requireEnv("ORACLE_MNEMONIC").trim().split(/\s+/);
  if (mnemonic.length !== 12 && mnemonic.length !== 15 && mnemonic.length !== 24) {
    throw new Error(
      `ORACLE_MNEMONIC must be 12, 15, or 24 words (got ${mnemonic.length})`,
    );
  }

  const wallet = new MeshWallet({
    networkId: NETWORK_ID,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: mnemonic },
  });
  await wallet.init();
  _wallet = wallet;
  return wallet;
}

export async function getOracleAddress(): Promise<string> {
  const w = await getOracleWallet();
  const addr = w.addresses.baseAddressBech32 ?? w.addresses.enterpriseAddressBech32;
  if (!addr) throw new Error("Oracle wallet has no payment address");
  return addr;
}

export async function getOraclePkh(): Promise<string> {
  return resolvePaymentKeyHash(await getOracleAddress());
}

// ---- Parse CIP-68 passport datum ----
// Order MUST match Aiken `CoffeePassportDatum` and frontend buildInitialDatum().
export interface CoffeePassport {
  farm_id: string;
  lot_id: string;
  variety: string;
  processing: string;
  harvest_timestamp: number;
  daily_events_merkle_root: string;
  photos_hash: string;
  gps_polygon_hash: string;
  sca_score: number;
  lab_cert_hash: string;
  sustainability: {
    forest_baseline_hash: string;
    eudr_dds_hash: string;
    deforestation_risk_score: number;
    fertilizer_log_hash: string;
    organic_input_ratio_pct: number;
    synthetic_n_kg_per_ha: number;
    co2e_per_kg_int10: number;
    co2_calc_method: string;
    water_l_per_kg: number;
    wastewater_treated: number;
    som_pct_int10: number;
    soil_test_lab_hash: string;
    shade_canopy_pct: number;
    bird_species_count: number;
    biodiversity_audit_hash: string;
    certifications: string[];
  };
  metadata_version: number;
  owner: string;
}

// JSON-Plutus-Data leaves (as returned by parseDatumCbor):
//   { bytes: "<hex>" }          → bytestring
//   { int: <bigint> }           → integer
//   { constructor: <n>, fields: [...] } → Constr
//   { list: [...] }             → List
type JsonPD =
  | { bytes: string }
  | { int: bigint | number | string }
  | { constructor: number | string; fields: JsonPD[] }
  | { list: JsonPD[] }
  | { map: { k: JsonPD; v: JsonPD }[] };

function hexToUtf8Safe(hex: string): string {
  if (!hex) return "";
  try {
    const buf = Buffer.from(hex, "hex");
    const decoded = buf.toString("utf8");
    return /[\x00-\x08\x0B-\x1F]/.test(decoded) ? hex : decoded;
  } catch {
    return hex;
  }
}

function pdBytes(node: JsonPD | undefined): string {
  if (!node) return "";
  return (node as { bytes?: string }).bytes ?? "";
}
function pdString(node: JsonPD | undefined): string {
  return hexToUtf8Safe(pdBytes(node));
}
function pdInt(node: JsonPD | undefined): number {
  if (!node) return 0;
  const v = (node as { int?: bigint | number | string }).int;
  if (v === undefined) return 0;
  return Number(v);
}
function pdList(node: JsonPD | undefined): JsonPD[] {
  if (!node) return [];
  const l = (node as { list?: JsonPD[] }).list;
  if (Array.isArray(l)) return l;
  // fallback: some serializers expose .fields for lists
  const f = (node as { fields?: JsonPD[] }).fields;
  return Array.isArray(f) ? f : [];
}
function pdFields(node: JsonPD | undefined): JsonPD[] {
  if (!node) return [];
  return (node as { fields?: JsonPD[] }).fields ?? [];
}
// Bool = Constr 0 [] (False) / Constr 1 [] (True). Tolerate legacy Int encoding.
function pdBool(node: JsonPD | undefined): number {
  if (!node) return 0;
  if (Object.prototype.hasOwnProperty.call(node, "constructor")) {
    return Number((node as { constructor: number | string }).constructor) === 1
      ? 1
      : 0;
  }
  return pdInt(node) === 0 ? 0 : 1;
}

export function parsePassportDatum(refUtxo: UTxO): CoffeePassport | null {
  const rawDatum = refUtxo.output.plutusData;
  if (!rawDatum || typeof rawDatum !== "string") return null;

  let parsed: JsonPD;
  try {
    parsed = parseDatumCbor<JsonPD>(rawDatum);
  } catch {
    return null;
  }
  const fields = pdFields(parsed);
  if (fields.length < 13) return null;
  const sFields = pdFields(fields[10]);
  if (sFields.length < 16) return null;

  return {
    farm_id: pdString(fields[0]),
    lot_id: pdString(fields[1]),
    variety: pdString(fields[2]),
    processing: pdString(fields[3]),
    harvest_timestamp: pdInt(fields[4]),
    daily_events_merkle_root: pdString(fields[5]),
    photos_hash: pdString(fields[6]),
    gps_polygon_hash: pdString(fields[7]),
    sca_score: pdInt(fields[8]),
    lab_cert_hash: pdString(fields[9]),
    sustainability: {
      forest_baseline_hash: pdString(sFields[0]),
      eudr_dds_hash: pdString(sFields[1]),
      deforestation_risk_score: pdInt(sFields[2]),
      fertilizer_log_hash: pdBytes(sFields[3]),
      organic_input_ratio_pct: pdInt(sFields[4]),
      synthetic_n_kg_per_ha: pdInt(sFields[5]),
      co2e_per_kg_int10: pdInt(sFields[6]),
      co2_calc_method: pdString(sFields[7]),
      water_l_per_kg: pdInt(sFields[8]),
      wastewater_treated: pdBool(sFields[9]),
      som_pct_int10: pdInt(sFields[10]),
      soil_test_lab_hash: pdString(sFields[11]),
      shade_canopy_pct: pdInt(sFields[12]),
      bird_species_count: pdInt(sFields[13]),
      biodiversity_audit_hash: pdString(sFields[14]),
      certifications: pdList(sFields[15]).map(pdString),
    },
    metadata_version: pdInt(fields[11]),
    owner: pdBytes(fields[12]),
  };
}

// True if the datum has Bool fields properly encoded (Constr, not Int).
// Older mints serialized wastewater_treated as Int 0 which can't be spent.
function isDatumSpendable(refUtxo: UTxO): boolean {
  try {
    const cbor = refUtxo.output.plutusData;
    if (typeof cbor !== "string") return false;
    const parsed = parseDatumCbor<JsonPD>(cbor);
    const sustain = pdFields(parsed)[10];
    const wastewater = pdFields(sustain)[9] as Record<string, unknown> | undefined;
    if (!wastewater) return false;
    // hasOwnProperty — `"constructor" in obj` is always true (inherited from
    // Object.prototype), so we have to check own keys.
    return Object.prototype.hasOwnProperty.call(wastewater, "fields");
  } catch {
    return false;
  }
}

// ---- Find reference UTxO for a given lot ----
// Prefer a spendable (Bool-correctly-encoded) UTxO; fall back to any match
// so the consumer page still shows passport data even if it's bricked.
export async function findReferenceUtxo(lotId: string): Promise<UTxO | null> {
  const provider = getProvider();
  const refUnit = passportPolicyId + referenceTokenName(lotId);
  const utxos = await provider.fetchAddressUTxOs(passportScriptAddress);
  const matches = utxos.filter((u: UTxO) =>
    u.output.amount.some((a) => a.unit === refUnit),
  );
  if (matches.length === 0) return null;
  return matches.find(isDatumSpendable) ?? matches[matches.length - 1];
}

// Convert JSON-Plutus-Data (from parseDatumCbor) into Mesh `Data` format that
// MeshTxBuilder.txOutInlineDatumValue accepts.
function jsonPdToMeshData(node: JsonPD): Data {
  if ("bytes" in node) return (node as { bytes: string }).bytes;
  if ("int" in node) {
    const v = (node as { int: bigint | number | string }).int;
    return typeof v === "bigint" ? Number(v) : Number(v);
  }
  if ("list" in node) {
    return (node as { list: JsonPD[] }).list.map(jsonPdToMeshData) as Data[];
  }
  if ("constructor" in node) {
    const n = node as { constructor: number | string; fields: JsonPD[] };
    return {
      alternative: Number(n.constructor),
      fields: n.fields.map(jsonPdToMeshData) as Data[],
    };
  }
  if ("map" in node) {
    const m = node as { map: { k: JsonPD; v: JsonPD }[] };
    return new Map(
      m.map.map(({ k, v }) => [jsonPdToMeshData(k), jsonPdToMeshData(v)]),
    ) as unknown as Data;
  }
  throw new Error(`Unknown PlutusData node: ${JSON.stringify(node)}`);
}

// Bool in Plutus = Constr 0 [] (False) or Constr 1 [] (True).
const FALSE_DATA: Data = { alternative: 0, fields: [] };
const TRUE_DATA: Data = { alternative: 1, fields: [] };

// Ensure a Bool field stays as Constr — older passports were minted with the
// field encoded as Int 0, which won't deserialize against `wastewater_treated:
// Bool` in the spend handler.
function coerceBool(v: Data): Data {
  if (typeof v === "number" || typeof v === "bigint") {
    return Number(v) === 0 ? FALSE_DATA : TRUE_DATA;
  }
  return v;
}

// Parse the reference UTxO datum into mutable Mesh `Data` fields, with the
// Bool field (wastewater_treated) coerced to a proper Constr.
function parseDatumToMeshFields(datumCbor: string): Data[] {
  const parsed = parseDatumCbor<JsonPD>(datumCbor);
  const fields = pdFields(parsed);
  if (fields.length < 13) {
    throw new Error("Reference datum does not have expected 13 fields");
  }
  const meshFields = fields.map(jsonPdToMeshData) as Data[];
  const sustainability = meshFields[10] as {
    alternative: number;
    fields: Data[];
  };
  if (
    sustainability &&
    typeof sustainability === "object" &&
    Array.isArray(sustainability.fields) &&
    sustainability.fields.length > 9
  ) {
    sustainability.fields[9] = coerceBool(sustainability.fields[9]);
  }
  return meshFields;
}

export interface SubmitResult {
  txHash: string;
  oraclePkh: string;
}

const MIN_COLLATERAL = BigInt(3_000_000); // 3 ADA
const isLovelaceUnit = (unit: string) => unit === "lovelace" || unit === "";

function findPureAda(utxos: UTxO[]): UTxO[] {
  return utxos
    .filter((u) => {
      if (u.output.amount.length !== 1) return false;
      if (!isLovelaceUnit(u.output.amount[0].unit)) return false;
      try {
        return BigInt(u.output.amount[0].quantity) >= MIN_COLLATERAL;
      } catch {
        return false;
      }
    })
    .sort((a, b) =>
      BigInt(b.output.amount[0].quantity) > BigInt(a.output.amount[0].quantity)
        ? 1
        : -1,
    );
}

// Return a collateral UTxO, auto-provisioning one if the wallet has none.
// Mesh's headless wallet doesn't reserve collateral like Lace, and each script
// spend consumes the previous pure-ADA UTxO, so we self-split a fresh 5 ADA
// UTxO and poll until the chain confirms it.
async function ensureCollateral(
  wallet: MeshWallet,
  pollSeconds = 90,
): Promise<UTxO[]> {
  const fromWallet = await wallet.getCollateral();
  if (fromWallet.length) return fromWallet;

  let pure = findPureAda(await wallet.getUtxos());
  if (pure.length) return [pure[0]];

  // No clean UTxO — split one and wait for confirmation.
  console.log("[collateral] none found, auto-splitting 5 ADA…");
  await setupOracleCollateral();
  const deadline = Date.now() + pollSeconds * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15_000));
    pure = findPureAda(await wallet.getUtxos());
    if (pure.length) {
      console.log("[collateral] new pure-ADA UTxO confirmed");
      return [pure[0]];
    }
  }
  throw new Error(
    "Auto-provisioned collateral but it did not confirm within " +
      `${pollSeconds}s. Retry shortly.`,
  );
}

// ---- Generic spend: mutate the datum + submit with the given redeemer ----
async function submitDatumUpdate(
  lotId: string,
  redeemer: Data,
  mutate: (fields: Data[]) => void,
): Promise<SubmitResult> {
  const wallet = await getOracleWallet();
  const provider = getProvider();
  const oraclePkh = await getOraclePkh();

  const refUtxo = await findReferenceUtxo(lotId);
  if (!refUtxo) {
    throw new Error(
      `Reference UTxO not found at ${passportScriptAddress} for lot ${lotId}. Mint passport first.`,
    );
  }
  const datumCbor = refUtxo.output.plutusData;
  if (!datumCbor || typeof datumCbor !== "string") {
    throw new Error("Reference UTxO has no inline datum");
  }

  const passport = parsePassportDatum(refUtxo);
  if (passport && passport.owner && passport.owner !== oraclePkh) {
    throw new Error(
      `Oracle pkh (${oraclePkh}) does not match passport datum owner (${passport.owner}). ` +
        `Mint passport with the oracle's key, or rotate ORACLE_MNEMONIC.`,
    );
  }

  const fields = parseDatumToMeshFields(datumCbor);
  mutate(fields);
  const newDatum: Data = { alternative: 0, fields };

  const changeAddress = await wallet.getChangeAddress();
  const collateral = await ensureCollateral(wallet);
  const utxos = await wallet.getUtxos();

  const refTokenAssets = refUtxo.output.amount
    .filter((a) => a.unit !== "lovelace" && a.unit !== "")
    .map((a) => ({ unit: a.unit, quantity: a.quantity }));
  // 3 ADA comfortably covers min-UTxO even for the largest datum (lab cert +
  // sustainability hashes). Excess returns to the oracle as change.
  const outputAssets = [
    { unit: "lovelace", quantity: "3000000" },
    ...refTokenAssets,
  ];

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
    verbose: false,
  });

  const unsignedTx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(refUtxo.input.txHash, refUtxo.input.outputIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(redeemer)
    .txInScript(scriptCbor)
    .txOut(passportScriptAddress, outputAssets)
    .txOutInlineDatumValue(newDatum)
    .requiredSignerHash(oraclePkh)
    .txInCollateral(
      collateral[0].input.txHash,
      collateral[0].input.outputIndex,
      collateral[0].output.amount,
      collateral[0].output.address,
    )
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);
  return { txHash, oraclePkh };
}

// ---- UpdateEvents: set daily_events_merkle_root (field 5) ----
export async function submitUpdateEvents(
  lotId: string,
  merkleRoot: string,
): Promise<SubmitResult> {
  return submitDatumUpdate(lotId, updateEventsRedeemer, (fields) => {
    fields[5] = merkleRoot;
  });
}

// ---- UpdateLab: set sca_score (field 8) + lab_cert_hash (field 9) ----
export async function submitUpdateLab(
  lotId: string,
  scaScore: number,
  labCertHash: string,
): Promise<SubmitResult> {
  return submitDatumUpdate(lotId, updateLabRedeemer, (fields) => {
    fields[8] = scaScore;
    fields[9] = labCertHash;
  });
}

export interface SustainabilityInput {
  co2e_per_kg?: number; // e.g. 2.45 → stored ×10 = 25 (int10)
  water_l_per_kg?: number;
  organic_input_ratio_pct?: number;
  som_pct?: number; // e.g. 3.5 → stored ×10 = 35
  shade_canopy_pct?: number;
  deforestation_risk_score?: number;
  eudr_dds_hash?: string;
  wastewater_treated?: boolean;
}

// ---- UpdateSustainability: replace fields of nested struct (idx 10) ----
// Sustainability struct field order (see veriviet/types.ak):
//  0 forest_baseline_hash       8 water_l_per_kg
//  1 eudr_dds_hash              9 wastewater_treated (Bool)
//  2 deforestation_risk_score  10 som_pct_int10
//  3 fertilizer_log_hash       11 soil_test_lab_hash
//  4 organic_input_ratio_pct   12 shade_canopy_pct
//  5 synthetic_n_kg_per_ha     13 bird_species_count
//  6 co2e_per_kg_int10         14 biodiversity_audit_hash
//  7 co2_calc_method           15 certifications (List)
export async function submitUpdateSustainability(
  lotId: string,
  input: SustainabilityInput,
): Promise<SubmitResult> {
  return submitDatumUpdate(lotId, updateSustainabilityRedeemer, (fields) => {
    const s = fields[10] as { alternative: number; fields: Data[] };
    if (!s || !Array.isArray(s.fields)) {
      throw new Error("Datum has no sustainability struct to update");
    }
    if (input.eudr_dds_hash !== undefined) s.fields[1] = input.eudr_dds_hash;
    if (input.deforestation_risk_score !== undefined)
      s.fields[2] = input.deforestation_risk_score;
    if (input.organic_input_ratio_pct !== undefined)
      s.fields[4] = input.organic_input_ratio_pct;
    if (input.co2e_per_kg !== undefined)
      s.fields[6] = Math.round(input.co2e_per_kg * 10);
    if (input.water_l_per_kg !== undefined)
      s.fields[8] = Math.round(input.water_l_per_kg);
    if (input.wastewater_treated !== undefined)
      s.fields[9] = input.wastewater_treated ? TRUE_DATA : FALSE_DATA;
    if (input.som_pct !== undefined)
      s.fields[10] = Math.round(input.som_pct * 10);
    if (input.shade_canopy_pct !== undefined)
      s.fields[12] = input.shade_canopy_pct;
  });
}

// One-shot helper: send 5 ADA from the oracle wallet back to itself in a
// pure-ADA output so that subsequent script txs have a clean collateral input.
// Idempotent in spirit — if a pure-ADA UTxO already exists, you can skip
// calling this; calling it again just creates another one.
export async function setupOracleCollateral(): Promise<SubmitResult> {
  const wallet = await getOracleWallet();
  const provider = getProvider();
  const oraclePkh = await getOraclePkh();
  const address = await getOracleAddress();
  const utxos = await wallet.getUtxos();
  const changeAddress = await wallet.getChangeAddress();

  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
    verbose: false,
  });

  const unsignedTx = await txBuilder
    .txOut(address, [{ unit: "lovelace", quantity: "5000000" }])
    .changeAddress(changeAddress)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx, true);
  const txHash = await wallet.submitTx(signedTx);
  return { txHash, oraclePkh };
}

