//! A small Spotify Web API client using the client-credentials flow. Requests are made
//! from Rust, so credentials never reach the webview. Mirrors server/spotify.js.
use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use reqwest::{Client, StatusCode, Url};
use serde_json::Value;

use crate::error::{AppResult, bad_gateway, bad_request};

const TOKEN_URL: &str = "https://accounts.spotify.com/api/token";
const API_URL: &str = "https://api.spotify.com/v1";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const SEARCH_TYPES: [&str; 3] = ["track", "album", "artist"];
const SEARCH_LIMIT: &str = "8";
const MAX_ALBUM_TRACKS: usize = 500;
/// Renew the token a minute before Spotify says it expires.
const TOKEN_EXPIRY_MARGIN: Duration = Duration::from_secs(60);

/// The saved Client ID and secret.
pub struct Credentials {
    pub client_id: String,
    pub client_secret: String,
}

struct CachedToken {
    credentials: String,
    access_token: String,
    expires_at: Instant,
}

pub struct Spotify {
    http: Client,
    cached_token: Mutex<Option<CachedToken>>,
}

impl Spotify {
    pub fn new(http: Client) -> Self {
        Self {
            http,
            cached_token: Mutex::new(None),
        }
    }

    fn cached_token(&self) -> std::sync::MutexGuard<'_, Option<CachedToken>> {
        self.cached_token
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    async fn send(&self, request: reqwest::RequestBuilder) -> AppResult<reqwest::Response> {
        request
            .timeout(REQUEST_TIMEOUT)
            .send()
            .await
            .map_err(|_| bad_gateway("COULDN'T REACH SPOTIFY"))
    }

    async fn access_token(
        &self,
        Credentials {
            client_id,
            client_secret,
        }: &Credentials,
    ) -> AppResult<String> {
        if client_id.is_empty() || client_secret.is_empty() {
            return Err(bad_request("ADD SPOTIFY CREDENTIALS IN SETTINGS"));
        }
        let credentials = format!("{client_id}:{client_secret}");
        if let Some(token) = self.cached_token().as_ref()
            && token.credentials == credentials
            && token.expires_at > Instant::now()
        {
            return Ok(token.access_token.clone());
        }

        let request = self
            .http
            .post(TOKEN_URL)
            .basic_auth(client_id, Some(client_secret))
            .header(
                reqwest::header::CONTENT_TYPE,
                "application/x-www-form-urlencoded",
            )
            .body("grant_type=client_credentials");
        let response = self.send(request).await?;
        if matches!(
            response.status(),
            StatusCode::BAD_REQUEST | StatusCode::UNAUTHORIZED
        ) {
            return Err(bad_request("INVALID CLIENT ID OR SECRET"));
        }
        let body = read_json(response).await?;
        let access_token = body["access_token"]
            .as_str()
            .unwrap_or_default()
            .to_string();
        let expires_in = Duration::from_secs(body["expires_in"].as_u64().unwrap_or(0));
        *self.cached_token() = Some(CachedToken {
            credentials,
            access_token: access_token.clone(),
            expires_at: Instant::now() + expires_in.saturating_sub(TOKEN_EXPIRY_MARGIN),
        });
        Ok(access_token)
    }

    /// GET a Web API URL with the saved credentials and return the parsed JSON.
    async fn api_get(&self, credentials: &Credentials, url: Url) -> AppResult<Value> {
        let access_token = self.access_token(credentials).await?;
        let response = self
            .send(self.http.get(url).bearer_auth(access_token))
            .await?;
        if response.status() == StatusCode::UNAUTHORIZED {
            *self.cached_token() = None;
            return Err(bad_gateway("SESSION EXPIRED — TRY AGAIN"));
        }
        read_json(response).await
    }

    /// Checks credentials before they are saved. Fails when Spotify rejects them.
    pub async fn test_credentials(&self, credentials: &Credentials) -> AppResult<()> {
        *self.cached_token() = None;
        self.access_token(credentials).await.map(|_| ())
    }

