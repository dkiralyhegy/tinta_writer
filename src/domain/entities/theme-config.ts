export type ThemeMode = "light" | "dark" | "system";
export type FocusMode = "off" | "sentence" | "paragraph";

/** Fontes de editor oferecidas no painel — todas carregadas localmente. */
export const EDITOR_FONTS = [
  "Calling Code",
  "iA Writer Duo",
  "Neue Haas Grotesk Display",
] as const;

export type EditorFont = (typeof EDITOR_FONTS)[number];

export const ACCENTS = ["ember", "amber", "steel", "plum", "moss", "garnet"] as const;
export type Accent = (typeof ACCENTS)[number];

export interface ThemeConfig {
  mode: ThemeMode;
  editorFont: EditorFont;
  /** px */
  fontSize: number;
  lineHeight: number;
  /** largura máxima da coluna de texto, em ch */
  columnWidth: number;
  /** texto justificado (com hifenização) em vez de alinhado à esquerda */
  justified: boolean;
  accent: Accent;
  focusMode: FocusMode;
  typewriter: boolean;
}

export const DEFAULT_THEME: ThemeConfig = {
  mode: "system",
  editorFont: "Calling Code",
  fontSize: 17,
  lineHeight: 1.7,
  columnWidth: 64,
  justified: false,
  accent: "ember",
  focusMode: "off",
  typewriter: false,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Normaliza um valor desconhecido (JSON de disco) para um ThemeConfig válido. */
export function normalizeTheme(raw: unknown): ThemeConfig {
  const r = (raw ?? {}) as Partial<Record<keyof ThemeConfig, unknown>>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;

  return {
    mode: pick(r.mode, ["light", "dark", "system"], DEFAULT_THEME.mode),
    editorFont: pick(r.editorFont, EDITOR_FONTS, DEFAULT_THEME.editorFont),
    fontSize: clamp(Number(r.fontSize) || DEFAULT_THEME.fontSize, 12, 32),
    lineHeight: clamp(Number(r.lineHeight) || DEFAULT_THEME.lineHeight, 1.2, 2.4),
    columnWidth: clamp(Number(r.columnWidth) || DEFAULT_THEME.columnWidth, 40, 120),
    justified: typeof r.justified === "boolean" ? r.justified : DEFAULT_THEME.justified,
    accent: pick(r.accent, ACCENTS, DEFAULT_THEME.accent),
    focusMode: pick(r.focusMode, ["off", "sentence", "paragraph"], DEFAULT_THEME.focusMode),
    typewriter: typeof r.typewriter === "boolean" ? r.typewriter : DEFAULT_THEME.typewriter,
  };
}
