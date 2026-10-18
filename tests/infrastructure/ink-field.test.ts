import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import type { InkRun } from "../../src/domain/services/ink-runs";
import {
  inkField,
  inkRunsOf,
  recolorSelectionSpec,
  setInkMode,
} from "../../src/infrastructure/codemirror/ink-field";

// Única suíte que toca CodeMirror: só @codemirror/state, que é JS puro (sem DOM).
const blue = (from: number, to: number): InkRun => ({ from, to, ink: "blue" });

function stateWith(doc: string, runs: InkRun[], choose: boolean, active: "black" | "blue" | "red" = "black") {
  return EditorState.create({ doc, extensions: inkField(runs, { active, choose }) });
}

const insert = (s: EditorState, at: number, text: string) =>
  s.update({ changes: { from: at, insert: text }, userEvent: "input.type" }).state;

describe("inkField — fora do typewriter real (herda a cor)", () => {
  it("digitar no fim de um trecho estende", () => {
    const s = insert(stateWith("azul preto", [blue(0, 4)], false), 4, "ado");
    expect(inkRunsOf(s)).toEqual([blue(0, 7)]);
  });

  it("digitar no meio estende", () => {
    const s = insert(stateWith("azul", [blue(0, 4)], false), 2, "XX");
    expect(inkRunsOf(s)).toEqual([blue(0, 6)]);
  });

  it("digitar antes do trecho não colore e desloca", () => {
    const s = insert(stateWith("azul", [blue(0, 4)], false), 0, "o ");
    expect(inkRunsOf(s)).toEqual([blue(2, 6)]);
  });

  it("apagar o trecho todo remove a cor", () => {
    const s0 = stateWith("ab azul cd", [blue(3, 7)], false);
    const s = s0.update({ changes: { from: 3, to: 7 } }).state;
    expect(inkRunsOf(s)).toEqual([]);
  });
});

describe("inkField — typewriter real (tinta ativa)", () => {
  it("tinta azul ativa colore o que é digitado", () => {
    const s = insert(stateWith("abc", [], true, "blue"), 3, " def");
    expect(inkRunsOf(s)).toEqual([blue(3, 7)]);
  });

  it("tinta preta dentro de um trecho azul corta o trecho", () => {
    const s = insert(stateWith("azul", [blue(0, 4)], true, "black"), 2, "XX");
    expect(inkRunsOf(s)).toEqual([blue(0, 2), blue(4, 6)]);
  });

  it("trocar o modo por efeito vale para a próxima digitação", () => {
    const s0 = stateWith("abc", [], false);
    const s1 = s0.update({ effects: setInkMode.of({ active: "red", choose: true }) }).state;
    const s = insert(s1, 3, "x");
    expect(inkRunsOf(s)).toEqual([{ from: 3, to: 4, ink: "red" }]);
  });
});

describe("recolorSelectionSpec", () => {
  it("seleção vazia → null", () => {
    expect(recolorSelectionSpec(stateWith("abc", [], true), "blue")).toBeNull();
  });

  it("recolore só a seleção", () => {
    const s0 = EditorState.create({
      doc: "abcdef",
      selection: { anchor: 1, head: 4 },
      extensions: inkField([], { active: "black", choose: true }),
    });
    const s = s0.update(recolorSelectionSpec(s0, "blue")!).state;
    expect(inkRunsOf(s)).toEqual([blue(1, 4)]);
  });
});
