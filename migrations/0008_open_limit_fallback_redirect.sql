-- Optional destination used only after a link's configurable open limit is reached.
ALTER TABLE links ADD COLUMN limit_reached_target_url TEXT;
