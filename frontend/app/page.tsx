"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@meshsdk/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Leaf, LayoutDashboard, Radio, Layers, RefreshCw,
  AlertCircle, CheckCircle, Link as LinkIcon, FileText
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MeshTxBuilder, BlockfrostProvider, resolvePaymentKeyHash, type UTxO } from "@meshsdk/core";
import {
  deserializeTxUnspentOutput,
  fromTxUnspentOutput,
  addVKeyWitnessSetToTransaction,
} from "@meshsdk/core-cst";
import {
  scriptCbor,
  passportScriptAddress,
  passportPolicyId,
  mintPassportRedeemer,
  referenceTokenName,
  userTokenName,
  buildInitialDatum,
} from "@/app/lib/coffee-passport";

import Sidebar, { ViewKey } from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import IoTMonitoring from "@/components/dashboard/IoTMonitoring";
import LotManagement from "@/components/dashboard/LotManagement";
import LotTraceability from "@/components/dashboard/LotTraceability";
import { Lot, EventLog, IoTTelemetry } from "@/lib/types";
import { INITIAL_LOTS, INITIAL_EVENT_LOGS, INITIAL_IOT_TELEMETRY } from "@/lib/data";

const BLOCKFROST_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_KEY || "";
const CARDANOSCAN = "https://preview.cardanoscan.io";

