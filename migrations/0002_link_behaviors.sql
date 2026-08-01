-- Apply this file once to an existing D1 database that was created with the
-- pre-2026-07-22 schema. Fresh databases should use schema.sql instead.
ALTER TABLE links ADD COLUMN scheduled_target_url TEXT;
ALTER TABLE links ADD COLUMN switch_at TEXT;
ALTER TABLE links ADD COLUMN unlock_at TEXT;
ALTER TABLE links ADD COLUMN receipt_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE links ADD COLUMN receipt_confirmed_at TEXT;
ALTER TABLE links ADD COLUMN passphrase_salt TEXT;
ALTER TABLE links ADD COLUMN passphrase_hash TEXT;
ALTER TABLE links ADD COLUMN passphrase_iterations INTEGER;
ALTER TABLE links ADD COLUMN state_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_links_switch_at ON links(switch_at);
CREATE INDEX IF NOT EXISTS idx_links_unlock_at ON links(unlock_at);
