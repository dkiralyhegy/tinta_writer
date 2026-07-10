import type { DayStats, StatsLog } from "../entities/writing-stats";

export function emptyDay(): DayStats {
  return { wordsWritten: 0, byNote: {} };
}

/** Aplica um saldo de palavras (pode ser negativo) à nota, no dia dado. Muta o log. */
export function applyDelta(
  log: StatsLog,
  dateKey: string,
  notePath: string,
  delta: number,
): void {
  if (delta === 0) return;
  const day = (log[dateKey] ??= emptyDay());
  day.wordsWritten += delta;
  day.byNote[notePath] = (day.byNote[notePath] ?? 0) + delta;
}

export function wordsToday(log: StatsLog, dateKey: string): number {
  return Math.max(0, log[dateKey]?.wordsWritten ?? 0);
}

export interface GoalProgress {
  current: number;
  target: number;
  /** 0..1, saturado em 1 */
  ratio: number;
  done: boolean;
}

export function goalProgressOf(current: number, targetWords: number): GoalProgress {
  const ratio = targetWords > 0 ? Math.min(1, current / targetWords) : 0;
  return { current, target: targetWords, ratio, done: current >= targetWords };
}

export function dailyProgress(
  log: StatsLog,
  dateKey: string,
  targetWords: number,
): GoalProgress {
  return goalProgressOf(wordsToday(log, dateKey), targetWords);
}

/** Normaliza um JSON desconhecido vindo do disco para um StatsLog válido. */
export function normalizeStatsLog(raw: unknown): StatsLog {
  if (typeof raw !== "object" || raw === null) return {};
  const log: StatsLog = {};
  for (const [date, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const v = (value ?? {}) as Partial<DayStats>;
    const byNote: Record<string, number> = {};
    if (typeof v.byNote === "object" && v.byNote !== null) {
      for (const [path, n] of Object.entries(v.byNote)) {
        if (Number.isFinite(n)) byNote[path] = Math.trunc(n as number);
      }
    }
    log[date] = {
      wordsWritten: Number.isFinite(v.wordsWritten) ? Math.trunc(v.wordsWritten!) : 0,
      byNote,
    };
  }
  return log;
}
