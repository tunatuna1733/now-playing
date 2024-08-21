use gsmtc::SessionModel;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub thumbnail: Option<Vec<u8>>,
    pub guid: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CurrentSession {
    pub source: String,
    pub session: SessionModel,
    pub image: Option<Vec<u8>>,
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SessionCreate {
    pub session_id: usize,
    pub source: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionUpdate {
    pub session_id: usize,
    pub source: String,
    pub session_model: SessionModel,
    pub image: Option<Vec<u8>>,
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SessionRemove {
    pub session_id: usize,
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSessionChange {
    pub session_id: usize,
}

#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct ActiveSessionRemove;

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum SessionControl {
    Play,
    Pause,
    TogglePlayPause,
    FastForward,
    Rewind,
    SkipNext,
    SkipPrevious,
}
