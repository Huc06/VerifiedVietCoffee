"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Leaf, 
  Droplet, 
  Wind, 
  Thermometer, 
  Camera, 
  MapPin, 
  Award,
  Link as LinkIcon,
  TreePine,
  Activity,
  Bird
} from "lucide-react";
import { mockLotData } from "@/app/lib/mockData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const CARDANOSCAN = "https://preview.cardanoscan.io";

type Passport = {
  farm_id: string;
  lot_id: string;
  variety: string;
  processing: string;
  harvest_timestamp: number;
  daily_events_merkle_root: string;
  photos_hash: string;
  gps_polygon_hash: string;
  sca_score: number;
  lab_cert_hash: string;
  sustainability: {
    forest_baseline_hash: string;
    eudr_dds_hash: string;
    deforestation_risk_score: number;
    fertilizer_log_hash: string;
    organic_input_ratio_pct: number;
    synthetic_n_kg_per_ha: number;
    co2e_per_kg_int10: number;
    co2_calc_method: string;
    water_l_per_kg: number;
    wastewater_treated: number | boolean;
    som_pct_int10: number;
    soil_test_lab_hash: string;
    shade_canopy_pct: number;
    bird_species_count: number;
    biodiversity_audit_hash: string;
    certifications: string[];
  };
  metadata_version: number;
  owner: string;
};

type DayEntry = {
  date: string;
  event_count: number;
  merkle_root_offchain: string;
  merkle_root_onchain: string;
  tx_hash: string | null;
  status: string;
  verified: boolean;
  current_root_match: boolean;
  events: Array<Record<string, any>>;
};

type LotResponse = {
  lot_id: string;
  script_address: string;
  ref_utxo: { tx_hash: string; output_index: number };
  passport: Passport;
  days: DayEntry[];
};

type TabKey = "timeline" | "passport" | "sustainability";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "timeline", label: "Timeline", icon: <Activity className="w-4 h-4" /> },
  { key: "passport", label: "Passport", icon: <Award className="w-4 h-4" /> },
  { key: "sustainability", label: "Sustainability", icon: <Leaf className="w-4 h-4" /> },
];

function shortHash(h: string, n = 8): string {
  if (!h) return "—";
  return h.length > n * 2 + 3 ? `${h.slice(0, n)}…${h.slice(-n)}` : h;
}

