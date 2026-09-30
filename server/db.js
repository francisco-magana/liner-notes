import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
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
`;

export function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fresh = !fs.existsSync(file);
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return { db, fresh };
}

export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
