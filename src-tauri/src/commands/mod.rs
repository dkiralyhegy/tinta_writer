pub mod ink;
pub mod library;
pub mod notes;
pub mod snapshots;
pub mod storage;

use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// Escrita atômica: tmp no mesmo diretório → fsync → rename → fsync do diretório.
/// O arquivo original nunca é truncado; um crash no meio nunca corrompe.
pub(crate) fn atomic_write(target: &Path, content: &str) -> Result<(), String> {
    let dir = target
        .parent()
        .ok_or_else(|| format!("caminho sem diretório: {}", target.display()))?;
    fs::create_dir_all(dir).map_err(|e| format!("criar diretório {}: {e}", dir.display()))?;

    let file_name = target
        .file_name()
        .ok_or_else(|| format!("caminho sem nome de arquivo: {}", target.display()))?
        .to_string_lossy()
        .into_owned();
    let tmp = dir.join(format!(".{file_name}.tmp-{}", std::process::id()));

    let result = (|| {
        let mut f = File::create(&tmp).map_err(|e| format!("criar tmp: {e}"))?;
        f.write_all(content.as_bytes())
            .map_err(|e| format!("escrever tmp: {e}"))?;
        f.sync_all().map_err(|e| format!("fsync tmp: {e}"))?;
        fs::rename(&tmp, target).map_err(|e| format!("rename atômico: {e}"))?;
        if let Ok(d) = File::open(dir) {
            let _ = d.sync_all();
        }
        Ok(())
    })();

    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

pub(crate) fn mtime_ms(path: &Path) -> Result<u64, String> {
    let meta = fs::metadata(path).map_err(|e| format!("metadata {}: {e}", path.display()))?;
    let mtime = meta.modified().map_err(|e| e.to_string())?;
    Ok(mtime
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64)
}

pub(crate) fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
