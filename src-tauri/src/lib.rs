mod commands;
mod watcher;

use commands::{ink, library, notes, snapshots, storage};

/// O WKWebView só sublinha erros de ortografia se a preferência nativa
/// "verificar ortografia durante a digitação" estiver ligada — e em apps
/// Tauri ela nasce desligada. Ligamos aqui (nível WebKit); o toggle nos
/// ajustes do tinta continua mandando, via atributo spellcheck do editor.
#[cfg(target_os = "macos")]
fn enable_native_spellcheck() {
    use objc2_foundation::{NSString, NSUserDefaults};
    let defaults = NSUserDefaults::standardUserDefaults();
    defaults.setBool_forKey(true, &NSString::from_str("WebContinuousSpellCheckingEnabled"));
    defaults.setBool_forKey(
        true,
        &NSString::from_str("WebAutomaticSpellingCorrectionEnabled"),
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            enable_native_spellcheck();
            Ok(())
        })
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
            ink::read_ink,
            ink::write_ink,
            ink::move_ink,
            ink::trash_ink,
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
