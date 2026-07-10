import type { StatsLog } from "../../domain/entities/writing-stats";

export interface StatsStore {
  load(): Promise<unknown | null>;
  save(log: StatsLog): Promise<void>;
}
