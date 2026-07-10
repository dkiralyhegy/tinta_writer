import { invoke } from "@tauri-apps/api/core";
import type { StatsLog } from "../../domain/entities/writing-stats";
import type { StatsStore } from "../../application/ports/stats-store";

export class TauriStatsStore implements StatsStore {
  async load(): Promise<unknown | null> {
    const raw = await invoke<string | null>("load_json", { scope: "stats" });
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  save(log: StatsLog): Promise<void> {
    return invoke("save_json", { scope: "stats", content: JSON.stringify(log) });
  }
}
