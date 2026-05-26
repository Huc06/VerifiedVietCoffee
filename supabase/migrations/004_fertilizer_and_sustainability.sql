CREATE TABLE fertilizer_applications (
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

CREATE TABLE sustainability_metrics (
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
