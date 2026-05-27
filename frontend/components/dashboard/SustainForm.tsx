import React from "react";
import { Sprout } from "lucide-react";
import { InputField, ActionButton } from "./UI";

export function SustainForm({
  lotId,
  setLotId,
  co2e,
  setCo2e,
  waterL,
  setWaterL,
  organicPct,
  setOrganicPct,
  somPct,
  setSomPct,
  shadePct,
  setShadePct,
  eudrHash,
  setEudrHash,
  onSubmit,
  loading,
}: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8 border-b border-[#2D5A27]/15 pb-5">
        <div className="p-3 bg-gradient-to-br from-[#2D6B5A]/25 to-[#1F4F42]/10 rounded-xl border border-[#2D6B5A]/20">
          <Sprout className="text-[#5DA852] w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e8e0d4]">Chỉ số Phát triển Bền vững</h2>
          <p className="text-xs text-[#8aad82]/40">Ghi nhận carbon, nước, và dữ liệu EUDR.</p>
        </div>
      </div>

      <div className="space-y-5">
        <InputField label="Mã lô hàng" value={lotId} onChange={setLotId} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InputField label="CO₂e (kg/kg)" value={co2e} onChange={setCo2e} type="number" />
          <InputField label="Nước (L/kg)" value={waterL} onChange={setWaterL} type="number" />
          <InputField label="Hữu cơ (%)" value={organicPct} onChange={setOrganicPct} type="number" />
          <InputField label="SOM đất (%)" value={somPct} onChange={setSomPct} type="number" />
          <InputField label="Tán che (%)" value={shadePct} onChange={setShadePct} type="number" />
        </div>

        <InputField label="Hash EUDR DDS" value={eudrHash} onChange={setEudrHash} placeholder="sha256:..." mono />
      </div>

      <div className="pt-4">
        <ActionButton onClick={onSubmit} loading={loading} disabled={!lotId} text="🌿 Neo Chỉ số Bền vững" variant="teal" />
      </div>
    </div>
  );
}
