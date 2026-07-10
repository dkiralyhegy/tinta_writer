import type { Library } from "../../domain/entities/library";
import type { NoteRepository } from "../ports/note-repository";

export async function loadLibrary(repo: NoteRepository, rootPath: string): Promise<Library> {
  const root = await repo.scan(rootPath);
  return { rootPath, root };
}
