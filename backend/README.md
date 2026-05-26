# VerifiedVietCoffee — Backend

Fastify server that ingests simulated sensor data (soil / weather / camera) from
the IoT simulators in `scripts/simulators`, persists events to Supabase, builds
daily Merkle anchors, and exposes verification endpoints used by the
consumer-facing passport app.

```
scripts/simulators ──HTTP──▶ backend (/iot/*) ──▶ Supabase
                                   │
                                   ├──▶ /blockchain/daily-anchor  (Merkle root)
                                   └──▶ /verify/:farmId/:date     (proof bundle)
```

## Requirements

- Node.js ≥ 20
- A Supabase project with the schema from `temp/setup.sql` already applied
- (Optional) a Blockfrost Preview API key — only needed when the oracle starts
  pushing anchors on-chain

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure `backend/.env`

Create `backend/.env` (already exists in this repo for local dev):

```dotenv
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

BLOCKFROST_API_KEY=preview...
BLOCKFROST_URL=https://cardano-preview.blockfrost.io/api/v0

MQTT_BROKER_URL=mqtt://localhost:1883
PORT=4000
NODE_ENV=development
```

> `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key, not `anon`.
> Keep this file out of git.

If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are missing, the store falls
back to an in-memory map — useful for unit tests, but data is lost on restart.

## 3. Run

```bash
npm run dev      # tsx watch — reloads on file change
# or
npm run build && npm start
```

You should see:

```
[store] Using Supabase storage
Server running on http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

## 4. Start the IoT simulators (separate terminal)

```bash
cd ../scripts
npm install
npm run simulate
```

This launches three publishers against the backend:

| Simulator | Interval | Endpoint            | Payload                      |
|-----------|---------:|---------------------|------------------------------|
| soil      |       5s | `POST /iot/data`    | `{ moisture, pH, N, P, K }`  |
| weather   |       5s | `POST /iot/data`    | `{ temp, humidity, rain }`   |
| camera    |      10s | `POST /iot/photo`   | `{ photo_url, gps }`         |

All three send `farm_id = "binhdong"` by default. Override with
`API_URL=...` or by editing `FARM_ID` in each simulator file.

## 5. Endpoints

### IoT ingestion (`/iot`)

| Method | Path                  | Body fields                                              | Notes                          |
|--------|-----------------------|----------------------------------------------------------|--------------------------------|
| POST   | `/iot/data`           | `device_id, timestamp, farm_id?, gps?, ...`              | Sensor reading                 |
| POST   | `/iot/photo`          | `device_id, timestamp, farm_id?, photo_url, gps?`        | Photo event                    |
| POST   | `/iot/event`          | `device_id, timestamp, event_type, farm_id?, ...`        | Generic event                  |
| GET    | `/iot/events/:farmId` | —                                                        | Last 100 events                |
| GET    | `/iot/latest/:farmId` | —                                                        | Latest reading per device      |

### Daily anchor + Merkle proof (`/blockchain`)

| Method | Path                            | Body                                          | Notes                                              |
|--------|---------------------------------|-----------------------------------------------|----------------------------------------------------|
| POST   | `/blockchain/daily-anchor`      | `{ farm_id, date, lot_id? }`                  | Builds Merkle root, saves with `status: pending`   |
| POST   | `/blockchain/submit-anchor`     | `{ anchor_id, lot_id? }`                      | Signs + submits `UpdateEvents` tx on Cardano       |
| GET    | `/blockchain/anchors/:farmId`   | —                                             | Lists all anchors                                  |
| GET    | `/blockchain/oracle`            | —                                             | Returns oracle address + pkh + script address      |
| POST   | `/blockchain/verify-event`      | `{ event, proof, root }`                      | Verifies a single Merkle proof                     |

### Consumer verification (`/verify`)

| Method | Path                       | Notes                                          |
|--------|----------------------------|------------------------------------------------|
| GET    | `/verify/:farmId/:date`    | All events + Merkle root + proofs for one day  |
| GET    | `/verify/:farmId`          | Farm overview (totals + anchor history)        |

## 6. Oracle setup (on-chain UpdateEvents)

The backend signs and submits `UpdateEvents` redeemers against the CIP-68
reference UTxO. The signing key is derived from `ORACLE_MNEMONIC` in `.env`.

