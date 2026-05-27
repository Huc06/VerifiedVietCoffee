import React from "react";
import { Coffee, Shield } from "lucide-react";

export function Header({
  scriptAddress,
  policyId,
  connected,
}: {
  scriptAddress: string;
  policyId: string;
  connected: boolean;
}) {
  const shortAddr = scriptAddress
    ? `${scriptAddress.slice(0, 15)}…${scriptAddress.slice(-10)}`
    : "—";
  const shortPolicy = policyId ? `${policyId.slice(0, 15)}…` : "—";

  return (
    <header className="px-6 py-5 md:px-10 md:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 bg-gradient-to-r from-[#1a2e19]/60 via-[#171f16]/80 to-[#141a13]/90 backdrop-blur-xl border-b border-[#2D5A27]/15 sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-[#e8e0d4] mb-0.5 flex items-center gap-2">
          <Coffee className="w-5 h-5 text-[#8B5E3C]" />
          Quản trị Nông trại
        </h2>
        <p className="text-xs text-[#8aad82]/40">Quản lý và phát hành hộ chiếu cà phê trên blockchain Cardano.</p>
      </div>

      {connected && scriptAddress && (
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="bg-[#1a2e19]/60 px-4 py-2.5 rounded-2xl border border-[#2D5A27]/20 flex-1 lg:flex-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C3F]/40 block mb-0.5">Script Address</span>
            <span className="text-xs font-mono text-[#c4b8a8]/70 truncate inline-block max-w-[200px]" title={scriptAddress}>
              {shortAddr}
            </span>
          </div>
          <div className="bg-[#1a2e19]/60 px-4 py-2.5 rounded-2xl border border-[#2D5A27]/20 flex-1 lg:flex-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A7C3F]/40 block mb-0.5">Policy ID</span>
            <span className="text-xs font-mono text-[#c4b8a8]/70 truncate inline-block max-w-[150px]" title={policyId}>
              {shortPolicy}
            </span>
          </div>
        </div>
      )}

      {!connected && (
        <div className="flex items-center gap-2 text-[#8B5E3C] bg-[#6B3A2A]/15 border border-[#8B5E3C]/20 px-4 py-2.5 rounded-xl text-sm font-medium">
          <Shield className="w-4 h-4" /> Kết nối ví để tiếp tục
        </div>
      )}
    </header>
  );
}
