import {
  Compartment,
  EditorState,
  type Extension,
  type StateEffect,
  type Text,
} from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { CarriageEvent } from "../../domain/services/carriage";
import type { Ink, ThemeConfig } from "../../domain/entities/theme-config";
import type { InkRun } from "../../domain/services/ink-runs";
import type { PosLexicon } from "../../domain/services/pos-lexicon";
import { wordDelta } from "../../domain/services/word-count";
import { inkDecorations } from "./ink";
import { inkField, inkRunsOf, recolorSelectionSpec, setInkMode, type InkMode } from "./ink-field";
import { focusMode } from "./focus-mode";
import {
  clearGrammarIssues,
  grammarExtension,
  setGrammarIssues,
  type DocGrammarIssue,
} from "./grammar";
import { type PageInfo, paperPages } from "./paper-pages";
import { posHighlight } from "./pos-highlight";
import { buildTheme } from "./ia-writer-theme";
import { baseExtensions, revisionAttributes } from "./markdown-setup";
import { styleCheck } from "./style-check";
import { realTypewriter } from "./real-typewriter";
import { typewriter } from "./typewriter";

export interface EditorEvents {
  /** getText é lazy — só materializa a string quando o save realmente rodar */
  onDocChanged(getText: () => string, wordDelta: number): void;
  onSave(): void;
  /** folha atual / total no estilo papel; null fora dele */
  onPageInfo?(info: PageInfo | null): void;
  onCarriage?(events: CarriageEvent[]): void;
  /** as cores mudaram sem o texto mudar (recolorir, ⌘Z/⌘⇧Z de recolorir) */
  onInkChanged?(): void;
}

/** no typewriter real, foco e typewriter scrolling ficam suspensos (não alterados) */
function effectiveConfig(config: ThemeConfig): ThemeConfig {
  return config.workspaceStyle === "typewriter-real"
    ? { ...config, focusMode: "off", typewriter: false }
    : config;
}

/** só o typewriter real escolhe tinta; nos outros estilos o texto herda a cor */
function inkModeOf(config: ThemeConfig): InkMode {
  const choose = config.workspaceStyle === "typewriter-real";
  return { choose, active: choose ? config.ink : "black" };
}

/** o que muda a extensão do estilo: o próprio estilo e o desgaste da tinta */
const styleKeyOf = (config: ThemeConfig) => `${config.workspaceStyle}:${config.inkWear}`;

const isSpace = (ch: string | undefined) =>
  ch === " " || ch === "\n" || ch === "\t" || ch === "\r" || ch === undefined;

/** Expande um range até fronteiras de whitespace dentro das próprias linhas. */
function expandToWordBounds(doc: Text, from: number, to: number) {
  const lineFrom = doc.lineAt(from);
  let f = from;
  while (f > lineFrom.from && !isSpace(lineFrom.text[f - lineFrom.from - 1])) f--;
  const lineTo = doc.lineAt(to);
  let t = to;
  while (t < lineTo.to && !isSpace(lineTo.text[t - lineTo.from])) t++;
  return { from: f, to: t };
}

/**
 * Fachada do CodeMirror — o resto do app não importa nada de @codemirror.
 * Mantém um cache de EditorState por nota: trocar de capítulo preserva
 * undo history e posição de scroll da sessão.
 */
export class CmEditor {
  private view: EditorView;
  private config: ThemeConfig;
  private readonly themeCompartment = new Compartment();
  private readonly focusCompartment = new Compartment();
  private readonly typewriterCompartment = new Compartment();
  private readonly revisionCompartment = new Compartment();
  private readonly styleCompartment = new Compartment();
  private readonly posCompartment = new Compartment();
  private readonly grammarCompartment = new Compartment();
  private readonly styleModeCompartment = new Compartment();
  /** chave do que está no styleModeCompartment — evita recriar plugins a cada ajuste */
  private appliedStyleKey: string | null = null;
  private readonly stateCache = new Map<string, EditorState>();
  private currentPath: string | null = null;
  private posLexicon: PosLexicon | null = null;

  constructor(
    parent: HTMLElement,
    initialConfig: ThemeConfig,
    private readonly events: EditorEvents,
  ) {
    this.config = initialConfig;
    this.view = new EditorView({ parent, state: this.makeState("") });
  }

