import { invoke } from "@tauri-apps/api/core";
import type { PersistedSettings, SettingsStore } from "../../application/ports/settings-store";

export class TauriSettingsStore implements SettingsStore {
  async load(): Promise<unknown | null> {
    const raw = await invoke<string | null>("load_json", { scope: "settings" });
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  save(settings: PersistedSettings): Promise<void> {
    return invoke("save_json", {
      scope: "settings",
      content: JSON.stringify(settings, null, 2),
    });
  }
}
