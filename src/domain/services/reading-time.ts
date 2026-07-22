/** Velocidade média de leitura de prosa em português. */
export const WORDS_PER_MINUTE = 200;

/**
 * Tempo estimado de leitura, no formato da status bar:
 * "menos de 1 min" · "~7 min" · "~1h05" (acima de uma hora).
 */
export function formatReadingTime(words: number, wpm: number = WORDS_PER_MINUTE): string {
  const minutes = Math.round(words / wpm);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h}h` : `~${h}h${String(m).padStart(2, "0")}`;
}
