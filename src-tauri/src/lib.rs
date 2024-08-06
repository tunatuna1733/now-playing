use serde::Serialize;
use tauri::{async_runtime::Mutex, AppHandle, Emitter, Manager};
use winrt::media::MediaClient;

pub mod winrt;

/*
#[tauri::command]
async fn get_current_sessions(
    media_client: State<'_, Mutex<MediaClient>>,
) -> Result<Vec<NowPlaying>, WinRTError> {
    let client = media_client.lock().await;
    let sessions = client.get_current_sessions().unwrap();
    Ok(sessions)
}
    */

pub fn emit_event<S: Serialize + Clone>(event_name: &str, payload: S, handle: &AppHandle) {
    handle.emit(event_name, payload).unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![])
        .setup(|app| {
            let app_handle = app.handle();
            let media_client = MediaClient::new().unwrap();
            let media_client_state = Mutex::from(media_client);
            app.manage(media_client_state);

            // credit: https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2
            let app_handle_clone = app_handle.clone().to_owned();
            tauri::async_runtime::spawn(async move {
                MediaClient::init_event_handler(&app_handle_clone)
                    .await
                    .unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
