use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

/// Janela de tempo em que um write do próprio app suprime eventos do watcher
/// para o mesmo caminho — evita o loop autosave → notify → reload.
const SELF_WRITE_WINDOW: Duration = Duration::from_secs(3);

#[derive(Default)]
pub struct SelfWrites(Mutex<HashMap<PathBuf, Instant>>);

impl SelfWrites {
    pub fn record(&self, p: &Path) {
        self.0.lock().unwrap().insert(normalize(p), Instant::now());
    }

    pub fn is_own(&self, p: &Path) -> bool {
        let mut map = self.0.lock().unwrap();
        map.retain(|_, t| t.elapsed() < SELF_WRITE_WINDOW);
        map.contains_key(&normalize(p))
    }
}

/// macOS entrega eventos com caminhos resolvidos (ex.: /private/var em vez
/// de /var); canonicaliza os dois lados para a comparação bater.
fn normalize(p: &Path) -> PathBuf {
    p.canonicalize().unwrap_or_else(|_| p.to_path_buf())
}

#[derive(Default)]
pub struct WatcherState(Mutex<Option<RecommendedWatcher>>);

/// Observa a pasta raiz da biblioteca e emite "fs-changed" com os caminhos
/// alterados por agentes externos (iCloud, Dropbox, outro editor).
/// Chamado de novo com outra raiz, substitui o watcher anterior.
#[tauri::command]
pub fn start_watching(app: AppHandle, root: String) -> Result<(), String> {
    let app_for_events = app.clone();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(event) = res else { return };
        if !matches!(
            event.kind,
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
        ) {
            return;
        }
        let self_writes = app_for_events.state::<SelfWrites>();
        let paths: Vec<String> = event
            .paths
            .iter()
            .filter(|p| is_relevant(p))
            .filter(|p| !self_writes.is_own(p))
            .map(|p| p.to_string_lossy().into_owned())
            .collect();
        if !paths.is_empty() {
            let _ = app_for_events.emit("fs-changed", paths);
        }
    })
    .map_err(|e| format!("criar watcher: {e}"))?;

    watcher
        .watch(Path::new(&root), RecursiveMode::Recursive)
        .map_err(|e| format!("observar {root}: {e}"))?;

    // Substituir o watcher anterior o derruba (Drop encerra a observação).
    *app.state::<WatcherState>().0.lock().unwrap() = Some(watcher);
    Ok(())
}

fn is_relevant(p: &Path) -> bool {
    // Ignora qualquer caminho com componente oculto (.snapshots, .git, .tmp-*)
    if p.components().any(|c| c.as_os_str().to_string_lossy().starts_with('.')) {
        return false;
    }
    if p.is_dir() {
        return true;
    }
    let name = p.file_name().map(|s| s.to_string_lossy().to_lowercase());
    matches!(name, Some(n) if n.ends_with(".md") || n.ends_with(".markdown") || n.ends_with(".txt"))
}
