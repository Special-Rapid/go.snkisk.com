CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  manage_key TEXT NOT NULL,
  one_time INTEGER NOT NULL DEFAULT 0,
  used_at TEXT,
  max_open_count INTEGER,
  open_count INTEGER NOT NULL DEFAULT 0,
  limit_reached_target_url TEXT,
  scheduled_target_url TEXT,
  switch_at TEXT,
  unlock_at TEXT,
  expires_at TEXT,
  ended_message TEXT,
  receipt_required INTEGER NOT NULL DEFAULT 0,
  receipt_confirmed_at TEXT,
  passphrase_salt TEXT,
  passphrase_hash TEXT,
  passphrase_iterations INTEGER,
  share_card_enabled INTEGER NOT NULL DEFAULT 0,
  share_card_title TEXT,
  share_card_description TEXT,
  preview_mode TEXT NOT NULL DEFAULT 'none',
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  state_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT,
  admin_paused_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_manage_key ON links(manage_key);
CREATE INDEX IF NOT EXISTS idx_links_deleted_at ON links(deleted_at);
CREATE INDEX IF NOT EXISTS idx_links_switch_at ON links(switch_at);
CREATE INDEX IF NOT EXISTS idx_links_unlock_at ON links(unlock_at);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
CREATE INDEX IF NOT EXISTS idx_links_admin_paused_at ON links(admin_paused_at);

CREATE TABLE IF NOT EXISTS issued_slugs (
  slug TEXT PRIMARY KEY,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO issued_slugs (slug)
SELECT slug FROM links;

CREATE TRIGGER IF NOT EXISTS reject_reissued_slug_on_insert
BEFORE INSERT ON links
WHEN EXISTS (SELECT 1 FROM issued_slugs WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'UNIQUE constraint failed: issued_slugs.slug');
END;

CREATE TRIGGER IF NOT EXISTS reject_reissued_slug_on_rename
BEFORE UPDATE OF slug ON links
WHEN NEW.slug <> OLD.slug
  AND EXISTS (SELECT 1 FROM issued_slugs WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'UNIQUE constraint failed: issued_slugs.slug');
END;

DROP TRIGGER IF EXISTS reserve_inserted_slug;
DROP TRIGGER IF EXISTS reserve_renamed_slug;

CREATE TRIGGER IF NOT EXISTS reserve_inserted_slug
AFTER INSERT ON links
BEGIN
  INSERT INTO issued_slugs (slug) VALUES (NEW.slug);
END;

CREATE TRIGGER IF NOT EXISTS reserve_renamed_slug
AFTER UPDATE OF slug ON links
WHEN NEW.slug <> OLD.slug
BEGIN
  INSERT INTO issued_slugs (slug) VALUES (NEW.slug);
END;

CREATE TABLE IF NOT EXISTS audience_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_link_id INTEGER NOT NULL REFERENCES links(id),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  expires_at TEXT,
  ended_message TEXT,
  share_card_enabled INTEGER NOT NULL DEFAULT 0,
  share_card_title TEXT,
  share_card_description TEXT,
  preview_mode TEXT NOT NULL DEFAULT 'none',
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  state_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_audience_entries_parent ON audience_entries(parent_link_id);
CREATE INDEX IF NOT EXISTS idx_audience_entries_slug ON audience_entries(slug);
CREATE INDEX IF NOT EXISTS idx_audience_entries_expires_at ON audience_entries(expires_at);

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

CREATE TRIGGER IF NOT EXISTS reject_reissued_audience_slug_on_insert
BEFORE INSERT ON audience_entries
WHEN EXISTS (SELECT 1 FROM issued_slugs WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'UNIQUE constraint failed: issued_slugs.slug');
END;

CREATE TRIGGER IF NOT EXISTS reject_reissued_audience_slug_on_rename
BEFORE UPDATE OF slug ON audience_entries
WHEN NEW.slug <> OLD.slug
  AND EXISTS (SELECT 1 FROM issued_slugs WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'UNIQUE constraint failed: issued_slugs.slug');
END;

CREATE TRIGGER IF NOT EXISTS reserve_inserted_audience_slug
AFTER INSERT ON audience_entries
BEGIN
  INSERT INTO issued_slugs (slug) VALUES (NEW.slug);
END;

CREATE TRIGGER IF NOT EXISTS reserve_renamed_audience_slug
AFTER UPDATE OF slug ON audience_entries
WHEN NEW.slug <> OLD.slug
BEGIN
  INSERT INTO issued_slugs (slug) VALUES (NEW.slug);
END;
