use serde::Serialize;
use std::fs;
use std::path::Path;

use super::mtime_ms;

const MAX_DEPTH: usize = 8;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub mtime_ms: u64,
    pub children: Vec<FsNode>,
}

#[tauri::command]
pub fn scan_library(root: String) -> Result<FsNode, String> {
    let p = Path::new(&root);
    if !p.is_dir() {
        return Err(format!("não é uma pasta: {root}"));
    }
    scan_dir(p, 0)
}

fn scan_dir(dir: &Path, depth: usize) -> Result<FsNode, String> {
    let mut children = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| format!("ler pasta {}: {e}", dir.display()))?;

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue; // dotfiles, .snapshots, .git, tmp files
        }
        if path.is_dir() {
            if depth < MAX_DEPTH {
                if let Ok(node) = scan_dir(&path, depth + 1) {
                    children.push(node);
                }
            }
        } else if is_note(&name) {
            children.push(FsNode {
                name,
                path: path.to_string_lossy().into_owned(),
                is_dir: false,
                mtime_ms: mtime_ms(&path).unwrap_or(0),
                children: Vec::new(),
            });
        }
    }

    // Pastas primeiro, depois notas; ambas em ordem alfabética case-insensitive
    // (prefixos numéricos "01-", "02-" ordenam capítulos naturalmente).
    children.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(FsNode {
        name: dir
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| dir.display().to_string()),
        path: dir.to_string_lossy().into_owned(),
        is_dir: true,
        mtime_ms: 0,
        children,
    })
}

fn is_note(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".txt")
}
