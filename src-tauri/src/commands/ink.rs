use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

use super::atomic_write;

/// Laterais de tinta: `<root>/.ink/<rel>.json`. Pasta oculta → fora do
/// scan_library; o watcher só reage a .md/.txt, então não dispara recarga.
const INK_DIR: &str = ".ink";

fn rel_in_ink(root: &str, path: &str) -> Result<PathBuf, String> {
    let rootp = Path::new(root);
    let rel = Path::new(path)
        .strip_prefix(rootp)
        .map_err(|_| format!("fora da biblioteca: {path}"))?;
    // contenção: nada de `..`, raiz vazia ou componentes especiais
    if rel.as_os_str().is_empty() || !rel.components().all(|c| matches!(c, Component::Normal(_)))
    {
        return Err(format!("caminho inválido: {path}"));
    }
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

/// Move cada arquivo de `src` para o mesmo caminho relativo em `dest`
/// (sobrescrevendo órfãos) e remove os diretórios de origem já vazios.
/// Ambos já vêm de `rel_in_ink`; os nomes lidos de `read_dir` são sempre
/// componentes simples, então nada escapa de `.ink/`.
fn merge_dir(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| format!("mover tinta: {e}"))?;
    let entries = fs::read_dir(src).map_err(|e| format!("mover tinta: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("mover tinta: {e}"))?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        let kind = entry.file_type().map_err(|e| format!("mover tinta: {e}"))?;
        if kind.is_dir() {
            merge_dir(&from, &to)?;
        } else {
            if to.is_dir() {
                fs::remove_dir_all(&to).map_err(|e| format!("limpar tinta antiga: {e}"))?;
            }
            fs::rename(&from, &to).map_err(|e| format!("mover tinta: {e}"))?;
        }
    }
    fs::remove_dir(src).map_err(|e| format!("mover tinta: {e}"))
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
    } else if dest.is_dir() {
        // a pasta de destino já tem laterais (órfãos): funde em vez de abandonar
        return merge_dir(&src, &dest);
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

    #[test]
    fn ponto_ponto_e_erro() {
        assert!(ink_file("/lib", "/lib/../notes/a.md").is_err());
        assert!(rel_in_ink("/lib", "/lib/..").is_err());
        assert!(rel_in_ink("/lib", "/lib/a/../../x").is_err());
    }

    #[test]
    fn raiz_da_biblioteca_e_erro() {
        assert!(rel_in_ink("/lib", "/lib").is_err());
        assert!(ink_file("/lib", "/lib").is_err());
    }

    #[test]
    fn caminho_aninhado_normal_continua_valido() {
        assert_eq!(
            rel_in_ink("/lib", "/lib/a/b").unwrap(),
            PathBuf::from("/lib/.ink/a/b")
        );
    }

    fn tmp_lib(tag: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("tinta-ink-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn write_ink_cria_e_apaga() {
        let lib = tmp_lib("write");
        let root = lib.to_string_lossy().to_string();
        let note = lib.join("sub/n.md").to_string_lossy().to_string();
        write_ink(root.clone(), note.clone(), Some("{}".into())).unwrap();
        let f = lib.join(".ink/sub/n.md.json");
        assert_eq!(fs::read_to_string(&f).unwrap(), "{}");
        assert_eq!(read_ink(root.clone(), note.clone()).unwrap(), Some("{}".into()));
        write_ink(root.clone(), note.clone(), None).unwrap();
        assert!(!f.exists());
        write_ink(root, note, None).unwrap();
        let _ = fs::remove_dir_all(&lib);
    }

    #[test]
    fn move_ink_acompanha_o_rename_da_nota() {
        let lib = tmp_lib("move");
        let root = lib.to_string_lossy().to_string();
        let from = lib.join("a.md").to_string_lossy().to_string();
        let to = lib.join("b.md").to_string_lossy().to_string();
        write_ink(root.clone(), from.clone(), Some("x".into())).unwrap();
        fs::write(&to, "nota").unwrap();
        move_ink(root.clone(), from, to).unwrap();
        assert!(!lib.join(".ink/a.md.json").exists());
        assert_eq!(fs::read_to_string(lib.join(".ink/b.md.json")).unwrap(), "x");
        let _ = fs::remove_dir_all(&lib);
    }

    #[test]
    fn move_ink_de_pasta_funde_quando_o_destino_ja_existe() {
        let lib = tmp_lib("merge");
        let root = lib.to_string_lossy().to_string();
        let ink = lib.join(".ink");
        fs::create_dir_all(ink.join("a/sub")).unwrap();
        fs::write(ink.join("a/x.md.json"), "novo-x").unwrap();
        fs::write(ink.join("a/sub/y.md.json"), "novo-y").unwrap();
        // destino com órfãos: um conflitante e um sem relação
        fs::create_dir_all(ink.join("b")).unwrap();
        fs::write(ink.join("b/x.md.json"), "velho-x").unwrap();
        fs::write(ink.join("b/z.md.json"), "z").unwrap();
        // a pasta já foi renomeada em disco
        fs::create_dir_all(lib.join("b")).unwrap();
        let from = lib.join("a").to_string_lossy().to_string();
        let to = lib.join("b").to_string_lossy().to_string();
        move_ink(root, from, to).unwrap();
        assert!(!ink.join("a").exists());
        assert_eq!(fs::read_to_string(ink.join("b/x.md.json")).unwrap(), "novo-x");
        assert_eq!(fs::read_to_string(ink.join("b/sub/y.md.json")).unwrap(), "novo-y");
        assert_eq!(fs::read_to_string(ink.join("b/z.md.json")).unwrap(), "z");
        let _ = fs::remove_dir_all(&lib);
    }

    #[test]
    fn move_ink_sem_origem_e_ok() {
        let lib = tmp_lib("move-missing");
        let root = lib.to_string_lossy().to_string();
        let from = lib.join("a.md").to_string_lossy().to_string();
        let to = lib.join("b.md").to_string_lossy().to_string();
        fs::write(&to, "nota").unwrap();
        move_ink(root, from, to).unwrap();
        let _ = fs::remove_dir_all(&lib);
    }
}
