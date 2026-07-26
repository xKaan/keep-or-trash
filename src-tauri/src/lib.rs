mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_photos,
            commands::move_to_trash,
            commands::undo_move,
            commands::read_photo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
