import type { Note } from "../../domain/entities/note";
import type { NoteRepository } from "../ports/note-repository";

export interface SaveOutcome {
  note: Note;
  /** setado quando o disco mudou por fora e o conteúdo novo foi para um .conflict */
  conflictPath: string | null;
}

/**
 * Persiste a nota com verificação de conflito externo (mtime).
 * Em conflito, o arquivo original fica intacto e o conteúdo editado vai
 * para um .conflict ao lado — nenhum dos lados se perde.
 */
export async function saveNote(
  repo: NoteRepository,
  note: Note,
  content: string,
): Promise<SaveOutcome> {
  const result = await repo.writeAtomic(note.path, content, note.mtimeMs);
  if (result.conflictPath) {
    return {
      note: { ...note, mtimeMs: result.mtimeMs },
      conflictPath: result.conflictPath,
    };
  }
  return {
    note: { ...note, content, mtimeMs: result.mtimeMs },
    conflictPath: null,
  };
}
