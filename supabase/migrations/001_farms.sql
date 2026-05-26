CREATE TABLE farms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  province        TEXT,
  altitude_m      INT,
  gps_polygon     JSONB,
  land_doc_url    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
