import type { Note } from "../../domain/entities/note";
import { titleFromPath } from "../../domain/entities/note";
import type { NoteRepository } from "../ports/note-repository";

export async function openNote(repo: NoteRepository, path: string): Promise<Note> {
  const { content, mtimeMs } = await repo.read(path);
  return { path, title: titleFromPath(path), content, mtimeMs };
}
