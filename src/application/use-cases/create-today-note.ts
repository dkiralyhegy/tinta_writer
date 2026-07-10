import { DAILY_DIR } from "../../domain/entities/library";
import { dailyNotePath, dailyNoteTemplate } from "../../domain/services/daily-note";
import type { Clock } from "../ports/clock";
import type { NoteRepository } from "../ports/note-repository";

/**
 * Garante que a nota de hoje (<root>/daily/YYYY-MM-DD.md, data local) existe
 * e devolve o caminho dela. Cria pasta e arquivo com template na primeira vez.
 */
export async function createTodayNote(
  repo: NoteRepository,
  clock: Clock,
  rootPath: string,
): Promise<string> {
  const now = clock.now();
  const path = dailyNotePath(rootPath, now);
  try {
    await repo.read(path);
  } catch {
    await repo.createFolder(`${rootPath}/${DAILY_DIR}`);
    await repo.create(path, dailyNoteTemplate(now));
  }
  return path;
}
