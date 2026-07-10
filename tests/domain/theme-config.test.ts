import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, normalizeTheme } from "../../src/domain/entities/theme-config";

describe("normalizeTheme", () => {
  it("null vira o tema default", () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
  });

  it("preserva justified válido e descarta lixo", () => {
    expect(normalizeTheme({ justified: true }).justified).toBe(true);
    expect(normalizeTheme({ justified: "sim" }).justified).toBe(DEFAULT_THEME.justified);
  });

  it("clampa valores numéricos fora da faixa", () => {
    const t = normalizeTheme({ fontSize: 900, columnWidth: 4, lineHeight: 0.1 });
    expect(t.fontSize).toBe(32);
    expect(t.columnWidth).toBe(40);
    expect(t.lineHeight).toBe(1.2);
  });

  it("enum inválido cai no default", () => {
    const t = normalizeTheme({ mode: "neon", accent: "rosa", focusMode: "tudo" });
    expect(t.mode).toBe(DEFAULT_THEME.mode);
    expect(t.accent).toBe(DEFAULT_THEME.accent);
    expect(t.focusMode).toBe(DEFAULT_THEME.focusMode);
  });
});
