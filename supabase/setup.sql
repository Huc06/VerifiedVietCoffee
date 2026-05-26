-- VerifiedVietCoffee — Full schema (run once in Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS farms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  province        TEXT,
  altitude_m      INT,
  gps_polygon     JSONB,
  land_doc_url    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  variety         TEXT,
  processing      TEXT,
  harvest_date    DATE,
  weight_kg       DECIMAL,
  sca_score       INT,
  status          TEXT DEFAULT 'growing',
  nft_token_name  TEXT,
  nft_tx_hash     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS iot_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         TEXT NOT NULL,
  device_id       TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  data            JSONB NOT NULL,
  photo_url       TEXT,
  gps_lat         DECIMAL(9,6),
  gps_lng         DECIMAL(9,6),
  recorded_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iot_events_farm_date ON iot_events(farm_id, recorded_at);

CREATE TABLE IF NOT EXISTS daily_anchors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         TEXT NOT NULL,
  anchor_date     DATE NOT NULL,
  event_count     INT,
  merkle_root     TEXT NOT NULL,
  tx_hash         TEXT,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(farm_id, anchor_date)
);

CREATE TABLE IF NOT EXISTS lab_certs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id          UUID REFERENCES lots(id),
  lab_name        TEXT,
  cert_type       TEXT,
  score           INT,
  cert_doc_url    TEXT,
  cert_hash       TEXT,
  issued_at       DATE,
  expires_at      DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fertilizer_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id           UUID REFERENCES farms(id),
  lot_id            UUID REFERENCES lots(id),
  applied_at        TIMESTAMPTZ NOT NULL,
  fertilizer_type   TEXT,
  product_code      TEXT,
  amount_kg         DECIMAL,
  zone              TEXT,
  method            TEXT,
  gps_track         JSONB,
  soil_npk_before   JSONB,
  soil_npk_after    JSONB,
  weather_snapshot  JSONB,
  operator_id       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sustainability_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id                 UUID REFERENCES farms(id),
  lot_id                  UUID REFERENCES lots(id),
  co2e_kg_per_kg_bean     DECIMAL,
  water_l_per_kg_bean     DECIMAL,
  organic_input_ratio_pct DECIMAL,
  som_pct                 DECIMAL,
  shade_canopy_pct        DECIMAL,
  source_data_hash        TEXT,
  on_chain_tx_hash        TEXT,
  computed_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eudr_compliance (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id                   UUID REFERENCES farms(id),
  polygon_hash              TEXT,
  baseline_satellite_hash   TEXT,
  deforestation_detected    BOOLEAN DEFAULT FALSE,
  risk_score                INT,
  dds_pdf_url               TEXT,
  dds_hash                  TEXT,
  on_chain_tx_hash          TEXT,
  generated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS iot_devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  device_id       TEXT UNIQUE NOT NULL,
  device_type     TEXT,
  model           TEXT,
  zone            TEXT,
  public_key      TEXT,
  registered_at   TIMESTAMPTZ DEFAULT now(),
  last_seen_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'active'
);
