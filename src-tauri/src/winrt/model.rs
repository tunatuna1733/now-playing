use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub thumbnail: Option<Vec<u8>>,
    pub guid: String,
}
