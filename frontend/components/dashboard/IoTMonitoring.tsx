import React, { useState, useRef } from 'react';
import {
  Droplet, ShieldCheck, Play, History,
  QrCode, Download, CheckCircle, MapPin, Sparkles,
  RefreshCw, Upload
} from 'lucide-react';
import { EventLog, IoTTelemetry } from '@/lib/types';

interface Props {
  telemetry: IoTTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<IoTTelemetry>>;
  eventLogs: EventLog[];
  setEventLogs: React.Dispatch<React.SetStateAction<EventLog[]>>;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export default function IoTMonitoring({ telemetry, setTelemetry, eventLogs, setEventLogs, walletConnected }: Props) {
  const [fertilizerType, setFertilizerType] = useState('Bio-organic NPK (5-5-5)');
  const [amount, setAmount] = useState('50');
  const [zone, setZone] = useState('Block A-1');
  const [method, setMethod] = useState('Broadcast');
  const [timeRange, setTimeRange] = useState<'1H' | '24H'>('24H');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chartPoints24H = "M0,150 Q100,120 200,140 T400,100 T600,130 T800,80";
  const chartPoints1H = "M0,130 Q100,110 200,105 T400,115 T600,90 T800,95";
  const selectedChartPoints = timeRange === '24H' ? chartPoints24H : chartPoints1H;

  const simulateLiveMetrics = () => {
    setTelemetry({
      soilMoisture: parseFloat((25 + Math.random() * 8).toFixed(1)),
      temperature: parseFloat((22 + Math.random() * 5).toFixed(1)),
      humidity: Math.floor(65 + Math.random() * 15),
      ecLevels: parseFloat((1.2 + Math.random() * 0.4).toFixed(1)),
      parSensor: Math.floor(800 + Math.random() * 100)
    });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setUploadedFile(e.dataTransfer.files[0].name);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadedFile(e.target.files[0].name);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setIsSubmitting(true);
    const generatedHash = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("");
    setTimeout(() => {
      const today = new Date();
      const ts = today.toISOString().split('T')[0] + " " + today.toTimeString().split(' ')[0].substring(0, 5);
      const newLog: EventLog = {
        id: "LOG-" + Math.floor(Math.random() * 900 + 100),
        timestamp: ts, operatorId: walletConnected ? "OPR-ADDR" : "OPR-4421",
        action: "FERTILIZE", details: `${amount}kg ${fertilizerType} / ${zone} (${method})`, verified: true
      };
      setEventLogs(prev => [newLog, ...prev]);
      setIsSubmitting(false); setTxHash(generatedHash); setUploadedFile(null);
      setTimeout(() => setTxHash(null), 6000);
    }, 2000);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Timestamp", "Operator ID", "Action", "Details", "Verified"].join(",");
    const rows = eventLogs.map(log => [log.id, log.timestamp, log.operatorId, log.action, `"${log.details}"`, log.verified ? "Yes" : "No"].join(","));
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `VVC_LedgerLogs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleLoadOlderEntries = () => {
    const historicalLogs: EventLog[] = [
      { id: "LOG-005", timestamp: "2023-11-16 11:30", operatorId: "OPR-9902", action: "PRUNING", details: "Section B Shade canopy thinning protocol completed - 100% compliant", verified: true },
      { id: "LOG-004", timestamp: "2023-11-15 09:12", operatorId: "OPR-4421", action: "FERTILIZE", details: "30kg Composted Husk mix and natural mulch / Section D slopes", verified: true },
      { id: "LOG-003", timestamp: "2023-11-14 16:30", operatorId: "SYS-AUTO", action: "IRRIGATION", details: "Automated root watering cycle Beta-2 (1.5 hours) completed for Zone A", verified: true },
      { id: "LOG-002", timestamp: "2023-11-13 08:30", operatorId: "OPR-4421", action: "MINT", details: "Standard anchor block #BD-4091-23 created for initial sapling growth logs", verified: true },
    ];
    setEventLogs(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      return [...prev, ...historicalLogs.filter(h => !existingIds.has(h.id))];
    });
  };

  const baseCircumference = 2 * Math.PI * 58;
  const moistureRatio = Math.min(100, Math.max(0, telemetry.soilMoisture)) / 100;
  const strokeDashoffsetValue = baseCircumference - (moistureRatio * baseCircumference);

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-[#1b4332]/5 border border-[#86af99]/20 p-4 rounded-xl flex flex-wrap justify-between items-center gap-4">
        <p className="text-xs text-[#012d1d] font-semibold flex items-center gap-2">
          <Sparkles size={16} className="text-[#2D6A4F]" />
          <span>Simulation Mode: Update IoT telemetry live to observe response.</span>
        </p>
        <button onClick={simulateLiveMetrics} className="bg-[#2D6A4F] hover:bg-[#012d1d] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
          <RefreshCw size={12} />
          <span>Simulate Sensor Fluctuation</span>
        </button>
      </div>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Soil Moisture Gauge */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[10px] tracking-wider uppercase font-bold text-[#414844]">Soil Moisture</h3>
              <p className="font-mono text-xs font-semibold text-[#2D6A4F] mt-0.5">Teros 12 Probe (Node-A1)</p>
            </div>
            <span className="text-[#2D6A4F] bg-[#2D6A4F]/10 p-2 rounded-lg"><Droplet size={18} /></span>
          </div>
          <div className="py-6 flex flex-col items-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle className="text-[#eeeeeb]" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8" />
                <circle className="text-[#2D6A4F] transition-all duration-700 ease-out" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8" strokeDasharray={baseCircumference} strokeDashoffset={strokeDashoffsetValue} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-bold text-[#012d1d]">{telemetry.soilMoisture}</span>
                <span className="text-[9px] tracking-wider uppercase font-semibold text-[#717973] mt-0.5">% VWC</span>
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center text-[10px] text-[#717973] uppercase mb-2">
              <span>Historical Trend (Past 24h)</span>
              <span className="text-[#008000] font-bold">Stable</span>
            </div>
            <div className="h-10 w-full flex items-end gap-1">
              {[40, 50, 35, 70, 55, 75, 60, 78].map((h, i) => (
                <div key={i} className="w-full bg-[#2D6A4F] rounded-t-sm transition-all" style={{ height: `${h}%`, opacity: 0.2 + i * 0.1 }} />
              ))}
            </div>
          </div>
        </div>

        {/* Atmospheric Chart */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[10px] tracking-wider uppercase font-bold text-[#414844]">Atmospheric Telemetry</h3>
              <p className="text-2xl font-serif font-bold text-[#012d1d] flex items-baseline gap-2 mt-1">
                <span>{telemetry.temperature}°C</span>
                <span className="text-xs font-sans font-normal text-[#717973]">{telemetry.humidity}% Humidity</span>
              </p>
            </div>
            <div className="flex gap-1 border border-[#eeeeeb] p-1 rounded-lg bg-white shadow-sm">
              {(['1H', '24H'] as const).map(r => (
                <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${timeRange === r ? 'bg-[#2D6A4F] text-white' : 'text-[#414844] hover:bg-[#eeeeeb]'}`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="h-44 w-full relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2D6A4F" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${selectedChartPoints} L800,180 L0,180 Z`} fill="url(#chart-grad)" className="transition-all duration-500" />
              <path d={selectedChartPoints} fill="none" stroke="#2D6A4F" strokeWidth="3" className="transition-all duration-500" />
              <circle cx="400" cy="100" fill="#2D6A4F" r="5" className="animate-pulse" />
              <text fill="#2D6A4F" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" x="412" y="94">Current: {telemetry.temperature}°C</text>
            </svg>
            <div className="flex justify-between mt-4 text-[10px] text-[#717973] font-mono border-t border-[#A67B5B]/15 pt-2">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
            </div>
          </div>
        </div>

        {/* Plant Photo (Time-lapse View) */}
        <div className="lg:col-span-12 glass-panel rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-sm">
          <div className="md:col-span-6 h-64 md:h-full min-h-[240px] relative group overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Live Camera view of the coffee crop block"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFEvftIA--CWeRJdk23lvcigQJe7QCc4u-hNg6dt4h0GLFKt4QUCiv8ZGsC8fF7rlfWaS98MhBH9DVaRrHBV8JPqD0XGdbdeuYIRvWPbQCzNVqLauVNFudodG1jwKFHPuhzHEc7bSuTVVxpp9X9Iwj9_iwDBnIT5L-xXxr2Uh5sInEXsro5PIwYEuqxLZnSHbqLBrIzM4ktd4U2jbc-80ltJ9mHCHWeBdYqiGoPoRHW9kduA0ZUXEtHnbu_q0QPd_uHrVCCQHi024"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="bg-white/30 backdrop-blur-md p-4 rounded-full text-white hover:scale-110 active:scale-95 transition-all outline-none cursor-pointer"
              >
                <Play size={28} fill="currentColor" />
              </button>
            </div>
            <div className="absolute bottom-4 left-4 bg-[#012d1d]/85 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-[#a5d0b9]/20 text-white text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              Live Camera 04: Zone B
            </div>
          </div>

          <div className="md:col-span-6 p-8 flex flex-col justify-center space-y-5">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#012d1d] mb-2">Phenology Monitor</h3>
              <p className="text-sm text-[#414844]/90 leading-relaxed">
                Automated daily camera captures analyze foliar surface health, disease indexes, and pest detection metrics in real time. Last verified by agricultural nodes: <span className="font-semibold text-[#2D6A4F]">14 mins ago</span>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#f3f4f1] rounded-lg border border-[#A67B5B]/10">
                <span className="text-[10px] tracking-wider uppercase font-bold text-[#717973] block mb-1">Phenological Stage</span>
                <span className="text-sm font-bold text-[#2D6A4F]">Flowering Season</span>
              </div>
              <div className="p-4 bg-[#f3f4f1] rounded-lg border border-[#A67B5B]/10">
                <span className="text-[10px] tracking-wider uppercase font-bold text-[#717973] block mb-1">Foliar Health Index</span>
                <span className="text-sm font-bold text-[#008000]">98.2 (Optimal)</span>
              </div>
            </div>
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-[#A67B5B]/20 py-3 rounded-lg text-xs font-bold text-[#414844] hover:bg-[#e8e8e5] transition-all cursor-pointer outline-none"
            >
              <History size={16} />
              <span>Explore Time-lapse History Logs</span>
            </button>
          </div>
        </div>
      </section>

      {/* Action Section: Fertilizer + Logs */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Fertilizer Form */}
        <div className="xl:col-span-1">
          <div className="bg-[#012d1d] text-white p-8 rounded-xl shadow-lg border-l-8 border-[#A67B5B] relative overflow-hidden">
            <h3 className="font-serif text-xl font-bold mb-6 flex items-center gap-2 text-[#a5d0b9]">
              <span className="text-[#A67B5B]"><Droplet size={22} /></span>
              Fertilizer &apos;4 Rights&apos;
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-5 relative z-10">
              <div>
                <label className="text-[10px] tracking-widest uppercase font-bold text-[#86af99] mb-2 block">Fertilizer Type *</label>
                <select value={fertilizerType} onChange={e => setFertilizerType(e.target.value)} className="w-full bg-[#1b4332] border border-[#86af99]/20 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none">
                  <option>Bio-organic NPK (5-5-5)</option>
                  <option>Composted Husk Mix</option>
                  <option>Foliar Supplement B</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-widest uppercase font-bold text-[#86af99] mb-2 block">Amount (kg) *</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-[#1b4332] border border-[#86af99]/20 rounded-lg py-2.5 px-3 text-sm font-mono text-white focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] tracking-widest uppercase font-bold text-[#86af99] mb-2 block">Target Zone *</label>
                  <select value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-[#1b4332] border border-[#86af99]/20 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none">
                    <option>Block A-1</option><option>Block A-2</option><option>Block B-East</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase font-bold text-[#86af99] mb-2 block">Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Broadcast', 'Drip Feed'].map(m => (
                    <button key={m} type="button" onClick={() => setMethod(m)} className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${method === m ? 'bg-[#1b4332] border-[#A67B5B] text-white' : 'bg-transparent border-[#86af99]/20 text-[#86af99]'}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-[#86af99]">
                    <MapPin size={14} className="text-[#008000]" />
                    <span className="font-mono text-[11px]">GPS: 11.94, 108.44</span>
                  </div>
                  <span className="text-[9px] bg-[#008000] px-2 py-0.5 rounded text-white font-bold tracking-wider">LOCKED</span>
                </div>
                <div
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-[#A67B5B] bg-white/10' : 'border-white/20 hover:bg-white/5'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                  <QrCode size={24} className="mx-auto mb-2 text-[#86af99]" />
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-white">{uploadedFile ? `Attached: ${uploadedFile}` : 'Upload NFC/QR Tag Photo'}</p>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#A67B5B] text-white py-3.5 rounded-lg font-bold shadow-lg hover:bg-[#79573f] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
                {isSubmitting ? <><RefreshCw size={16} className="animate-spin" /><span>Anchoring Block Proof...</span></> : <><Upload size={16} /><span>Submit to On-Chain Ledger</span></>}
              </button>
            </form>
            {/* Background Texture overlay pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <svg className="w-full h-full text-white fill-current" viewBox="0 0 100 100">
                <pattern id="leaf-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M10,0 C15,5 20,10 20,15 C20,20 15,20 10,20 C5,20 0,20 0,15 C0,10 5,5 10,0 Z" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#leaf-pattern)" />
              </svg>
            </div>
          </div>
          {txHash && (
            <div className="mt-4 p-4 rounded-xl border border-[#008000]/20 bg-[#008000]/5 text-[#008000] text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold"><CheckCircle size={16} /><span>Cardano Ledger anchored</span></div>
              <p className="font-mono text-[10px] select-all break-all text-[#012d1d]/85">Tx: {txHash}</p>
            </div>
          )}
        </div>

        {/* Event History Table */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-[#A67B5B]/15 shadow-sm flex flex-col min-h-[460px] justify-between overflow-hidden">
          <div>
            <div className="p-6 border-b border-[#A67B5B]/10 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#012d1d]">On-Chain Event Logs</h3>
                <p className="text-[10px] text-[#717973] uppercase tracking-wider font-semibold">Secured by decentralized ledger</p>
              </div>
              <button onClick={handleExportCSV} className="text-[#2D6A4F] font-bold text-[10px] tracking-wider uppercase border border-[#2D6A4F]/20 hover:bg-[#2D6A4F]/5 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all">
                <Download size={12} /><span>Export CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto scrolling-data max-h-[380px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] tracking-widest uppercase text-[#717973] font-bold sticky top-0 bg-white border-b border-[#eeeeeb]">
                  <tr><th className="p-4">Timestamp</th><th className="p-4">Operator</th><th className="p-4">Action</th><th className="p-4">Details</th><th className="p-4 text-center">Proof</th></tr>
                </thead>
                <tbody className="divide-y divide-[#A67B5B]/10 text-xs">
                  {eventLogs.map(log => {
                    let badge = 'bg-[#2D6A4F]/10 text-[#2D6A4F]';
                    if (log.action === 'SENSOR ALERT') badge = 'bg-[#FFB703]/10 text-[#FFB703] border border-[#FFB703]/20';
                    else if (log.action === 'IRRIGATION') badge = 'bg-blue-100 text-blue-700';
                    else if (log.action === 'PRUNING') badge = 'bg-stone-100 text-[#717973]';
                    else if (log.action === 'MINT') badge = 'bg-purple-100 text-purple-700';
                    return (
                      <tr key={log.id} className="hover:bg-[#f9faf6] transition-colors">
                        <td className="p-4 font-mono text-[11px] text-[#414844] whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-4 font-semibold text-[#1a1c1a]">{log.operatorId}</td>
                        <td className="p-4"><span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badge}`}>{log.action}</span></td>
                        <td className="p-4 text-[#414844] leading-relaxed max-w-xs truncate" title={log.details}>{log.details}</td>
                        <td className="p-4 text-center">{log.verified && <ShieldCheck size={18} className="mx-auto text-[#A67B5B] hover:text-[#2D6A4F] transition-all cursor-pointer" />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 bg-[#f3f4f1]/50 border-t border-[#A67B5B]/10 text-center">
            <button
              onClick={handleLoadOlderEntries}
              className="text-[10px] tracking-wider uppercase font-bold text-[#717973] hover:text-[#012d1d] transition-all outline-none cursor-pointer"
            >
              Load Older Entries...
            </button>
          </div>
        </div>
      </section>

      {/* Phenology History Overlay Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#A67B5B]/20 max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#eeeeeb]">
              <div>
                <h4 className="font-serif text-lg font-bold text-[#012d1d]">Cam 04: High-Res Crop Growth Stages</h4>
                <p className="text-xs text-[#717973]">Historic sequence analysis (Bao Loc Highlands, 2023)</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-[#717973] hover:text-[#1a1c1a] border border-[#eeeeeb] p-1.5 rounded-lg transition-all cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { date: "Oct 24, 2023", stage: "Flowering Stage", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFEvftIA--CWeRJdk23lvcigQJe7QCc4u-hNg6dt4h0GLFKt4QUCiv8ZGsC8fF7rlfWaS98MhBH9DVaRrHBV8JPqD0XGdbdeuYIRvWPbQCzNVqLauVNFudodG1jwKFHPuhzHEc7bSuTVVxpp9X9Iwj9_iwDBnIT5L-xXxr2Uh5sInEXsro5PIwYEuqxLZnSHbqLBrIzM4ktd4U2jbc-80ltJ9mHCHWeBdYqiGoPoRHW9kduA0ZUXEtHnbu_q0QPd_uHrVCCQHi024" },
                { date: "Sep 15, 2023", stage: "Green Cherry Formation", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyBijJF0D_PyCnb8M-2duh-0pQ4HuvSKCQqSG9dH4iL-MtrpSYyUCyK60ziuwusO6uYJO_jShSYZH-i0lbLY1jRGkE_TkyLjZk_rN7zsKprvNOIANfqrRHgskvH7WK8auv_DgrF6sDjD3pFStbwwrX8rDFSDExKRGenmHo5E0rTIomrb6eINSlXBPtkmtJ8ldvnZKyNMmdiVwAvbTOF8lXBdNieKBUO7d4m1-dzGrjU0JRceTHnpO6Dy2wTidy5ov8144kZ37m_bo" },
                { date: "Aug 02, 2023", stage: "Under-shade vegetative grow", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBtZn5xBl4qAXR124V6kLhexRTS00TmqwwlXCrbv1zA17dIIS8ytZM8vQ1Jg3PbuktfbLRZIkI-3p0DaCphC9loljKLMYePLUhJDRLcXawnIwDEQ6XuLv1h5UiyCr3T7c6zFCmOiE-CDVkmeOk-Q1jaVV37zMxWDyG0SIHQXrKwsX5Stk6TxmcoT-eRdYNFKtp3h1SDzeurs8UL2MVywqKo8TO6v1Y1IjBxHLXapVWIZKqPuqXdBN8M476iprR3gjiMIxUCQ-_ZtWQ" }
              ].map((item, idx) => (
                <div key={idx} className="border border-[#A67B5B]/15 rounded-lg overflow-hidden relative group">
                  <div className="h-32 bg-[#eeeeeb] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={item.stage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" src={item.img} />
                  </div>
                  <div className="p-2.5 bg-[#f9faf6]">
                    <p className="text-[10px] font-semibold text-[#2D6A4F]">{item.date}</p>
                    <p className="text-xs font-bold truncate text-[#012d1d]">{item.stage}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right pt-2">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="bg-[#2D6A4F] text-white py-2 px-6 rounded-lg text-xs font-bold hover:bg-[#012d1d] outline-none cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