### Option A — Reuse the same mnemonic as your Lace dev wallet
1. In Lace: Settings → Show recovery phrase → copy the 24 words.
2. Paste into `ORACLE_MNEMONIC=` in `backend/.env` (space-separated, no quotes).
3. Restart the server, then verify:
   ```bash
   curl http://localhost:4000/blockchain/oracle
   # { "address": "addr_test1q...", "payment_pkh": "1803...", "script_address": "addr_test1w..." }
   ```
   `payment_pkh` must match the one seeded in `temp/seed_oracle.sql` and the
   `owner` field of every passport you want this oracle to update.

### Option B — Dedicated oracle key
1. Generate a fresh mnemonic + address (Mesh's `MeshWallet.brew()` or any
   Cardano wallet).
2. Top up the oracle address with ≥ 20 tADA from the Preview faucet:
   <https://docs.cardano.org/cardano-testnets/tools/faucet/>
3. Paste the mnemonic into `ORACLE_MNEMONIC`.
4. Re-seed `oracles` table with the new pkh, then mint a fresh passport
   from the frontend using this oracle's address (so `datum.owner` matches).

## 7. Mock a full week of data + on-chain anchors

After the backend is running and a passport has been minted from the frontend,
generate N days of synthetic IoT readings and push them on-chain in one shot:

```bash
cd ../scripts
npm install     # first time only
# Default: 3 days · 10 readings/day · lot LD-2026-0527 · farm binhdong
npm run mock-week
# Custom:
npm run mock-week -- --days 7 --lot-id LD-2026-0527 --confirm-wait 60
# Off-chain only (no Cardano tx, useful for fast UI iteration):
npm run mock-week -- --skip-submit
```

The script loops oldest → newest day so the most recent anchor lands in the
on-chain datum at the end. Each iteration waits ~45s for the previous tx to
confirm so the next `submit-anchor` can find the new reference UTxO; tune via
`--confirm-wait`.

When it finishes, open
`http://localhost:3000/lot/<lot-id>` — the consumer page shows the timeline
with the latest day's anchor flagged ✓ current.

## 8. Quick demo flow

```bash
# 1. Boot backend in one terminal
cd backend && npm run dev

# 2. Pump fake sensor data for ~30s
cd ../scripts && npm run simulate    # Ctrl-C after a moment

# 3. Build today's Merkle anchor (note the LOT_ID from the passport you minted)
ANCHOR=$(curl -s -X POST http://localhost:4000/blockchain/daily-anchor \
  -H 'Content-Type: application/json' \
  -d "{\"farm_id\":\"binhdong\",\"date\":\"$(date -u +%F)\",\"lot_id\":\"LD-2026-0527\"}")
echo "$ANCHOR" | jq
ANCHOR_ID=$(echo "$ANCHOR" | jq -r .anchor_id)

# 4. Sign + submit UpdateEvents on Cardano Preview
curl -s -X POST http://localhost:4000/blockchain/submit-anchor \
  -H 'Content-Type: application/json' \
  -d "{\"anchor_id\":\"$ANCHOR_ID\"}" | jq
# → { tx_hash: "...", status: "submitted" }
# Open https://preview.cardanoscan.io/transaction/<tx_hash> to confirm.

# 5. Fetch the proof bundle (consumer-facing)
curl -s "http://localhost:4000/verify/binhdong/$(date -u +%F)" | jq '.merkle_root, .event_count'
```

## 9. Troubleshooting

- **`Server running` but rows don't appear in Supabase** — `.env` is missing or
  the service role key is wrong; check the first line of stdout: it must say
  `[store] Using Supabase storage`, not `in-memory`.
- **CORS errors from the Next.js app** — Fastify is configured with
  `origin: true` in `src/server.ts`. Check that the frontend is calling
  `http://localhost:4000` (or whatever `PORT` you set), not `:3000`.
- **`gen_random_uuid()` missing** — run `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
  in Supabase SQL Editor before applying `temp/setup.sql`.
- **Port already in use** — change `PORT` in `.env` or `kill $(lsof -t -i:4000)`.
- **`submit-anchor` returns "No 'events' oracle registered"** — run
  `temp/seed_oracle.sql` after pointing it at the pkh that
  `GET /blockchain/oracle` returns.
- **`submit-anchor` returns "Reference UTxO not found"** — mint the passport
  from the frontend first; backend looks up the ref token by `lot_id`.
- **`submit-anchor` returns "Oracle pkh does not match passport datum owner"**
  — the passport was minted by a different wallet than the oracle. Either
  rotate `ORACLE_MNEMONIC` to the wallet that minted, or re-mint a passport
  using the oracle's address as the wallet.
