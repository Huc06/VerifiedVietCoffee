CREATE TABLE lots (
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

CREATE TABLE iot_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  lot_id          UUID REFERENCES lots(id),
  device_id       TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  data            JSONB NOT NULL,
  photo_url       TEXT,
  gps_lat         DECIMAL(9,6),
  gps_lng         DECIMAL(9,6),
  recorded_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_iot_events_farm_date ON iot_events(farm_id, recorded_at);
