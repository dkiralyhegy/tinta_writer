import { describe, expect, it } from "vitest";
import {
  FRESH_INK_SESSION,
  loadInk,
  saveInk,
} from "../../src/application/use-cases/ink-persistence";
import { openNote } from "../../src/application/use-cases/open-note";
import { saveNote } from "../../src/application/use-cases/save-note";
import { recolor, type InkRun } from "../../src/domain/services/ink-runs";
import { InMemoryInkStore } from "../fakes/in-memory-ink-store";
import { InMemoryNoteRepository } from "../fakes/in-memory-note-repository";

const ROOT = "/w";
const NOTE = "/w/cap1.md";
const blue = (from: number, to: number): InkRun => ({ from, to, ink: "blue" });

describe("saveInk", () => {
  it("nota sem cor nunca grava lateral", async () => {
    const store = new InMemoryInkStore();
    await saveInk(store, ROOT, NOTE, "texto", [], FRESH_INK_SESSION);
    expect(store.saves).toBe(0);
  });

  it("grava quando há cor e não regrava se nada mudou", async () => {
    const store = new InMemoryInkStore();
    const s1 = await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], s1);
    expect(store.saves).toBe(1);
    expect(store.files.has(NOTE)).toBe(true);
  });

  it("tirar toda a cor apaga o lateral", async () => {
    const store = new InMemoryInkStore();
    const s1 = await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    await saveInk(store, ROOT, NOTE, "texto azul", [], s1);
    expect(store.files.has(NOTE)).toBe(false);
  });

  it("lateral ilegível não é sobrescrito enquanto não houver cor", async () => {
    const store = new InMemoryInkStore();
    store.files.set(NOTE, "{lixo de uma versão futura");
    const { session } = await loadInk(store, ROOT, NOTE, "texto");
    expect(session.unreadable).toBe(true);

    await saveInk(store, ROOT, NOTE, "texto", [], session);
    expect(store.files.get(NOTE)).toBe("{lixo de uma versão futura");

    await saveInk(store, ROOT, NOTE, "texto", [blue(0, 5)], session);
    expect(store.files.get(NOTE)).not.toBe("{lixo de uma versão futura");
  });
});

describe("loadInk", () => {
  it("sem lateral → sem trechos", async () => {
    const { runs, session } = await loadInk(new InMemoryInkStore(), ROOT, NOTE, "texto");
    expect(runs).toEqual([]);
    expect(session).toEqual(FRESH_INK_SESSION);
  });

  it("reabre as cores gravadas", async () => {
    const store = new InMemoryInkStore();
    await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    const { runs } = await loadInk(store, ROOT, NOTE, "texto azul");
    expect(runs).toEqual([blue(6, 10)]);
  });

  it("após edição externa, reancora e marca para regravar", async () => {
    const store = new InMemoryInkStore();
    await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    const { runs, session } = await loadInk(store, ROOT, NOTE, "novo texto azul");
    expect(runs).toEqual([blue(11, 15)]);
    await saveInk(store, ROOT, NOTE, "novo texto azul", runs, session);
    expect(store.saves).toBe(2);
  });
});

describe("princípio: a nota nunca recebe cor", () => {
  it("qualquer recoloração deixa o arquivo da nota idêntico ao texto", async () => {
    const repo = new InMemoryNoteRepository();
    const store = new InMemoryInkStore();
    const text = "Uma frase azul, outra vermelha e o resto preto.";
    repo.externallyModify(NOTE, "");
    const note = await openNote(repo, NOTE);

    let runs: InkRun[] = [];
    runs = recolor(runs, 9, 13, "blue");
    runs = recolor(runs, 21, 29, "red");
    runs = recolor(runs, 0, 3, "blue");
    runs = recolor(runs, 10, 25, "black");

    await saveNote(repo, note, text);
    await saveInk(store, ROOT, NOTE, text, runs, FRESH_INK_SESSION);

    expect((await repo.read(NOTE)).content).toBe(text);
    expect(store.files.get(NOTE)).toContain('"ink":"blue"');

    const noteContent = (await repo.read(NOTE)).content;
    expect(noteContent).not.toContain('"ink"');
    expect(noteContent).not.toContain("<span");
    expect(noteContent).not.toContain("{");
    // o único artefato com "ink" é o lateral
    expect([...store.files.keys()]).toEqual([NOTE]);
  });
});
