export type ThemeMode = "light" | "dark" | "system";
export type FocusMode = "off" | "sentence" | "paragraph";

/** Fontes de editor oferecidas no painel — todas carregadas localmente. */
export const EDITOR_FONTS = [
  "Calling Code",
  "iA Writer Duo",
  "EB Garamond",
  "Neue Haas Grotesk Display",
] as const;

export type EditorFont = (typeof EDITOR_FONTS)[number];

export const ACCENTS = ["ember", "amber", "steel", "plum", "moss", "garnet"] as const;
export type Accent = (typeof ACCENTS)[number];

export const WORKSPACE_STYLES = ["standard", "typewriter-real", "transparent", "paper"] as const;
export type WorkspaceStyle = (typeof WORKSPACE_STYLES)[number];

/** tinta da máquina de escrever — preto é a ausência de cor no lateral */
export const INKS = ["black", "blue", "red"] as const;
export type Ink = (typeof INKS)[number];

/** desfoque nativo (vibrancy) atrás da janela no estilo transparência */
export const WINDOW_BLURS = ["off", "light", "strong"] as const;
export type WindowBlur = (typeof WINDOW_BLURS)[number];

const cycle = <T>(list: readonly T[], current: T): T =>
  list[(list.indexOf(current) + 1) % list.length]!;

/** ordem do ⌘E */
export function nextWorkspaceStyle(current: WorkspaceStyle): WorkspaceStyle {
  return cycle(WORKSPACE_STYLES, current);
}

/** ordem do ⌘⇧I */
export function nextInk(current: Ink): Ink {
  return cycle(INKS, current);
}

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
  /** ortografia nativa do macOS (sublinhado vermelho) */
  spellcheck: boolean;
  /** autocorreção nativa do macOS */
  autocorrect: boolean;
  /** realce de classes gramaticais (estilo iA Writer, léxico local) */
  posHighlight: boolean;
  posNoun: boolean;
  posVerb: boolean;
  posAdj: boolean;
  posAdv: boolean;
  posConj: boolean;
  /** riscar muletas, redundâncias e clichês */
  styleCheck: boolean;
  /** gramática via LanguageTool — envia texto para API online; opt-in explícito */
  grammarCheck: boolean;
  /** aparência do workspace, alternada com ⌘E */
  workspaceStyle: WorkspaceStyle;
  /** opacidade do fundo no estilo transparência (0.15–1); o texto fica sempre opaco */
  windowOpacity: number;
  windowBlur: WindowBlur;
  /** tinta ativa no typewriter real */
  ink: Ink;
  typewriterSound: boolean;
  /** 0–1 */
  typewriterVolume: number;
  /** intensidade das imperfeições da tinta, 0 (limpa) a 1 (máquina velha) */
  inkWear: number;
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
  spellcheck: true,
  autocorrect: true,
  posHighlight: false,
  posNoun: true,
  posVerb: true,
  posAdj: true,
  posAdv: true,
  posConj: true,
  styleCheck: false,
  grammarCheck: false,
  workspaceStyle: "standard",
  windowOpacity: 0.75,
  windowBlur: "light",
  ink: "black",
  typewriterSound: true,
  typewriterVolume: 0.6,
  inkWear: 0.5,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Normaliza um valor desconhecido (JSON de disco) para um ThemeConfig válido. */
export function normalizeTheme(raw: unknown): ThemeConfig {
  const r = (raw ?? {}) as Partial<Record<keyof ThemeConfig, unknown>>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === "boolean" ? value : fallback;
  // diferente do padrão `Number(x) || default`: aqui zero é valor legítimo
  const num = (value: unknown, fallback: number, lo: number, hi: number): number =>
    typeof value === "number" && Number.isFinite(value) ? clamp(value, lo, hi) : fallback;

  return {
    mode: pick(r.mode, ["light", "dark", "system"], DEFAULT_THEME.mode),
    editorFont: pick(r.editorFont, EDITOR_FONTS, DEFAULT_THEME.editorFont),
    fontSize: clamp(Number(r.fontSize) || DEFAULT_THEME.fontSize, 12, 32),
    lineHeight: clamp(Number(r.lineHeight) || DEFAULT_THEME.lineHeight, 1.2, 2.4),
    columnWidth: clamp(Number(r.columnWidth) || DEFAULT_THEME.columnWidth, 40, 120),
    justified: typeof r.justified === "boolean" ? r.justified : DEFAULT_THEME.justified,
    accent: pick(r.accent, ACCENTS, DEFAULT_THEME.accent),
    focusMode: pick(r.focusMode, ["off", "sentence", "paragraph"], DEFAULT_THEME.focusMode),
    typewriter: bool(r.typewriter, DEFAULT_THEME.typewriter),
    spellcheck: bool(r.spellcheck, DEFAULT_THEME.spellcheck),
    autocorrect: bool(r.autocorrect, DEFAULT_THEME.autocorrect),
    posHighlight: bool(r.posHighlight, DEFAULT_THEME.posHighlight),
    posNoun: bool(r.posNoun, DEFAULT_THEME.posNoun),
    posVerb: bool(r.posVerb, DEFAULT_THEME.posVerb),
    posAdj: bool(r.posAdj, DEFAULT_THEME.posAdj),
    posAdv: bool(r.posAdv, DEFAULT_THEME.posAdv),
    posConj: bool(r.posConj, DEFAULT_THEME.posConj),
    styleCheck: bool(r.styleCheck, DEFAULT_THEME.styleCheck),
    grammarCheck: bool(r.grammarCheck, DEFAULT_THEME.grammarCheck),
    workspaceStyle: pick(r.workspaceStyle, WORKSPACE_STYLES, DEFAULT_THEME.workspaceStyle),
    windowOpacity: num(r.windowOpacity, DEFAULT_THEME.windowOpacity, 0.15, 1),
    windowBlur: pick(r.windowBlur, WINDOW_BLURS, DEFAULT_THEME.windowBlur),
    ink: pick(r.ink, INKS, DEFAULT_THEME.ink),
    typewriterSound: bool(r.typewriterSound, DEFAULT_THEME.typewriterSound),
    typewriterVolume: num(r.typewriterVolume, DEFAULT_THEME.typewriterVolume, 0, 1),
    inkWear: num(r.inkWear, DEFAULT_THEME.inkWear, 0, 1),
  };
}
