import React from "react";
import { FlaskConical } from "lucide-react";
import { InputField, ActionButton } from "./UI";

export function LabForm({
  lotId,
  setLotId,
  scaScore,
  setScaScore,
  labCertHash,
  setLabCertHash,
  onSubmit,
  loading,
}: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8 border-b border-[#2D5A27]/15 pb-5">
        <div className="p-3 bg-gradient-to-br from-[#2D5A27]/25 to-[#1a2e19]/10 rounded-xl border border-[#2D5A27]/20">
          <FlaskConical className="text-[#4A7C3F] w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e8e0d4]">Kết quả Phòng thí nghiệm</h2>
          <p className="text-xs text-[#8aad82]/40">Gửi điểm cupping qua Backend Oracle.</p>
        </div>
      </div>

      <div className="space-y-5">
        <InputField label="Mã lô hàng" value={lotId} onChange={setLotId} placeholder="VD: LD-2026-0527" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InputField label="Điểm SCA Cupping (0-100)" value={scaScore} onChange={setScaScore} type="number" />
          <InputField label="Hash Chứng nhận Lab" value={labCertHash} onChange={setLabCertHash} placeholder="sha256:..." mono />
        </div>
      </div>

      <div className="pt-4">
        <ActionButton onClick={onSubmit} loading={loading} disabled={!lotId} text="🔬 Gửi tới Backend Oracle" variant="green" />
      </div>
    </div>
  );
}
