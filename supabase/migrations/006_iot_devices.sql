CREATE TABLE iot_devices (
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
