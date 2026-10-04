//! All database access, one module per table, plus input validation.
pub mod album_art;
pub mod reflections;
pub mod settings;
pub mod songs;
pub mod validation;

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::art_input::{ArtChange, Image};
    use crate::database::open_in_memory;

    fn image() -> Image {
        Image {
            mime: "image/png".into(),
            data: vec![1, 2, 3],
        }
    }

    #[test]
    fn song_lifecycle() {
        let db = open_in_memory();
        let song = songs::create(
            &db,
            &json!({ "title": "A", "artist": "B", "moods": ["calm"] }),
            &ArtChange::New(image()),
        )
        .unwrap();
        assert!(song.art.is_some());
        assert_eq!(song.moods, json!(["CALM"]));

        let song = songs::update(
            &db,
            &song.id,
            &json!({ "rating": 4, "notes": { "1": "x" } }),
            &ArtChange::Keep,
        )
        .unwrap();
        assert_eq!(
            (song.rating, song.title.as_str(), song.notes.clone()),
            (4, "A", json!({ "1": "x" }))
        );
        assert!(song.art.is_some());

        let song = reflections::add(&db, &song.id, &json!({ "text": "thoughts" })).unwrap();
        let reflection_id = song.reflections[0].id.clone();
        let song =
            reflections::update(&db, &song.id, &reflection_id, &json!({ "text": "more" })).unwrap();
        assert_eq!(song.reflections[0].text, "more");

        // Removing the art also deletes the unused image.
        songs::update(&db, &song.id, &json!({}), &ArtChange::Remove).unwrap();
        let art_rows: i64 = db
            .query_row("SELECT COUNT(*) FROM art", [], |row| row.get(0))
            .unwrap();
        assert_eq!(art_rows, 0);

        songs::remove(&db, &song.id).unwrap();
        assert!(songs::list(&db).unwrap().is_empty());
        let reflection_rows: i64 = db
            .query_row("SELECT COUNT(*) FROM reflections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(reflection_rows, 0);
        assert_eq!(
            songs::remove(&db, &song.id).unwrap_err().message,
            "SONG NOT FOUND"
        );
    }

    #[test]
    fn import_skips_duplicates_and_shares_art() {
        let db = open_in_memory();
        songs::create(
            &db,
            &json!({ "title": "One", "artist": "Band" }),
            &ArtChange::Keep,
        )
        .unwrap();
        let tracks = [
            json!({ "title": "one", "artist": "BAND" }),
            json!({ "title": "Two", "artist": "Band" }),
            json!({ "title": "Three", "artist": "Band" }),
        ];
        let added = songs::import_many(&db, &tracks, Some(&image())).unwrap();
        assert_eq!(
            added
                .iter()
                .map(|song| song.title.as_str())
                .collect::<Vec<_>>(),
            ["Two", "Three"]
        );
        assert_eq!(added[0].art, added[1].art);
        // Newest first keeps the album's track order.
        let titles: Vec<String> = songs::list(&db)
            .unwrap()
            .into_iter()
            .map(|song| song.title)
            .collect();
        let position = |title: &str| titles.iter().position(|other| other == title).unwrap();
        assert!(position("Two") < position("Three"));
    }

    #[test]
    fn existing_art_is_shared() {
        let db = open_in_memory();
        let first = songs::create(
            &db,
            &json!({ "title": "A", "artist": "B" }),
            &ArtChange::New(image()),
        )
        .unwrap();
        let art_id = first
            .art
            .as_deref()
            .unwrap()
            .rsplit('/')
            .next()
            .unwrap()
            .to_string();
        let second = songs::create(
            &db,
            &json!({ "title": "C", "artist": "B" }),
            &ArtChange::Existing(art_id),
        )
        .unwrap();
        assert_eq!(first.art, second.art);
        let missing = songs::create(
            &db,
            &json!({ "title": "D", "artist": "B" }),
            &ArtChange::Existing("nope".into()),
        );
        assert_eq!(missing.unwrap_err().message, "ALBUM ART NOT FOUND");
    }

    #[test]
    fn settings_save_only_given_fields() {
        let db = open_in_memory();
        settings::save(&db, &json!({ "clientId": " id ", "theme": "dark" })).unwrap();
        let saved = settings::save(&db, &json!({ "theme": "purple" })).unwrap();
        assert_eq!((saved.client_id.as_str(), saved.theme.as_str()), ("id", ""));
    }
}
