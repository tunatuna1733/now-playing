use gsmtc::{AlbumModel, MediaModel, PlaybackModel, TimelineModel};
use windows::Media::{
    Control::{
        GlobalSystemMediaTransportControlsSessionMediaProperties,
        GlobalSystemMediaTransportControlsSessionPlaybackInfo,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
        GlobalSystemMediaTransportControlsSessionTimelineProperties,
    },
    MediaPlaybackAutoRepeatMode, MediaPlaybackType,
};

use super::error::ConvertError;

pub fn convert_playback_info(
    playback_info: &GlobalSystemMediaTransportControlsSessionPlaybackInfo,
) -> Result<PlaybackModel, ConvertError> {
    let status = match playback_info.PlaybackStatus() {
        Ok(p) => match p {
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Changing => {
                gsmtc::PlaybackStatus::Changing
            }
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Closed => {
                gsmtc::PlaybackStatus::Closed
            }
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Opened => {
                gsmtc::PlaybackStatus::Opened
            }
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused => {
                gsmtc::PlaybackStatus::Paused
            }
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing => {
                gsmtc::PlaybackStatus::Playing
            }
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped => {
                gsmtc::PlaybackStatus::Stopped
            }
            _ => {
                return Err(ConvertError {
                    message: "Unknown playback status.".to_string(),
                });
            }
        },
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get playback status.".to_string(),
            });
        }
    };
    let playback_type = match playback_info.PlaybackType() {
        Ok(i) => match i.Value() {
            Ok(t) => match t {
                MediaPlaybackType::Image => gsmtc::PlaybackType::Image,
                MediaPlaybackType::Music => gsmtc::PlaybackType::Music,
                MediaPlaybackType::Unknown => gsmtc::PlaybackType::Unknown,
                MediaPlaybackType::Video => gsmtc::PlaybackType::Video,
                _ => {
                    return Err(ConvertError {
                        message: "Unknown playback type.".to_string(),
                    });
                }
            },
            Err(_) => {
                return Err(ConvertError {
                    message: "Failed to get playback type.".to_string(),
                });
            }
        },
        Err(_) => {
            return Err(ConvertError {
                message: "Faield to get playback type.".to_string(),
            });
        }
    };
    let auto_repeat = match playback_info.AutoRepeatMode() {
        Ok(i) => match i.Value() {
            Ok(r) => match r {
                MediaPlaybackAutoRepeatMode::List => Some(gsmtc::AutoRepeatMode::List),
                MediaPlaybackAutoRepeatMode::None => Some(gsmtc::AutoRepeatMode::None),
                MediaPlaybackAutoRepeatMode::Track => Some(gsmtc::AutoRepeatMode::Track),
                _ => None,
            },
            Err(_) => None,
        },
        Err(_) => None,
    };
    let rate = match playback_info.PlaybackRate() {
        Ok(i) => match i.Value() {
            Ok(r) => Some(r),
            Err(_) => None,
        },
        Err(_) => None,
    };
    let shuffle = match playback_info.IsShuffleActive() {
        Ok(i) => match i.Value() {
            Ok(s) => Some(s),
            Err(_) => None,
        },
        Err(_) => None,
    };
    let playback = PlaybackModel {
        status,
        r#type: playback_type,
        rate: rate.unwrap_or_default(),
        shuffle: shuffle.unwrap_or_default(),
        auto_repeat: auto_repeat.unwrap_or_default(),
    };
    Ok(playback)
}

pub fn convert_timeline_info(
    timeline_info: &GlobalSystemMediaTransportControlsSessionTimelineProperties,
) -> Result<TimelineModel, ConvertError> {
    let start = match timeline_info.StartTime() {
        Ok(s) => s.Duration,
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get start time.".to_string(),
            });
        }
    };
    let end = match timeline_info.EndTime() {
        Ok(s) => s.Duration,
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get end time.".to_string(),
            });
        }
    };
    let position = match timeline_info.Position() {
        Ok(s) => s.Duration,
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get position.".to_string(),
            });
        }
    };
    let last_updated_at_ms = match timeline_info.LastUpdatedTime() {
        Ok(s) => s.UniversalTime,
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get last updated time.".to_string(),
            });
        }
    };
    let timeline = TimelineModel {
        start,
        end,
        position,
        last_updated_at_ms,
    };
    Ok(timeline)
}

pub fn convert_album_info(
    album_info: &GlobalSystemMediaTransportControlsSessionMediaProperties,
) -> Result<AlbumModel, ConvertError> {
    let album_artist = match album_info.AlbumArtist() {
        Ok(a) => a.to_string(),
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get album artist.".to_string(),
            });
        }
    };
    let album_title = match album_info.AlbumTitle() {
        Ok(a) => a.to_string(),
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get album title.".to_string(),
            });
        }
    };
    let album_track_count = match album_info.AlbumTrackCount() {
        Ok(a) => a.unsigned_abs(),
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get album track count.".to_string(),
            });
        }
    };
    let album = AlbumModel {
        artist: album_artist,
        title: album_title,
        track_count: album_track_count,
    };
    Ok(album)
}

pub fn convert_media_info(
    media_info: &GlobalSystemMediaTransportControlsSessionMediaProperties,
) -> Result<MediaModel, ConvertError> {
    let album = match convert_album_info(&media_info) {
        Ok(a) => Some(a),
        Err(_) => None,
    };

    let media_playback_type = match media_info.PlaybackType() {
        Ok(i) => match i.Value() {
            Ok(p) => match p {
                MediaPlaybackType::Image => gsmtc::PlaybackType::Image,
                MediaPlaybackType::Music => gsmtc::PlaybackType::Music,
                MediaPlaybackType::Unknown => gsmtc::PlaybackType::Unknown,
                MediaPlaybackType::Video => gsmtc::PlaybackType::Video,
                _ => {
                    return Err(ConvertError {
                        message: "Unknown playback type.".to_string(),
                    });
                }
            },
            Err(_) => {
                return Err(ConvertError {
                    message: "Failed to get playback type.".to_string(),
                });
            }
        },
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get playback type.".to_string(),
            });
        }
    };
    let title = match media_info.Title() {
        Ok(t) => t.to_string(),
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get title.".to_string(),
            });
        }
    };
    let subtitle = match media_info.Subtitle() {
        Ok(t) => t.to_string(),
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get subtitle.".to_string(),
            });
        }
    };
    let artist = match media_info.Artist() {
        Ok(t) => t.to_string(),
        Err(_) => {
            return Err(ConvertError {
                message: "Failed to get artist.".to_string(),
            });
        }
    };

    let media = MediaModel {
        title,
        subtitle,
        artist,
        album,
        track_number: None, // we do not use this value as of now
        genres: media_info
            .Genres()
            .unwrap()
            .into_iter()
            .map(|s| s.to_string())
            .collect(),
        playback_type: media_playback_type,
    };

    Ok(media)
}
