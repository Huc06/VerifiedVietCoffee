import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function InputField({ label, value, onChange, placeholder, mono, type = "text" }: any) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#8aad82]/50 uppercase tracking-wider mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl bg-[#141a13] border border-[#2D5A27]/20 px-4 py-3 text-[#e8e0d4] placeholder-[#3A6B35]/25 focus:outline-none focus:ring-2 focus:ring-[#3A6B35]/40 focus:border-[#3A6B35]/40 transition-all ${mono ? 'font-mono text-sm' : ''}`}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options }: any) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#8aad82]/50 uppercase tracking-wider mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#141a13] border border-[#2D5A27]/20 px-4 py-3 text-[#e8e0d4] focus:outline-none focus:ring-2 focus:ring-[#3A6B35]/40 focus:border-[#3A6B35]/40 transition-all appearance-none"
      >
        {options.map((opt: string) => <option key={opt} value={opt} className="bg-[#141a13]">{opt}</option>)}
      </select>
    </label>
  );
}

export function ActionButton({ onClick, loading, disabled, text, variant = "green" }: any) {
  const colors: Record<string, string> = {
    green:   "bg-gradient-to-r from-[#3A6B35] to-[#2D5A27] hover:from-[#4A7C3F] hover:to-[#3A6B35] text-white shadow-[#2D5A27]/30",
    brown:   "bg-gradient-to-r from-[#8B5E3C] to-[#6B3A2A] hover:from-[#9B6E4C] hover:to-[#8B5E3C] text-white shadow-[#6B3A2A]/30",
    emerald: "bg-gradient-to-r from-[#4A7C3F] to-[#3A6B35] hover:from-[#5DA852] hover:to-[#4A7C3F] text-white shadow-[#3A6B35]/30",
    teal:    "bg-gradient-to-r from-[#2D6B5A] to-[#1F4F42] hover:from-[#3A7C6B] hover:to-[#2D6B5A] text-white shadow-[#1F4F42]/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-full py-4 rounded-xl font-bold transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide ${colors[variant] || colors.green}`}
    >
      {loading && (
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-5 h-5" />
        </motion.div>
      )}
      {loading ? "Đang xử lý giao dịch…" : text}
    </button>
  );
}
