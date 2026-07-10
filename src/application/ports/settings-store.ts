import type { ThemeConfig } from "../../domain/entities/theme-config";
import type { Goals } from "../../domain/entities/writing-stats";

export interface PersistedSettings {
  theme: ThemeConfig;
  goals: Goals;
  rootPath: string | null;
  lastNotePath: string | null;
  sidebarOpen: boolean;
}

export interface SettingsStore {
  load(): Promise<unknown | null>;
  save(settings: PersistedSettings): Promise<void>;
}
