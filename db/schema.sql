-- db/schema.sql
-- Run this once against the Neon database.
--   psql "$DATABASE_URL" -f db/schema.sql
-- or paste it into the Neon SQL editor.

CREATE TABLE IF NOT EXISTS leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),

  name          text NOT NULL,
  phone         text NOT NULL UNIQUE,          -- one row per person
  city          text NOT NULL,
  city_zone     text NOT NULL,                 -- lucknow | outside
  asset_type    text NOT NULL DEFAULT 'rooftop', -- rooftop | farmland | building | other
  lead_type     text NOT NULL,                 -- owner | developer | both

  intent        text NOT NULL,
  owns_building text,
  area_bucket   text,
  roof_type     text,
  locality      text,
  use_cases     text,                          -- comma separated: solar,tower
  available     text,

  priority      char(1) NOT NULL,              -- A | B | C
  status        text NOT NULL DEFAULT 'new',   -- new | contacted | qualified | dead
  notes         text,
  source        text NOT NULL DEFAULT 'direct',
  ip            text
);

CREATE INDEX IF NOT EXISTS leads_priority_idx ON leads (priority, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_zone_idx     ON leads (city_zone, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_asset_idx    ON leads (asset_type, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx   ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_ip_idx       ON leads (ip, created_at DESC);
