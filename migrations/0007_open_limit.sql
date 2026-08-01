-- Apply after 0006_link_invitation_expiry.sql to replace one-time-only links
-- with a configurable maximum number of opens.
ALTER TABLE links ADD COLUMN max_open_count INTEGER;
ALTER TABLE links ADD COLUMN open_count INTEGER NOT NULL DEFAULT 0;

-- Preserve existing one-time links: unused links have one remaining open,
-- and used links remain terminal after the migration.
UPDATE links
SET max_open_count = 1,
    open_count = CASE WHEN used_at IS NULL THEN 0 ELSE 1 END
WHERE one_time = 1;
