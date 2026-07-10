mod commands;
mod watcher;

use commands::{library, notes, snapshots, storage};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(watcher::SelfWrites::default())
        .manage(watcher::WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            notes::read_note,
            notes::write_note_atomic,
            notes::create_note,
            notes::create_folder,
            notes::rename_note,
            notes::delete_note,
            library::scan_library,
            snapshots::snapshot_note,
            snapshots::list_snapshots,
            snapshots::delete_snapshots,
            storage::load_json,
            storage::save_json,
            watcher::start_watching,
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar tinta");
}
