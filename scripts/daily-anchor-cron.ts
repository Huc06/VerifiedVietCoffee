// scripts/daily-anchor-cron.ts — Build + submit a daily Merkle anchor for a
// farm/lot, using whatever IoT events are already in the DB for that day.
//
// Intended to run once a day (e.g. via cron at 02:00) for the previous day's
// data. For local use it can also run in a loop.
//
// Usage:
//   npx tsx daily-anchor-cron.ts                      # yesterday, binhdong / LD-2026-0527
//   npx tsx daily-anchor-cron.ts --date 2026-05-26
//   npx tsx daily-anchor-cron.ts --farm-id binhdong --lot-id LD-2026-0527
//   npx tsx daily-anchor-cron.ts --loop 86400         # repeat every N seconds

const API_URL = process.env.API_URL || "http://localhost:4000";

interface Args {
  farmId: string;
  lotId: string;
  date: string;
  loopSeconds: number | null;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string, def?: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? def : argv[i + 1];
  };
  const loop = get("loop");
  return {
    farmId: get("farm-id", "binhdong")!,
    lotId: get("lot-id", "LD-2026-0527")!,
    date: get("date", yesterdayISO())!,
    loopSeconds: loop ? Number(loop) : null,
  };
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `${res.status} ${res.statusText}`);
  }
  return json;
}

async function runOnce(args: Args) {
  const stamp = new Date().toISOString();
  console.log(`\n[${stamp}] daily-anchor ${args.farmId} / ${args.lotId} / ${args.date}`);
  try {
    const anchor = await post("/blockchain/daily-anchor", {
      farm_id: args.farmId,
      date: args.date,
      lot_id: args.lotId,
    });
    console.log(
      `  anchor ${anchor.anchor_id} root=${String(anchor.merkle_root).slice(0, 14)}… events=${anchor.event_count}`,
    );
    const submit = await post("/blockchain/submit-anchor", {
      anchor_id: anchor.anchor_id,
    });
    console.log(`  submitted tx=${submit.tx_hash}`);
    console.log(
      `  https://preview.cardanoscan.io/transaction/${submit.tx_hash}`,
    );
  } catch (e: any) {
    console.error(`  ✗ ${e.message}`);
  }
}

async function main() {
  const args = parseArgs();
  // Health check
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(String(res.status));
  } catch (e: any) {
    console.error(`Backend not reachable at ${API_URL}: ${e.message}`);
    process.exit(1);
  }

  await runOnce(args);

  if (args.loopSeconds) {
    console.log(`\nLooping every ${args.loopSeconds}s. Ctrl-C to stop.`);
    setInterval(() => {
      // each tick anchors the new "yesterday"
      runOnce({ ...args, date: yesterdayISO() });
    }, args.loopSeconds * 1000);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
