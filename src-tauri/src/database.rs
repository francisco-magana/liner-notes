//! The SQLite database: schema, connection and ids. Same file format as the Node server's.
use std::{fs, path::Path};

use rusqlite::Connection;

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS art (
  id   TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS songs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  album       TEXT NOT NULL DEFAULT '',
  year        TEXT NOT NULL DEFAULT '',
  genre       TEXT NOT NULL DEFAULT '',
  rating      INTEGER NOT NULL DEFAULT 0,
  moods       TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
  lyrics      TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '{}',  -- JSON object: lyric line index -> note
  art_id      TEXT REFERENCES art(id) ON DELETE SET NULL,
  first_heard TEXT NOT NULL DEFAULT '',
  created     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reflections (
  id      TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  date    TEXT NOT NULL,
  text    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reflections_song ON reflections(song_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
";

/// Opens the SQLite database, creating the file and tables when needed.
pub fn open_database(file_path: &Path) -> Result<Connection, Box<dyn std::error::Error>> {
    if let Some(folder) = file_path.parent() {
        fs::create_dir_all(folder)?;
    }
    let db = Connection::open(file_path)?;
    prepare(&db)?;
    Ok(db)
}

/// An empty database in memory, for tests.
#[cfg(test)]
pub fn open_in_memory() -> Connection {
    let db = Connection::open_in_memory().unwrap();
    prepare(&db).unwrap();
    db
}

fn prepare(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
    db.execute_batch(SCHEMA)
}

/// A short random id for new rows.
pub fn new_id() -> String {
    uuid::Uuid::new_v4().simple().to_string()[..12].to_string()
}
