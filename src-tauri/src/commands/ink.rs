use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use super::atomic_write;

/// Laterais de tinta: `<root>/.ink/<rel>.json`. Pasta oculta → fora do
/// scan_library; o watcher só reage a .md/.txt, então não dispara recarga.
const INK_DIR: &str = ".ink";

fn rel_in_ink(root: &str, path: &str) -> Result<PathBuf, String> {
    let rootp = Path::new(root);
    let rel = Path::new(path)
        .strip_prefix(rootp)
        .map_err(|_| format!("fora da biblioteca: {path}"))?;
    Ok(rootp.join(INK_DIR).join(rel))
}

/// lateral de uma nota: `.ink/<rel>.json`
fn ink_file(root: &str, note: &str) -> Result<PathBuf, String> {
    let mut p = rel_in_ink(root, note)?;
    let name = p
        .file_name()
        .map(|s| format!("{}.json", s.to_string_lossy()))
        .ok_or_else(|| format!("caminho sem nome: {note}"))?;
    p.set_file_name(name);
    Ok(p)
}

fn ignore_missing(result: std::io::Result<()>, what: &str) -> Result<(), String> {
    match result {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("{what}: {e}")),
    }
}

#[tauri::command]
pub fn read_ink(root: String, path: String) -> Result<Option<String>, String> {
    let p = ink_file(&root, &path)?;
    match fs::read_to_string(&p) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("ler tinta: {e}")),
    }
}

#[tauri::command]
pub fn write_ink(root: String, path: String, content: Option<String>) -> Result<(), String> {
    let p = ink_file(&root, &path)?;
    match content {
        Some(c) => atomic_write(&p, &c),
        None => ignore_missing(fs::remove_file(&p), "apagar tinta"),
    }
}

/// Chamado DEPOIS do rename da nota/pasta: `to` já existe em disco.
#[tauri::command]
pub fn move_ink(root: String, from: String, to: String) -> Result<(), String> {
    let (src, dest) = if Path::new(&to).is_dir() {
        (rel_in_ink(&root, &from)?, rel_in_ink(&root, &to)?)
    } else {
        (ink_file(&root, &from)?, ink_file(&root, &to)?)
    };
    if !src.exists() {
        return Ok(());
    }
    if dest.is_file() {
        // lateral órfão de uma nota antiga com o mesmo nome
        fs::remove_file(&dest).map_err(|e| format!("limpar tinta antiga: {e}"))?;
    } else if dest.exists() {
        return Ok(());
    }
    if let Some(dir) = dest.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dest).map_err(|e| format!("mover tinta: {e}"))
}

/// A nota já foi para a Lixeira: não dá para saber se era nota ou pasta,
/// então tenta os dois laterais possíveis.
#[tauri::command]
pub fn trash_ink(root: String, path: String) -> Result<(), String> {
    for p in [ink_file(&root, &path)?, rel_in_ink(&root, &path)?] {
        if p.exists() {
            trash::delete(&p).map_err(|e| format!("tinta para a lixeira: {e}"))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caminho_do_lateral_espelha_a_biblioteca() {
        let p = ink_file("/lib", "/lib/livro/cap-01.md").unwrap();
        assert_eq!(p, PathBuf::from("/lib/.ink/livro/cap-01.md.json"));
    }

    #[test]
    fn nota_fora_da_biblioteca_e_erro() {
        assert!(ink_file("/lib", "/outro/cap.md").is_err());
    }
}
