"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useWallet } from "@meshsdk/react";
import { MeshTxBuilder, UTxO } from "@meshsdk/core";
import { Sidebar, TabKey } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MintForm } from "@/components/dashboard/MintForm";
import { UpdateEventsForm } from "@/components/dashboard/UpdateEventsForm";
import { LabForm } from "@/components/dashboard/LabForm";
import { SustainForm } from "@/components/dashboard/SustainForm";
import { TransactionResult, TxResult } from "@/components/dashboard/TransactionResult";

const BLOCKFROST_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_KEY || "";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const CARDANOSCAN = "https://preview.cardanoscan.io";

async function getCollateralUtxo(wallet: any, utxos: UTxO[]): Promise<UTxO[]> {
  try {
    const collaterals = await wallet.getCollateral();
    if (collaterals && collaterals.length > 0) return collaterals;
  } catch (e) {
    console.warn("Wallet getCollateral() failed, using manual UTxO selection");
  }
  const adaOnly = utxos.filter((u) => u.output.amount.length === 1 && u.output.amount[0].unit === "lovelace");
  adaOnly.sort((a, b) => Number(b.output.amount[0].quantity) - Number(a.output.amount[0].quantity));
  if (adaOnly.length === 0) throw new Error("No collateral UTxO found");
  return [adaOnly[0]];
}

export default function FarmDashboard() {
  const { connected, wallet } = useWallet();
  const [activeTab, setActiveTab] = useState<TabKey>("mint");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);

  const [scriptAddress, setScriptAddress] = useState<string>("");
  const [policyId, setPolicyId] = useState<string>("");

  const [lotId, setLotId] = useState("");
  const [farmId, setFarmId] = useState("");
  const [variety, setVariety] = useState("Robusta");
  const [processing, setProcessing] = useState("Honey");
  
  const [merkleRoot, setMerkleRoot] = useState("");
  const [photosHash, setPhotosHash] = useState("");

  const [scaScore, setScaScore] = useState("");
  const [labCertHash, setLabCertHash] = useState("");

  const [co2e, setCo2e] = useState("");
  const [waterL, setWaterL] = useState("");
  const [organicPct, setOrganicPct] = useState("");
  const [somPct, setSomPct] = useState("");
  const [shadePct, setShadePct] = useState("");
  const [eudrHash, setEudrHash] = useState("");

  useEffect(() => {
    fetch(`${BACKEND_URL}/blockchain/info`)
      .then((res) => res.json())
      .then((data) => {
        setScriptAddress(data.scriptAddress);
        setPolicyId(data.policyId);
      })
      .catch((err) => console.error("Failed to fetch blockchain info:", err));
  }, []);

  const handleError = (error: any) => {
    console.error(error);
    setResult({ error: error?.message || String(error) });
  };

  const handleMint = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/blockchain/mint-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId, lotId, variety, processing,
          userAddress: await wallet.getChangeAddress(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { unsignedTx } = await res.json();
      const signedTx = await wallet.signTx(unsignedTx, true);
      const submitRes = await fetch(`${BACKEND_URL}/blockchain/submit-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTx }),
      });
      if (!submitRes.ok) throw new Error(await submitRes.text());
      const { txHash } = await submitRes.json();
      setResult({ hash: txHash });
    } catch (err: any) { handleError(err); }
    finally { setLoading(false); }
  };

  const handleUpdateEvents = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/blockchain/update-events-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId, merkleRoot, photosHash,
          userAddress: await wallet.getChangeAddress(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { unsignedTx } = await res.json();
      const signedTx = await wallet.signTx(unsignedTx, true);
      const submitRes = await fetch(`${BACKEND_URL}/blockchain/submit-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTx }),
      });
      if (!submitRes.ok) throw new Error(await submitRes.text());
      const { txHash } = await submitRes.json();
      setResult({ hash: txHash });
    } catch (err: any) { handleError(err); }
    finally { setLoading(false); }
  };

  const handleUpdateLab = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/blockchain/submit-lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotId, scaScore: parseInt(scaScore), labCertHash }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { txHash } = await res.json();
      setResult({ hash: txHash });
    } catch (err: any) { handleError(err); }
    finally { setLoading(false); }
  };

  const handleUpdateSustain = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/blockchain/submit-sustainability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          co2e: parseFloat(co2e), waterL: parseFloat(waterL),
          organicPct: parseFloat(organicPct), somPct: parseFloat(somPct),
          shadePct: parseFloat(shadePct), eudrHash,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { txHash } = await res.json();
      setResult({ hash: txHash });
    } catch (err: any) { handleError(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#111c10] text-[#e8e0d4] font-sans selection:bg-[#3A6B35]/30 overflow-hidden flex flex-col md:flex-row">
      {/* Background orbs matching brand palette */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#2D5A27]/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#6B3A2A]/6 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-[#4A7C3F]/6 rounded-full blur-[120px]" />
      </div>

      <Sidebar activeTab={activeTab} onSelectTab={(t) => { setActiveTab(t); setResult(null); }} />

      <div className="flex-1 flex flex-col z-10 h-screen overflow-y-auto">
        <Header scriptAddress={scriptAddress} policyId={policyId} connected={connected} />
        
        <main className="flex-1 p-6 md:p-12">
          {!connected ? (
            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-6">
              <Image src="/logo.png" alt="VerifiedVietCoffee" width={120} height={120} className="opacity-40" />
              <h2 className="text-2xl font-bold text-[#e8e0d4]">Kết nối Ví Cardano</h2>
              <p className="text-[#8aad82]/40 text-sm leading-relaxed">Vui lòng kết nối ví của bạn (Lace, Nami, Eternl…) bằng nút ở thanh bên trái để truy cập hệ thống quản trị nông trại.</p>
            </div>
          ) : (
            <div className="max-w-4xl">
              {activeTab === "mint" && (
                <MintForm 
                  farmId={farmId} setFarmId={setFarmId} 
                  lotId={lotId} setLotId={setLotId} 
                  variety={variety} setVariety={setVariety} 
                  processing={processing} setProcessing={setProcessing} 
                  onSubmit={handleMint} loading={loading} 
                />
              )}
              {activeTab === "update" && (
                <UpdateEventsForm 
                  lotId={lotId} setLotId={setLotId} 
                  merkleRoot={merkleRoot} setMerkleRoot={setMerkleRoot} 
                  photosHash={photosHash} setPhotosHash={setPhotosHash} 
                  onSubmit={handleUpdateEvents} loading={loading} 
                />
              )}
              {activeTab === "lab" && (
                <LabForm 
                  lotId={lotId} setLotId={setLotId} 
                  scaScore={scaScore} setScaScore={setScaScore} 
                  labCertHash={labCertHash} setLabCertHash={setLabCertHash} 
                  onSubmit={handleUpdateLab} loading={loading} 
                />
              )}
              {activeTab === "sustain" && (
                <SustainForm 
                  lotId={lotId} setLotId={setLotId} 
                  co2e={co2e} setCo2e={setCo2e} 
                  waterL={waterL} setWaterL={setWaterL} 
                  organicPct={organicPct} setOrganicPct={setOrganicPct} 
                  somPct={somPct} setSomPct={setSomPct} 
                  shadePct={shadePct} setShadePct={setShadePct} 
                  eudrHash={eudrHash} setEudrHash={setEudrHash} 
                  onSubmit={handleUpdateSustain} loading={loading} 
                />
              )}

              <TransactionResult result={result} tab={activeTab} lotId={lotId} CARDANOSCAN={CARDANOSCAN} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