  private makeState(content: string, inkRuns: readonly InkRun[] = []): EditorState {
    this.appliedStyleKey = styleKeyOf(this.config);
    return EditorState.create({
      doc: content,
      extensions: [
        baseExtensions(),
        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              this.events.onSave();
              return true;
            },
          },
        ]),
        this.themeCompartment.of(buildTheme(this.config)),
        this.focusCompartment.of(focusMode(effectiveConfig(this.config).focusMode)),
        this.typewriterCompartment.of(effectiveConfig(this.config).typewriter ? typewriter() : []),
        this.revisionCompartment.of(
          revisionAttributes(this.config.spellcheck, this.config.autocorrect),
        ),
        this.styleCompartment.of(this.config.styleCheck ? styleCheck() : []),
        this.posCompartment.of(this.posExtension(this.config)),
        this.grammarCompartment.of(this.config.grammarCheck ? grammarExtension() : []),
        this.styleModeCompartment.of(this.styleExtension(this.config)),
        inkField(inkRuns, inkModeOf(this.config)),
        inkDecorations,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            const before = inkRunsOf(update.startState);
            const after = inkRunsOf(update.state);
            const same = before === after || (before.length === 0 && after.length === 0);
            if (!same) this.events.onInkChanged?.();
            return;
          }
          let delta = 0;
          update.changes.iterChanges((fromA, toA, fromB, toB) => {
            const oldRange = expandToWordBounds(update.startState.doc, fromA, toA);
            const newRange = expandToWordBounds(update.state.doc, fromB, toB);
            delta += wordDelta(
              update.startState.doc.sliceString(oldRange.from, oldRange.to),
              update.state.doc.sliceString(newRange.from, newRange.to),
            );
          });
          this.events.onDocChanged(() => update.state.doc.toString(), delta);
        }),
      ],
    });
  }

  /** Abre um documento, restaurando estado (undo/scroll) se cacheado e íntegro. */
  openDocument(path: string, content: string, inkRuns: readonly InkRun[] = []): void {
    if (this.currentPath) this.stateCache.set(this.currentPath, this.view.state);

    const cached = this.stateCache.get(path);
    if (cached && cached.doc.toString() === content) {
      this.view.setState(cached);
      // o cache pode ter sido criado com config antiga — reaplica a atual
      this.appliedStyleKey = null;
      this.applyConfig(this.config);
    } else {
      this.view.setState(this.makeState(content, inkRuns));
    }
    this.currentPath = path;
    this.view.focus();
  }

  /** Descarta o estado cacheado (ex.: arquivo mudou por fora). */
  forget(path: string): void {
    this.stateCache.delete(path);
  }

  /** Descarta o cache de tudo sob um prefixo (pasta movida/renomeada/excluída). */
  forgetUnder(prefix: string): void {
    for (const key of [...this.stateCache.keys()]) {
      if (key === prefix || key.startsWith(`${prefix}/`)) this.stateCache.delete(key);
    }
  }

  currentText(): string {
    return this.view.state.doc.toString();
  }

  currentInkRuns(): InkRun[] {
    return inkRunsOf(this.view.state);
  }

  /** recolore a seleção; false se não há seleção */
  recolorSelection(ink: Ink): boolean {
    const spec = recolorSelectionSpec(this.view.state, ink);
    if (!spec) return false;
    this.view.dispatch(spec);
    return true;
  }

  applyConfig(config: ThemeConfig): void {
    this.config = config;
    const effects: StateEffect<unknown>[] = [
      this.themeCompartment.reconfigure(buildTheme(config)),
      this.focusCompartment.reconfigure(focusMode(effectiveConfig(config).focusMode)),
      this.typewriterCompartment.reconfigure(effectiveConfig(config).typewriter ? typewriter() : []),
      this.revisionCompartment.reconfigure(
        revisionAttributes(config.spellcheck, config.autocorrect),
      ),
      this.styleCompartment.reconfigure(config.styleCheck ? styleCheck() : []),
      this.posCompartment.reconfigure(this.posExtension(config)),
      this.grammarCompartment.reconfigure(config.grammarCheck ? grammarExtension() : []),
      setInkMode.of(inkModeOf(config)),
    ];
    const key = styleKeyOf(config);
    if (key !== this.appliedStyleKey) {
      effects.push(this.styleModeCompartment.reconfigure(this.styleExtension(config)));
      this.appliedStyleKey = key;
    }
    this.view.dispatch({ effects });
    if (config.workspaceStyle !== "paper") this.events.onPageInfo?.(null);
  }

  private posExtension(config: ThemeConfig) {
    return config.posHighlight && this.posLexicon
      ? posHighlight(this.posLexicon, config)
      : [];
  }

  /** extensão do estilo do workspace ativo (⌘E) */
  private styleExtension(config: ThemeConfig): Extension {
    switch (config.workspaceStyle) {
      case "paper":
        return paperPages((info) => this.events.onPageInfo?.(info));
      case "typewriter-real":
        return realTypewriter({ onEvents: (e) => this.events.onCarriage?.(e) }, config.inkWear);
      default:
        return [];
    }
  }

  /** injeta o léxico carregado (lazy) e ativa o realce se configurado */
  setPosLexicon(lexicon: PosLexicon): void {
    this.posLexicon = lexicon;
    this.view.dispatch({
      effects: this.posCompartment.reconfigure(this.posExtension(this.config)),
    });
  }

  focus(): void {
    this.view.focus();
  }

  // ── gramática (LanguageTool) ──────────────────────────────────────

  /** janela de texto para checagem: doc inteiro se couber no limite da API */
  visibleWindow(): { from: number; to: number; text: string } {
    const doc = this.view.state.doc;
    if (doc.length <= 19_000) {
      return { from: 0, to: doc.length, text: doc.toString() };
    }
    const ranges = this.view.visibleRanges;
    const start = ranges.length ? ranges[0]!.from : 0;
    const end = ranges.length ? ranges[ranges.length - 1]!.to : 0;
    const from = doc.lineAt(start).from;
    const to = doc.lineAt(Math.min(end, from + 19_000)).to;
    return { from, to, text: doc.sliceString(from, to) };
  }

  /** identidade do documento — comparar antes/depois de uma checagem async */
  docIdentity(): unknown {
    return this.view.state.doc;
  }

  setGrammarIssues(issues: DocGrammarIssue[]): void {
    this.view.dispatch({ effects: setGrammarIssues.of(issues) });
  }

  clearGrammarIssues(): void {
    this.view.dispatch({ effects: clearGrammarIssues.of(null) });
  }

  destroy(): void {
    this.view.destroy();
  }
}
