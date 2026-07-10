/** Estatísticas de um dia: saldo de palavras escritas (pode ser negativo se apagou mais que escreveu). */
export interface DayStats {
  wordsWritten: number;
  byNote: Record<string, number>;
}

/** Log completo, chaveado por data local "YYYY-MM-DD". */
export type StatsLog = Record<string, DayStats>;

export interface Goals {
  /** meta diária de palavras; null = sem meta */
  dailyWords: number | null;
}

export const DEFAULT_GOALS: Goals = { dailyWords: null };

export function normalizeGoals(raw: unknown): Goals {
  const r = (raw ?? {}) as Partial<Record<keyof Goals, unknown>>;
  const n = Number(r.dailyWords);
  return { dailyWords: Number.isFinite(n) && n > 0 ? Math.floor(n) : null };
}
