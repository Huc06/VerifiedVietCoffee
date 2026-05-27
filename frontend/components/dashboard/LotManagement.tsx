import React, { useState } from 'react';
import {
  Share2, FileDown, Timer, Check, Anchor, Copy, ShieldCheck, Printer,
  Droplet, Wind, Terminal, Activity, Info, RefreshCw, Plus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Lot } from '@/lib/types';

interface Props {
  selectedLot: Lot;
  lots: Lot[];
  onSelectLot: (lot: Lot) => void;
  walletConnected: boolean;
  onOpenMintModal: () => void;
}

export default function LotManagement({ selectedLot, lots, onSelectLot, walletConnected, onOpenMintModal }: Props) {
  const [anchored, setAnchored] = useState<Record<string, boolean>>({});
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [printStatus, setPrintStatus] = useState(false);

  const lotId = selectedLot.id;
  const isCip68Anchored = anchored[lotId] || false;

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(cip68Schema);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleAnchorDailyRoot = () => {
    setIsAnchoring(true);
    setTimeout(() => {
      setAnchored(prev => ({ ...prev, [lotId]: true }));
      setIsAnchoring(false);
    }, 2000);
  };

  const handlePrintLabel = () => {
    setPrintStatus(true);
    setTimeout(() => {
      setPrintStatus(false);
      alert(`Sent Container tag for Lot ID ${lotId} to high-resolution printer. Includes blockchain QR schema.`);
    }, 1500);
  };

  const cip68Schema = `{
  "policy_id": "${selectedLot.policyId}",
  "asset_name": "${selectedLot.assetName}",
  "metadata": {
    "name": "VerifiedVietCoffee #${lotId.substring(lotId.length - 4)}",
    "origin": "${selectedLot.origin}",
    "coordinates": "${selectedLot.coordinates}",
    "merkle_root": "${selectedLot.merkleRoot}",
    "compliance": {
      "eudr": "${selectedLot.eudrStatus.toLowerCase()}",
      "certification": "FairTrade-Organic"
    }
  }
}`;

  return (
    <div className="space-y-8">
      {/* Batch Selector */}
      <section className="bg-white p-4 rounded-xl border border-[#A67B5B]/15 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-[#A67B5B]" />
          <span className="text-xs font-semibold text-[#414844]">Select target batch lot to track on-chain lifecycle:</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={selectedLot.id}
            onChange={(e) => { const f = lots.find(l => l.id === e.target.value); if (f) onSelectLot(f); }}
            className="bg-white border border-[#A67B5B]/20 rounded-lg p-2 text-xs font-mono font-bold text-[#012d1d] focus:outline-none cursor-pointer"
          >
            {lots.filter(l => l.id !== "VVC-2023-LAMDONG-084").map(l => (
              <option key={l.id} value={l.id}>{l.id} ({l.variety})</option>
            ))}
          </select>
          <button
            onClick={onOpenMintModal}
            className="bg-[#2D6A4F] text-white hover:bg-[#1b4332] text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-[#2D6A4F]/10 active:scale-95 whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Mint New Passport</span>
          </button>
        </div>
      </section>

      {/* Lot Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] tracking-wider font-bold text-[#2D6A4F] bg-[#1b4332]/10 px-3 py-1 rounded-full mb-3 inline-block">PREMIUM EXPORT GRADE</span>
            <h2 className="font-serif text-3xl font-bold text-[#012d1d]">Lot ID: {selectedLot.id}</h2>
            <p className="font-serif text-[#79573f] text-lg font-medium">{selectedLot.variety}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3.5 py-2 border border-[#A67B5B]/20 rounded-lg text-[#414844] hover:bg-[#e8e8e5] text-xs font-bold bg-white transition-all">
              <Share2 size={14} /><span>Share Proof</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 border border-[#A67B5B]/20 rounded-lg text-[#414844] hover:bg-[#e8e8e5] text-xs font-bold bg-white transition-all">
              <FileDown size={14} /><span>Export COA</span>
            </button>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-white p-6 rounded-xl border border-[#A67B5B]/15 shadow-sm overflow-hidden">
        <h3 className="text-[10px] tracking-wider uppercase font-bold text-[#414844] mb-8 flex items-center gap-1.5">
          <Activity size={14} className="text-[#2D6A4F]" />PRODUCTION LIFECYCLE
        </h3>
        <div className="relative">
          <div className="absolute top-5 left-8 right-8 h-[2px] bg-[#eeeeeb]">
            <div className="h-full bg-[#2D6A4F] w-[75%] transition-all duration-700" />
          </div>
          <div className="relative flex justify-between gap-2 overflow-x-auto pb-4">
            {selectedLot.timeline.map((step, idx) => {
              let circleClass = 'bg-[#eeeeeb] text-[#717973] border-4 border-white';
              let titleClass = 'text-[#717973]';
              let iconElement: React.ReactNode = <span>{idx + 1}</span>;
              if (step.status === 'completed') {
                circleClass = 'bg-[#2D6A4F] text-white border-4 border-white shadow-sm';
                titleClass = 'text-[#2D6A4F] font-bold';
                iconElement = <Check size={14} />;
              } else if (step.status === 'active') {
                circleClass = 'bg-[#A67B5B] text-white border-4 border-white shadow-sm animate-pulse';
                titleClass = 'text-[#79573f] font-bold';
                iconElement = <Timer size={14} />;
              }
              return (
                <div key={idx} className="flex flex-col items-center text-center min-w-[100px] flex-1 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${circleClass}`}>{iconElement}</div>
                  <span className={`text-[10px] tracking-wider uppercase font-bold mt-3 ${titleClass}`}>{step.title}</span>
                  <span className="text-[9px] text-[#717973] mt-0.5 whitespace-nowrap">{step.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid: Blockchain + Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* CIP-68 Schema */}
          <section className="bg-white p-8 rounded-xl border border-[#A67B5B]/15 border-l-4 border-l-[#FFB703] shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#012d1d] mb-1">Cardano Digital Product Passport</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isCip68Anchored ? 'bg-[#008000]' : 'bg-[#FFB703] animate-pulse'}`} />
                  <span className="text-[10px] uppercase font-bold text-[#79573f] tracking-wide">{isCip68Anchored ? 'Anchor Completed' : 'PENDING DAILY ANCHOR'}</span>
                </div>
              </div>
              {!isCip68Anchored ? (
                <button onClick={handleAnchorDailyRoot} disabled={isAnchoring} className="bg-[#012d1d] hover:bg-[#1b4332] text-white text-xs font-bold py-3 px-5 rounded-lg flex items-center gap-2 shadow transition-all cursor-pointer">
                  {isAnchoring ? <><RefreshCw size={14} className="animate-spin" /><span>Confirming...</span></> : <><Anchor size={14} /><span>Anchor Daily Merkle Root</span></>}
                </button>
              ) : (
                <span className="bg-[#008000]/10 border border-[#008000]/20 text-[#008000] text-[10px] font-bold px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                  <ShieldCheck size={14} /><span>Ledger anchored</span>
                </span>
              )}
            </div>
            <div className="bg-[#012d1d] text-[#86af99] p-5 rounded-lg border border-white/5 relative whitespace-pre shadow-inner">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <span className="font-mono text-[10px] tracking-widest uppercase font-bold flex items-center gap-1.5 text-slate-300">
                  <Terminal size={12} />CIP-68 Reference Datum Schema (JSON)
                </span>
                <button onClick={handleCopyJSON} className="text-[#86af99] hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1">
                  <Copy size={14} /><span className="text-[10px] font-bold">{jsonCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="font-mono text-xs leading-relaxed overflow-x-auto tech-scroll max-h-48 text-[#a5d0b9]">{cip68Schema}</pre>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <DatumBlock label="Mint Style Status" value="ACTIVE (V3)" />
              <DatumBlock label="Policy ID (Ada)" value={selectedLot.policyId.substring(0, 8) + "..."} />
              <DatumBlock label="Telemetry Update" value="14m ago" />
              <DatumBlock label="Ledger Epoch" value={String(selectedLot.epoch)} />
            </div>
          </section>

          {/* Verification Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <VerifyCard color="#008000" label="EUDR DDS STATUS" icon={<ShieldCheck size={36} className="fill-current text-green-100 stroke-[#008000]" />} value="Compliant" sub="Sentinel-2 telemetry" />
            <VerifyCard color="#79573f" label="CARBON FOOTPRINT" icon={<Wind size={36} className="text-[#79573f]" />} value={selectedLot.carbonFootprint} sub="Per finished KG crop" />
            <VerifyCard color="#2D6A4F" label="WATER INTENSITY" icon={<Droplet size={36} className="text-[#2D6A4F]" />} value={selectedLot.waterIntensity} sub="Honey optimization" />
          </section>
        </div>

        {/* Right Side */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          {/* QR Code */}
          <section className="bg-white p-6 rounded-xl border border-[#A67B5B]/15 shadow-sm text-center">
            <h3 className="text-[10px] tracking-wider uppercase font-bold text-[#717973] mb-4">LOT PASSPORT QR CODE</h3>
            <div className="bg-white p-6 inline-block rounded-xl border border-[#eeeeeb] mb-4 shadow-inner">
              <QRCodeSVG
                value={typeof window !== "undefined"
                  ? `${window.location.origin}/lot/${encodeURIComponent(selectedLot.id)}?mock=true`
                  : `/lot/${encodeURIComponent(selectedLot.id)}?mock=true`}
                size={160}
                fgColor="#012d1d"
                className="mx-auto"
              />
            </div>
            <p className="text-xs text-[#717973] leading-relaxed mb-6 px-3">
              Scan to view full immersive farm telemetry, soil properties, and Merkle records live on the public blockchain explorer portal.
            </p>
            <button
              onClick={handlePrintLabel}
              disabled={printStatus}
              className="w-full py-3 border-2 border-[#012d1d] text-[#012d1d] font-bold rounded-lg text-xs hover:bg-[#012d1d] hover:text-white flex items-center justify-center gap-1.5 transition-all outline-none cursor-pointer mb-3"
            >
              <Printer size={14} />
              <span>{printStatus ? 'Generating tag Layout...' : 'Print Shipping Tag Label'}</span>
            </button>
            <a href={`/lot/${encodeURIComponent(selectedLot.id)}?mock=true`} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold text-[#2D6A4F] hover:underline">
              View Consumer Passport →
            </a>
          </section>

          {/* Batch Measurements */}
          <section className="bg-white p-6 rounded-xl border border-[#A67B5B]/15 shadow-sm">
            <h3 className="text-[10px] tracking-wider uppercase font-bold text-[#717973] mb-4">BATCH TELEMETRY MEASUREMENTS</h3>
            <div className="space-y-3 font-mono text-xs">
              <MeasRow label="Moisture Content" value={selectedLot.moisture} />
              <MeasRow label="Bulk Density" value={selectedLot.density} />
              <MeasRow label="Acidity pH" value={selectedLot.ph} />
              <MeasRow label="Bag Volume" value={`${selectedLot.bagCount} Bags`} last />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DatumBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border border-[#A67B5B]/10 rounded-lg">
      <p className="text-[9px] uppercase font-bold text-[#717973] mb-0.5">{label}</p>
      <p className="font-mono text-xs font-bold text-[#012d1d] truncate">{value}</p>
    </div>
  );
}

function VerifyCard({ color, label, icon, value, sub }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#A67B5B]/15 shadow-sm" style={{ borderTopWidth: 4, borderTopColor: color }}>
      <h4 className="text-[10px] tracking-wider uppercase font-bold text-[#717973] mb-3">{label}</h4>
      <div className="flex items-center gap-3">
        <span>{icon}</span>
        <div>
          <p className="text-md font-bold text-[#012d1d] leading-none mb-1">{value}</p>
          <p className="text-[9px] text-[#717973] font-semibold uppercase">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function MeasRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${last ? '' : 'border-b border-[#eeeeeb]'}`}>
      <span className="font-sans text-[#717973]">{label}</span>
      <span className="font-bold text-[#012d1d]">{value}</span>
    </div>
  );
}
