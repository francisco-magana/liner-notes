//! The `reflections` table. Every change returns the updated song, so the frontend can
//! replace its copy in one go.
use rusqlite::{Connection, params};
use serde_json::Value;

use super::{
    songs,
    songs::Song,
    validation::{to_iso_date, validate_reflection_text},
};
use crate::database::new_id;
use crate::error::{AppResult, not_found};

fn assert_exists(db: &Connection, song_id: &str, reflection_id: &str) -> AppResult<()> {
    let exists = db
        .prepare_cached("SELECT 1 FROM reflections WHERE id = ? AND song_id = ?")?
        .exists([reflection_id, song_id])?;
    if !exists {
        return Err(not_found("REFLECTION NOT FOUND"));
    }
    Ok(())
}

/// Adds a reflection from `{ text, date }`. `date` defaults to now.
pub fn add(db: &Connection, song_id: &str, input: &Value) -> AppResult<Song> {
    songs::get(db, song_id)?; // Fails when the song does not exist.
    let text = validate_reflection_text(input.get("text"))?;
    db.prepare_cached("INSERT INTO reflections (id, song_id, date, text) VALUES (?, ?, ?, ?)")?
        .execute(params![
            new_id(),
            song_id,
            to_iso_date(input.get("date")),
            text
        ])?;
    songs::get(db, song_id)
}

/// Changes a reflection's text; its date stays the same.
pub fn update(
    db: &Connection,
    song_id: &str,
    reflection_id: &str,
    input: &Value,
) -> AppResult<Song> {
    assert_exists(db, song_id, reflection_id)?;
    let text = validate_reflection_text(input.get("text"))?;
    db.prepare_cached("UPDATE reflections SET text = ? WHERE id = ?")?
        .execute([&text, reflection_id])?;
    songs::get(db, song_id)
}

pub fn remove(db: &Connection, song_id: &str, reflection_id: &str) -> AppResult<Song> {
    assert_exists(db, song_id, reflection_id)?;
    db.prepare_cached("DELETE FROM reflections WHERE id = ?")?
        .execute([reflection_id])?;
    songs::get(db, song_id)
}
