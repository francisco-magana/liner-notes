//! Cleans up values sent by the frontend before they reach the database.
//! Mirrors server/store/validation.js.
use chrono::{DateTime, NaiveDate, SecondsFormat, Utc};
use serde_json::{Map, Value};

use crate::error::{AppResult, bad_request};

pub const MAX_TEXT: usize = 300;
const MAX_GENRE: usize = 100;
const MAX_YEAR: usize = 10;
const MAX_DATE: usize = 10;
const MAX_MOOD: usize = 40;
const MAX_NOTE: usize = 5000;
const MAX_LYRICS: usize = 100_000;
const MAX_REFLECTION: usize = 100_000;

/// Any value as text, like JavaScript's `String(value)` ('' for null or missing).
fn to_text(value: Option<&Value>) -> String {
    match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(text)) => text.clone(),
        Some(other) => other.to_string(),
    }
}

/// Any value as a trimmed string of at most `max_length` characters.
pub fn clean_text(value: Option<&Value>, max_length: usize) -> String {
    to_text(value).trim().chars().take(max_length).collect()
}

/// Validated song fields. With a partial validation, missing fields are `None`.
#[derive(Debug, Default)]
pub struct SongFields {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub rating: Option<i64>,
    pub moods: Option<Vec<String>>,
    pub lyrics: Option<String>,
    pub notes: Option<Map<String, Value>>,
    pub first_heard: Option<String>,
}

/// Validates the song fields in a request. Title and artist are required.
/// With `partial` (for updates), only the fields present in `input` are checked and returned.
pub fn validate_song(input: &Value, partial: bool) -> AppResult<SongFields> {
    let Some(input) = input.as_object() else {
        return Err(bad_request("INVALID SONG"));
    };
    let is_present = |field: &str| !partial || input.contains_key(field);
    let field = |name: &str| input.get(name);
    let mut song = SongFields::default();

    for (name, slot) in [("title", &mut song.title), ("artist", &mut song.artist)] {
        if !is_present(name) {
            continue;
        }
        let value = clean_text(field(name), MAX_TEXT);
        if value.is_empty() {
            return Err(bad_request(format!("{} IS REQUIRED", name.to_uppercase())));
        }
        *slot = Some(value);
    }
    if is_present("album") {
        song.album = Some(clean_text(field("album"), MAX_TEXT));
    }
    if is_present("genre") {
        song.genre = Some(clean_text(field("genre"), MAX_GENRE));
    }
    if is_present("year") {
        song.year = Some(clean_text(field("year"), MAX_YEAR));
    }
    if is_present("firstHeard") {
        song.first_heard = Some(clean_text(field("firstHeard"), MAX_DATE));
    }
    if is_present("rating") {
        song.rating = Some(clean_rating(field("rating")));
    }
    if is_present("moods") {
        song.moods = Some(clean_moods(field("moods")));
    }
    if is_present("lyrics") {
        song.lyrics = Some(clean_lyrics(field("lyrics")));
    }
    if is_present("notes") {
        song.notes = Some(clean_notes(field("notes")));
    }
    Ok(song)
}

/// A whole number of stars from 0 to 5.
fn clean_rating(value: Option<&Value>) -> i64 {
    let number = match value {
        Some(Value::Number(number)) => number.as_f64().unwrap_or(0.0),
        Some(Value::String(text)) => text.trim().parse().unwrap_or(0.0),
        Some(Value::Bool(true)) => 1.0,
        _ => 0.0,
    };
    if number.is_nan() {
        0
    } else {
        number.round().clamp(0.0, 5.0) as i64
    }
}

/// Uppercase, unique, non-empty mood names.
fn clean_moods(moods: Option<&Value>) -> Vec<String> {
    let mut cleaned: Vec<String> = Vec::new();
    for mood in moods.and_then(Value::as_array).into_iter().flatten() {
        let mood = clean_text(Some(mood), MAX_MOOD).to_uppercase();
        if !mood.is_empty() && !cleaned.contains(&mood) {
            cleaned.push(mood);
        }
    }
    cleaned
}

