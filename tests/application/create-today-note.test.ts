import { describe, expect, it } from "vitest";
import type { Clock } from "../../src/application/ports/clock";
import { createTodayNote } from "../../src/application/use-cases/create-today-note";
import { InMemoryNoteRepository } from "../fakes/in-memory-note-repository";

const fixedClock = (date: Date): Clock => ({ now: () => date });

describe("createTodayNote", () => {
  it("cria a nota de hoje com template quando não existe", async () => {
    const repo = new InMemoryNoteRepository();
    const clock = fixedClock(new Date(2026, 6, 10, 9, 0));

    const path = await createTodayNote(repo, clock, "/w");

    expect(path).toBe("/w/daily/2026-07-10.md");
    expect(repo.folders.has("/w/daily")).toBe(true);
    const { content } = await repo.read(path);
    expect(content).toMatch(/^# .*julho.*2026\n\n$/);
  });

  it("reusa a nota existente sem sobrescrever", async () => {
    const repo = new InMemoryNoteRepository();
    const clock = fixedClock(new Date(2026, 6, 10, 22, 0));
    repo.externallyModify("/w/daily/2026-07-10.md", "texto já escrito de manhã");

    const path = await createTodayNote(repo, clock, "/w");

    const { content } = await repo.read(path);
    expect(content).toBe("texto já escrito de manhã");
  });
});
