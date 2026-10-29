-- db/migrate-001-asset-type.sql
-- Run this ONCE on a database created before asset types existed.
-- Fresh installs get this column from db/schema.sql already.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'rooftop';

CREATE INDEX IF NOT EXISTS leads_asset_idx ON leads (asset_type, created_at DESC);
