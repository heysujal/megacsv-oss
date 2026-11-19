-- One row per message sent from the Feedback button.
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  kind TEXT NOT NULL,          -- problem, idea or other
  message TEXT NOT NULL,
  email TEXT NOT NULL,
  app_version TEXT NOT NULL,
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  file_size TEXT NOT NULL
);