function formatDate(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default function LotPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = use(params);
  const searchParams = useSearchParams();
  const isMock = searchParams.get("mock") === "true";
  
  const [data, setData] = useState<LotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("timeline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let attempts = 0;
    setLoading(true);
    setError(null);

    if (isMock) {
      setTimeout(() => {
        if (alive) {
          setData(mockLotData as unknown as LotResponse);
          setLoading(false);
        }
      }, 800);
      return;
    }

    // Fetch the real on-chain passport. A freshly minted lot can take ~1 minute
    // to be indexed, so we retry on 404 before surfacing an error. We never fall
    // back to demo data here — that would misrepresent a real lot as another farm.
    const load = async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/verify/lot/${encodeURIComponent(lotId)}`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (r.status === 404) {
          if (attempts < 5 && alive) {
            attempts += 1;
            setTimeout(load, 6000);
            return;
          }
          throw new Error(
            "This passport isn't on-chain yet. If you just minted it, the network needs ~1 minute to index — wait a moment and retry.",
          );
        }
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? r.statusText);
        }
        const json: LotResponse = await r.json();
        if (alive) {
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (alive) {
          const msg = e?.message ?? String(e);
          setError(
            /fetch|network|load failed/i.test(msg)
              ? "Couldn't reach the verification service. Make sure the backend is running (localhost:4000), then retry."
              : msg,
          );
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      alive = false;
    };
  }, [lotId, isMock]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center text-sm">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Leaf className="w-8 h-8 text-amber-500" />
        </motion.div>
        <span className="ml-3 font-medium tracking-widest uppercase text-stone-400">Verifying...</span>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-3 p-8">
        <Clock className="w-12 h-12 text-amber-500 mb-2" />
        <h1 className="text-2xl font-bold">Passport not available yet</h1>
        <p className="text-sm text-stone-400 break-all max-w-lg text-center">
          {error ?? "Unknown error"}
        </p>
        <p className="text-xs text-stone-500 font-mono mt-4">Lot ID: {lotId}</p>
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-500/90 hover:bg-amber-500 text-stone-900 font-semibold rounded-full text-sm transition"
          >
            Retry
          </button>
          <a href={`?mock=true`} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm transition backdrop-blur-md">
            View Demo Data
          </a>
        </div>
      </main>
    );
  }

  const { passport, days, ref_utxo } = data;
  const anyVerified = days.some((d) => d.verified);
  const allVerified = days.length > 0 && days.every((d) => d.verified);

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 relative selection:bg-amber-200">
      {/* Background Hero — on-brand gradient (no external image dependency) */}
      <div className="absolute top-0 left-0 w-full h-[40vh] z-0 overflow-hidden bg-gradient-to-br from-[#012d1d] via-[#2D6A4F] to-[#A67B5B]">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-stone-50" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-12 sm:py-20 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-3xl space-y-6"
        >
          {/* Header Card (Glassmorphism) */}
          <header className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white shadow-2xl p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Leaf className="w-32 h-32 text-amber-900" />
            </div>
            
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-amber-700 font-bold mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              VerifiedVietCoffee Passport
            </p>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 text-stone-900 tracking-tight capitalize">
              {passport.farm_id.replace(/_/g, " ")}
            </h1>
            
            <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Lot ID</span>
                <span className="font-mono font-medium text-stone-800 bg-stone-200/50 px-2 py-0.5 rounded mt-1">
                  {passport.lot_id}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Variety</span>
                <span className="font-medium text-stone-800 mt-1">{passport.variety}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Processing</span>
                <span className="font-medium text-stone-800 mt-1">{passport.processing}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Harvest Date</span>
                <span className="font-medium text-stone-800 mt-1">{formatDate(passport.harvest_timestamp)}</span>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-stone-200/50">
              <VerifiedBadge allVerified={allVerified} anyVerified={anyVerified} dayCount={days.length} />
              <a
                href={`${CARDANOSCAN}/transaction/${ref_utxo.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                View Mint Tx
              </a>
            </div>
          </header>

          {/* Interactive Tabs Section */}
          <div className="rounded-3xl bg-white shadow-xl border border-stone-100 overflow-hidden">
            <div className="flex border-b border-stone-100 bg-stone-50/50 p-2 gap-2">
              {TABS.map((t) => {
                const isActive = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-2xl transition-all relative ${
                      isActive ? "text-amber-900" : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab" 
                        className="absolute inset-0 bg-white shadow-sm border border-stone-200 rounded-2xl" 
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {t.icon}
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === "timeline" && <TimelineTab days={days} currentRoot={passport.daily_events_merkle_root} />}
                  {tab === "passport" && <PassportTab passport={passport} />}
                  {tab === "sustainability" && <SustainabilityTab s={passport.sustainability} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <footer className="text-center flex items-center justify-center gap-2 text-xs text-stone-400 pt-4 pb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Anchored on Cardano via Mesh SDK & CIP-68
          </footer>
        </motion.div>
      </div>
    </main>
  );
}

function VerifiedBadge({
  allVerified,
  anyVerified,
  dayCount,
}: {
  allVerified: boolean;
  anyVerified: boolean;
  dayCount: number;
}) {
  const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wide";
  if (dayCount === 0) {
    return (
      <span className={`${base} bg-stone-100 text-stone-500 border border-stone-200`}>
        <Clock className="w-4 h-4" /> Awaiting harvest data
      </span>
    );
  }
  if (allVerified) {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm`}>
        <CheckCircle className="w-4 h-4" /> Fully Verified on Cardano
      </span>
    );
  }
  if (anyVerified) {
    return (
      <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200 shadow-sm`}>
        <AlertTriangle className="w-4 h-4" /> Partially verified
      </span>
    );
  }
  return (
    <span className={`${base} bg-red-50 text-red-700 border border-red-200`}>
      <AlertTriangle className="w-4 h-4" /> Not yet anchored
    </span>
  );
}

function TimelineTab({ days, currentRoot }: { days: DayEntry[]; currentRoot: string }) {
  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500 font-medium">No daily anchors recorded yet.</p>
        <p className="text-sm text-stone-400 mt-2">Sensor readings and Merkle roots will appear here automatically.</p>
      </div>
    );
  }
  return (
    <div className="space-y-8 relative">
      <div className="absolute top-0 bottom-0 left-[27px] w-px bg-stone-200 z-0" />
      
      {currentRoot && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-100 relative z-10">
          <p className="text-amber-800 uppercase tracking-wider text-[10px] font-bold mb-1 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" /> Latest On-Chain Root
          </p>
          <p className="font-mono break-all text-xs text-amber-900 bg-amber-100/50 p-2 rounded-lg mt-2">
            {currentRoot}
          </p>
        </div>
      )}
      
      <div className="space-y-6">
        {days
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((d, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={d.date}
              className="relative z-10 flex gap-4 sm:gap-6"
            >
              <div className="w-14 flex-shrink-0 flex flex-col items-center pt-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white ${d.current_root_match ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-stone-300'}`} />
                <p className="text-xs font-bold text-stone-400 mt-2 rotate-180" style={{ writingMode: 'vertical-rl' }}>
                  {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              
              <div className="flex-1 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-stone-800 text-base">{d.date}</h3>
                    <p className="text-xs text-stone-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <Activity className="w-3.5 h-3.5" /> {d.event_count} IoT sensor readings
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.current_root_match ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        Current Hash
                      </span>
                    ) : d.verified ? (
                      <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                        Anchored
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                        Pending
                      </span>
                    )}
                    {d.tx_hash && (
                      <a
                        className="text-stone-400 hover:text-blue-600 transition p-1"
                        href={`${CARDANOSCAN}/transaction/${d.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View Transaction"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-stone-50 rounded-xl p-3 mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Merkle Root</p>
                  <p className="font-mono text-xs text-stone-600 break-all">{d.merkle_root_offchain}</p>
                </div>

                <DayMetrics events={d.events} />
                <DayPhotos events={d.events} />
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}

type Ev = Record<string, any>;

function avg(events: Ev[], type: string, key: string): number | null {
  const vals = events
    .filter((e) => (e.data?.event_type ?? e.event_type) === type)
    .map((e) => Number((e.data ?? e)[key]))
    .filter((n) => !Number.isNaN(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function DayMetrics({ events }: { events: Ev[] }) {
  const chips: { label: string; value: string; icon: React.ReactNode }[] = [];
  const soilMoist = avg(events, "soil", "soil_moisture_pct");
  const soilTemp = avg(events, "soil", "soil_temp_c");
  const airTemp = avg(events, "weather", "air_temp_c");
  const humidity = avg(events, "weather", "humidity_pct");
  const rain = avg(events, "weather", "rain_mm");
  
  if (soilMoist !== null) chips.push({ label: "Soil", value: `${soilMoist.toFixed(0)}%`, icon: <Droplet className="w-3 h-3 text-blue-500" /> });
  if (soilTemp !== null) chips.push({ label: "Soil", value: `${soilTemp.toFixed(1)}°C`, icon: <Thermometer className="w-3 h-3 text-amber-600" /> });
  if (airTemp !== null) chips.push({ label: "Air", value: `${airTemp.toFixed(1)}°C`, icon: <Thermometer className="w-3 h-3 text-rose-500" /> });
  if (humidity !== null) chips.push({ label: "Humidity", value: `${humidity.toFixed(0)}%`, icon: <Wind className="w-3 h-3 text-teal-500" /> });
  if (rain !== null) chips.push({ label: "Rain", value: `${rain.toFixed(1)}mm`, icon: <Droplet className="w-3 h-3 text-indigo-500" /> });
  
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {chips.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-medium shadow-sm">
          {c.icon} {c.label}: {c.value}
        </span>
      ))}
    </div>
  );
}

function DayPhotos({ events }: { events: Ev[] }) {
  const photos = events
    .map((e) => (e.data ?? e) as Ev)
    .filter((d) => d.event_type === "photo" && d.photo_url)
    .slice(0, 4);
  if (!photos.length) return null;
  return (
    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
      {photos.map((p, i) => (
        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 group">
          <img
            src={p.photo_url as string}
            alt={`farm snapshot ${i}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PassportTab({ passport }: { passport: Passport }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Farm" value={passport.farm_id.replace(/_/g, " ")} icon={<MapPin className="text-amber-600" />} />
        <MetricCard label="Lot ID" value={passport.lot_id} icon={<Activity className="text-emerald-600" />} />
        <MetricCard label="Variety" value={passport.variety} icon={<Leaf className="text-green-600" />} />
        <MetricCard label="Processing" value={passport.processing} icon={<Droplet className="text-blue-500" />} />
        <MetricCard label="Harvest Date" value={formatDate(passport.harvest_timestamp)} icon={<Clock className="text-purple-500" />} />
        <MetricCard label="SCA Score" value={passport.sca_score ? `${passport.sca_score} pts` : "—"} icon={<Award className="text-yellow-500" />} />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest border-b border-stone-200 pb-2">On-Chain Hashes</h3>
        <HashRow label="Lab Cert Hash" hash={passport.lab_cert_hash} />
        <HashRow label="Photos Hash" hash={passport.photos_hash} />
        <HashRow label="GPS Polygon Hash" hash={passport.gps_polygon_hash} />
        <HashRow label="Merkle Root" hash={passport.daily_events_merkle_root} />
        <HashRow label="Owner PubKey Hash" hash={passport.owner} />
      </div>
    </div>
  );
}

function SustainabilityTab({ s }: { s: Passport["sustainability"] }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard 
          label="Carbon Footprint" 
          value={s.co2e_per_kg_int10 ? `${(s.co2e_per_kg_int10 / 10).toFixed(2)} kg CO₂e` : "—"} 
          subValue={s.co2_calc_method}
          icon={<Wind className="text-gray-500" />} 
        />
        <MetricCard 
          label="Water Usage" 
          value={s.water_l_per_kg ? `${s.water_l_per_kg} L/kg` : "—"} 
          subValue={s.wastewater_treated ? "Wastewater treated" : "Not treated"}
          icon={<Droplet className="text-blue-500" />} 
        />
        <MetricCard 
          label="Organic Input" 
          value={s.organic_input_ratio_pct ? `${s.organic_input_ratio_pct}%` : "—"} 
          icon={<Leaf className="text-emerald-500" />} 
        />
        <MetricCard 
          label="Soil Health (SOM)" 
          value={s.som_pct_int10 ? `${(s.som_pct_int10 / 10).toFixed(1)}%` : "—"} 
          icon={<Activity className="text-amber-700" />} 
        />
        <MetricCard 
          label="Shade Canopy" 
          value={s.shade_canopy_pct ? `${s.shade_canopy_pct}%` : "—"} 
          icon={<TreePine className="text-green-700" />} 
        />
        <MetricCard 
          label="Biodiversity" 
          value={s.bird_species_count ? `${s.bird_species_count} species` : "—"} 
          icon={<Bird className="text-orange-500" />} 
        />
      </div>

      {s.certifications && s.certifications.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Award className="w-4 h-4" /> Certifications
          </h3>
          <div className="flex flex-wrap gap-2">
            {s.certifications.map(c => (
              <span key={c} className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full shadow-sm">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest border-b border-stone-200 pb-2">Compliance & Proofs</h3>
        <HashRow label="EUDR DDS Hash" hash={s.eudr_dds_hash} />
        <HashRow label="Forest Baseline Hash" hash={s.forest_baseline_hash} />
        <HashRow label="Fertilizer Log Hash" hash={s.fertilizer_log_hash} />
        <HashRow label="Soil Test Lab Hash" hash={s.soil_test_lab_hash} />
        <HashRow label="Biodiversity Audit Hash" hash={s.biodiversity_audit_hash} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, subValue, icon }: { label: string; value: string; subValue?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition group">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-stone-50 rounded-xl group-hover:bg-stone-100 transition">
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">{label}</p>
      </div>
      <p className="text-xl font-black text-stone-800">{value}</p>
      {subValue && <p className="text-[10px] text-stone-400 font-medium mt-1 uppercase tracking-wider">{subValue}</p>}
    </div>
  );
}

function HashRow({ label, hash }: { label: string; hash: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-stone-100 last:border-0 gap-2">
      <span className="text-xs font-bold text-stone-500 w-1/3">{label}</span>
      <span className="font-mono text-xs text-stone-600 bg-stone-50 px-2 py-1 rounded truncate flex-1" title={hash}>
        {hash || "—"}
      </span>
    </div>
  );
}

