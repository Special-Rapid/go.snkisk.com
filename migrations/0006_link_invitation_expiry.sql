-- Apply after 0005_audience_entries.sql to add expiry settings to parent links.
-- Fresh databases should use schema.sql instead.
ALTER TABLE links ADD COLUMN expires_at TEXT;
ALTER TABLE links ADD COLUMN ended_message TEXT;

CREATE INDEX idx_links_expires_at ON links(expires_at);
