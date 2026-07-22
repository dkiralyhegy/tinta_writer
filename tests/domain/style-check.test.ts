import { describe, expect, it } from "vitest";
import { STYLE_ENTRIES_PT } from "../../src/domain/data/style-check-pt";
import { buildStyleIndex, findStyleIssues } from "../../src/domain/services/style-check";

const index = buildStyleIndex(STYLE_ENTRIES_PT);

describe("findStyleIssues", () => {
  it("encontra redundância multi-palavra com posições exatas", () => {
    const text = "Ele resolveu subir para cima do telhado.";
    const issues = findStyleIssues(text, 0, index);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe("redundancia");
    expect(text.slice(issues[0]!.from, issues[0]!.to)).toBe("subir para cima");
  });

  it("muleta de uma palavra, case-insensitive", () => {
    const issues = findStyleIssues("Basicamente é isso.", 0, index);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.kind).toBe("muleta");
  });

  it("clichê com apóstrofo e acento", () => {
    const issues = findStyleIssues("procurar agulha no palheiro é inútil", 0, index);
    expect(issues.map((i) => i.kind)).toContain("cliche");
  });

  it("baseOffset desloca as posições", () => {
    const issues = findStyleIssues("meio que estranho", 1000, index);
    expect(issues[0]!.from).toBe(1000);
  });

  it("não marca palavras que só começam igual", () => {
    // "na verdade" é muleta; "na verdadeira história" não é
    const issues = findStyleIssues("na verdadeira história", 0, index);
    expect(issues).toHaveLength(0);
  });

  it("prefere a frase mais longa a partir do mesmo token", () => {
    // "há anos atrás" (3 palavras) deve ganhar de qualquer variação curta
    const text = "isso foi há anos atrás";
    const issues = findStyleIssues(text, 0, index);
    expect(issues).toHaveLength(1);
    expect(text.slice(issues[0]!.from, issues[0]!.to)).toBe("há anos atrás");
  });

  it("múltiplos vícios no mesmo trecho", () => {
    const issues = findStyleIssues(
      "Na verdade foi um divisor de águas, basicamente.",
      0,
      index,
    );
    expect(issues).toHaveLength(3);
  });

  it("texto limpo não gera issues", () => {
    expect(findStyleIssues("Ela abriu a porta e viu o mar.", 0, index)).toHaveLength(0);
  });
});
