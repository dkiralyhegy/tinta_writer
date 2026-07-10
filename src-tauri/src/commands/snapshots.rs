use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use super::now_secs;

const SNAPSHOT_DIR: &str = ".snapshots";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotInfo {
    pub path: String,
    /// Caminho da nota relativo à raiz da biblioteca
    pub note_rel: String,
    pub ts_secs: u64,
}

/// Copia a versão atual em disco para `<root>/.snapshots/<rel>/<ts>.<ext>`
/// antes de a sessão de edição sobrescrever. Retorna None se a nota ainda
/// não existe em disco (nota nova — nada a preservar).
#[tauri::command]
pub fn snapshot_note(root: String, path: String) -> Result<Option<String>, String> {
    let rootp = PathBuf::from(&root);
    let p = PathBuf::from(&path);
    if !p.is_file() {
        return Ok(None);
    }
    let rel = p
        .strip_prefix(&rootp)
        .map_err(|_| format!("nota fora da biblioteca: {path}"))?;

    let ext = p
        .extension()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "md".into());
    let snap_dir = rootp.join(SNAPSHOT_DIR).join(rel);
    fs::create_dir_all(&snap_dir).map_err(|e| format!("criar {}: {e}", snap_dir.display()))?;

    let dest = snap_dir.join(format!("{}.{ext}", now_secs()));
    fs::copy(&p, &dest).map_err(|e| format!("copiar snapshot: {e}"))?;
    Ok(Some(dest.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn list_snapshots(root: String) -> Result<Vec<SnapshotInfo>, String> {
    let base = PathBuf::from(&root).join(SNAPSHOT_DIR);
    let mut out = Vec::new();
    if base.is_dir() {
        collect(&base, &base, &mut out);
    }
    Ok(out)
}

fn collect(base: &Path, dir: &Path, out: &mut Vec<SnapshotInfo>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect(base, &path, out);
        } else if let Some(ts) = parse_ts(&path) {
            let note_rel = path
                .parent()
                .and_then(|p| p.strip_prefix(base).ok())
                .map(|p| p.to_string_lossy().into_owned())
                .unwrap_or_default();
            out.push(SnapshotInfo {
                path: path.to_string_lossy().into_owned(),
                note_rel,
                ts_secs: ts,
            });
        }
    }
}

fn parse_ts(path: &Path) -> Option<u64> {
    path.file_stem()?.to_string_lossy().parse().ok()
}

/// Remove snapshots expirados. Cada caminho é validado como estando dentro
/// de `<root>/.snapshots` — este command não consegue apagar nada fora dela.
#[tauri::command]
pub fn delete_snapshots(root: String, paths: Vec<String>) -> Result<u32, String> {
    let base = PathBuf::from(&root)
        .join(SNAPSHOT_DIR)
        .canonicalize()
        .map_err(|e| format!("pasta de snapshots: {e}"))?;

    let mut deleted = 0;
    for raw in paths {
        let Ok(canon) = PathBuf::from(&raw).canonicalize() else {
            continue; // já não existe
        };
        if !canon.starts_with(&base) {
            return Err(format!("caminho fora de .snapshots: {raw}"));
        }
        if canon.is_file() {
            fs::remove_file(&canon).map_err(|e| format!("remover {raw}: {e}"))?;
            deleted += 1;
        }
    }
    Ok(deleted)
}
