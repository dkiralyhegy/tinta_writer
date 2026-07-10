export interface Note {
  path: string;
  title: string;
  content: string;
  /** mtime em ms do arquivo em disco no momento da leitura — usado para detectar conflito externo */
  mtimeMs: number;
}

export function titleFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.(md|markdown|txt)$/i, "");
}
