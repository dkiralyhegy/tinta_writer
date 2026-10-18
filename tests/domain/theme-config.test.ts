import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  nextInk,
  nextWorkspaceStyle,
  normalizeTheme,
} from "../../src/domain/entities/theme-config";

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

describe("campos de estilo do workspace", () => {
  it("defaults dos campos novos", () => {
    const t = normalizeTheme(null);
    expect(t.workspaceStyle).toBe("standard");
    expect(t.windowOpacity).toBe(0.75);
    expect(t.windowBlur).toBe("light");
    expect(t.ink).toBe("black");
    expect(t.typewriterSound).toBe(true);
    expect(t.typewriterVolume).toBe(0.6);
    expect(t.inkWear).toBe(0.5);
  });

  it("enums inválidos caem no default", () => {
    const t = normalizeTheme({ workspaceStyle: "neon", windowBlur: "total", ink: "verde" });
    expect(t.workspaceStyle).toBe("standard");
    expect(t.windowBlur).toBe("light");
    expect(t.ink).toBe("black");
  });

  it("aceita valores válidos", () => {
    const t = normalizeTheme({ workspaceStyle: "paper", windowBlur: "off", ink: "red" });
    expect(t.workspaceStyle).toBe("paper");
    expect(t.windowBlur).toBe("off");
    expect(t.ink).toBe("red");
  });

  it("clampa números e preserva zero onde zero é válido", () => {
    const t = normalizeTheme({ windowOpacity: 0, typewriterVolume: 0, inkWear: 7 });
    expect(t.windowOpacity).toBe(0.15);
    expect(t.typewriterVolume).toBe(0);
    expect(t.inkWear).toBe(1);
  });

  it("número inválido cai no default", () => {
    const t = normalizeTheme({ windowOpacity: "muito", typewriterVolume: null });
    expect(t.windowOpacity).toBe(0.75);
    expect(t.typewriterVolume).toBe(0.6);
  });
});

describe("nextWorkspaceStyle", () => {
  it("cicla padrão → typewriter real → transparência → papel → padrão", () => {
    expect(nextWorkspaceStyle("standard")).toBe("typewriter-real");
    expect(nextWorkspaceStyle("typewriter-real")).toBe("transparent");
    expect(nextWorkspaceStyle("transparent")).toBe("paper");
    expect(nextWorkspaceStyle("paper")).toBe("standard");
  });
});

describe("nextInk", () => {
  it("cicla preto → azul → vermelho → preto", () => {
    expect(nextInk("black")).toBe("blue");
    expect(nextInk("blue")).toBe("red");
    expect(nextInk("red")).toBe("black");
  });
});
