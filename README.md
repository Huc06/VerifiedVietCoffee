# VerifiedVietCoffee

Farm-to-cup traceability for Vietnamese specialty coffee, anchored to the
Cardano blockchain via **CIP-68** NFTs.

Each coffee lot becomes a "passport" NFT on-chain. IoT sensor readings,
sustainability metrics (CO₂e, water, soil), EUDR compliance data, and lab cert
hashes are pushed into the passport datum by off-chain oracles. Consumers scan
the QR on a green-bean bag, open `/lot/<lotId>`, and the page verifies the
on-chain Merkle root against the off-chain sensor data in real time.

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌─────────────┐
│ IoT sensors │───▶│  Fastify API │───▶│   Supabase DB    │    │   Cardano   │
│ (simulators)│    │   (backend)  │    │ farms, lots,     │    │  Preview    │
└─────────────┘    │              │    │ iot_events,      │    │  Network    │
                   │ /iot/event   │    │ daily_anchors,   │    │             │
                   │ /blockchain  │───▶│ oracles,         │◀──▶│  CIP-68 NFT │
                   │ /verify      │    │ oracle_submits   │    │  Aiken      │
                   └──────────────┘    └──────────────────┘    │  validator  │
                          ▲                                     └─────────────┘
                          │                                            ▲
                          ▼                                            │
                   ┌──────────────┐                                    │
                   │   Next.js    │  Lace wallet mint → tx ─────────────
                   │  (frontend)  │
                   │ /lot/<lotId> │
                   │ Mint Test UI │
                   └──────────────┘
```

---

## Repo layout

| Folder       | What's there                                                 |
|--------------|--------------------------------------------------------------|
| `aiken/`     | Aiken v3 multi-validator (`mint` + `spend`) — CIP-68 passport |
| `backend/`   | Fastify + Mesh SDK API: IoT ingest, Merkle anchors, oracle submitter |
| `frontend/`  | Next.js 16 — mint Test UI (`/`) + consumer passport (`/lot/<lotId>`) |
| `scripts/`   | IoT simulators + `mock-week.ts` end-to-end demo generator    |
| `temp/`      | Supabase schema (`setup.sql`), oracle seed, migrations       |
| `docs/`      | Original v3 implementation plan + setup notes                |
| `supabase/`  | Reserved for future Supabase CLI migrations                  |

Each sub-project has its own README — see **`backend/README.md`** for the
canonical run-book.

---

## Quick start (E2E demo in ~10 min)

### Prerequisites

- Node.js ≥ 20
- A **Supabase** project (free tier is fine)
- A **Blockfrost** project on the **Preview** testnet → API key starting with `preview...`
- **Lace** wallet on **Preview** with ≥ 20 tADA from the Preview faucet
- Aiken not needed at runtime — the compiled blueprint is checked into
  `frontend/app/data/coffee-passport.json` + `backend/src/data/`

### 1. Supabase schema

Open SQL Editor in your Supabase project and run in order:

1. `temp/setup.sql` — full schema (farms, lots, iot_events, daily_anchors, oracles, etc.)
2. `temp/migrate_oracle_unique.sql` — composite unique key on `(payment_pkh, kind)`
3. `temp/seed_oracle.sql` — 4 oracle roles (events / lab / sustainability / eudr)
   sharing the dev Lace pkh

> If you use a wallet other than the one in `seed_oracle.sql`, update the
> address/pkh in that file first — `submit-anchor` checks the seeded oracle
> pkh matches the passport datum owner.

### 2. Backend

```bash
cd backend
# Edit .env:
#   SUPABASE_URL=https://<proj>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service_role>
#   BLOCKFROST_API_KEY=preview...
#   ORACLE_MNEMONIC=<24-word Lace recovery phrase>

npm install
npm run dev          # serves on http://localhost:4000
```

Verify:

```bash
curl http://localhost:4000/blockchain/oracle | jq
# { "address": "addr_test1q…", "payment_pkh": "…", "script_address": "addr_test1w…" }
```

The `payment_pkh` returned **must** match the one seeded into `oracles`.

### 3. Frontend

```bash
cd frontend
# Edit .env:
#   NEXT_PUBLIC_BLOCKFROST_KEY=preview...
#   NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

npm install
npm run dev          # serves on http://localhost:3000
```

### 4. Mint a passport

1. Open `http://localhost:3000`
2. Click **Connect Wallet** → Lace
3. Fill the mint form (defaults to `binhdong_farm` / `LD-2026-0527` / Robusta / Honey)
4. Click **Mint Coffee Passport** — Lace will pop up to sign
5. After Cardano confirms (~30s), a QR + `/lot/<lotId>` link appears below

