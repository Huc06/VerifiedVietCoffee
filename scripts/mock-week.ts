// scripts/mock-week.ts — Generate N days of mock IoT readings + daily anchors
// + on-chain UpdateEvents tx for a single lot, end-to-end.
//
// Usage:
//   npx tsx mock-week.ts                      # defaults: binhdong / LD-2026-0527 / 3 days
//   npx tsx mock-week.ts --days 7 --lot-id LD-2026-0527
//   npx tsx mock-week.ts --skip-submit        # only off-chain anchors, no Cardano tx
//   npx tsx mock-week.ts --confirm-wait 90    # seconds to wait after submit-anchor

const API_URL = process.env.API_URL || "http://localhost:4000";

interface Args {
  farmId: string;
  lotId: string;
  days: number;
  perDay: number;
  skipSubmit: boolean;
  confirmWait: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string, def?: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i === -1) return def;
    return argv[i + 1];
  };
  return {
    farmId: get("farm-id", "binhdong")!,
    lotId: get("lot-id", "LD-2026-0527")!,
    days: Number(get("days", "3")),
    perDay: Number(get("per-day", "10")),
    skipSubmit: argv.includes("--skip-submit"),
    confirmWait: Number(get("confirm-wait", "45")),
  };
}

function rand(min: number, max: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round((Math.random() * (max - min) + min) * f) / f;
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeReading(
  farmId: string,
  timestamp: string,
  kind: "soil" | "weather" | "photo",
): Record<string, unknown> {
  switch (kind) {
    case "soil":
      return {
        farm_id: farmId,
        device_id: sample(["teros12-A", "teros12-B", "teros12-C"]),
        event_type: "soil",
        timestamp,
        soil_moisture_pct: rand(35, 55),
        soil_temp_c: rand(18, 26),
        soil_ec_ds_m: rand(0.8, 1.8, 2),
        soil_ph: rand(5.2, 6.2, 2),
        gps: { lat: 11.95, lng: 108.43 },
      };
    case "weather":
      return {
        farm_id: farmId,
        device_id: "weather-gw-01",
        event_type: "weather",
        timestamp,
        air_temp_c: rand(16, 28),
        humidity_pct: rand(60, 92, 0),
        rain_mm: rand(0, 8, 1),
        wind_kph: rand(0, 15, 1),
        gps: { lat: 11.95, lng: 108.43 },
      };
    case "photo":
      return {
        farm_id: farmId,
        device_id: "cam-canopy-01",
        event_type: "photo",
        timestamp,
        photo_url: `https://picsum.photos/seed/${encodeURIComponent(timestamp)}/640/480`,
        ndvi_avg: rand(0.55, 0.85, 2),
        gps: { lat: 11.95, lng: 108.43 },
      };
  }
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

function dayISO(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function spreadTimestamps(date: string, count: number): string[] {
  // distribute timestamps evenly across the day (skip 23:59:59 boundary)
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const hh = Math.floor(((i + 0.5) / count) * 24);
    const mm = Math.floor(((i + 0.5) / count) * 24 * 60) % 60;
    out.push(`${date}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
  }
  return out;
}

async function processDay(args: Args, dayOffset: number) {
  const date = dayISO(dayOffset);
  console.log(`\n=== Day ${dayOffset === 0 ? "(today)" : `-${dayOffset}`} · ${date} ===`);

  // 1. Pump readings
  const stamps = spreadTimestamps(date, args.perDay);
  const kinds: ("soil" | "weather" | "photo")[] = ["soil", "weather", "photo"];
  let ok = 0;
  for (let i = 0; i < stamps.length; i++) {
    const kind = kinds[i % 3];
    const body = makeReading(args.farmId, stamps[i], kind);
    try {
      await post("/iot/event", body);
      ok++;
    } catch (e: any) {
      console.error(`  ! event ${kind} ${stamps[i]}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${ok}/${stamps.length} events ingested`);

  // 2. Build daily anchor (off-chain)
  let anchor;
  try {
    anchor = await post("/blockchain/daily-anchor", {
      farm_id: args.farmId,
      date,
      lot_id: args.lotId,
    });
    console.log(
      `  ✓ anchor ${anchor.anchor_id} root=${String(anchor.merkle_root).slice(0, 12)}…`,
    );
  } catch (e: any) {
    console.error(`  ✗ daily-anchor failed: ${e.message}`);
    return;
  }

  if (args.skipSubmit) {
    console.log("  · skipping on-chain submit (--skip-submit)");
    return;
  }

  // 3. Submit on-chain UpdateEvents
  try {
    const submit = await post("/blockchain/submit-anchor", {
      anchor_id: anchor.anchor_id,
    });
    console.log(`  ✓ submitted tx=${submit.tx_hash}`);
    console.log(`    https://preview.cardanoscan.io/transaction/${submit.tx_hash}`);
  } catch (e: any) {
    console.error(`  ✗ submit-anchor failed: ${e.message}`);
    return;
  }

  // 4. Wait for chain to confirm so the next day's submit can find the new UTxO
  if (dayOffset > 0) {
    console.log(`  · waiting ${args.confirmWait}s for tx confirmation…`);
    await new Promise((r) => setTimeout(r, args.confirmWait * 1000));
  }
}

async function main() {
  const args = parseArgs();
  console.log("mock-week", args);
  console.log("backend", API_URL);

  // Health check
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(String(res.status));
  } catch (e: any) {
    console.error(`Backend not reachable at ${API_URL}: ${e.message}`);
    process.exit(1);
  }

  // Oldest → newest so the LATEST day's anchor ends up in the on-chain datum.
  for (let off = args.days - 1; off >= 0; off--) {
    await processDay(args, off);
  }

  console.log(
    `\nDone. Open http://localhost:3000/lot/${encodeURIComponent(args.lotId)} to view.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
