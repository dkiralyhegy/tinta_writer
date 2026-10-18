import { describe, expect, it } from "vitest";
import { computePageBreaks } from "../../src/domain/services/page-breaks";

describe("computePageBreaks", () => {
  it("documento vazio tem uma folha vazia", () => {
    expect(computePageBreaks([], 100)).toEqual({ breakBefore: [], pageHeights: [0] });
  });

  it("tudo cabe numa folha", () => {
    expect(computePageBreaks([30, 30, 30], 100)).toEqual({ breakBefore: [], pageHeights: [90] });
  });

  it("parágrafo que não cabe vai inteiro para a próxima folha", () => {
    expect(computePageBreaks([40, 40, 40], 100)).toEqual({
      breakBefore: [2],
      pageHeights: [80, 40],
    });
  });

  it("encaixe exato não quebra", () => {
    expect(computePageBreaks([50, 50, 10], 100)).toEqual({
      breakBefore: [2],
      pageHeights: [100, 10],
    });
  });

  it("parágrafo maior que uma folha estica a folha dele", () => {
    expect(computePageBreaks([20, 250, 20], 100)).toEqual({
      breakBefore: [1, 2],
      pageHeights: [20, 250, 20],
    });
  });

  it("primeiro parágrafo gigante não gera folha vazia antes", () => {
    expect(computePageBreaks([250], 100)).toEqual({ breakBefore: [], pageHeights: [250] });
  });
});
