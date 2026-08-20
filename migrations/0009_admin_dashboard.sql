-- Apply after 0008_open_limit_fallback_redirect.sql.
-- Adds an administrator-controlled reversible pause and a 90-day audit trail.
ALTER TABLE links ADD COLUMN admin_paused_at TEXT;

CREATE INDEX IF NOT EXISTS idx_links_admin_paused_at ON links(admin_paused_at);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_subject TEXT NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  link_id INTEGER,
  link_slug TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_created_at ON admin_audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_events_link_id ON admin_audit_events(link_id);
