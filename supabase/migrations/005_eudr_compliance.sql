CREATE TABLE eudr_compliance (
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
