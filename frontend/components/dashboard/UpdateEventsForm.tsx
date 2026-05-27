import React from "react";
import { Activity } from "lucide-react";
import { InputField, ActionButton } from "./UI";

export function UpdateEventsForm({
  lotId,
  setLotId,
  merkleRoot,
  setMerkleRoot,
  photosHash,
  setPhotosHash,
  onSubmit,
  loading,
}: any) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8 border-b border-[#2D5A27]/15 pb-5">
        <div className="p-3 bg-gradient-to-br from-[#3A6B35]/25 to-[#2D5A27]/10 rounded-xl border border-[#3A6B35]/20">
          <Activity className="text-[#5DA852] w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e8e0d4]">Cập nhật Dữ liệu hàng ngày</h2>
          <p className="text-xs text-[#8aad82]/40">Neo Merkle root từ dữ liệu IoT (Tier 1).</p>
        </div>
      </div>

      <div className="space-y-5">
        <InputField label="Mã lô hàng" value={lotId} onChange={setLotId} placeholder="VD: LD-2026-0527" />
        <InputField label="Merkle Root (Sự kiện hàng ngày)" value={merkleRoot} onChange={setMerkleRoot} placeholder="sha256:..." mono />
        <InputField label="Hash Ảnh chụp" value={photosHash} onChange={setPhotosHash} placeholder="sha256:..." mono />
      </div>

      <div className="pt-4">
        <ActionButton onClick={onSubmit} loading={loading} disabled={!lotId || (!merkleRoot && !photosHash)} text="📡 Cập nhật Sự kiện (Tier 1)" variant="emerald" />
      </div>
    </div>
  );
}
