import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Layers,
  Leaf,
  UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

export type ViewKey = 'dashboard' | 'iot' | 'lots' | 'traceability';

interface SidebarProps {
  currentView: ViewKey;
  setView: (view: ViewKey) => void;
  onOpenMintModal: () => void;
  walletConnected: boolean;
}

const NAV_ITEMS: { key: ViewKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { key: 'iot', label: 'IoT Monitoring', icon: <Radio size={20} /> },
  { key: 'lots', label: 'Lot Management', icon: <Layers size={20} /> },
  { key: 'traceability', label: 'Customer Portal', icon: <Leaf size={20} /> },
];

export default function Sidebar({ currentView, setView, onOpenMintModal, walletConnected }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 w-64 border-r border-[#A67B5B]/15 bg-[#fafafa] shadow-[4px_0_24px_rgba(45,106,79,0.02)] z-50">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-[#A67B5B]/10">
        <div className="relative p-1.5 bg-[#2D6A4F]/10 rounded-xl border border-[#2D6A4F]/15 flex items-center justify-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" width={32} height={32} className="rounded-lg object-contain" />
        </div>
        <div className="overflow-hidden">
          <h1 
            className="font-serif text-base font-extrabold text-[#012d1d] hover:text-[#2D6A4F] cursor-pointer transition-colors leading-tight tracking-tight whitespace-nowrap" 
            onClick={() => setView('dashboard')}
          >
            VerifiedVietCoffee
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-bold bg-[#A67B5B]/15 text-[#79573f] px-1.5 py-0.5 rounded uppercase tracking-wider">
              Binh Dong
            </span>
            <span className="text-[8px] font-semibold text-[#717973] tracking-widest uppercase">
              Farm
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium outline-none cursor-pointer ${
                isActive
                  ? 'text-[#2D6A4F] font-bold'
                  : 'text-[#515954] hover:text-[#012d1d] hover:bg-[#2D6A4F]/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-view-pill"
                  className="absolute inset-0 bg-[#2D6A4F]/8 border-l-[3px] border-[#2D6A4F] rounded-xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              <span className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110 text-[#2D6A4F]' : 'group-hover:scale-105 text-[#717973] group-hover:text-[#2D6A4F]'}`}>
                {item.icon}
              </span>
              
              <span className="relative z-10">{item.label}</span>
              
              {isActive && (
                <span className="absolute right-4 w-1.5 h-1.5 bg-[#2D6A4F] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Panel */}
      <div className="p-5 border-t border-[#A67B5B]/10 mt-auto bg-[#fafafa]">
        {/* Operator ID Badge */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2D6A4F]/5 via-white to-[#A67B5B]/5 rounded-2xl border border-[#A67B5B]/20 p-4 shadow-[0_4px_20px_rgba(27,67,50,0.03)] group hover:border-[#2D6A4F]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#2D6A4F]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2D6A4F] to-[#1b4332] flex items-center justify-center text-white shadow-md shadow-[#2D6A4F]/20 group-hover:scale-105 transition-transform duration-200">
                <UserCheck size={20} />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${walletConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-[#012d1d] tracking-tight">Binh Dong Admin</p>
              <p className="text-[9px] uppercase font-extrabold tracking-widest text-[#717973] mt-0.5">
                {walletConnected ? 'Verified Operator' : 'Offline Mode'}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#eeeeeb] flex items-center justify-between text-[8px] font-bold text-[#717973] uppercase tracking-wider relative z-10">
            <span>System: v1.4.0</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${walletConnected ? 'bg-green-600' : 'bg-amber-500'}`} />
              {walletConnected ? 'Cardano Secured' : 'Unsynced'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
