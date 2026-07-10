use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use super::atomic_write;

/// Settings e stats vivem em `~/Library/Application Support/com.artboeira.tinta/`
/// como JSON simples, gravados com a mesma escrita atômica das notas.
fn json_path(app: &AppHandle, scope: &str) -> Result<PathBuf, String> {
    if scope.is_empty() || !scope.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err(format!("scope inválido: {scope}"));
    }
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("app config dir: {e}"))?;
    Ok(dir.join(format!("{scope}.json")))
}

#[tauri::command]
pub fn load_json(app: AppHandle, scope: String) -> Result<Option<String>, String> {
    let path = json_path(&app, &scope)?;
    match fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("ler {}: {e}", path.display())),
    }
}

#[tauri::command]
pub fn save_json(app: AppHandle, scope: String, content: String) -> Result<(), String> {
    let path = json_path(&app, &scope)?;
    atomic_write(&path, &content)
}
