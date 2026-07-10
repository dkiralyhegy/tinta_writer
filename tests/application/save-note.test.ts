import { describe, expect, it } from "vitest";
import { openNote } from "../../src/application/use-cases/open-note";
import { saveNote } from "../../src/application/use-cases/save-note";
import { InMemoryNoteRepository } from "../fakes/in-memory-note-repository";

describe("saveNote", () => {
  it("salva e atualiza o mtime da nota", async () => {
    const repo = new InMemoryNoteRepository();
    repo.externallyModify("/w/cap1.md", "rascunho");
    const note = await openNote(repo, "/w/cap1.md");

    const { note: saved, conflictPath } = await saveNote(repo, note, "rascunho revisado");

    expect(conflictPath).toBeNull();
    expect(saved.content).toBe("rascunho revisado");
    expect(saved.mtimeMs).toBeGreaterThan(note.mtimeMs);
    expect((await repo.read("/w/cap1.md")).content).toBe("rascunho revisado");
  });

  it("conflito externo: original intacto, conteúdo novo vai para .conflict", async () => {
    const repo = new InMemoryNoteRepository();
    repo.externallyModify("/w/cap1.md", "versão original");
    const note = await openNote(repo, "/w/cap1.md");

    // outro programa mexe no arquivo depois da nossa leitura
    repo.externallyModify("/w/cap1.md", "editado pelo iCloud");

    const { conflictPath } = await saveNote(repo, note, "minha edição local");

    expect(conflictPath).not.toBeNull();
    expect((await repo.read("/w/cap1.md")).content).toBe("editado pelo iCloud");
    expect((await repo.read(conflictPath!)).content).toBe("minha edição local");
  });
});
