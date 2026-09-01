CREATE TABLE IF NOT EXISTS plugin_reports (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  duplicate_fingerprint TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plugin_reports_status_created
  ON plugin_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plugin_reports_expires
  ON plugin_reports (expires_at);
