import { history, redo, undo } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import type { InkRun } from "../../src/domain/services/ink-runs";
import {
  inkField,
  inkHistory,
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

describe("inkField — limites", () => {
  it("trechos além do fim do documento são cortados ou descartados", () => {
    const s = stateWith("abcde", [blue(3, 99), blue(40, 50)], false);
    expect(inkRunsOf(s)).toEqual([blue(3, 5)]);
  });
});

describe("inkField — desfazer/refazer", () => {
  function withHistory(doc: string, runs: InkRun[], choose: boolean, active: "black" | "blue" | "red" = "black") {
    return EditorState.create({
      doc,
      extensions: [history(), inkField(runs, { active, choose }), inkHistory],
    });
  }
  // aplica um comando de histórico a um estado, sem DOM
  function run(cmd: (t: { state: EditorState; dispatch: (tr: import("@codemirror/state").Transaction) => void }) => boolean, state: EditorState) {
    let out = state;
    cmd({ state, dispatch: (tr) => (out = tr.state) });
    return out;
  }
  const del = (s: EditorState, from: number, to: number) =>
    s.update({ changes: { from, to }, userEvent: "delete.selection" }).state;

  it("apagar um trecho azul e desfazer restaura o trecho; refazer o remove", () => {
    const s0 = withHistory("ab azul cd", [blue(3, 7)], false);
    const s1 = del(s0, 3, 7);
    expect(inkRunsOf(s1)).toEqual([]);
    const s2 = run(undo, s1);
    expect(s2.doc.toString()).toBe("ab azul cd");
    expect(inkRunsOf(s2)).toEqual([blue(3, 7)]);
    const s3 = run(redo, s2);
    expect(s3.doc.toString()).toBe("ab  cd");
    expect(inkRunsOf(s3)).toEqual([]);
  });

  it("typewriter real com tinta preta: desfazer devolve o texto azul", () => {
    const s0 = withHistory("ab azul cd", [blue(3, 7)], true, "black");
    const s2 = run(undo, del(s0, 3, 7));
    expect(inkRunsOf(s2)).toEqual([blue(3, 7)]);
  });

  it("recolorir e desfazer restaura os trechos anteriores", () => {
    const s0 = EditorState.create({
      doc: "abcdef",
      selection: { anchor: 1, head: 4 },
      extensions: [history(), inkField([], { active: "black", choose: true }), inkHistory],
    });
    const s1 = s0.update(recolorSelectionSpec(s0, "blue")!).state;
    expect(inkRunsOf(s1)).toEqual([blue(1, 4)]);
    expect(inkRunsOf(run(undo, s1))).toEqual([]);
  });

  it("nota sem cor continua sem trechos ao digitar e desfazer", () => {
    const s0 = withHistory("abc", [], false);
    const s1 = s0.update({ changes: { from: 3, insert: "d" }, userEvent: "input.type" }).state;
    expect(inkRunsOf(run(undo, s1))).toEqual([]);
  });
});