If you see *"No pure-ADA collateral UTxO"*, hit **POST /blockchain/setup-collateral**
once to split a 5 ADA pure-ADA UTxO from the oracle wallet:

```bash
curl -X POST http://localhost:4000/blockchain/setup-collateral
```

### 5. Generate a week of mock data + on-chain anchors

```bash
cd scripts
npm install
npm run mock-week -- --days 3 --confirm-wait 90
```

This ingests ~30 IoT events, builds 3 Merkle roots, and submits 3
`UpdateEvents` txs to Cardano Preview. Total runtime ~5 min (confirmation
waits between days).

### 6. Open the consumer page

`http://localhost:3000/lot/LD-2026-0527`

You should see:

- **Header**: `Binhdong Farm` · Lot `LD-2026-0527` · Robusta · Honey · `✓ Verified on Cardano`
- **Timeline tab**: most-recent day with badge `✓ current` (off-chain root matches on-chain), older days `anchored` with clickable `tx ↗` links
- **Passport tab**: full CIP-68 metadata + on-chain merkle root
- **Sustainability tab**: CO₂e / water / SOM / EUDR fields (all `—` until `UpdateSustainability` / `UpdateLab` is wired)

---

## Smart contract

`aiken/validators/coffee_passport.ak` is a CIP-68 multi-validator:

| Handler | Purpose                                                                                                                          |
|---------|----------------------------------------------------------------------------------------------------------------------------------|
| `mint`  | `MintPassport` → emit ref token (label 100) + user token (label 222); `BurnPassport` requires all minted quantities negative      |
| `spend` | Spend the reference UTxO with `UpdateEvents` / `UpdateSustainability` / `UpdateLab` — checks immutable fields (farm_id, lot_id, owner) + per-action field constraints, requires signature from `datum.owner` |

The compiled blueprint is checked in. To recompile:

```bash
cd aiken
aiken build
# blueprint at aiken/plutus.json — copy validators[0] to
#   frontend/app/data/coffee-passport.json
#   backend/src/data/coffee-passport.json
```

---

## API endpoints (backend)

| Method | Path                              | Purpose                                                       |
|--------|-----------------------------------|---------------------------------------------------------------|
| POST   | `/iot/event`                      | Ingest a sensor reading                                       |
| GET    | `/iot/events/:farmId`             | Last 100 events                                               |
| POST   | `/blockchain/daily-anchor`        | Build Merkle root off-chain; `{farm_id, date, lot_id?}`       |
| POST   | `/blockchain/submit-anchor`       | Sign + submit `UpdateEvents` on Cardano; `{anchor_id}`        |
| POST   | `/blockchain/setup-collateral`    | One-shot: split 5 ADA pure-ADA UTxO for the oracle            |
| GET    | `/blockchain/oracle`              | Oracle address, pkh, script address                           |
| GET    | `/verify/lot/:lotId`              | **Consumer endpoint** — on-chain passport + off-chain timeline |
| GET    | `/verify/:farmId/:date`           | Day-by-day events + Merkle proofs                             |

Full request/response shapes are in `backend/README.md`.

---

## Networks

This project targets **Cardano Preview** end-to-end. The script address has
network-id `0`, so it also resolves on Preprod — but the wallet, Blockfrost
key, and faucet must all be on the same network. Switching to mainnet means
flipping `CARDANO_NETWORK_ID=1` in `backend/.env`, regenerating the script
address, and swapping Blockfrost keys.

---

## Known limitations (MVP)

- **Single oracle key** — all four oracle roles share one Lace mnemonic. In
  production each role should hold its own keypair.
- **Single ref UTxO assumption** — `findReferenceUtxo` picks the first
  spendable one if multiple exist for the same `lot_id`. Re-minting the same
  lot leaves orphaned ref tokens at the script address (they can only be
  burned).
- **Bool encoding** — early passports minted before the Bool-as-Constr fix
  have `wastewater_treated` encoded as `I 0` instead of `Constr 0 []`; the
  spend handler can't deserialize them. Backend's `isDatumSpendable` filters
  these out automatically.
- **Lab cert + sustainability** — schema + on-chain redeemers exist but the
  oracle submitters for `UpdateLab` / `UpdateSustainability` aren't wired yet.
  The Update Lab tab on the Test UI hits the chain directly via Lace.
- **Merkle proofs ≠ tamper detection** — the on-chain datum holds only the
  **latest** Merkle root, so older days are trusted via tx history rather
  than re-verifiable. Production would either chain roots or anchor a
  root-of-roots.
- **EUDR / Hansen / Sentinel-2 are stubs** — no real satellite query yet.

---

## License

TBD.
