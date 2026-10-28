PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, brand TEXT NOT NULL, sku TEXT NOT NULL, ean TEXT NOT NULL,
  source_hash TEXT NOT NULL, data_json TEXT NOT NULL, visible INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS products_brand ON products(brand,visible);
CREATE TABLE IF NOT EXISTS import_runs (
  id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
  status TEXT NOT NULL, product_count INTEGER NOT NULL DEFAULT 0, message TEXT
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, brand TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
  company TEXT NOT NULL, country TEXT NOT NULL, message TEXT NOT NULL,
  product_id TEXT, consent_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL
);
