import { describe, expect, it } from "vitest";
import {
  computePageBreaks,
  spacerHeights,
} from "../../src/domain/services/page-breaks";

describe("computePageBreaks", () => {
  it("documento vazio tem uma folha vazia", () => {
    expect(computePageBreaks([], 100)).toEqual({
      breakBefore: [],
      pageHeights: [0],
    });
  });

  it("tudo cabe numa folha", () => {
    expect(computePageBreaks([30, 30, 30], 100)).toEqual({
      breakBefore: [],
      pageHeights: [90],
    });
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
    expect(computePageBreaks([250], 100)).toEqual({
      breakBefore: [],
      pageHeights: [250],
    });
  });
});

describe("spacerHeights", () => {
  it("entre folhas soma resto, margem de baixo, vão e margem de cima", () => {
    expect(spacerHeights([80, 40], 100, 10, 32)).toEqual([
      20 + 10 + 32 + 10,
      60 + 10 + 32,
    ]);
  });

  it("folha não cheia: mudar o usado muda o espaçador", () => {
    const a = spacerHeights([50, 40], 100, 10, 32);
    const b = spacerHeights([60, 40], 100, 10, 32);
    expect(a[0]).not.toBe(b[0]);
  });

  it("parágrafo maior que a folha não gera resto negativo", () => {
    expect(spacerHeights([150], 100, 10, 32)).toEqual([10 + 32]);
  });
});
