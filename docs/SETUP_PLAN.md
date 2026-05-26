# Setup Plan — VerifiedVietCoffee MVP

## Project Structure

Tách riêng FE và BE. Deploy độc lập.

```
verifiedvietcoffee/
├── .github/
│   └── workflows/
│       ├── ci-frontend.yml         # Lint + build FE on PR
│       ├── ci-backend.yml          # Lint + build BE on PR
│       ├── deploy-frontend.yml     # Deploy FE to Vercel/VPS
│       ├── deploy-backend.yml      # Deploy BE to VPS (Docker)
│       └── aiken-test.yml          # Aiken contract tests
│
├── frontend/                       
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── farm/
│   │   │   │   └── verify/[lotId]/
│   │   ├── components/
│   │   ├── lib/                    # FE utils (fetch API, format...)
│   │   └── types/                  # Shared types (copy hoặc symlink)
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                        
│   ├── src/
│   │   ├── server.ts               # Entry point
│   │   ├── routes/
│   │   │   ├── iot.ts              # POST /iot/data, /iot/photo, /iot/event
│   │   │   ├── lot.ts              # CRUD lots
│   │   │   ├── farm.ts             # CRUD farms
│   │   │   ├── sustainability.ts   # Fertilizer + metrics
│   │   │   ├── eudr.ts             # DDS generation
│   │   │   ├── blockchain.ts       # Anchor + mint + verify
│   │   │   ├── verify.ts           # Public verify endpoints
│   │   │   └── qr.ts              # QR generation
│   │   ├── lib/
│   │   │   ├── blockchain/
│   │   │   │   ├── daily-anchor.ts
│   │   │   │   ├── milestone-anchor.ts
│   │   │   │   ├── mint-passport.ts
│   │   │   │   ├── verify-passport.ts
│   │   │   │   └── server-wallet.ts
│   │   │   ├── iot/
│   │   │   │   ├── ingest.ts
│   │   │   │   └── merkle.ts
│   │   │   ├── sustainability/
│   │   │   │   ├── carbon-calc.ts
│   │   │   │   ├── water-calc.ts
│   │   │   │   └── season-summary.ts
│   │   │   ├── eudr/
│   │   │   │   ├── hansen-check.ts
│   │   │   │   └── dds-generator.ts
│   │   │   └── supabase.ts         # DB client
│   │   └── types/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── aiken/                          
│   ├── aiken.toml
│   ├── lib/veriviet/types.ak
│   └── validators/coffee_passport.ak
│
├── scripts/                        
│   ├── simulators/
│   │   ├── soil-simulator.ts
│   │   ├── weather-simulator.ts
│   │   ├── camera-simulator.ts
│   │   └── run-all.ts
│   ├── mqtt-consumer.ts
│   ├── daily-anchor-cron.ts
│   └── package.json
│
├── supabase/
│   └── migrations/
│       ├── 001_farms.sql
│       ├── 002_lots_and_events.sql
│       ├── 003_anchors_and_certs.sql
│       ├── 004_fertilizer_and_sustainability.sql
│       ├── 005_eudr_compliance.sql
│       └── 006_iot_devices.sql
│
├── docker-compose.yml
├── .env.example
└── docs/
```

---

## CI/CD (GitHub Actions)

### ci-frontend.yml — FE check on PR

```yaml
name: CI Frontend
on:
  pull_request:
    paths: ['frontend/**']
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build
```

### ci-backend.yml — BE check on PR

```yaml
name: CI Backend
on:
  pull_request:
    paths: ['backend/**', 'scripts/**']
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npm run build
```

### deploy-frontend.yml — Deploy FE (Vercel)

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths: ['frontend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

### deploy-backend.yml — Deploy BE (VPS Docker)

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**', 'scripts/**', 'docker-compose.yml']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /app/verifiedvietcoffee
            git pull origin main
            docker compose up -d --build
```

### aiken-test.yml — Smart contract

```yaml
name: Aiken
on:
  pull_request:
    paths: ['aiken/**']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aiken-lang/setup-aiken@v1
      - run: cd aiken && aiken check && aiken build
```

---

## Docker Compose (VPS)

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports: ["1883:1883"]
    volumes: ["./mosquitto.conf:/mosquitto/config/mosquitto.conf"]

  backend:
    build: ./backend
    ports: ["4000:4000"]
    env_file: .env
    depends_on: [mosquitto]

  mqtt-consumer:
    build: ./scripts
    command: npx tsx mqtt-consumer.ts
    env_file: .env
    depends_on: [mosquitto]

  simulator:
    build: ./scripts
    command: npx tsx simulators/run-all.ts
    env_file: .env
    depends_on: [mosquitto]
```

FE deploy riêng trên Vercel (free, auto SSL, edge CDN). BE + MQTT + simulators trên VPS.

---

## Setup Steps

### Step 1 — Repo Init
- Git init, `.gitignore`, `.env.example`
- Tạo folder structure
- GitHub repo + branch protection (main, dev)

### Step 2 — Frontend Init
- `create-next-app` trong `frontend/`
- Tailwind, shadcn/ui, next-intl, leaflet, qrcode.react, recharts
- Config env: `NEXT_PUBLIC_API_URL` trỏ tới BE

### Step 3 — Backend Init
- Fastify + TypeScript trong `backend/`
- Deps: @fastify/cors, @supabase/supabase-js, @meshsdk/core, mqtt, merkletreejs
- Routes skeleton
- Dockerfile

### Step 4 — Database
- Supabase cloud (free tier)
- Run migrations

### Step 5 — MQTT + Simulators
- Mosquitto config
- 3 simulators + mqtt-consumer
- Docker Compose local dev

### Step 6 — Merkle + Blockchain
- merkle.ts, daily-anchor, milestone-anchor
- Aiken contract compile
- Mesh SDK integration (Preprod)

### Step 7 — CI/CD
- GitHub Actions workflows
- Secrets setup (VPS_HOST, VERCEL_TOKEN, etc.)

### Step 8 — Deploy
- VPS: Docker Compose (BE + MQTT + simulators)
- Vercel: FE auto-deploy on push

---

## Git Workflow

```
main              ← production, auto deploy
  └── dev         ← integration
       ├── feat/fe-*          ← FE
       ├── feat/api-*         ← BE
       ├── feat/blockchain-*  ← BE
       └── feat/simulator-*   ← BE
```

PR → dev (CI check) → merge dev → main (auto deploy)

---

## API Contract (FE gọi BE)

Base URL: `https://api.verifiedvietcoffee.com` (hoặc `http://localhost:4000` local)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/farm/:id` | Farm info |
| GET | `/farm/:id/events` | Event list |
| GET | `/farm/:id/iot/latest` | Latest sensor readings |
| POST | `/lot` | Create lot |
| GET | `/lot/:id` | Lot detail |
| POST | `/lot/:id/milestone` | Trigger milestone |
| POST | `/blockchain/mint-passport` | Mint CIP-68 NFT |
| GET | `/verify/:lotId` | Public passport data |
| GET | `/verify/:lotId/merkle-proof/:eventId` | Merkle proof |
| GET | `/qr/:lotId` | QR image |

FE chỉ cần biết API contract này để build UI.

---

## Câu hỏi cần confirm

1. Dùng **Supabase cloud** (free tier) hay self-host?
2. Có sẵn **Blockfrost API key** (Preprod)?
3. **Aiken** đã cài? (`aikup`)
4. VPS đã có hay cần mua mới?
5. Vercel account cho FE deploy?
