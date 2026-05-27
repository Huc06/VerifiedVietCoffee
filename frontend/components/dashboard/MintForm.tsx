import React from "react";
import { Coffee } from "lucide-react";
import { InputField, SelectField, ActionButton } from "./UI";

export function MintForm({
  farmId,
  setFarmId,
  lotId,
  setLotId,
  variety,
  setVariety,
  processing,
  setProcessing,
  onSubmit,
  loading,
}: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8 border-b border-[#2D5A27]/15 pb-5">
        <div className="p-3 bg-gradient-to-br from-[#6B3A2A]/25 to-[#8B5E3C]/10 rounded-xl border border-[#8B5E3C]/20">
          <Coffee className="text-[#8B5E3C] w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e8e0d4]">Khởi tạo Lô cà phê mới</h2>
          <p className="text-xs text-[#8aad82]/40">Mint token tham chiếu CIP-68 trên Cardano.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputField label="Mã nông trại" value={farmId} onChange={setFarmId} placeholder="VD: binhdong_farm" />
        <InputField label="Mã lô hàng" value={lotId} onChange={setLotId} placeholder="VD: LD-2026-0527" />
        <SelectField label="Giống cà phê" value={variety} onChange={setVariety} options={["Robusta", "Arabica", "Catimor", "Yellow Bourbon"]} />
        <SelectField label="Phương pháp chế biến" value={processing} onChange={setProcessing} options={["Honey", "Washed", "Natural"]} />
      </div>

      <div className="pt-4">
        <ActionButton onClick={onSubmit} loading={loading} disabled={!farmId || !lotId} text="☕ Phát hành Hộ chiếu Cà phê" variant="brown" />
      </div>
    </div>
  );
}
