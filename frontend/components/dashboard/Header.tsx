import React from 'react';
import { Menu, Wallet, Leaf } from 'lucide-react';
import type { ViewKey } from './Sidebar';
import { CardanoWallet } from '@meshsdk/react';

interface HeaderProps {
  currentView: ViewKey;
  setView: (view: ViewKey) => void;
  walletConnected: boolean;
  walletAddress: string | null;
  onDisconnectWallet: () => void;
  onConnectWallet: () => void;
  onOpenMobileMenu: () => void;
  lots: { id: string }[];
}

const VIEW_TITLES: Record<ViewKey, string> = {
  dashboard: 'FARM MANAGER DASHBOARD',
  iot: 'CROP INTELLIGENCE TELEMETRY',
  lots: 'BLOCKCHAIN PASSPORT DETAIL',
  traceability: 'JOURNEY OF YOUR BEAN',
};

export default function Header({
  currentView,
  setView,
  walletConnected,
  walletAddress,
  onDisconnectWallet,
  onConnectWallet,
  onOpenMobileMenu,
  lots,
}: HeaderProps) {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#A67B5B]/15 px-6 py-4 flex justify-between items-center z-40">
      <div className="flex items-center gap-3">
        <button onClick={onOpenMobileMenu} className="md:hidden text-[#012d1d] hover:text-[#2D6A4F] p-1 rounded transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <span className="md:hidden font-serif text-lg font-bold text-[#012d1d]">VerifiedVietCoffee</span>
          <span className="hidden md:block font-serif text-sm font-semibold tracking-wide uppercase text-[#414844]/60">
            {VIEW_TITLES[currentView]}
          </span>
          <span className="md:hidden text-[10px] uppercase font-bold text-[#717973] tracking-wider leading-none">
            {currentView}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="[&_button]:!text-xs [&_button]:!font-bold [&_button]:!rounded-lg [&_button]:!py-1.5 [&_button]:!px-3 [&_button]:!border [&_button]:!border-[#2D6A4F]/20 [&_button]:!bg-[#1b4332]/5 [&_button]:!text-[#012d1d] [&_button]:hover:!bg-[#1b4332]/10 [&_button]:!shadow-sm [&_button]:!cursor-pointer [&_button]:!transition-colors">
          <CardanoWallet />
        </div>

        <button
          onClick={() => {
            setView('traceability');
          }}
          className={`hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
            currentView === 'traceability'
              ? 'bg-[#1b4332] text-white border-[#1b4332]'
              : 'bg-transparent border-[#A67B5B]/30 text-[#012d1d] hover:bg-[#A67B5B]/10'
          }`}
        >
          <Leaf size={14} />
          <span>Customer Portal</span>
        </button>
      </div>
    </header>
  );
}
