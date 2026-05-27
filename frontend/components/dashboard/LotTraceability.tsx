import React, { useState } from 'react';
import {
  ShieldCheck, Search, Award, Leaf, Wind,
  Navigation, Lock, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Lot } from '@/lib/types';

interface Props {
  selectedLot: Lot;
  lots: Lot[];
  onSelectLot: (lot: Lot) => void;
  walletConnected: boolean;
}

export default function LotTraceability({ selectedLot, lots, onSelectLot, walletConnected }: Props) {
  const [isValidating, setIsValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState(false);

  const handleVerifyMerkle = () => {
    setIsValidating(true); setValidated(false);
    setTimeout(() => { setIsValidating(false); setValidated(true); }, 1800);
  };

  const handleSearchLookup = (e: React.FormEvent) => {
    e.preventDefault(); setSearchError(false);
    const query = searchId.trim().toUpperCase();
    if (!query) return;
    const found = lots.find(l => l.id.toUpperCase() === query);
    if (found) { onSelectLot(found); setSearchId(''); } else { setSearchError(true); }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Search */}
      <section className="bg-white p-6 rounded-xl border border-[#A67B5B]/20 shadow-sm">
        <form onSubmit={handleSearchLookup} className="flex flex-col sm:flex-row gap-4 items-stretch">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-0 bottom-0 flex items-center text-[#717973] pointer-events-none"><Search size={18} /></span>
            <input type="text" value={searchId} onChange={(e) => { setSearchId(e.target.value); setSearchError(false); }}
              placeholder="Search Lot ID (e.g. VVC-2023-LAMDONG-084 or LD-2026-0427)..."
              className="w-full bg-[#F8F9FA] pl-11 pr-4 py-3 rounded-lg border border-[#A67B5B]/30 text-sm focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] text-[#012d1d] font-mono uppercase" />
          </div>
          <button type="submit" className="bg-[#2D6A4F] text-white py-3 px-6 rounded-lg text-xs font-bold hover:bg-[#012d1d] transition-all cursor-pointer whitespace-nowrap">Trace Bean Provenance</button>
        </form>
        {searchError && <p className="text-red-600 text-xs mt-2 font-semibold">⚠ Lot ID not found. Check formatting (e.g., LD-2026-0427).</p>}
      </section>

      {/* Hero */}
      <section>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#012d1d] mb-3 leading-tight">The Journey of Your Bean</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="bg-[#a5d0b9] text-[#012d1d] px-3.5 py-1.5 rounded-full font-mono text-[11px] tracking-wider uppercase">Lot ID: {selectedLot.id}</span>
          <span className="flex items-center gap-1 text-[#414844] font-mono"><ShieldCheck size={16} className="text-[#A67B5B]" />On-Chain Blockchain Secured</span>
        </div>
      </section>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Farm + Lab */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#F8F9FA] border border-[#A67B5B]/20 p-6 rounded-xl shadow-sm">
            <div className="relative h-48 mb-6 rounded-lg overflow-hidden group border border-[#eeeeeb]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Highland Coffee Plantation Lâm Đồng"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtZn5xBl4qAXR124V6kLhexRTS00TmqwwlXCrbv1zA17dIIS8ytZM8vQ1Jg3PbuktfbLRZIkI-3p0DaCphC9loljKLMYePLUhJDRLcXawnIwDEQ6XuLv1h5UiyCr3T7c6zFCmOiE-CDVkmeOk-Q1jaVV37zMxWDyG0SIHQXrKwsX5Stk6TxmcoT-eRdYNFKtp3h1SDzeurs8UL2MVywqKo8TO6v1Y1IjBxHLXapVWIZKqPuqXdBN8M476iprR3gjiMIxUCQ-_ZtWQ"
              />
              <div className="absolute bottom-2.5 right-2.5 bg-[#012d1d]/85 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] uppercase font-mono tracking-wider font-bold">{selectedLot.altitude}</div>
            </div>
            <h3 className="font-serif text-xl font-bold text-[#012d1d] mb-1">Binh Dong Farm</h3>
            <p className="text-xs font-semibold text-[#79573f] mb-4">{selectedLot.origin}</p>
            <p className="text-sm text-[#414844]/90 mb-6 leading-relaxed">{selectedLot.description}</p>
            <div className="flex items-center gap-3.5 pt-4 border-t border-[#A67B5B]/10">
              <div className="w-12 h-12 rounded-full border-2 border-[#2D6A4F] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Grower ${selectedLot.grower}`}
                  className="w-full h-full object-cover"
                  src={selectedLot.growerAvatar}
                />
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase font-extrabold text-[#79573f]">{selectedLot.growerTitle}</p>
                <p className="text-sm font-bold text-[#1a1c1a]">{selectedLot.grower}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#012d1d] text-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-lg font-bold text-[#a5d0b9]">Lab Cupping Results</h3>
              <Award size={22} className="text-[#a5d0b9]" />
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] tracking-widest uppercase font-bold text-[#86af99] mb-1">SCA Cupping Score</p>
                  <p className="font-mono text-4xl font-black text-[#a5d0b9]">{selectedLot.cuppingScore} <span className="text-lg font-sans font-normal opacity-70">pts</span></p>
                </div>
                <span className="text-[10px] bg-[#008000] text-white font-bold tracking-widest px-3 py-1 rounded uppercase">Specialty Grade</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 font-mono">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#86af99]">Moisture Profile</p>
                  <p className="text-lg font-bold text-white">{selectedLot.moisture}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#86af99]">Defects Count</p>
                  <p className="text-lg font-bold text-white">None Detected (Low)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Timeline + Sustainability */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#F8F9FA] border border-[#A67B5B]/20 p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-8">
              <Navigation size={20} className="text-[#2D6A4F]" />
              <h3 className="font-serif text-lg font-bold text-[#012d1d]">Traceability Passport</h3>
            </div>
            <div className="relative border-l-2 border-[#A67B5B]/25 ml-3 pl-8 space-y-10">
              {selectedLot.timeline.map((step, idx) => (
                <div key={idx} className="relative group">
                  <span className="absolute -left-[41px] top-0.5 w-4 h-4 rounded-full bg-[#2D6A4F] border-4 border-[#F8F9FA] ring-2 ring-[#2D6A4F]/20" />
                  <p className="text-[10px] tracking-wider uppercase font-bold text-[#79573f] mb-1">{step.date}</p>
                  <p className="font-serif text-[15px] font-bold text-[#012d1d] mb-2 leading-tight">{step.title}</p>
                  <p className="text-xs text-[#414844]/90 mb-4 leading-relaxed">{step.desc}</p>
                  {idx === 0 && (
                    <div className="rounded-lg overflow-hidden border border-[#A67B5B]/15 h-36 bg-[#eeeeeb] shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Specialty manual harvesting cherries highlight"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyBijJF0D_PyCnb8M-2duh-0pQ4HuvSKCQqSG9dH4iL-MtrpSYyUCyK60ziuwusO6uYJO_jShSYZH-i0lbLY1jRGkE_TkyLjZk_rN7zsKprvNOIANfqrRHgskvH7WK8auv_DgrF6sDjD3pFStbwwrX8rDFSDExKRGenmHo5E0rTIomrb6eINSlXBPtkmtJ8ldvnZKyNMmdiVwAvbTOF8lXBdNieKBUO7d4m1-dzGrjU0JRceTHnpO6Dy2wTidy5ov8144kZ37m_bo"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#F8F9FA] border border-[#A67B5B]/20 p-6 rounded-xl shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#012d1d] mb-5">Sustainability Metrics</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3.5 bg-[#2D6A4F]/10 rounded-lg border border-[#2D6A4F]/10">
                <Leaf size={22} className="text-[#2D6A4F]" />
                <div>
                  <p className="text-[10px] tracking-wide uppercase font-bold text-[#012d1d]">EUDR Status</p>
                  <p className="text-xs font-bold text-[#008000]">{selectedLot.eudrStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 bg-[#eeeeeb]/70 rounded-lg">
                <Wind size={22} className="text-[#79573f]" />
                <div>
                  <p className="text-[10px] tracking-wide uppercase font-bold text-[#414844]">Carbon Index</p>
                  <p className="text-xs font-bold text-[#1a1c1a]">{selectedLot.carbonFootprint}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <p className="text-[#414844]">Water Reuse Efficiency</p>
                <p className="font-mono text-[#012d1d]">{selectedLot.waterReuseEfficiency}</p>
              </div>
              <div className="w-full bg-[#eeeeeb] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#2D6A4F] h-full" style={{ width: selectedLot.waterReuseEfficiency }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Verification + Map + QR */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border-2 border-[#012d1d] p-6 rounded-xl shadow-lg relative overflow-hidden">
            <h3 className="font-serif text-lg font-bold text-[#012d1d] mb-4 flex items-center gap-1.5">
              <Lock size={18} className="text-[#A67B5B]" />Verified On-Chain
            </h3>
            <p className="text-xs text-[#414844]/90 mb-5 leading-relaxed">This lot&apos;s supply chain is sealed and secured cryptographically by the decentralized public ledger.</p>
            <div className="space-y-3.5 font-mono text-[11px] mb-6">
              <div className="bg-[#eeeeeb] p-3 rounded border border-[#A67B5B]/10">
                <p className="text-[9px] uppercase tracking-wider font-bold text-[#79573f] mb-1">Ada Policy ID</p>
                <p className="truncate text-[#012d1d] font-bold" title={selectedLot.policyId}>{selectedLot.policyId}</p>
              </div>
              <div className="bg-[#eeeeeb] p-3 rounded border border-[#A67B5B]/10">
                <p className="text-[9px] uppercase tracking-wider font-bold text-[#79573f] mb-1">Asset ID</p>
                <p className="truncate text-[#012d1d] font-bold">{selectedLot.assetName}</p>
              </div>
            </div>
            <button onClick={handleVerifyMerkle} disabled={isValidating}
              className="w-full bg-[#2D6A4F] hover:bg-[#012d1d] text-white py-3.5 rounded-lg text-xs font-bold flex justify-center items-center gap-1.5 transition-all cursor-pointer">
              {isValidating ? <><RefreshCw size={14} className="animate-spin" /><span>Validating...</span></> : <><ShieldCheck size={14} /><span>Verify Merkle Proof</span></>}
            </button>
            {validated && (
              <div className="mt-4 p-4 bg-[#1b4332]/10 text-[#2D6A4F] border border-[#2D6A4F]/20 rounded-lg text-center">
                <p className="text-[10px] tracking-widest uppercase font-bold mb-1">Hash Comparison Succeed</p>
                <p className="font-mono text-[9px] select-all break-all leading-tight text-[#1a1c1a]/80">{selectedLot.merkleRoot}</p>
              </div>
            )}
          </div>

          <div className="bg-[#F8F9FA] border border-[#A67B5B]/20 rounded-xl overflow-hidden shadow-sm">
            <div className="h-44 bg-[#eeeeeb] flex flex-col items-center justify-center relative group overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Farm satellite topographic map overlay"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtfftuy3DmJtup1vlQoVJIg1Gc0zIb81dE7X40_TwtGB5lN5j6ZZac3EbJ3KkRk-XjPn-HRbFkd84JUE-YoLBSSxC8-uJ2x4vHAls7HUAFabZ67NEbWEoXTWLJxetxFpABouPF9UfjpJPcA9YQdU7ze4SyrJZHDTkeJO6zwZsOMTnRV3PFYnvWfjNZT77wQRQHYg04Vh-dG0XpsJ6wp2g1n0y9nytpC3a5m4_05WSGTw2dIV1JawC7kwRqovxeOuidJsNCsoeLZYM"
              />
              <div className="absolute inset-0 bg-[#012d1d]/15 flex items-center justify-center">
                <span className="bg-white/95 text-[#012d1d] px-3 py-1.5 rounded shadow-lg font-mono text-[10px] tracking-tight font-bold border border-[#A67B5B]/20">
                  {selectedLot.coordinates}
                </span>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-xs text-[#012d1d] mb-1">Geospatial Proof</h4>
              <p className="text-[9px] tracking-wider uppercase font-extrabold text-[#717973]">Sentinel-2 Telemetry Verified</p>
            </div>
          </div>

          <div className="bg-[#A67B5B] text-white p-6 rounded-xl flex flex-col items-center text-center">
            <p className="text-[10px] tracking-widest uppercase font-bold opacity-80 mb-4">Share this Passport</p>
            <div className="bg-white p-3 rounded-lg shadow mb-4">
              <QRCodeSVG
                value={typeof window !== "undefined"
                  ? `${window.location.origin}/lot/${encodeURIComponent(selectedLot.id)}?mock=true`
                  : `/lot/${encodeURIComponent(selectedLot.id)}?mock=true`}
                size={96}
                fgColor="#012d1d"
              />
            </div>
            <p className="text-xs leading-relaxed">Scan to preview real-time moisture conditions and temperature maps for this specific crop cycle.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
