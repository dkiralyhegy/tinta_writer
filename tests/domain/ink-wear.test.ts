import { describe, expect, it } from "vitest";
import { wearFor } from "../../src/domain/services/ink-wear";

const A = "a".charCodeAt(0);

describe("wearFor", () => {
  it("desgaste zero = tinta limpa", () => {
    expect(wearFor(A, "cas", 0)).toBeNull();
  });

  it("determinístico: mesma letra no mesmo contexto é sempre igual", () => {
    expect(wearFor(A, "cas", 0.5)).toEqual(wearFor(A, "cas", 0.5));
  });

  it("contexto diferente muda o desgaste", () => {
    const samples = ["cas", "mes", "vid", "pal", "lum"].map((c) => wearFor(A, c, 1)!.opacity);
    expect(new Set(samples).size).toBeGreaterThan(1);
  });

  it("faixas no desgaste máximo", () => {
    for (let i = 0; i < 500; i++) {
      const w = wearFor(32 + (i % 90), String(i), 1)!;
      expect(w.opacity).toBeGreaterThanOrEqual(0.78);
      expect(w.opacity).toBeLessThanOrEqual(1);
      expect(Math.abs(w.dy)).toBeLessThanOrEqual(0.6);
      expect(Math.abs(w.rot)).toBeLessThanOrEqual(1.2);
    }
  });

  it("~5% de batidas fracas no desgaste padrão (0.5)", () => {
    let faint = 0;
    for (let i = 0; i < 4000; i++) if (wearFor(97 + (i % 26), String(i), 0.5)!.faint) faint++;
    expect(faint / 4000).toBeGreaterThan(0.03);
    expect(faint / 4000).toBeLessThan(0.07);
  });
});