    /// Searches tracks, albums or artists. Returns Spotify's result objects.
    pub async fn search(
        &self,
        credentials: &Credentials,
        kind: &str,
        query: &str,
    ) -> AppResult<Vec<Value>> {
        if !SEARCH_TYPES.contains(&kind) {
            return Err(bad_request("INVALID SEARCH TYPE"));
        }
        let url = Url::parse_with_params(
            &format!("{API_URL}/search"),
            [("type", kind), ("limit", SEARCH_LIMIT), ("q", query)],
        )
        .map_err(|_| bad_request("INVALID SEARCH"))?;
        let mut results = self.api_get(credentials, url).await?;
        Ok(take_items(&mut results, &format!("/{kind}s/items")))
    }

    /// An album's details plus all its tracks, following Spotify's pagination.
    pub async fn album_with_tracks(
        &self,
        credentials: &Credentials,
        album_id: &str,
    ) -> AppResult<(Value, Vec<Value>)> {
        if album_id.is_empty() || !album_id.bytes().all(|byte| byte.is_ascii_alphanumeric()) {
            return Err(bad_request("INVALID ALBUM"));
        }
        let url = Url::parse(&format!("{API_URL}/albums/{album_id}"))
            .map_err(|_| bad_request("INVALID ALBUM"))?;
        let mut album = self.api_get(credentials, url).await?;
        let mut tracks = take_items(&mut album, "/tracks/items");
        let mut next_page_url = album["tracks"]["next"].as_str().map(str::to_string);
        while let Some(page_url) = next_page_url.filter(|_| tracks.len() < MAX_ALBUM_TRACKS) {
            let page_url = Url::parse(&page_url).map_err(|_| bad_gateway("SPOTIFY ERROR"))?;
            let mut page = self.api_get(credentials, page_url).await?;
            tracks.extend(take_items(&mut page, "/items"));
            next_page_url = page["next"].as_str().map(str::to_string);
        }
        Ok((album, tracks))
    }
}

async fn read_json(response: reqwest::Response) -> AppResult<Value> {
    let status = response.status();
    if !status.is_success() {
        return Err(bad_gateway(format!("SPOTIFY ERROR {}", status.as_u16())));
    }
    response
        .json()
        .await
        .map_err(|_| bad_gateway("SPOTIFY ERROR"))
}

/// Moves out the non-null entries of the array at `pointer` (none when it isn't an array).
fn take_items(value: &mut Value, pointer: &str) -> Vec<Value> {
    match value.pointer_mut(pointer).map(Value::take) {
        Some(Value::Array(items)) => items.into_iter().filter(|item| !item.is_null()).collect(),
        _ => Vec::new(),
    }
}

/// URL of the largest image in a Spotify image list, or None.
pub fn largest_image_url(images: &Value) -> Option<&str> {
    images
        .as_array()?
        .iter()
        .max_by_key(|image| image["width"].as_u64().unwrap_or(0))?["url"]
        .as_str()
}

/// "Artist One, Artist Two"
pub fn join_artist_names(artists: &Value) -> String {
    let names = artists
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|artist| artist["name"].as_str());
    names.collect::<Vec<_>>().join(", ")
}

/// Calls the real Spotify API, so it's skipped by default. Run it with `cargo test -- --ignored`.
#[cfg(test)]
mod tls_check {
    #[tokio::test]
    #[ignore = "needs the internet"]
    async fn spotify_rejects_bad_credentials_over_https() {
        let spotify = super::Spotify::new(reqwest::Client::new());
        let credentials = super::Credentials {
            client_id: "x".into(),
            client_secret: "y".into(),
        };
        let error = spotify.test_credentials(&credentials).await.unwrap_err();
        assert_eq!(error.message, "INVALID CLIENT ID OR SECRET");
    }
}
