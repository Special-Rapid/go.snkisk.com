-- Apply after 0002_link_behaviors.sql to add opt-in public share cards.
-- Fresh databases should use schema.sql instead.
ALTER TABLE links ADD COLUMN share_card_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE links ADD COLUMN share_card_title TEXT;
ALTER TABLE links ADD COLUMN share_card_description TEXT;
