//! The Tauri desktop app: the Liner Notes backend in Rust, with the frontend from public/.
//! The database lives in the app's data folder, e.g.
//! ~/Library/Application Support/com.franciscomagana.linernotes/ on macOS.
mod art_input;
mod commands;
mod database;
mod error;
mod spotify;
mod store;

use std::{borrow::Cow, path::PathBuf};

use tauri::{
    Manager,
    http::{Response, StatusCode, header},
};

use commands::AppState;

/// `DB_PATH` is only meant for testing; normally the database sits in the app's data folder.
fn database_path(app: &tauri::App) -> tauri::Result<PathBuf> {
    match std::env::var_os("DB_PATH") {
        Some(path) => Ok(PathBuf::from(path)),
        None => Ok(app.path().app_data_dir()?.join("linernotes.db")),
    }
}

/// Serves stored album art at art://localhost/<id> (see art_input::art_url).
fn album_art_response(state: &AppState, path: &str) -> Response<Cow<'static, [u8]>> {
    let art_id = path.trim_start_matches('/');
    match store::album_art::get(&state.db(), art_id) {
        Ok(Some(image)) => Response::builder()
            .header(header::CONTENT_TYPE, image.mime)
            // A stored image never changes (a new image gets a new id), so it can be cached forever.
            .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
            .body(Cow::Owned(image.data)),
        _ => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Cow::Borrowed(&[][..])),
    }
    .expect("valid response")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Only one copy of the app may run, since both would write to the same database.
    // macOS already does this for apps.
    #[cfg(not(target_os = "macos"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }));

    builder
        .setup(|app| {
            let path = database_path(app)?;
            let db = database::open_database(&path)
                .map_err(|error| format!("Couldn't open {}: {error}", path.display()))?;
            println!("Database: {}", path.display());
            app.manage(AppState::new(db));
            Ok(())
        })
        .register_uri_scheme_protocol("art", |context, request| {
            album_art_response(
                &context.app_handle().state::<AppState>(),
                request.uri().path(),
            )
        })
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap,
            commands::save_settings,
            commands::create_song,
            commands::update_song,
            commands::delete_song,
            commands::add_reflection,
            commands::update_reflection,
            commands::delete_reflection,
            commands::test_spotify,
            commands::spotify_search,
            commands::import_album,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Liner Notes");
}
