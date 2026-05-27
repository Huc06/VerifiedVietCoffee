"use client";

import { use, useEffect, useState } from "react";

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
    wastewater_treated: number;
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
  events: Array<Record<string, unknown>>;
};

type LotResponse = {
  lot_id: string;
  script_address: string;
  ref_utxo: { tx_hash: string; output_index: number };
  passport: Passport;
  days: DayEntry[];
};

type TabKey = "timeline" | "passport" | "sustainability";

const TABS: { key: TabKey; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "passport", label: "Passport" },
  { key: "sustainability", label: "Sustainability" },
];

function shortHash(h: string, n = 8): string {
  if (!h) return "—";
  return h.length > n * 2 + 3 ? `${h.slice(0, n)}…${h.slice(-n)}` : h;
}

function formatDate(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export default function LotPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = use(params);
  const [data, setData] = useState<LotResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("timeline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${BACKEND_URL}/verify/lot/${encodeURIComponent(lotId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? r.statusText);
        return r.json();
      })
      .then((json: LotResponse) => {
        if (alive) setData(json);
      })
      .catch((e) => alive && setError(e.message ?? String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [lotId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-100 text-stone-900 flex items-center justify-center text-sm">
        Verifying lot {lotId}…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center justify-center gap-3 p-8">
        <h1 className="text-2xl font-bold">Lot not found</h1>
        <p className="text-sm text-red-600 break-all max-w-lg text-center">
          {error ?? "Unknown error"}
        </p>
        <p className="text-xs text-stone-500">Lot ID: {lotId}</p>
      </main>
    );
  }

  const { passport, days, ref_utxo } = data;
  const anyVerified = days.some((d) => d.verified);
  const allVerified = days.length > 0 && days.every((d) => d.verified);

  return (
    <main className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl space-y-4">
        {/* Header card */}
        <header className="rounded-2xl bg-gradient-to-br from-amber-50 to-stone-50 border border-stone-200 p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700/80 font-semibold">
            VerifiedVietCoffee · Coffee Passport
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 capitalize">
            {passport.farm_id.replace(/_/g, " ")}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Lot{" "}
            <span className="font-mono font-medium text-stone-800">
              {passport.lot_id}
            </span>{" "}
            · {passport.variety} · {passport.processing}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Harvested {formatDate(passport.harvest_timestamp)}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
            <VerifiedBadge
              allVerified={allVerified}
              anyVerified={anyVerified}
              dayCount={days.length}
            />
            <a
              href={`${CARDANOSCAN}/transaction/${ref_utxo.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              view mint tx ↗
            </a>
          </div>
        </header>

        {/* Tabs */}
        <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-stone-200 bg-stone-50 text-sm">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 px-4 py-3 font-medium border-b-2 transition ${
                  tab === t.key
                    ? "border-amber-600 text-amber-700 bg-white"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {tab === "timeline" && (
              <TimelineTab
                days={days}
                currentRoot={passport.daily_events_merkle_root}
              />
            )}
            {tab === "passport" && <PassportTab passport={passport} />}
            {tab === "sustainability" && (
              <SustainabilityTab s={passport.sustainability} />
            )}
          </div>
        </div>

        <footer className="text-center text-[11px] text-stone-400 pt-2 pb-4">
          Anchored on Cardano · Mesh SDK · CIP-68
        </footer>
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
  const base = "px-2.5 py-1 rounded-full font-semibold text-[11px]";
  if (dayCount === 0) {
    return (
      <span className={`${base} bg-stone-200 text-stone-600`}>
        awaiting harvest data
      </span>
    );
  }
  if (allVerified) {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        ✓ Verified on Cardano
      </span>
    );
  }
  if (anyVerified) {
    return (
      <span className={`${base} bg-amber-100 text-amber-800`}>
        ⚠ Partially verified
      </span>
    );
  }
  return (
    <span className={`${base} bg-red-50 text-red-700`}>⨯ Not yet anchored</span>
  );
}

function TimelineTab({
  days,
  currentRoot,
}: {
  days: DayEntry[];
  currentRoot: string;
}) {
  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-stone-500">
          No daily anchors recorded for this lot yet.
        </p>
        <p className="text-xs text-stone-400 mt-2">
          Once the farm runs <code className="font-mono">mock-week</code> or
          deploys sensors, sensor readings + Merkle roots will appear here.
        </p>
      </div>
    );
  }
  return (
    <>
      {currentRoot && (
        <div className="mb-4 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
          <p className="text-stone-500 uppercase tracking-wider text-[10px] font-semibold">
            Current on-chain root
          </p>
          <p className="font-mono break-all mt-1 text-stone-700">
            {currentRoot}
          </p>
        </div>
      )}
      <ol className="space-y-2">
        {days
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((d) => (
            <li
              key={d.date}
              className="border border-stone-200 rounded-lg p-3 hover:bg-stone-50 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{d.date}</p>
                  <p className="text-xs text-stone-500">
                    {d.event_count} sensor reading
                    {d.event_count === 1 ? "" : "s"}
                  </p>
                  <p className="text-[10px] font-mono text-stone-400 mt-1">
                    root {shortHash(d.merkle_root_offchain)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {d.current_root_match ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                      ✓ current
                    </span>
                  ) : d.verified ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      anchored
                    </span>
                  ) : d.tx_hash ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      ⚠ tampered?
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                      pending
                    </span>
                  )}
                  {d.tx_hash && (
                    <a
                      className="text-blue-600 hover:underline"
                      href={`${CARDANOSCAN}/transaction/${d.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      tx ↗
                    </a>
                  )}
                </div>
              </div>

              <DayMetrics events={d.events} />
              <DayPhotos events={d.events} />
            </li>
          ))}
      </ol>
    </>
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
  const chips: { label: string; value: string }[] = [];
  const soilMoist = avg(events, "soil", "soil_moisture_pct");
  const soilTemp = avg(events, "soil", "soil_temp_c");
  const airTemp = avg(events, "weather", "air_temp_c");
  const humidity = avg(events, "weather", "humidity_pct");
  const rain = avg(events, "weather", "rain_mm");
  if (soilMoist !== null)
    chips.push({ label: "soil moisture", value: `${soilMoist.toFixed(0)}%` });
  if (soilTemp !== null)
    chips.push({ label: "soil temp", value: `${soilTemp.toFixed(1)}°C` });
  if (airTemp !== null)
    chips.push({ label: "air temp", value: `${airTemp.toFixed(1)}°C` });
  if (humidity !== null)
    chips.push({ label: "humidity", value: `${humidity.toFixed(0)}%` });
  if (rain !== null)
    chips.push({ label: "rain", value: `${rain.toFixed(1)}mm` });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {chips.map((c) => (
        <span
          key={c.label}
          className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600"
        >
          <span className="text-stone-400">{c.label}</span>{" "}
          <span className="font-semibold">{c.value}</span>
        </span>
      ))}
    </div>
  );
}

