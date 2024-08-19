use gsmtc::{ManagerEvent::*, SessionModel, SessionUpdateEvent::*};
use tauri::AppHandle;
use windows::{
    Media::Control::GlobalSystemMediaTransportControlsSessionManager,
    Storage::Streams::{DataReader, IRandomAccessStreamWithContentType},
};

use crate::{emit_event, winrt::model::SessionUpdate};

use super::{
    convert::{convert_media_info, convert_playback_info, convert_timeline_info},
    error::WinRTError,
    model::{
        ActiveSessionChange, ActiveSessionRemove, CurrentSession, NowPlaying, SessionCreate,
        SessionRemove,
    },
};

pub struct MediaClient {
    pub session_manager: GlobalSystemMediaTransportControlsSessionManager,
    // pub handle: AppHandle,
    pub current_sessions: Vec<NowPlaying>,
}

impl MediaClient {
    pub fn new() -> Result<Self, WinRTError> {
        let session_manager = match GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        {
            Ok(i) => match i.get() {
                Ok(m) => m,
                Err(_) => {
                    return Err(WinRTError {
                        message: "Failed to get session manager.".to_string(),
                    });
                }
            },
            Err(_) => {
                return Err(WinRTError {
                    message: "Failed to request session manager.".to_string(),
                });
            }
        };
        let current_sessions = Vec::<NowPlaying>::new();
        Ok(Self {
            session_manager,
            current_sessions,
        })
    }

    /*
    pub fn init_sessions_handler(&self) -> Result<(), WinRTError> {
        let handler = TypedEventHandler::<
            GlobalSystemMediaTransportControlsSessionManager,
            SessionsChangedEventArgs,
        >::new(|sm, _| {
            // this event can detect media play/stop (not resume/pause)
            let new_sessions = match sm.clone().unwrap().GetSessions() {
                Ok(n) => n,
                Err(err) => {
                    println!("Failed to get new sessions.\n{}", err.to_string());
                    return Ok(());
                }
            };
            for new_session in new_sessions {}
            Ok(())
        });
        if let Err(err) = self.session_manager.SessionsChanged(&handler) {
            return Err(WinRTError {
                message: format!(
                    "Failed to add event handler to sessions manager.\n{}",
                    err.to_string()
                ),
            });
        }
        Ok(())
    }
    */

    pub async fn init_event_handler(
        handle: &AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + 'static>> {
        let mut rx = gsmtc::SessionManager::create().await.unwrap();
        while let Some(evt) = rx.recv().await {
            match evt {
                SessionCreated {
                    session_id,
                    mut rx,
                    source,
                } => {
                    let app_handle = handle.clone();
                    emit_event(
                        "session_create",
                        SessionCreate {
                            session_id: session_id.clone(),
                            source: source.clone(),
                        },
                        &app_handle,
                    );
                    tauri::async_runtime::spawn(async move {
                        while let Some(evt) = rx.recv().await {
                            match evt {
                                Model(model) => {
                                    emit_event(
                                        "session_update",
                                        SessionUpdate {
                                            session_id,
                                            source: source.clone(),
                                            session_model: model,
                                            image: None,
                                        },
                                        &app_handle,
                                    );
                                }
                                Media(model, image) => {
                                    if let Some(img) = image {
                                        emit_event(
                                            "session_update",
                                            SessionUpdate {
                                                session_id,
                                                source: source.clone(),
                                                session_model: model,
                                                image: Some(img.data),
                                            },
                                            &app_handle,
                                        );
                                    } else {
                                        emit_event(
                                            "session_update",
                                            SessionUpdate {
                                                session_id,
                                                source: source.clone(),
                                                session_model: model,
                                                image: None,
                                            },
                                            &app_handle,
                                        );
                                    }
                                }
                            }
                        }
                        println!("[{session_id}/{source}] exited event-loop");
                    });
                }
                SessionRemoved { session_id } => {
                    emit_event(
                        "session_remove",
                        SessionRemove {
                            session_id: session_id.clone(),
                        },
                        handle,
                    );
                }
                CurrentSessionChanged {
                    session_id: Some(id),
                } => {
                    emit_event(
                        "current_session_change",
                        ActiveSessionChange {
                            session_id: id.clone(),
                        },
                        handle,
                    );
                }
                CurrentSessionChanged { session_id: None } => {
                    emit_event("current_session_remove", ActiveSessionRemove, handle);
                }
            }
        }
        Ok(())
    }

