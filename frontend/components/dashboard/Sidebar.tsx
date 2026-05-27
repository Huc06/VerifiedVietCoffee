import React from "react";
import Image from "next/image";
import { Activity, FlaskConical, Sprout, Coffee } from "lucide-react";
import { CardanoWallet } from "@meshsdk/react";

export type TabKey = "mint" | "update" | "lab" | "sustain";

export const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "mint", label: "Phát hành Lô", icon: <Coffee className="w-4 h-4" /> },
  { key: "update", label: "Cập nhật Sự kiện", icon: <Activity className="w-4 h-4" /> },
  { key: "lab", label: "Kết quả Lab", icon: <FlaskConical className="w-4 h-4" /> },
  { key: "sustain", label: "Bền vững", icon: <Sprout className="w-4 h-4" /> },
];

export function Sidebar({
  activeTab,
  onSelectTab,
}: {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}) {
  return (
    <div className="w-full md:w-64 flex-shrink-0 bg-gradient-to-b from-[#1a2e19] via-[#162514] to-[#111c10] border-r border-[#2D5A27]/20 md:h-screen flex flex-col z-20">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-[#2D5A27]/20">
        <Image src="/logo.png" alt="VerifiedVietCoffee" width={44} height={44} className="rounded-xl" />
        <div>
          <h1 className="font-black text-[#e8e0d4] leading-tight text-base tracking-tight">VerifiedViet</h1>
          <p className="text-[10px] text-[#4A7C3F] font-bold uppercase tracking-[0.2em]">Coffee</p>
        </div>
      </div>

      {/* Nav Menu - Desktop */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto hidden md:block">
        <div className="text-[10px] font-bold text-[#4A7C3F]/40 uppercase tracking-widest mb-4 px-3 pt-2">Hợp đồng thông minh</div>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onSelectTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${
                isActive
                  ? "text-[#e8e0d4] bg-[#2D5A27]/20 border border-[#3A6B35]/30 shadow-md shadow-[#2D5A27]/10"
                  : "text-[#8aad82]/50 hover:bg-[#2D5A27]/10 hover:text-[#8aad82]/80 border border-transparent"
              }`}
            >
              <span className={isActive ? "text-[#5DA852]" : "text-[#4A7C3F]/30 group-hover:text-[#4A7C3F]/60"}>{t.icon}</span>
              <span className="font-semibold text-sm">{t.label}</span>
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#3A6B35] rounded-r-full" />}
            </button>
          );
        })}
      </nav>

      {/* Nav Menu - Mobile */}
      <nav className="flex md:hidden p-2 overflow-x-auto gap-2 border-b border-[#2D5A27]/20 scrollbar-hide">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onSelectTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-xs font-semibold ${
                isActive
                  ? "text-[#e8e0d4] bg-[#2D5A27]/20 border border-[#3A6B35]/30"
                  : "text-[#4A7C3F]/40 bg-[#1a2e19]/80"
              }`}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </nav>

      {/* Wallet Connection */}
      <div className="p-4 border-t border-[#2D5A27]/20 mt-auto bg-[#111c10]/80">
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="w-2 h-2 rounded-full bg-[#5DA852] animate-pulse" />
          <span className="text-[10px] font-bold text-[#4A7C3F]/40 uppercase tracking-wider">Cardano Preprod</span>
        </div>
        <div className="[&_button]:!w-full [&_button]:!text-[#1a2e19] [&_button]:!font-bold [&_button]:!bg-gradient-to-r [&_button]:!from-[#4A7C3F] [&_button]:!to-[#3A6B35] hover:[&_button]:!from-[#5DA852] hover:[&_button]:!to-[#4A7C3F] [&_button]:!rounded-xl [&_button]:!py-2.5 [&_button]:!shadow-lg [&_button]:!shadow-[#2D5A27]/30 transition-all">
          <CardanoWallet />
        </div>
      </div>
    </div>
  );
}
