CREATE TABLE links (
  code TEXT NOT NULL PRIMARY KEY CHECK (length(code) = 8),
  destination_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0 CHECK (click_count >= 0)
) STRICT;
