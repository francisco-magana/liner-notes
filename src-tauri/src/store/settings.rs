//! The `settings` table: key/value pairs for the theme and Spotify credentials.
use std::collections::HashMap;

use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value;

use super::validation::clean_text;
use crate::error::AppResult;

const THEMES: [&str; 2] = ["light", "dark"];
const MAX_SETTING_LENGTH: usize = 200;

/// API field name → key in the settings table.
const STORAGE_KEYS: [(&str, &str); 3] = [
    ("theme", "theme"),
    ("clientId", "spotifyClientId"),
    ("clientSecret", "spotifySecret"),
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub client_id: String,
    pub client_secret: String,
}

/// '' means "follow the system theme".
fn clean_theme(value: &str) -> String {
    if THEMES.contains(&value) {
        value.to_string()
    } else {
        String::new()
    }
}

pub fn get(db: &Connection) -> AppResult<Settings> {
    let stored: HashMap<String, String> = db
        .prepare_cached("SELECT key, value FROM settings")?
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<rusqlite::Result<_>>()?;
    let value = |key: &str| stored.get(key).cloned().unwrap_or_default();
    Ok(Settings {
        theme: clean_theme(&value("theme")),
        client_id: value("spotifyClientId"),
        client_secret: value("spotifySecret"),
    })
}

/// Saves the fields present in `input`; others keep their value. Returns all settings.
pub fn save(db: &Connection, input: &Value) -> AppResult<Settings> {
    let transaction = db.unchecked_transaction()?;
    for (field, storage_key) in STORAGE_KEYS {
        let Some(value) = input.get(field) else {
            continue;
        };
        let value = clean_text(Some(value), MAX_SETTING_LENGTH);
        let value = if field == "theme" {
            clean_theme(&value)
        } else {
            value
        };
        transaction
            .prepare_cached("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")?
            .execute([storage_key, &value])?;
    }
    transaction.commit()?;
    get(db)
}
