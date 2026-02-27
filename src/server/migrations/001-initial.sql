CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  value TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS entitlements_user_id_idx ON entitlements(user_id);

CREATE TABLE IF NOT EXISTS redeem_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  entitlement TEXT NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  redeemed_at TEXT
);

CREATE TABLE IF NOT EXISTS lenses (
  id TEXT PRIMARY KEY,
  notion_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  intro TEXT NOT NULL,
  cover_url TEXT,
  order_int INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS lenses_notion_id_uq ON lenses(notion_id);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  notion_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cover_url TEXT,
  images_json TEXT NOT NULL,
  takeaways_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS entries_notion_id_uq ON entries(notion_id);

CREATE TABLE IF NOT EXISTS lens_entries (
  lens_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  PRIMARY KEY (lens_id, entry_id),
  FOREIGN KEY (lens_id) REFERENCES lenses(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lens_entries_entry_id_idx ON lens_entries(entry_id);

CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_sync_at TEXT
);

