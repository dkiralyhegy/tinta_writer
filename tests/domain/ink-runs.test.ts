import { describe, expect, it } from "vitest";
import {
  contentHash,
  normalizeRuns,
  parseStoredInk,
  recolor,
  resolveRuns,
  serializeRuns,
  type InkRun,
} from "../../src/domain/services/ink-runs";

const blue = (from: number, to: number): InkRun => ({ from, to, ink: "blue" });
const red = (from: number, to: number): InkRun => ({ from, to, ink: "red" });

describe("normalizeRuns", () => {
  it("ordena, funde adjacentes de mesma cor e descarta vazios", () => {
    expect(normalizeRuns([blue(5, 8), blue(0, 5), red(9, 9)])).toEqual([blue(0, 8)]);
  });

  it("adjacentes de cores diferentes ficam separados", () => {
    expect(normalizeRuns([blue(0, 3), red(3, 6)])).toEqual([blue(0, 3), red(3, 6)]);
  });
});

describe("recolor", () => {
  it("colore um trecho preto", () => {
    expect(recolor([], 2, 6, "blue")).toEqual([blue(2, 6)]);
  });

  it("preto remove a cor", () => {
    expect(recolor([blue(0, 10)], 0, 10, "black")).toEqual([]);
  });

  it("parcial no meio divide o trecho", () => {
    expect(recolor([blue(0, 10)], 3, 6, "red")).toEqual([blue(0, 3), red(3, 6), blue(6, 10)]);
  });

  it("cruzando dois trechos", () => {
    expect(recolor([blue(0, 5), red(5, 10)], 3, 7, "black")).toEqual([blue(0, 3), red(7, 10)]);
  });

  it("mesma cor encostada funde", () => {
    expect(recolor([blue(0, 5)], 5, 8, "blue")).toEqual([blue(0, 8)]);
  });

  it("range vazio não muda nada", () => {
    expect(recolor([blue(0, 5)], 3, 3, "red")).toEqual([blue(0, 5)]);
  });
});

describe("contentHash", () => {
  it("determinístico e sensível a mudança", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
    expect(contentHash("abc")).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });
});

describe("serializeRuns / resolveRuns", () => {
  const doc = "Era uma vez uma máquina de escrever azul.";

  it("zero trechos → null (sem lateral)", () => {
    expect(serializeRuns(doc, [])).toBeNull();
  });

  it("guarda âncora: texto, prefixo e sufixo", () => {
    const stored = serializeRuns(doc, [blue(12, 23)])!;
    expect(stored.runs[0]).toMatchObject({ text: "uma máquina", ink: "blue" });
    expect(stored.runs[0]!.prefix).toBe("Era uma vez ");
    expect(stored.runs[0]!.suffix).toBe(" de escrever azul.");
    expect(stored.contentLength).toBe(doc.length);
  });

  it("round-trip pelo caminho rápido (texto inalterado)", () => {
    const runs = [blue(0, 3), red(12, 23)];
    expect(resolveRuns(doc, serializeRuns(doc, runs))).toEqual(runs);
  });

  it("reancora quando texto foi inserido antes do trecho", () => {
    const stored = serializeRuns(doc, [red(12, 23)])!;
    const edited = `Prólogo. ${doc}`; // +9 caracteres
    expect(resolveRuns(edited, stored)).toEqual([red(21, 32)]);
  });

  it("ocorrências repetidas: desempata pelo contexto", () => {
    const text = "azul aqui. e azul ali.";
    const stored = serializeRuns(text, [blue(13, 17)])!; // o segundo "azul"
    const edited = `x ${text}`;
    expect(resolveRuns(edited, stored)).toEqual([blue(15, 19)]);
  });

  it("trecho apagado por fora é descartado, o resto sobrevive", () => {
    const stored = serializeRuns(doc, [blue(0, 3), red(12, 23)])!;
    const edited = doc.replace("uma máquina", "um piano");
    expect(resolveRuns(edited, stored)).toEqual([blue(0, 3)]);
  });

  it("null e versão desconhecida → sem trechos", () => {
    expect(resolveRuns(doc, null)).toEqual([]);
    expect(resolveRuns(doc, { version: 2 } as never)).toEqual([]);
  });
});

describe("parseStoredInk", () => {
  it("lê o que serializeRuns gerou", () => {
    const stored = serializeRuns("abc def", [blue(0, 3)])!;
    expect(parseStoredInk(JSON.stringify(stored))).toEqual(stored);
  });

  it("JSON inválido ou formato estranho → null", () => {
    expect(parseStoredInk("{nope")).toBeNull();
    expect(parseStoredInk('{"version":1}')).toBeNull();
    expect(parseStoredInk('{"version":9,"runs":[]}')).toBeNull();
  });

  it("descarta trechos malformados mas mantém os válidos", () => {
    const text = JSON.stringify({
      version: 1,
      contentLength: 3,
      contentHash: "fnv1a:00000000",
      runs: [
        { from: 0, to: 3, ink: "blue", text: "abc", prefix: "", suffix: "" },
        { from: 0, to: 3, ink: "verde", text: "abc", prefix: "", suffix: "" },
      ],
    });
    expect(parseStoredInk(text)!.runs).toHaveLength(1);
  });
});
