# VerifiedVietCoffee

Farm-level traceability for Vietnamese Specialty Coffee on Cardano.

Scope: from coffee tree to green bean.

## Structure

```
frontend/       → Next.js 15 (FE team)
backend/        → Fastify API server
aiken/          → Smart contract (CIP-68)
scripts/        → IoT simulators + cron jobs
supabase/       → DB migrations
```

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Simulators + MQTT
docker compose up mosquitto mqtt-consumer simulator

# Full stack
docker compose up
```

## Env

Copy `.env.example` → `.env` and fill in values.
