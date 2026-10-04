//! Album art as the frontend sees it: the URL stored art is served at, and turning the
//! `art` value the frontend sends into a change the store can apply. Mirrors server/artInput.js.
use std::{sync::LazyLock, time::Duration};

use base64::{Engine, engine::general_purpose::STANDARD};
use regex::Regex;
use serde_json::Value;

use crate::error::{AppResult, bad_request};

const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(10);

/// Stored art: served by the `art` protocol (see lib.rs). Web-version URLs are accepted too.
static STORED_ART_URL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:/api/art/|art://localhost/|http://art\.localhost/)([\w-]+)$").unwrap()
});
static DATA_URL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)^data:(image/[\w.+-]+);base64,(.+)$").unwrap());

/// The URL a stored image is served at, or None when there is none.
pub fn art_url(art_id: Option<&str>) -> Option<String> {
    // Windows and Android webviews only allow custom protocols in the http://<scheme>.localhost form.
    let base = if cfg!(any(windows, target_os = "android")) {
        "http://art.localhost"
    } else {
        "art://localhost"
    };
    art_id.map(|id| format!("{base}/{id}"))
}

/// Image bytes and their type.
pub struct Image {
    pub mime: String,
    pub data: Vec<u8>,
}

pub enum ArtChange {
    /// Leave the song's art as it is.
    Keep,
    Remove,
    /// An image already stored.
    Existing(String),
    New(Image),
}

/// Parses the `art` value from a request into an art change:
///   missing                      Keep
///   null or ''                   Remove
///   a stored-art URL             Existing
///   a data URL or https URL      New, decoded or downloaded
pub async fn parse_art_input(
    value: Option<&Value>,
    http: &reqwest::Client,
) -> AppResult<ArtChange> {
    let value = match value {
        None => return Ok(ArtChange::Keep),
        Some(Value::Null) => return Ok(ArtChange::Remove),
        Some(Value::String(text)) if text.is_empty() => return Ok(ArtChange::Remove),
        Some(Value::String(text)) => text,
        Some(_) => return Err(bad_request("INVALID ALBUM ART")),
    };

    if let Some(stored) = STORED_ART_URL.captures(value) {
        return Ok(ArtChange::Existing(stored[1].to_string()));
    }
    if value.starts_with("data:") {
        return Ok(ArtChange::New(decode_data_url(value)?));
    }
    if value.starts_with("https://") {
        return Ok(ArtChange::New(download_image(http, value).await?));
    }
    Err(bad_request("INVALID ALBUM ART"))
}

fn decode_data_url(data_url: &str) -> AppResult<Image> {
    let not_an_image = || bad_request("ALBUM ART MUST BE AN IMAGE");
    let parts = DATA_URL.captures(data_url).ok_or_else(not_an_image)?;
    let data = STANDARD
        .decode(parts[2].trim())
        .map_err(|_| not_an_image())?;
    Ok(Image {
        mime: parts[1].to_string(),
        data: check_size(data)?,
    })
}

/// Downloads an image.
pub async fn download_image(http: &reqwest::Client, url: &str) -> AppResult<Image> {
    let failed = || bad_request("COULDN'T DOWNLOAD ALBUM ART");
    let response = http
        .get(url)
        .timeout(DOWNLOAD_TIMEOUT)
        .send()
        .await
        .map_err(|_| failed())?;
    let mime = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_string();
    if !response.status().is_success() || !mime.starts_with("image/") {
        return Err(failed());
    }
    let data = response.bytes().await.map_err(|_| failed())?;
    Ok(Image {
        mime,
        data: check_size(data.to_vec())?,
    })
}

fn check_size(data: Vec<u8>) -> AppResult<Vec<u8>> {
    if data.len() > MAX_IMAGE_BYTES {
        return Err(bad_request("IMAGE TOO LARGE"));
    }
    Ok(data)
}