    // I think we should not use this function except launch timing
    pub fn get_current_sessions(&self) -> Result<Vec<CurrentSession>, WinRTError> {
        let sessions = match self.session_manager.GetSessions() {
            Ok(s) => s,
            Err(_) => {
                return Err(WinRTError {
                    message: "Failed to get current sessions.".to_string(),
                });
            }
        };
        let mut current_sessions = Vec::<CurrentSession>::new();
        let mut id = 0;
        for session in sessions {
            let info = match session.TryGetMediaPropertiesAsync() {
                Ok(a) => match a.get() {
                    Ok(p) => p,
                    Err(_) => {
                        return Err(WinRTError {
                            message: "Failed to get session info.".to_string(),
                        });
                    }
                },
                Err(_) => {
                    return Err(WinRTError {
                        message: "Failed to get session info.".to_string(),
                    });
                }
            };
            let thumbnail: Option<Vec<u8>> = match info.Thumbnail() {
                Ok(t) => {
                    let thumbnail_stream = t.OpenReadAsync().unwrap().get().unwrap();
                    let thumbnail_vec = match MediaClient::decode_thumbnail(thumbnail_stream) {
                        Ok(t) => t,
                        Err(_) => {
                            return Err(WinRTError {
                                message: "Failed to decode thumbnail.".to_string(),
                            });
                        }
                    };
                    Some(thumbnail_vec)
                }
                Err(_) => {
                    println!("There might be no thumbnail for this content.");
                    None
                }
            };
            let source = session.SourceAppUserModelId().unwrap(); // execution file name (e.g. Spotify.exe)

            // playback
            let playback_info = match session.GetPlaybackInfo() {
                Ok(p) => p,
                Err(_) => {
                    return Err(WinRTError {
                        message: "Failed to get playback info.".to_string(),
                    });
                }
            };
            let playback = match convert_playback_info(&playback_info) {
                Ok(p) => Some(p),
                Err(err) => {
                    println!("{}", err.message);
                    None
                }
            };

            // timeline
            let timeline_info = match session.GetTimelineProperties() {
                Ok(t) => t,
                Err(_) => {
                    return Err(WinRTError {
                        message: "Failed to get timeline info.".to_string(),
                    });
                }
            };
            let timeline = match convert_timeline_info(&timeline_info) {
                Ok(t) => Some(t),
                Err(_) => None,
            };

            // media
            let media = match convert_media_info(&info) {
                Ok(m) => Some(m),
                Err(_) => None,
            };

            let session = SessionModel {
                playback,
                timeline,
                media,
                source: source.clone().to_string(),
            };

            let data = CurrentSession {
                source: source.to_string(),
                session,
                image: thumbnail,
                session_id: id.clone(),
            };
            current_sessions.push(data);
            id += 1;
        }
        Ok(current_sessions)
    }

    pub fn decode_thumbnail(
        stream: IRandomAccessStreamWithContentType,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let stream_len = stream.Size().unwrap() as usize;
        let mut data = vec![0u8; stream_len];
        let reader = DataReader::CreateDataReader(&stream).unwrap();
        reader.LoadAsync(stream_len as u32).unwrap().get().unwrap();
        reader.ReadBytes(&mut data).unwrap();

        reader.Close().ok();
        stream.Close().ok();

        Ok(data)
    }

    /*
    pub fn update_session(mut self, session: NowPlaying) -> Result<(), WinRTError> {
        // this function updates the current state of one of the current_sessions
        // should be called in each session's event handler
        let prev_length = self.current_sessions.len();
        let new_sessions_iterator = self
            .current_sessions
            .into_iter()
            .filter(|s| s.guid != session.guid);
        let mut new_sessions = new_sessions_iterator.collect::<Vec<NowPlaying>>();
        let new_length = new_sessions.len();
        if prev_length != new_length {
            new_sessions.push(session);
        }
        self.current_sessions = new_sessions;
        Ok(())
    }
    */
}
