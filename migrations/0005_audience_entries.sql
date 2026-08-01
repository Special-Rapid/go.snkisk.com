-- Apply after 0004_og_preview.sql. Fresh databases should use schema.sql instead.
CREATE TABLE audience_entries (
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

CREATE INDEX idx_audience_entries_parent ON audience_entries(parent_link_id);
CREATE INDEX idx_audience_entries_slug ON audience_entries(slug);
CREATE INDEX idx_audience_entries_expires_at ON audience_entries(expires_at);

CREATE TRIGGER reject_reissued_audience_slug_on_insert
BEFORE INSERT ON audience_entries
WHEN EXISTS (SELECT 1 FROM issued_slugs WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'UNIQUE constraint failed: issued_slugs.slug');
END;

CREATE TRIGGER reject_reissued_audience_slug_on_rename
BEFORE UPDATE OF slug ON audience_entries
WHEN NEW.slug <> OLD.slug
  AND EXISTS (SELECT 1 FROM issued_slugs WHERE slug = NEW.slug)
BEGIN
  SELECT RAISE(ABORT, 'UNIQUE constraint failed: issued_slugs.slug');
END;

CREATE TRIGGER reserve_inserted_audience_slug
AFTER INSERT ON audience_entries
BEGIN
  INSERT INTO issued_slugs (slug) VALUES (NEW.slug);
END;

CREATE TRIGGER reserve_renamed_audience_slug
AFTER UPDATE OF slug ON audience_entries
WHEN NEW.slug <> OLD.slug
BEGIN
  INSERT INTO issued_slugs (slug) VALUES (NEW.slug);
END;