/// Keeps leading whitespace and blank lines (they are section breaks); drops only trailing whitespace.
fn clean_lyrics(lyrics: Option<&Value>) -> String {
    to_text(lyrics)
        .trim_end()
        .chars()
        .take(MAX_LYRICS)
        .collect()
}

/// Keeps only non-empty notes keyed by a lyric line index.
fn clean_notes(notes: Option<&Value>) -> Map<String, Value> {
    let mut cleaned = Map::new();
    for (line_index, note) in notes.and_then(Value::as_object).into_iter().flatten() {
        let text = clean_text(Some(note), MAX_NOTE);
        let is_line_index =
            !line_index.is_empty() && line_index.bytes().all(|byte| byte.is_ascii_digit());
        if is_line_index && !text.is_empty() {
            cleaned.insert(line_index.clone(), Value::String(text));
        }
    }
    cleaned
}

pub fn validate_reflection_text(text: Option<&Value>) -> AppResult<String> {
    let cleaned = clean_text(text, MAX_REFLECTION);
    if cleaned.is_empty() {
        return Err(bad_request("WRITE SOMETHING FIRST"));
    }
    Ok(cleaned)
}

/// A time as JavaScript's `toISOString()` writes it: 2026-10-03T12:00:00.000Z
pub fn iso_string(time: DateTime<Utc>) -> String {
    time.to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// A valid date string as ISO, or now when it is missing or unreadable.
pub fn to_iso_date(value: Option<&Value>) -> String {
    let text = value.and_then(Value::as_str).unwrap_or("").trim();
    let parsed = DateTime::parse_from_rfc3339(text)
        .map(|time| time.with_timezone(&Utc))
        .ok()
        .or_else(|| {
            // A date alone means midnight UTC, as in JavaScript.
            let date = NaiveDate::parse_from_str(text, "%Y-%m-%d").ok()?;
            Some(date.and_hms_opt(0, 0, 0)?.and_utc())
        });
    iso_string(parsed.unwrap_or_else(Utc::now))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn requires_title_and_artist() {
        let error = validate_song(&json!({ "title": "  ", "artist": "A" }), false).unwrap_err();
        assert_eq!(error.message, "TITLE IS REQUIRED");
        assert!(validate_song(&json!("nope"), false).is_err());
    }

    #[test]
    fn partial_only_returns_present_fields() {
        let song = validate_song(&json!({ "rating": "4.6" }), true).unwrap();
        assert_eq!(song.rating, Some(5));
        assert!(song.title.is_none() && song.moods.is_none());
    }

    #[test]
    fn cleans_values() {
        let song = validate_song(
            &json!({
                "title": " Song ", "artist": "Band", "rating": -3,
                "moods": ["calm", "CALM", " ", "sad"],
                "lyrics": "  first\n\nsecond  \n\n",
                "notes": { "0": " hi ", "x": "skip", "2": "" }
            }),
            false,
        )
        .unwrap();
        assert_eq!(song.title.as_deref(), Some("Song"));
        assert_eq!(song.rating, Some(0));
        assert_eq!(song.moods.unwrap(), vec!["CALM", "SAD"]);
        assert_eq!(song.lyrics.as_deref(), Some("  first\n\nsecond"));
        assert_eq!(Value::Object(song.notes.unwrap()), json!({ "0": "hi" }));
    }

    #[test]
    fn dates() {
        assert_eq!(
            to_iso_date(Some(&json!("2026-10-03T08:15:00.000Z"))),
            "2026-10-03T08:15:00.000Z"
        );
        assert_eq!(
            to_iso_date(Some(&json!("2026-10-03"))),
            "2026-10-03T00:00:00.000Z"
        );
        assert!(to_iso_date(Some(&json!("garbage"))).ends_with('Z'));
    }
}