function DayPhotos({ events }: { events: Ev[] }) {
  const photos = events
    .map((e) => (e.data ?? e) as Ev)
    .filter((d) => d.event_type === "photo" && d.photo_url)
    .slice(0, 6);
  if (!photos.length) return null;
  return (
    <div className="flex gap-1.5 mt-2.5 overflow-x-auto">
      {photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={p.photo_url as string}
          alt={`canopy ${i}`}
          className="h-14 w-14 rounded object-cover border border-stone-200 flex-shrink-0"
          loading="lazy"
        />
      ))}
    </div>
  );
}

function PassportTab({ passport }: { passport: Passport }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <Field label="Farm" value={passport.farm_id} />
      <Field label="Lot" value={passport.lot_id} mono />
      <Field label="Variety" value={passport.variety} />
      <Field label="Processing" value={passport.processing} />
      <Field label="Harvest date" value={formatDate(passport.harvest_timestamp)} />
      <Field label="SCA score" value={passport.sca_score || "—"} />
      <Field
        label="Lab cert hash"
        value={shortHash(passport.lab_cert_hash)}
        mono
        title={passport.lab_cert_hash}
      />
      <Field
        label="Photos hash"
        value={shortHash(passport.photos_hash)}
        mono
        title={passport.photos_hash}
      />
      <Field
        label="GPS polygon hash"
        value={shortHash(passport.gps_polygon_hash)}
        mono
        title={passport.gps_polygon_hash}
      />
      <Field label="Metadata version" value={passport.metadata_version} />
      <Field
        label="Owner pkh"
        value={shortHash(passport.owner)}
        mono
        title={passport.owner}
      />
      <Field
        label="On-chain merkle root"
        value={shortHash(passport.daily_events_merkle_root) || "—"}
        mono
        title={passport.daily_events_merkle_root}
      />
    </dl>
  );
}

function SustainabilityTab({ s }: { s: Passport["sustainability"] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <Field
        label="CO₂e per kg"
        value={
          s.co2e_per_kg_int10
            ? `${(s.co2e_per_kg_int10 / 10).toFixed(2)} kg CO₂e/kg`
            : "—"
        }
      />
      <Field
        label="Water"
        value={s.water_l_per_kg ? `${s.water_l_per_kg} L/kg` : "—"}
      />
      <Field
        label="Organic input ratio"
        value={
          s.organic_input_ratio_pct ? `${s.organic_input_ratio_pct}%` : "—"
        }
      />
      <Field
        label="Synthetic N"
        value={
          s.synthetic_n_kg_per_ha ? `${s.synthetic_n_kg_per_ha} kg/ha` : "—"
        }
      />
      <Field
        label="Soil organic matter"
        value={s.som_pct_int10 ? `${(s.som_pct_int10 / 10).toFixed(1)}%` : "—"}
      />
      <Field
        label="Shade canopy"
        value={s.shade_canopy_pct ? `${s.shade_canopy_pct}%` : "—"}
      />
      <Field
        label="Bird species"
        value={s.bird_species_count || "—"}
      />
      <Field
        label="Wastewater treated"
        value={s.wastewater_treated ? "Yes" : "No"}
      />
      <Field
        label="Deforestation risk"
        value={s.deforestation_risk_score ?? "—"}
      />
      <Field label="CO₂ method" value={s.co2_calc_method || "—"} />
      <Field
        label="EUDR DDS hash"
        value={shortHash(s.eudr_dds_hash)}
        mono
        title={s.eudr_dds_hash}
      />
      <Field
        label="Forest baseline hash"
        value={shortHash(s.forest_baseline_hash)}
        mono
        title={s.forest_baseline_hash}
      />
      <Field
        label="Fertilizer log hash"
        value={shortHash(s.fertilizer_log_hash)}
        mono
        title={s.fertilizer_log_hash}
      />
      <Field
        label="Soil test lab hash"
        value={shortHash(s.soil_test_lab_hash)}
        mono
        title={s.soil_test_lab_hash}
      />
      <Field
        label="Biodiversity audit"
        value={shortHash(s.biodiversity_audit_hash)}
        mono
        title={s.biodiversity_audit_hash}
      />
      <Field
        label="Certifications"
        value={s.certifications.length ? s.certifications.join(", ") : "—"}
      />
    </dl>
  );
}

function Field({
  label,
  value,
  mono,
  title,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="border border-stone-200 rounded-lg p-2.5 bg-stone-50">
      <dt className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-stone-800 ${mono ? "font-mono text-xs break-all" : "text-sm"}`}
        title={title}
      >
        {value}
      </dd>
    </div>
  );
}
