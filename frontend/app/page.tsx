"use client";

import { useState } from "react";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { QRCodeSVG } from "qrcode.react";
import {
  MeshTxBuilder,
  BlockfrostProvider,
  resolvePaymentKeyHash,
} from "@meshsdk/core";
import type { UTxO } from "@meshsdk/core";
import {
  scriptCbor,
  passportScriptAddress,
  passportPolicyId,
  mintPassportRedeemer,
  updateEventsRedeemer,
  updateLabRedeemer,
  referenceTokenName,
  userTokenName,
  buildInitialDatum,
} from "@/app/lib/coffee-passport";

const BLOCKFROST_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_KEY || "";

// Lace's CIP-30 getCollateral returns null when no dedicated collateral UTxO
// is configured (Mesh's getCollateralMesh() then crashes on .map()). Fall
// back to the largest pure-ADA UTxO from the wallet (>= 3 ADA, the minimum
// the protocol needs for a Plutus tx at current params).
async function getCollateralUtxo(wallet: any, utxos: UTxO[]): Promise<UTxO[]> {
  try {
    const fromWallet = await wallet.getCollateralMesh();
    if (fromWallet && fromWallet.length > 0) {
      console.log("[collateral] from wallet:", fromWallet);
      return fromWallet;
    }
  } catch (e) {
    console.warn("[collateral] getCollateralMesh threw, falling back:", e);
  }

  const minLovelace = BigInt(3_000_000); // 3 ADA
  const isLovelace = (unit: string) => unit === "lovelace" || unit === "";

  const pureAda = utxos
    .filter((u) => {
      const onlyAda =
        u.output.amount.length === 1 && isLovelace(u.output.amount[0].unit);
      if (!onlyAda) return false;
      try {
        return BigInt(u.output.amount[0].quantity) >= minLovelace;
      } catch {
        return false;
      }
    })
    // largest first
    .sort((a, b) =>
      BigInt(b.output.amount[0].quantity) >
      BigInt(a.output.amount[0].quantity)
        ? 1
        : -1,
    );

  console.log(
    `[collateral] wallet utxos: ${utxos.length}, pure-ADA >= 3: ${pureAda.length}`,
  );
  if (utxos.length > 0) {
    console.log(
      "[collateral] first 3 utxos:",
      utxos.slice(0, 3).map((u) => ({
        units: u.output.amount.map((a) => a.unit),
        qtys: u.output.amount.map((a) => a.quantity),
      })),
    );
  }

  if (pureAda.length === 0) {
    throw new Error(
      `No pure-ADA collateral UTxO (>= 3 ADA) found in your wallet ` +
        `(${utxos.length} UTxOs total). Either:\n` +
        `  1) Set up a dedicated 5 ADA collateral in Lace ` +
        `(Settings → Network → Collateral), OR\n` +
        `  2) Send yourself a small pure-ADA UTxO (e.g. 5 tADA) so the dApp ` +
        `has a clean input to use as collateral.`,
    );
  }
  return [pureAda[0]];
}

type TxResult = { hash: string; error?: never } | { hash?: never; error: string };

