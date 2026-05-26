CREATE TABLE daily_anchors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         UUID REFERENCES farms(id),
  anchor_date     DATE NOT NULL,
  event_count     INT,
  merkle_root     TEXT NOT NULL,
  tx_hash         TEXT,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(farm_id, anchor_date)
);

CREATE TABLE lab_certs (
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
