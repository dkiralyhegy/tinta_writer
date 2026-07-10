use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

use super::{atomic_write, mtime_ms, now_secs};
use crate::watcher::SelfWrites;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteContent {
    pub content: String,
    pub mtime_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteOutcome {
    pub mtime_ms: u64,
    /// Presente quando o disco mudou por fora: o conteúdo novo foi gravado
    /// neste arquivo .conflict e o arquivo original ficou intacto.
    pub conflict_path: Option<String>,
}

#[tauri::command]
pub fn read_note(path: String) -> Result<NoteContent, String> {
    let p = PathBuf::from(&path);
    let content = fs::read_to_string(&p).map_err(|e| format!("ler {path}: {e}"))?;
    Ok(NoteContent {
        content,
        mtime_ms: mtime_ms(&p)?,
    })
}

#[tauri::command]
pub fn write_note_atomic(
    path: String,
    content: String,
    expected_mtime_ms: Option<u64>,
    self_writes: State<SelfWrites>,
) -> Result<WriteOutcome, String> {
    let p = PathBuf::from(&path);

    // Conflito externo: se o mtime em disco difere do que lemos, alguém
    // (iCloud, Dropbox, outro editor) mexeu no arquivo. Nunca sobrescrever:
    // o conteúdo novo vai para um .conflict ao lado, nenhum lado se perde.
    if let (Some(expected), true) = (expected_mtime_ms, p.exists()) {
        let actual = mtime_ms(&p)?;
        if actual != expected {
            let conflict = conflict_path_for(&p);
            atomic_write(&conflict, &content)?;
            self_writes.record(&conflict);
            return Ok(WriteOutcome {
                mtime_ms: actual,
                conflict_path: Some(conflict.to_string_lossy().into_owned()),
            });
        }
    }

    atomic_write(&p, &content)?;
    self_writes.record(&p);
    Ok(WriteOutcome {
        mtime_ms: mtime_ms(&p)?,
        conflict_path: None,
    })
}

#[tauri::command]
pub fn create_note(
    path: String,
    content: String,
    self_writes: State<SelfWrites>,
) -> Result<WriteOutcome, String> {
    let p = PathBuf::from(&path);
    if p.exists() {
        return Err(format!("já existe: {path}"));
    }
    atomic_write(&p, &content)?;
    self_writes.record(&p);
    Ok(WriteOutcome {
        mtime_ms: mtime_ms(&p)?,
        conflict_path: None,
    })
}

#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("criar pasta {path}: {e}"))
}

#[tauri::command]
pub fn rename_note(
    from: String,
    to: String,
    self_writes: State<SelfWrites>,
) -> Result<(), String> {
    let dest = PathBuf::from(&to);
    if dest.exists() {
        return Err(format!("já existe: {to}"));
    }
    if let Some(dir) = dest.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::rename(&from, &dest).map_err(|e| format!("renomear: {e}"))?;
    self_writes.record(Path::new(&from));
    self_writes.record(&dest);
    Ok(())
}

/// Move para a Lixeira do macOS — nunca deleta de verdade.
#[tauri::command]
pub fn delete_note(path: String, self_writes: State<SelfWrites>) -> Result<(), String> {
    self_writes.record(Path::new(&path));
    trash::delete(&path).map_err(|e| format!("mover para a lixeira: {e}"))
}

fn conflict_path_for(p: &Path) -> PathBuf {
    let stem = p
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "nota".into());
    let ext = p
        .extension()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "md".into());
    let name = format!("{stem}.conflict-{}.{ext}", now_secs());
    p.with_file_name(name)
}
