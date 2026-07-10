import { DAILY_DIR } from "../entities/library";

/**
 * Chave de data LOCAL "YYYY-MM-DD" — nunca toISOString(), que usa UTC e
 * erraria o dia perto da meia-noite.
 */
export function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailyNoteFileName(now: Date): string {
  return `${localDateKey(now)}.md`;
}

export function dailyNotePath(rootPath: string, now: Date): string {
  return `${rootPath}/${DAILY_DIR}/${dailyNoteFileName(now)}`;
}

/** Corpo inicial da nota de hoje: heading com a data por extenso em pt-BR. */
export function dailyNoteTemplate(now: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return `# ${formatted}\n\n`;
}
