//! The `art` table: album art images stored as BLOBs. Songs from the same album can share one row.
use rusqlite::{Connection, OptionalExtension, params};

use crate::art_input::{ArtChange, Image};
use crate::database::new_id;
use crate::error::{AppResult, bad_request};

/// A stored image, or None.
pub fn get(db: &Connection, art_id: &str) -> AppResult<Option<Image>> {
    let image = db
        .prepare_cached("SELECT mime, data FROM art WHERE id = ?")?
        .query_row([art_id], |row| {
            Ok(Image {
                mime: row.get(0)?,
                data: row.get(1)?,
            })
        })
        .optional()?;
    Ok(image)
}

/// Stores an image and returns its new id.
pub fn insert(db: &Connection, image: &Image) -> AppResult<String> {
    let art_id = new_id();
    db.prepare_cached("INSERT INTO art (id, mime, data) VALUES (?, ?, ?)")?
        .execute(params![art_id, image.mime, image.data])?;
    Ok(art_id)
}

/// Applies an art change and returns the art id the song should point at.
pub fn apply_change(
    db: &Connection,
    change: &ArtChange,
    current_art_id: Option<String>,
) -> AppResult<Option<String>> {
    match change {
        ArtChange::Keep => Ok(current_art_id),
        ArtChange::Remove => Ok(None),
        ArtChange::Existing(art_id) => {
            let exists = db
                .prepare_cached("SELECT 1 FROM art WHERE id = ?")?
                .exists([art_id])?;
            if !exists {
                return Err(bad_request("ALBUM ART NOT FOUND"));
            }
            Ok(Some(art_id.clone()))
        }
        ArtChange::New(image) => Ok(Some(insert(db, image)?)),
    }
}

/// Removes images that no song uses anymore.
pub fn delete_unused(db: &Connection) -> AppResult<()> {
    db.prepare_cached(
        "DELETE FROM art WHERE id NOT IN (SELECT art_id FROM songs WHERE art_id IS NOT NULL)",
    )?
    .execute([])?;
    Ok(())
}
