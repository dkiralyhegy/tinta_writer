import type { StatsLog } from "../../domain/entities/writing-stats";
import { localDateKey } from "../../domain/services/daily-note";
import {
  applyDelta,
  dailyProgress,
  normalizeStatsLog,
  wordsToday,
  type GoalProgress,
} from "../../domain/services/stats-calculator";
import type { Clock } from "../ports/clock";
import type { StatsStore } from "../ports/stats-store";

/**
 * Acumula saldos de palavras em memória e persiste junto do ciclo de
 * autosave (flush). A data é sempre a local do momento do registro.
 */
export class ProgressTracker {
  private log: StatsLog = {};
  private dirty = false;

  constructor(
    private readonly store: StatsStore,
    private readonly clock: Clock,
  ) {}

  async init(): Promise<void> {
    this.log = normalizeStatsLog(await this.store.load());
  }

  recordDelta(notePath: string, delta: number): void {
    if (delta === 0) return;
    applyDelta(this.log, localDateKey(this.clock.now()), notePath, delta);
    this.dirty = true;
  }

  wordsToday(): number {
    return wordsToday(this.log, localDateKey(this.clock.now()));
  }

  dailyProgress(targetWords: number): GoalProgress {
    return dailyProgress(this.log, localDateKey(this.clock.now()), targetWords);
  }

  async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await this.store.save(this.log);
    } catch (err) {
      this.dirty = true;
      throw err;
    }
  }
}
