//! Errors returned by commands. The frontend receives just the message, as a string.
use serde::{Serialize, Serializer};

/// Shown for errors whose details aren't meant for the user (they are logged instead).
const UNEXPECTED_MESSAGE: &str = "SOMETHING WENT WRONG";

#[derive(Debug)]
pub struct AppError {
    pub message: String,
}

pub type AppResult<T> = Result<T, AppError>;

/// An error whose message is safe to show to the user.
pub fn user_error(message: impl Into<String>) -> AppError {
    AppError {
        message: message.into(),
    }
}

pub use user_error as bad_request;
pub use user_error as not_found;
/// An outside service (Spotify, an image host) failed or could not be reached.
pub use user_error as bad_gateway;

impl From<rusqlite::Error> for AppError {
    fn from(error: rusqlite::Error) -> Self {
        eprintln!("Database error: {error}");
        user_error(UNEXPECTED_MESSAGE)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        eprintln!("JSON error: {error}");
        user_error(UNEXPECTED_MESSAGE)
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.message)
    }
}
