//! The `songs` table. Every function that returns a song returns the full API shape,
//! reflections included. Mirrors server/store/songs.js.
use std::collections::{HashMap, HashSet};

use chrono::{Duration, Utc};
use rusqlite::{
    Connection, OptionalExtension, Row, named_params, params_from_iter, types::Value as SqlValue,
};
use serde::Serialize;
use serde_json::Value;

use super::{
    album_art,
    validation::{SongFields, iso_string, validate_song},
};
use crate::art_input::{ArtChange, Image, art_url};
use crate::database::new_id;
use crate::error::{AppResult, not_found};

#[derive(Debug, Serialize)]
pub struct Reflection {
    pub id: String,
    pub date: String,
    pub text: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Song {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub year: String,
    pub genre: String,
    pub rating: i64,
    pub moods: Value,
    pub lyrics: String,
    pub notes: Value,
    pub art: Option<String>,
    pub first_heard: String,
    pub created: String,
    pub reflections: Vec<Reflection>,
}

const SONG_COLUMNS: &str = "id, title, artist, album, year, genre, rating, moods, lyrics, notes, art_id, first_heard, created";

/// A songs row, before its reflections are added.
struct SongRow {
    song: Song,
    art_id: Option<String>,
}

fn read_song_row(row: &Row) -> rusqlite::Result<SongRow> {
    let json = |index: usize| -> rusqlite::Result<Value> {
        let text: String = row.get(index)?;
        Ok(serde_json::from_str(&text).unwrap_or(Value::Null))
    };
    let art_id: Option<String> = row.get(10)?;
    Ok(SongRow {
        song: Song {
            id: row.get(0)?,
            title: row.get(1)?,
            artist: row.get(2)?,
            album: row.get(3)?,
            year: row.get(4)?,
            genre: row.get(5)?,
            rating: row.get(6)?,
            moods: json(7)?,
            lyrics: row.get(8)?,
            notes: json(9)?,
            art: art_url(art_id.as_deref()),
            first_heard: row.get(11)?,
            created: row.get(12)?,
            reflections: Vec::new(),
        },
        art_id,
    })
}

fn read_reflection(row: &Row) -> rusqlite::Result<(String, Reflection)> {
    Ok((
        row.get(0)?,
        Reflection {
            id: row.get(1)?,
            date: row.get(2)?,
            text: row.get(3)?,
        },
    ))
}

fn find_row(db: &Connection, song_id: &str) -> AppResult<SongRow> {
    db.prepare_cached(&format!("SELECT {SONG_COLUMNS} FROM songs WHERE id = ?"))?
        .query_row([song_id], read_song_row)
        .optional()?
        .ok_or_else(|| not_found("SONG NOT FOUND"))
}

/// Every song, newest first.
pub fn list(db: &Connection) -> AppResult<Vec<Song>> {
    let mut reflections_by_song: HashMap<String, Vec<Reflection>> = HashMap::new();
    let mut reflections =
        db.prepare_cached("SELECT song_id, id, date, text FROM reflections ORDER BY date")?;
    for reflection in reflections.query_map([], read_reflection)? {
        let (song_id, reflection) = reflection?;
        reflections_by_song
            .entry(song_id)
            .or_default()
            .push(reflection);
    }

    let mut songs = db.prepare_cached(&format!(
        "SELECT {SONG_COLUMNS} FROM songs ORDER BY created DESC"
    ))?;
    let rows = songs.query_map([], read_song_row)?;
    rows.map(|row| {
        let mut song = row?.song;
        song.reflections = reflections_by_song.remove(&song.id).unwrap_or_default();
        Ok(song)
    })
    .collect()
}

pub fn get(db: &Connection, song_id: &str) -> AppResult<Song> {
    let mut song = find_row(db, song_id)?.song;
    song.reflections = db
        .prepare_cached(
            "SELECT song_id, id, date, text FROM reflections WHERE song_id = ? ORDER BY date",
        )?
        .query_map([song_id], read_reflection)?
        .map(|row| row.map(|(_, reflection)| reflection))
        .collect::<rusqlite::Result<_>>()?;
    Ok(song)
}

/// Inserts already-validated fields and returns the new song's id.
fn insert_row(
    db: &Connection,
    fields: &SongFields,
    art_id: Option<&str>,
    created: &str,
) -> AppResult<String> {
    let song_id = new_id();
    let text = |value: &Option<String>| value.clone().unwrap_or_default();
    db.prepare_cached(&format!(
        "INSERT INTO songs ({SONG_COLUMNS})
         VALUES (:id, :title, :artist, :album, :year, :genre, :rating, :moods, :lyrics, :notes, :art_id, :first_heard, :created)"
    ))?
    .execute(named_params! {
        ":id": song_id,
        ":title": text(&fields.title),
        ":artist": text(&fields.artist),
        ":album": text(&fields.album),
        ":year": text(&fields.year),
        ":genre": text(&fields.genre),
        ":rating": fields.rating.unwrap_or(0),
        ":moods": serde_json::to_string(&fields.moods.clone().unwrap_or_default())?,
        ":lyrics": text(&fields.lyrics),
        ":notes": serde_json::to_string(&fields.notes.clone().unwrap_or_default())?,
        ":art_id": art_id,
        ":first_heard": text(&fields.first_heard),
        ":created": created,
    })?;
    Ok(song_id)
}

/// Adds a song.
pub fn create(db: &Connection, input: &Value, art_change: &ArtChange) -> AppResult<Song> {
    let fields = validate_song(input, false)?;
    let transaction = db.unchecked_transaction()?;
    let art_id = album_art::apply_change(&transaction, art_change, None)?;
    let song_id = insert_row(
        &transaction,
        &fields,
        art_id.as_deref(),
        &iso_string(Utc::now()),
    )?;
    transaction.commit()?;
    get(db, &song_id)
}

/// The changed columns and their new values.
fn column_changes(fields: SongFields) -> AppResult<Vec<(&'static str, SqlValue)>> {
    let mut changes: Vec<(&'static str, SqlValue)> = Vec::new();
    let texts = [
        ("title", fields.title),
        ("artist", fields.artist),
        ("album", fields.album),
        ("year", fields.year),
        ("genre", fields.genre),
        ("lyrics", fields.lyrics),
        ("first_heard", fields.first_heard),
    ];
    for (column, value) in texts {
        if let Some(value) = value {
            changes.push((column, SqlValue::Text(value)));
        }
    }
    if let Some(rating) = fields.rating {
        changes.push(("rating", SqlValue::Integer(rating)));
    }
    if let Some(moods) = fields.moods {
        changes.push(("moods", SqlValue::Text(serde_json::to_string(&moods)?)));
    }
    if let Some(notes) = fields.notes {
        changes.push(("notes", SqlValue::Text(serde_json::to_string(&notes)?)));
    }
    Ok(changes)
}

/// Changes only the fields present in `input`.
pub fn update(
    db: &Connection,
    song_id: &str,
    input: &Value,
    art_change: &ArtChange,
) -> AppResult<Song> {
    let mut changes = column_changes(validate_song(input, true)?)?;
    let transaction = db.unchecked_transaction()?;
    let row = find_row(&transaction, song_id)?;
    let art_id = album_art::apply_change(&transaction, art_change, row.art_id.clone())?;
    if art_id != row.art_id {
        changes.push(("art_id", art_id.map_or(SqlValue::Null, SqlValue::Text)));
    }

    if !changes.is_empty() {
        let assignments = changes
            .iter()
            .map(|(column, _)| format!("{column} = ?"))
            .collect::<Vec<_>>()
            .join(", ");
        let values = changes
            .into_iter()
            .map(|(_, value)| value)
            .chain([SqlValue::Text(song_id.to_string())]);
        transaction.execute(
            &format!("UPDATE songs SET {assignments} WHERE id = ?"),
            params_from_iter(values),
        )?;
    }
    album_art::delete_unused(&transaction)?;
    transaction.commit()?;
    get(db, song_id)
}

/// Deletes a song; its reflections go with it (ON DELETE CASCADE).
pub fn remove(db: &Connection, song_id: &str) -> AppResult<()> {
    let transaction = db.unchecked_transaction()?;
    if transaction.execute("DELETE FROM songs WHERE id = ?", [song_id])? == 0 {
        return Err(not_found("SONG NOT FOUND"));
    }
    album_art::delete_unused(&transaction)?;
    transaction.commit()?;
    Ok(())
}

/// Used to spot duplicates: two songs match when title and artist match, ignoring case.
fn duplicate_key(title: &str, artist: &str) -> String {
    format!("{title}§{artist}").to_lowercase()
}

/// Adds many songs that share one image (an album import), skipping any whose title
/// and artist are already in the library. Returns the added songs.
pub fn import_many(
    db: &Connection,
    inputs: &[Value],
    image: Option<&Image>,
) -> AppResult<Vec<Song>> {
    let transaction = db.unchecked_transaction()?;
    let mut existing: HashSet<String> = transaction
        .prepare_cached("SELECT title, artist FROM songs")?
        .query_map([], |row| {
            Ok(duplicate_key(
                &row.get::<_, String>(0)?,
                &row.get::<_, String>(1)?,
            ))
        })?
        .collect::<rusqlite::Result<_>>()?;

    let mut new_songs = Vec::new();
    for input in inputs {
        let song = validate_song(input, false)?;
        let key = duplicate_key(
            song.title.as_deref().unwrap_or(""),
            song.artist.as_deref().unwrap_or(""),
        );
        if existing.insert(key) {
            new_songs.push(song);
        }
    }
    if new_songs.is_empty() {
        return Ok(Vec::new());
    }

    let art_id = image
        .map(|image| album_art::insert(&transaction, image))
        .transpose()?;
    // One second apart, so the "recent" sort keeps the album's track order.
    let now = Utc::now();
    let added_ids = new_songs
        .iter()
        .enumerate()
        .map(|(index, song)| {
            let created = iso_string(now - Duration::seconds(index as i64));
            insert_row(&transaction, song, art_id.as_deref(), &created)
        })
        .collect::<AppResult<Vec<_>>>()?;
    transaction.commit()?;
    added_ids.iter().map(|song_id| get(db, song_id)).collect()
}
