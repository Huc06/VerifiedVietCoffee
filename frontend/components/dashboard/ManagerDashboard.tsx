import React from 'react';
import {
  Layers,
  Droplets,
  History,
  Wind,
  Radio,
  Filter,
  CheckCircle,
  Eye,
  Calendar,
  Sun,
  Lock,
  Plus
} from 'lucide-react';
import { Lot, IoTTelemetry } from '@/lib/types';

interface Props {
  lots: Lot[];
  setView: (view: 'dashboard' | 'iot' | 'lots' | 'traceability') => void;
  onSelectLot: (lot: Lot) => void;
  telemetry: IoTTelemetry;
  walletConnected: boolean;
  onConnectWallet: () => void;
  onOpenMintModal: () => void;
}

export default function ManagerDashboard({ lots, setView, onSelectLot, telemetry, walletConnected, onConnectWallet, onOpenMintModal }: Props) {
  const activeLots = lots.filter(l => l.id !== "VVC-2023-LAMDONG-084");

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="font-serif text-3xl font-bold text-[#012d1d] mb-2 leading-tight">
              Welcome back, Binh Dong Farm Manager
            </h2>
            <p className="text-sm text-[#414844]/80 flex flex-wrap items-center gap-2">
              <Calendar size={16} className="text-[#A67B5B]" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="mx-2 text-[#c1c8c2]">|</span>
              <Sun size={16} className="text-[#FFB703] animate-spin-slow" />
              <span>Sunny, 24°C, Bảo Lộc - Lâm Đồng Province</span>
            </p>
          </div>
          <div className="bg-[#F8F9FA] border border-[#A67B5B]/10 p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="h-12 w-12 bg-[#1b4332]/10 rounded-full flex items-center justify-center text-[#2D6A4F]">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] tracking-wider uppercase font-semibold text-[#414844]/70">Last Batch Scanned</p>
              <p className="font-mono text-sm font-bold text-[#012d1d]">#BD-4092-23</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics Grid */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Layers size={18} />}
            iconColor="text-[#2D6A4F]"
            iconBg="bg-[#2D6A4F]/5"
            badge="+1 new"
            badgeColor="text-[#008000] bg-[#008000]/10"
            label="Active Lots"
            value={String(activeLots.length)}
            barPercent={activeLots.length * 20}
            barColor="bg-[#2D6A4F]"
          />
          <MetricCard
            icon={<Droplets size={18} />}
            iconColor="text-[#A67B5B]"
            iconBg="bg-[#A67B5B]/5"
            badge="Optimal Range"
            badgeColor="text-[#414844]"
            label="Avg Soil Moisture"
            value="42%"
            barPercent={42}
            barColor="bg-[#A67B5B]"
          />
          <MetricCard
            icon={<History size={18} />}
            iconColor="text-[#FFB703]"
            iconBg="bg-[#FFB703]/5"
            badge="Requires Action"
            badgeColor="text-[#FFB703] bg-[#FFB703]/10"
            label="Pending Anchors"
            value="3"
            barPercent={25}
            barColor="bg-[#FFB703]"
          />
          <MetricCard
            icon={<Wind size={18} />}
            iconColor="text-[#012d1d]"
            iconBg="bg-[#012d1d]/5"
            badge="Below Avg"
            badgeColor="text-[#008000] bg-[#008000]/10"
            label="GHG Footprint"
            value="2.1"
            unit="kg"
            sub="CO2e/kg processed bean"
          />
        </div>
      </section>

      {/* Grid: Live data + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* IoT Live Stream */}
        <div className="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl border border-[#A67B5B]/15 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-serif text-lg font-bold text-[#012d1d]">IoT Live Stream</h4>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#008000] bg-[#008000]/10 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#008000] animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="space-y-4">
              <TelemetryRow label="Soil Moisture" sub="Zone A - Probe 1" value={`${telemetry.soilMoisture}%`} />
              <TelemetryRow label="Temperature" sub="Ambient Air" value={`${telemetry.temperature}°C`} />
              <TelemetryRow label="EC Nutrient Density" sub="Soil Conductivity" value={`${telemetry.ecLevels} mS/cm`} />
              <TelemetryRow label="PAR Sensor" sub="Photosynthesis UV" value={`${telemetry.parSensor} µmol`} last />
            </div>
          </div>
          <button onClick={() => setView('iot')} className="mt-6 w-full py-2.5 text-xs font-bold text-[#2D6A4F] border border-[#2D6A4F]/20 rounded-lg hover:bg-[#2D6A4F]/5 transition-all">
            Review Deep IoT Telemetry
          </button>
        </div>

        {/* Active Lots Table */}
        <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl border border-[#A67B5B]/15 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-serif text-lg font-bold text-[#012d1d]">Active Batch Lots</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenMintModal}
                  className="bg-[#2D6A4F] text-white hover:bg-[#1b4332] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-[#2D6A4F]/10 active:scale-95"
                >
                  <Plus size={14} />
                  <span>Mint Passport</span>
                </button>
                <button className="text-xs font-semibold text-[#414844] flex items-center gap-1 hover:text-[#012d1d] border border-[#eeeeeb] px-2.5 py-1.5 rounded-lg bg-white transition-all cursor-pointer">
                  <Filter size={12} />
                  <span>Filter List</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#A67B5B]/10 text-[10px] tracking-wider uppercase text-[#414844] font-bold">
                  <tr>
                    <th className="pb-3">Lot ID</th>
                    <th className="pb-3">Variety</th>
                    <th className="pb-3">Altitude</th>
                    <th className="pb-3">Current Stage</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#A67B5B]/10">
                  {activeLots.map((lot) => {
                    let bulletColor = 'bg-[#A67B5B]';
                    let textColor = 'text-[#79573f]';
                    if (lot.stage.includes('Fermentation')) { bulletColor = 'bg-[#2D6A4F]'; textColor = 'text-[#2D6A4F]'; }
                    else if (lot.stage.includes('Drying')) { bulletColor = 'bg-[#1a1c1a]'; textColor = 'text-[#1a1c1a]'; }
                    else if (lot.stage.includes('Sorting') || lot.stage.includes('Resting')) { bulletColor = 'bg-[#FFB703]'; textColor = 'text-amber-600'; }

                    return (
                      <tr key={lot.id} className="hover:bg-[#f9faf6] transition-colors">
                        <td className="py-4 font-mono text-xs font-bold text-[#012d1d]">{lot.id}</td>
                        <td className="py-4 text-xs font-medium text-[#414844]">{lot.variety}</td>
                        <td className="py-4 text-xs font-mono text-[#717973]">{lot.altitude}</td>
                        <td className="py-4 text-xs">
                          <span className={`flex items-center gap-1.5 font-bold ${textColor}`}>
                            <span className={`w-2 h-2 rounded-full ${bulletColor}`} />
                            {lot.stage}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => { onSelectLot(lot); setView('lots'); }}
                            className="px-3 py-1 text-xs font-bold border border-[#A67B5B]/30 rounded-lg hover:bg-[#A67B5B]/10 transition-all inline-flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>Quick View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-4 border-t border-[#eeeeeb] mt-4 flex justify-between items-center text-xs text-[#717973]">
            <span>Showing {activeLots.length} active high-altitude coffee lots</span>
            <button className="text-[#2D6A4F] font-bold hover:underline" onClick={() => setView('lots')}>Manage All Lots</button>
          </div>
        </div>
      </div>

      {/* EUDR Compliance Banner */}
      <section>
        <div className="bg-[#012d1d] text-white p-8 rounded-xl overflow-hidden relative border border-[#2D6A4F]">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-[#2D6A4F]" />
                <span className="text-[10px] tracking-widest uppercase font-bold text-[#86af99]">EUDR Compliance Status</span>
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#a5d0b9] mb-4">100% Deforestation-Free Compliant</h3>
              <p className="text-sm text-[#86af99] max-w-lg leading-relaxed">
                Your farm satellite telemetry has been verified against the latest Sentinel-2 datasets. All premium beans harvested from the current cycle are fully compliant with EUDR rules.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="bg-[#1b4332]/50 p-4 rounded-lg border border-[#86af99]/15">
                  <p className="text-[10px] uppercase font-semibold text-[#86af99] mb-1">Season Water Use</p>
                  <p className="font-mono text-xl font-bold text-[#a5d0b9]">124.2 m³</p>
                </div>
                <div className="bg-[#1b4332]/50 p-4 rounded-lg border border-[#86af99]/15">
                  <p className="text-[10px] uppercase font-semibold text-[#86af99] mb-1">Regenerative Score</p>
                  <p className="font-mono text-xl font-bold text-green-300">A+ (Optimal)</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-5 relative h-56 w-full rounded-xl overflow-hidden border border-white/10 shadow-md">
              <div className="absolute inset-0 bg-gradient-to-t from-[#012d1d] via-transparent to-transparent z-10 pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="EUDR Farm Satellite Map"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbeJOkwKb-mFHfAbMth49tFQ2RLQBguNMGQz7Kc2HEpMCRFQY0KHfu200VGP_RxfgkI4Ryj2TavjbWgKROttoTHe5s3nG2xgWIgbgo41IiqMlQz6omGAt6mQCrygA-WqCU7MhBxsw7E8eWMsp8sccnEvlICHGZ_pFrSWHiWuV_g0LiLaGMIkkkDVOHcNnEAZiXiTfor4ahH8G3qrHHvwzvR96oGRHv5xuQjxaqAC48WlI6TsLfoWkYkqChSOoOZv_r1WSYwRWsYhA"
              />
              <div className="absolute bottom-3 right-3 z-20 backdrop-blur-md bg-white/70 px-3 py-1.5 rounded-lg border border-[#2D6A4F]/20 flex items-center gap-1.5 shadow-sm">
                <Lock size={12} className="text-[#2D6A4F]" />
                <span className="font-mono text-[9px] font-bold text-[#012d1d]">Merkle: 0x8f2a...3e4b</span>
              </div>
            </div>
          </div>

          {/* Atmospheric background context element */}
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none">
            <svg className="w-full h-full text-white fill-current" viewBox="0 0 100 100">
              <pattern id="dots-density" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#dots-density)" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, iconColor, iconBg, badge, badgeColor, label, value, unit, sub, barPercent, barColor }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-[#A67B5B]/20 shadow-[0px_4px_20px_rgba(27,67,50,0.06)] hover:translate-y-[-2px] transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className={`${iconColor} p-2 ${iconBg} rounded-lg`}>{icon}</span>
        <span className={`text-[10px] font-bold ${badgeColor} px-2 py-1 rounded`}>{badge}</span>
      </div>
      <p className="text-[10px] tracking-wider uppercase font-bold text-[#414844] mb-1">{label}</p>
      <h3 className="text-3xl font-mono font-bold text-[#012d1d]">
        {value} {unit && <span className="text-sm font-sans font-normal opacity-70">{unit}</span>}
      </h3>
      {sub && <p className="text-[10px] text-[#414844]/70 mt-1">{sub}</p>}
      {barPercent !== undefined && (
        <div className="mt-4 h-1 w-full bg-[#eeeeeb] rounded-full overflow-hidden">
          <div className={`${barColor} h-full transition-all duration-500`} style={{ width: `${barPercent}%` }} />
        </div>
      )}
    </div>
  );
}

function TelemetryRow({ label, sub, value, last }: { label: string; sub: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${last ? '' : 'pb-3 border-b border-[#eeeeeb]'}`}>
      <div>
        <p className="text-xs font-bold text-[#1a1c1a]">{label}</p>
        <p className="text-[10px] text-[#414844]">{sub}</p>
      </div>
      <span className="font-mono text-sm font-semibold text-[#012d1d] bg-[#1b4332]/5 px-2.5 py-1 rounded-md">{value}</span>
    </div>
  );
}