export default function FarmDashboard() {
  const { connected, wallet } = useWallet();

  // App-wide state
  const [currentView, setCurrentView] = useState<ViewKey>("dashboard");
  const [lots] = useState<Lot[]>(INITIAL_LOTS);
  const [selectedLot, setSelectedLot] = useState<Lot>(INITIAL_LOTS[0]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>(INITIAL_EVENT_LOGS);
  const [telemetry, setTelemetry] = useState<IoTTelemetry>(INITIAL_IOT_TELEMETRY);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Mint Modal state
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [mintResult, setMintResult] = useState<{ hash: string } | { error: string } | null>(null);
  const [mintLotId, setMintLotId] = useState("");
  const [mintFarmId, setMintFarmId] = useState("");
  const [mintVariety, setMintVariety] = useState("Robusta");
  const [mintProcessing, setMintProcessing] = useState("Honey");

  useEffect(() => {
    if (connected && wallet) {
      wallet.getChangeAddress().then(setWalletAddress).catch(console.error);
    } else {
      setWalletAddress(null);
    }
  }, [connected, wallet]);

  const farmId = mintFarmId.trim();
  const lotId = mintLotId.trim().toUpperCase();
  const canMint = connected && !!farmId && !!lotId && !mintLoading;

  // Mint the CIP-68 passport entirely client-side: the connected browser wallet
  // builds, signs and submits the tx with its own UTxOs + collateral. (Routing
  // UTxOs through a backend mangles their shape, so we keep it in the browser.)
  const handleMint = async () => {
    if (!connected || !wallet) return;
    if (!farmId || !lotId) {
      setMintResult({ error: "Farm ID and Lot ID are required." });
      return;
    }
    setMintLoading(true);
    setMintResult(null);
    try {
      if (!BLOCKFROST_KEY) {
        throw new Error("Missing NEXT_PUBLIC_BLOCKFROST_KEY (Preview) in frontend .env");
      }
      const provider = new BlockfrostProvider(BLOCKFROST_KEY);

      // MeshCardanoBrowserWallet returns CBOR-hex UTxOs (CIP-30), not objects —
      // normalize both UTxOs and collateral to Mesh UTxO objects.
      const toUtxos = (arr: unknown[] | undefined): UTxO[] =>
        (arr ?? []).map((u) =>
          typeof u === "string"
            ? fromTxUnspentOutput(deserializeTxUnspentOutput(u))
            : (u as UTxO),
        );

      const utxos = toUtxos((await wallet.getUtxos()) as unknown[] | undefined);
      if (utxos.length === 0) {
        throw new Error("Wallet has no UTxOs. Fund it with Preview test ADA, then retry.");
      }
      // getChangeAddress()/getUsedAddresses() return hex on this wallet wrapper;
      // a parsed UTxO's address is already bech32, so use it for change + owner.
      const changeAddress = utxos[0].output.address;

      // Plutus minting needs a collateral input. Prefer the wallet's reserved
      // collateral; otherwise pick a pure-ADA UTxO from the wallet's own funds.
      const isPureAda = (u: UTxO) =>
        u.output.amount.length === 1 &&
        (u.output.amount[0].unit === "lovelace" || u.output.amount[0].unit === "") &&
        Number(u.output.amount[0].quantity) >= 5_000_000;

      const reserved = toUtxos((await wallet.getCollateral()) as unknown[] | undefined);
      const collateralUtxo = reserved[0] ?? utxos.find(isPureAda);
      if (!collateralUtxo) {
        throw new Error(
          "No pure-ADA UTxO (≥5 tADA) found for collateral. Send a few ADA to yourself to create one, or set collateral in Lace, then retry.",
        );
      }
      // Don't let coin-selection also spend the collateral UTxO.
      const filtered = utxos.filter(
        (u) =>
          u.input.txHash !== collateralUtxo.input.txHash ||
          u.input.outputIndex !== collateralUtxo.input.outputIndex,
      );
      const selectFrom = filtered.length > 0 ? filtered : utxos;

      const ownerPkh = resolvePaymentKeyHash(changeAddress);

      const harvestTimestamp = Math.floor(Date.now() / 1000);
      const datum = buildInitialDatum({
        farmId,
        lotId,
        variety: mintVariety,
        processing: mintProcessing,
        harvestTimestamp,
        ownerPubKeyHash: ownerPkh,
      });

      const refTokenName = referenceTokenName(lotId);
      const usrTokenName = userTokenName(lotId);

      const txBuilder = new MeshTxBuilder({ fetcher: provider, verbose: false });
      const unsignedTx = await txBuilder
        // Reference token (CIP-68 label 100) — locked at the script with datum
        .mintPlutusScriptV3()
        .mint("1", passportPolicyId, refTokenName)
        .mintingScript(scriptCbor)
        .mintRedeemerValue(mintPassportRedeemer)
        // Ownership token (label 222) — returned to the wallet via change
        .mintPlutusScriptV3()
        .mint("1", passportPolicyId, usrTokenName)
        .mintingScript(scriptCbor)
        .mintRedeemerValue(mintPassportRedeemer)
        .txOut(passportScriptAddress, [
          { unit: passportPolicyId + refTokenName, quantity: "1" },
        ])
        .txOutInlineDatumValue(datum)
        .txInCollateral(
          collateralUtxo.input.txHash,
          collateralUtxo.input.outputIndex,
          collateralUtxo.output.amount,
          collateralUtxo.output.address,
        )
        .changeAddress(changeAddress)
        .selectUtxosFrom(selectFrom)
        .complete();

      // This wallet exposes the raw CIP-30 API, whose signTx() returns ONLY the
      // witness set — not a full tx. Merge it into the unsigned tx before submit.
      // (Guard: if a wrapper already returned a full tx — CBOR array 0x83/0x84 —
      // use it as-is.)
      const signed = await wallet.signTx(unsignedTx, true);
      const signedTx =
        signed.startsWith("84") || signed.startsWith("83")
          ? signed
          : addVKeyWitnessSetToTransaction(unsignedTx, signed);

      let txHash: string;
      try {
        txHash = await provider.submitTx(signedTx);
      } catch (provErr) {
        console.warn("Blockfrost submit failed, trying wallet submit", provErr);
        txHash = await wallet.submitTx(signedTx);
      }
      setMintResult({ hash: txHash });
    } catch (err: any) {
      console.error(err);
      setMintResult({ error: err?.message || String(err) });
    } finally {
      setMintLoading(false);
    }
  };

  const handleConnectWallet = () => {
    // Scroll to sidebar wallet or show a hint
    const sidebarEl = document.querySelector('[class*="CardanoWallet"]');
    if (sidebarEl) sidebarEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDisconnectWallet = () => {
    // MeshSDK handles disconnect via its own button, this is just UI feedback
    window.location.reload();
  };

  const MOBILE_NAV_ITEMS: { key: ViewKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { key: 'iot', label: 'IoT', icon: <Radio size={20} /> },
    { key: 'lots', label: 'Lots', icon: <Layers size={20} /> },
    { key: 'traceability', label: 'Portal', icon: <Leaf size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F3] text-[#1a1c1a] font-sans selection:bg-[#2D6A4F]/10 flex flex-col md:flex-row relative">
      {/* Desktop Sidebar */}
      <Sidebar
        currentView={currentView}
        setView={(v) => { setCurrentView(v); setShowMobileMenu(false); }}
        onOpenMintModal={() => setMintModalOpen(true)}
        walletConnected={connected}
      />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#A67B5B]/15 flex justify-around py-2 px-1 shadow-lg">
        {MOBILE_NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setCurrentView(item.key)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
              currentView === item.key
                ? 'text-[#2D6A4F] font-bold'
                : 'text-[#717973]'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pb-20 md:pb-0">
        <Header
          currentView={currentView}
          setView={setCurrentView}
          walletConnected={connected}
          walletAddress={walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : null}
          onDisconnectWallet={handleDisconnectWallet}
          onConnectWallet={handleConnectWallet}
          onOpenMobileMenu={() => setShowMobileMenu(!showMobileMenu)}
          lots={lots}
        />

        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === "dashboard" && (
                <ManagerDashboard
                  lots={lots}
                  setView={setCurrentView}
                  onSelectLot={(lot) => { setSelectedLot(lot); setCurrentView('lots'); }}
                  telemetry={telemetry}
                  walletConnected={connected}
                  onConnectWallet={handleConnectWallet}
                  onOpenMintModal={() => setMintModalOpen(true)}
                />
              )}
              {currentView === "iot" && (
                <IoTMonitoring
                  telemetry={telemetry}
                  setTelemetry={setTelemetry}
                  eventLogs={eventLogs}
                  setEventLogs={setEventLogs}
                  walletConnected={connected}
                  onConnectWallet={handleConnectWallet}
                />
              )}
              {currentView === "lots" && (
                <LotManagement
                  selectedLot={selectedLot}
                  lots={lots}
                  onSelectLot={setSelectedLot}
                  walletConnected={connected}
                  onOpenMintModal={() => setMintModalOpen(true)}
                />
              )}
              {currentView === "traceability" && (
                <LotTraceability
                  selectedLot={selectedLot}
                  lots={lots}
                  onSelectLot={setSelectedLot}
                  walletConnected={connected}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="text-center py-6 border-t border-[#A67B5B]/10 text-xs text-[#717973]">
          <p className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F] animate-pulse" />
            VerifiedVietCoffee • EUDR-Ready Traceability Platform • Cardano CIP-68 • SCA Q-Grader
          </p>
        </footer>
      </div>

      {/* ===== Mint Passport Modal ===== */}
      <AnimatePresence>
        {mintModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setMintModalOpen(false); setMintResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl border border-[#A67B5B]/20 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[#A67B5B]/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2D6A4F]/10 rounded-lg">
                    <Leaf size={20} className="text-[#2D6A4F]" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#012d1d]">Mint New Passport</h2>
                    <p className="text-[10px] tracking-wider uppercase font-bold text-[#717973]">CIP-68 Digital Product Passport</p>
                  </div>
                </div>
                <button onClick={() => { setMintModalOpen(false); setMintResult(null); }} className="p-2 hover:bg-[#eeeeeb] rounded-lg transition-colors">
                  <X size={20} className="text-[#414844]" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {!connected ? (
                  <div className="text-center py-8 space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="VerifiedVietCoffee" width={80} height={80} className="mx-auto opacity-30" />
                    <p className="text-sm text-[#717973] font-semibold">Connect your Cardano wallet to mint</p>
                    <p className="text-xs text-[#A67B5B]">Use the wallet button in the sidebar</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] tracking-wider uppercase font-bold text-[#414844] mb-2 block">Farm ID *</label>
                        <input
                          value={mintFarmId} onChange={(e) => setMintFarmId(e.target.value)}
                          placeholder="binh_dong_farm"
                          className="w-full bg-[#F8F9FA] border border-[#A67B5B]/20 rounded-lg py-2.5 px-3 text-sm font-mono text-[#012d1d] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                        />
                        <p className="text-[10px] text-[#717973] mt-1.5">Stable identifier for the farm.</p>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-wider uppercase font-bold text-[#414844] mb-2 block">Lot ID *</label>
                        <input
                          value={mintLotId} onChange={(e) => setMintLotId(e.target.value.toUpperCase())}
                          placeholder="LD-2026-0431"
                          className="w-full bg-[#F8F9FA] border border-[#A67B5B]/20 rounded-lg py-2.5 px-3 text-sm font-mono uppercase text-[#012d1d] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                        />
                        <p className="text-[10px] text-[#717973] mt-1.5">Must be unique on-chain.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] tracking-wider uppercase font-bold text-[#414844] mb-2 block">Variety</label>
                        <select
                          value={mintVariety} onChange={(e) => setMintVariety(e.target.value)}
                          className="w-full bg-[#F8F9FA] border border-[#A67B5B]/20 rounded-lg py-2.5 px-3 text-sm text-[#012d1d] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                        >
                          <option>Robusta</option>
                          <option>Arabica</option>
                          <option>Catimor</option>
                          <option>Bourbon</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-wider uppercase font-bold text-[#414844] mb-2 block">Processing</label>
                        <select
                          value={mintProcessing} onChange={(e) => setMintProcessing(e.target.value)}
                          className="w-full bg-[#F8F9FA] border border-[#A67B5B]/20 rounded-lg py-2.5 px-3 text-sm text-[#012d1d] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                        >
                          <option>Honey</option>
                          <option>Natural</option>
                          <option>Washed</option>
                          <option>Wet-Hulled</option>
                        </select>
                      </div>
                    </div>

                    {/* On-chain preview */}
                    <div className="bg-[#F8F9FA] border border-[#A67B5B]/15 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#717973] font-semibold">Reference token (100)</span>
                        <span className="font-mono text-[#012d1d] truncate max-w-[60%]" title={lotId}>
                          {lotId ? `Lot_${lotId.replace(/-/g, "_")}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#717973] font-semibold">Network</span>
                        <span className="font-mono text-[#2D6A4F] font-bold">Cardano Preview</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#717973] font-semibold">Wallet cost</span>
                        <span className="font-mono text-[#012d1d]">~5 test ADA + fees</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-[#717973] leading-relaxed">
                      Mints a CIP-68 pair: the reference token + datum is locked at the passport
                      script, and the ownership (222) token is sent to your wallet. You&apos;ll be
                      asked to sign once.
                    </p>

                    <button
                      onClick={handleMint}
                      disabled={!canMint}
                      className="w-full bg-[#2D6A4F] hover:bg-[#012d1d] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      {mintLoading ? (
                        <><RefreshCw size={16} className="animate-spin" /><span>Minting on Cardano...</span></>
                      ) : (
                        <><Leaf size={16} /><span>Mint CIP-68 Passport</span></>
                      )}
                    </button>

                    {/* Mint Result */}
                    {mintResult && (
                      <div className={`p-4 rounded-xl border ${
                        'error' in mintResult
                          ? 'bg-red-50 border-red-200'
                          : 'bg-[#1b4332]/5 border-[#2D6A4F]/20'
                      }`}>
                        {'error' in mintResult ? (
                          <div className="flex items-start gap-2">
                            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-red-700">Transaction Failed</p>
                              <p className="text-xs text-red-600 mt-1 break-all">{mintResult.error}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-start gap-2">
                              <CheckCircle size={18} className="text-[#2D6A4F] mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-[#2D6A4F]">Passport Minted Successfully</p>
                                <a
                                  href={`${CARDANOSCAN}/transaction/${mintResult.hash}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="font-mono text-[10px] text-[#2D6A4F] hover:underline break-all mt-1 inline-flex items-center gap-1"
                                >
                                  {mintResult.hash} <LinkIcon size={10} />
                                </a>
                              </div>
                            </div>
                            {lotId && (
                              <div className="flex items-center gap-4 pt-3 border-t border-[#2D6A4F]/10">
                                <div className="bg-white p-2 rounded-lg shadow">
                                  <QRCodeSVG
                                    value={typeof window !== "undefined"
                                      ? `${window.location.origin}/lot/${encodeURIComponent(lotId)}`
                                      : `/lot/${encodeURIComponent(lotId)}`}
                                    size={72}
                                  />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-[#012d1d] flex items-center gap-1"><FileText size={14} className="text-[#A67B5B]" />Consumer Passport Ready</p>
                                  <a
                                    href={`/lot/${encodeURIComponent(lotId)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] font-mono text-[#2D6A4F] hover:underline mt-1 block"
                                  >
                                    /lot/{lotId}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-72 h-full bg-[#f9faf6] shadow-xl border-r border-[#A67B5B]/20 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Logo" width={36} height={36} className="rounded-lg" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#012d1d]">VerifiedVietCoffee</h2>
                  <p className="text-[9px] tracking-widest uppercase font-bold text-[#717973]">Binh Dong Farm</p>
                </div>
              </div>
              <nav className="space-y-2">
                {MOBILE_NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => { setCurrentView(item.key); setShowMobileMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                      currentView === item.key
                        ? 'text-[#2D6A4F] font-bold bg-[#2D6A4F]/10'
                        : 'text-[#414844] hover:bg-[#eeeeeb]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
              <button
                onClick={() => { setMintModalOpen(true); setShowMobileMenu(false); }}
                className="w-full bg-[#2D6A4F] text-white py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 mt-8"
              >
                <Leaf size={14} />Mint Passport
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