export default function Home() {
  const { wallet, connected } = useWallet();
  const [tab, setTab] = useState<"mint" | "update" | "lab">("mint");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);

  // Mint form
  const [farmId, setFarmId] = useState("binhdong_farm");
  const [lotId, setLotId] = useState("LD-2026-0527");
  const [variety, setVariety] = useState("Robusta");
  const [processing, setProcessing] = useState("Honey");

  // Update Events form
  const [merkleRoot, setMerkleRoot] = useState("");
  const [photosHash, setPhotosHash] = useState("");

  // Update Lab form
  const [scaScore, setScaScore] = useState("84");
  const [labCertHash, setLabCertHash] = useState("");

  function getProvider() {
    if (!BLOCKFROST_KEY || BLOCKFROST_KEY === "your_blockfrost_preview_key_here") {
      throw new Error("Set NEXT_PUBLIC_BLOCKFROST_KEY in .env.local");
    }
    return new BlockfrostProvider(BLOCKFROST_KEY);
  }

  async function handleMintPassport() {
    setLoading(true);
    setResult(null);
    let step = "init";
    try {
      step = "getProvider";
      const provider = getProvider();

      step = "wallet.getUtxosMesh";
      const utxos = await wallet.getUtxosMesh();
      console.log("[mint] utxos:", utxos.length);

      step = "wallet.getChangeAddressBech32";
      const changeAddress = await wallet.getChangeAddressBech32();
      console.log("[mint] changeAddress:", changeAddress);

      step = "wallet.getCollateral";
      const collateral: UTxO[] = await getCollateralUtxo(wallet, utxos);
      console.log("[mint] collateral:", collateral.length);

      step = "resolvePaymentKeyHash(changeAddress)";
      const ownerPkh = resolvePaymentKeyHash(changeAddress);
      console.log("[mint] ownerPkh:", ownerPkh);

      const harvestTimestamp = Math.floor(Date.now() / 1000);
      const datum = buildInitialDatum({
        farmId,
        lotId,
        variety,
        processing,
        harvestTimestamp,
        ownerPubKeyHash: ownerPkh,
      });

      const refTokenName = referenceTokenName(lotId);
      const usrTokenName = userTokenName(lotId);
      console.log("[mint] refTokenName:", refTokenName);
      console.log("[mint] usrTokenName:", usrTokenName);
      console.log("[mint] scriptAddress:", passportScriptAddress);

      step = "txBuilder.complete";
      const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: true });

      const unsignedTx = await txBuilder
        .mintPlutusScriptV3()
        .mint("1", passportPolicyId, refTokenName)
        .mintingScript(scriptCbor)
        .mintRedeemerValue(mintPassportRedeemer)
        .mintPlutusScriptV3()
        .mint("1", passportPolicyId, usrTokenName)
        .mintingScript(scriptCbor)
        .mintRedeemerValue(mintPassportRedeemer)
        .txOut(passportScriptAddress, [
          { unit: passportPolicyId + refTokenName, quantity: "1" },
        ])
        .txOutInlineDatumValue(datum)
        .txInCollateral(
          collateral[0].input.txHash,
          collateral[0].input.outputIndex,
          collateral[0].output.amount,
          collateral[0].output.address,
        )
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();
      console.log("[mint] unsignedTx length:", unsignedTx.length);

      step = "wallet.signTxReturnFullTx";
      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);
      console.log("[mint] signedTx length:", signedTx.length);

      step = "wallet.submitTx";
      const txHash = await wallet.submitTx(signedTx);
      setResult({ hash: txHash });
    } catch (e: any) {
      console.error(`[mint] failed at step "${step}":`, e);
      setResult({ error: `[${step}] ${e?.message || String(e)}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateEvents() {
    setLoading(true);
    setResult(null);
    try {
      const provider = getProvider();
      const utxos = await wallet.getUtxosMesh();
      const changeAddress = await wallet.getChangeAddressBech32();
      const collateral: UTxO[] = await getCollateralUtxo(wallet, utxos);
      const ownerPkh = resolvePaymentKeyHash(changeAddress);

      // Find the reference token UTxO at script address
      const refTokenName = referenceTokenName(lotId);
      const refAssetUnit = passportPolicyId + refTokenName;
      const scriptUtxos = await provider.fetchAddressUTxOs(passportScriptAddress);
      const refUtxo = scriptUtxos.find((u: UTxO) =>
        u.output.amount.some((a: any) => a.unit === refAssetUnit),
      );
      if (!refUtxo) throw new Error("Reference token UTxO not found at script address");

      // Parse old datum and build new datum with updated merkle root
      const oldDatumFields = (refUtxo.output.plutusData as any)?.fields;
      if (!oldDatumFields) throw new Error("No inline datum found on reference UTxO");

      // Clone and update only the allowed fields
      const newFields = [...oldDatumFields];
      if (merkleRoot) newFields[5] = merkleRoot;
      if (photosHash) newFields[6] = photosHash;
      const newDatum = { alternative: 0, fields: newFields };

      const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: true });

      const unsignedTx = await txBuilder
        .spendingPlutusScriptV3()
        .txIn(refUtxo.input.txHash, refUtxo.input.outputIndex)
        .txInInlineDatumPresent()
        .txInRedeemerValue(updateEventsRedeemer)
        .txInScript(scriptCbor)
        // Continuing output with updated datum
        .txOut(passportScriptAddress, refUtxo.output.amount)
        .txOutInlineDatumValue(newDatum)
        .requiredSignerHash(ownerPkh)
        .txInCollateral(
          collateral[0].input.txHash,
          collateral[0].input.outputIndex,
          collateral[0].output.amount,
          collateral[0].output.address,
        )
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);
      const txHash = await wallet.submitTx(signedTx);
      setResult({ hash: txHash });
    } catch (e: any) {
      setResult({ error: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLab() {
    setLoading(true);
    setResult(null);
    try {
      const provider = getProvider();
      const utxos = await wallet.getUtxosMesh();
      const changeAddress = await wallet.getChangeAddressBech32();
      const collateral: UTxO[] = await getCollateralUtxo(wallet, utxos);
      const ownerPkh = resolvePaymentKeyHash(changeAddress);

      const refTokenName = referenceTokenName(lotId);
      const refAssetUnit = passportPolicyId + refTokenName;
      const scriptUtxos = await provider.fetchAddressUTxOs(passportScriptAddress);
      const refUtxo = scriptUtxos.find((u: UTxO) =>
        u.output.amount.some((a: any) => a.unit === refAssetUnit),
      );
      if (!refUtxo) throw new Error("Reference token UTxO not found at script address");

      const oldDatumFields = (refUtxo.output.plutusData as any)?.fields;
      if (!oldDatumFields) throw new Error("No inline datum found on reference UTxO");

      const newFields = [...oldDatumFields];
      newFields[8] = parseInt(scaScore) || 0;
      if (labCertHash) newFields[9] = labCertHash;
      const newDatum = { alternative: 0, fields: newFields };

      const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: true });

      const unsignedTx = await txBuilder
        .spendingPlutusScriptV3()
        .txIn(refUtxo.input.txHash, refUtxo.input.outputIndex)
        .txInInlineDatumPresent()
        .txInRedeemerValue(updateLabRedeemer)
        .txInScript(scriptCbor)
        .txOut(passportScriptAddress, refUtxo.output.amount)
        .txOutInlineDatumValue(newDatum)
        .requiredSignerHash(ownerPkh)
        .txInCollateral(
          collateral[0].input.txHash,
          collateral[0].input.outputIndex,
          collateral[0].output.amount,
          collateral[0].output.address,
        )
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete();

      const signedTx = await wallet.signTxReturnFullTx(unsignedTx, true);
      const txHash = await wallet.submitTx(signedTx);
      setResult({ hash: txHash });
    } catch (e: any) {
      setResult({ error: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: "mint" as const, label: "Mint Passport" },
    { key: "update" as const, label: "Update Events" },
    { key: "lab" as const, label: "Update Lab" },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center p-8 pt-16">
      <h1 className="text-3xl font-bold mb-1">VerifiedVietCoffee</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Smart Contract Test UI — Preview
      </p>

      <div className="mb-6">
        <CardanoWallet />
      </div>

      {connected && (
        <div className="w-full max-w-lg space-y-4">
          {/* Contract info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-semibold">Script Address</span>
              <p className="font-mono text-gray-500 truncate" title={passportScriptAddress}>
                {passportScriptAddress}
              </p>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-semibold">Policy ID</span>
              <p className="font-mono text-gray-500 truncate" title={passportPolicyId}>
                {passportPolicyId}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setResult(null); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Mint Passport */}
          {tab === "mint" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Farm ID</span>
                  <input
                    value={farmId}
                    onChange={(e) => setFarmId(e.target.value)}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Lot ID</span>
                  <input
                    value={lotId}
                    onChange={(e) => setLotId(e.target.value)}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Variety</span>
                  <select
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option>Robusta</option>
                    <option>Arabica</option>
                    <option>Catimor</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Processing</span>
                  <select
                    value={processing}
                    onChange={(e) => setProcessing(e.target.value)}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option>Honey</option>
                    <option>Washed</option>
                    <option>Natural</option>
                  </select>
                </label>
              </div>
              <button
                onClick={handleMintPassport}
                disabled={loading || !farmId || !lotId}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm"
              >
                {loading ? "Minting..." : "Mint Coffee Passport"}
              </button>
              <p className="text-xs text-gray-400">
                Mints a CIP-68 NFT pair: reference token (with datum) at script address + user token to your wallet.
              </p>
            </div>
          )}

          {/* Update Events */}
          {tab === "update" && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Lot ID (to update)</span>
                <input
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Daily Events Merkle Root</span>
                <input
                  value={merkleRoot}
                  onChange={(e) => setMerkleRoot(e.target.value)}
                  placeholder="sha256:9c4a1f..."
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Photos Hash</span>
                <input
                  value={photosHash}
                  onChange={(e) => setPhotosHash(e.target.value)}
                  placeholder="sha256:21be90..."
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
                />
              </label>
              <button
                onClick={handleUpdateEvents}
                disabled={loading || !lotId || (!merkleRoot && !photosHash)}
                className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition text-sm"
              >
                {loading ? "Updating..." : "Update Events (Tier 1)"}
              </button>
              <p className="text-xs text-gray-400">
                Spends the reference token UTxO and recreates it with updated merkle root / photos hash.
              </p>
            </div>
          )}

          {/* Update Lab */}
          {tab === "lab" && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Lot ID (to update)</span>
                <input
                  value={lotId}
                  onChange={(e) => setLotId(e.target.value)}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">SCA Cupping Score</span>
                <input
                  type="number"
                  value={scaScore}
                  onChange={(e) => setScaScore(e.target.value)}
                  min="0"
                  max="100"
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Lab Certificate Hash</span>
                <input
                  value={labCertHash}
                  onChange={(e) => setLabCertHash(e.target.value)}
                  placeholder="sha256:..."
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
                />
              </label>
              <button
                onClick={handleUpdateLab}
                disabled={loading || !lotId}
                className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition text-sm"
              >
                {loading ? "Updating..." : "Update Lab Results"}
              </button>
              <p className="text-xs text-gray-400">
                Updates SCA score and lab certification hash on the passport datum.
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={`p-3 rounded-lg text-sm ${
                result.error
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}
            >
              {result.error ? (
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="break-all text-xs mt-1">{result.error}</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">Transaction Submitted</p>
                  <a
                    href={`https://preview.cardanoscan.io/transaction/${result.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline text-xs break-all"
                  >
                    {result.hash}
                  </a>
                  {tab === "mint" && lotId && <ConsumerLink lotId={lotId} />}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!connected && (
        <p className="text-gray-400 text-sm mt-4">
          Connect your wallet to test the smart contract
        </p>
      )}
    </main>
  );
}

function ConsumerLink({ lotId }: { lotId: string }) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/lot/${encodeURIComponent(lotId)}`
      : `/lot/${encodeURIComponent(lotId)}`;
  return (
    <div className="mt-3 pt-3 border-t border-green-200 flex items-center gap-3">
      <div className="bg-white p-1.5 rounded border border-gray-200">
        <QRCodeSVG value={url} size={88} />
      </div>
      <div className="text-xs text-gray-700 space-y-1">
        <p className="font-semibold text-gray-900">Consumer passport</p>
        <a
          href={`/lot/${encodeURIComponent(lotId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          /lot/{lotId}
        </a>
        <p className="text-gray-400">Scan with phone or open in new tab.</p>
      </div>
    </div>
  );
}
