-- The page fingerprints last sent to IndexNow (dist/indexnow.json), so each page is sent only when it changes.
CREATE TABLE indexnow (
  url TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  sent_at TEXT NOT NULL
);
