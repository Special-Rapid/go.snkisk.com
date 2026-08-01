-- Apply after 0003_share_card.sql to add opt-in social preview snapshots.
-- Fresh databases should use schema.sql instead.
ALTER TABLE links ADD COLUMN preview_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE links ADD COLUMN og_title TEXT;
ALTER TABLE links ADD COLUMN og_description TEXT;
ALTER TABLE links ADD COLUMN og_image_url TEXT;
