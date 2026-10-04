//! The commands public/api.js calls, one per endpoint of the Node server's /api.
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;
use serde_json::{Value, json};
use tauri::State;

use crate::art_input::{self, parse_art_input};
use crate::error::{AppResult, bad_request};
use crate::spotify::{Credentials, Spotify, join_artist_names, largest_image_url};
use crate::store::{reflections, settings, settings::Settings, songs, songs::Song};

pub struct AppState {
    db: Mutex<Connection>,
    http: reqwest::Client,
    spotify: Spotify,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        let http = reqwest::Client::new();
        Self {
            db: Mutex::new(db),
            spotify: Spotify::new(http.clone()),
            http,
        }
    }

    /// The database connection. Not to be held across an `.await`.
    pub fn db(&self) -> MutexGuard<'_, Connection> {
        self.db
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn spotify_credentials(&self) -> AppResult<Credentials> {
        let Settings {
            client_id,
            client_secret,
            ..
        } = settings::get(&self.db())?;
        Ok(Credentials {
            client_id,
            client_secret,
        })
    }
}

/// Everything the app needs on first load.
#[tauri::command]
pub fn bootstrap(state: State<AppState>) -> AppResult<Value> {
    let db = state.db();
    Ok(json!({ "songs": songs::list(&db)?, "settings": settings::get(&db)? }))
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, changes: Value) -> AppResult<Settings> {
    settings::save(&state.db(), &changes)
}

#[tauri::command]
pub async fn create_song(state: State<'_, AppState>, song: Value) -> AppResult<Song> {
    let art_change = parse_art_input(song.get("art"), &state.http).await?;
    songs::create(&state.db(), &song, &art_change)
}

#[tauri::command]
pub async fn update_song(
    state: State<'_, AppState>,
    song_id: String,
    changes: Value,
) -> AppResult<Song> {
    let art_change = parse_art_input(changes.get("art"), &state.http).await?;
    songs::update(&state.db(), &song_id, &changes, &art_change)
}

#[tauri::command]
pub fn delete_song(state: State<AppState>, song_id: String) -> AppResult<()> {
    songs::remove(&state.db(), &song_id)
}

// Reflections. Each returns the updated song.

#[tauri::command]
pub fn add_reflection(
    state: State<AppState>,
    song_id: String,
    reflection: Value,
) -> AppResult<Song> {
    reflections::add(&state.db(), &song_id, &reflection)
}

#[tauri::command]
pub fn update_reflection(
    state: State<AppState>,
    song_id: String,
    reflection_id: String,
    changes: Value,
) -> AppResult<Song> {
    reflections::update(&state.db(), &song_id, &reflection_id, &changes)
}

#[tauri::command]
pub fn delete_reflection(
    state: State<AppState>,
    song_id: String,
    reflection_id: String,
) -> AppResult<Song> {
    reflections::remove(&state.db(), &song_id, &reflection_id)
}

// Spotify: credential check, search and whole-album import.

/// `credentials` is `{ clientId, clientSecret }`, checked before they are saved.
#[tauri::command]
pub async fn test_spotify(state: State<'_, AppState>, credentials: Value) -> AppResult<Value> {
    let field = |name: &str| {
        credentials[name]
            .as_str()
            .unwrap_or_default()
            .trim()
            .to_string()
    };
    let credentials = Credentials {
        client_id: field("clientId"),
        client_secret: field("clientSecret"),
    };
    state.spotify.test_credentials(&credentials).await?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
pub async fn spotify_search(
    state: State<'_, AppState>,
    kind: String,
    query: String,
) -> AppResult<Value> {
    let query = query.trim();
    if query.is_empty() {
        return Err(bad_request("TYPE SOMETHING TO SEARCH"));
    }
    let credentials = state.spotify_credentials()?;
    Ok(json!({ "items": state.spotify.search(&credentials, &kind, query).await? }))
}

/// Adds every track of an album. `request` is `{ albumId, genre, firstHeard }`; genre and
/// first-heard date come from the song form.
#[tauri::command]
pub async fn import_album(state: State<'_, AppState>, request: Value) -> AppResult<Value> {
    let album_id = request["albumId"].as_str().unwrap_or_default();
    let credentials = state.spotify_credentials()?;
    let (album, tracks) = state
        .spotify
        .album_with_tracks(&credentials, album_id)
        .await?;

    let year: String = album["release_date"]
        .as_str()
        .unwrap_or_default()
        .chars()
        .take(4)
        .collect();
    let songs: Vec<Value> = tracks
        .iter()
        .map(|track| {
            json!({
                "title": track["name"],
                "artist": join_artist_names(&track["artists"]),
                "album": album["name"],
                "year": year,
                "genre": request.get("genre").unwrap_or(&json!("")),
                "firstHeard": request.get("firstHeard").unwrap_or(&json!("")),
            })
        })
        .collect();

    // A failed cover download doesn't stop the import.
    let cover = match largest_image_url(&album["images"]) {
        Some(url) => art_input::download_image(&state.http, url).await.ok(),
        None => None,
    };
    let added = songs::import_many(&state.db(), &songs, cover.as_ref())?;
    Ok(json!({ "album": album["name"], "added": added }))
}
