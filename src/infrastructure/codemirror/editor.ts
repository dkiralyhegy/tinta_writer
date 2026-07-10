import { Compartment, EditorState, type Text } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { ThemeConfig } from "../../domain/entities/theme-config";
import { wordDelta } from "../../domain/services/word-count";
import { focusMode } from "./focus-mode";
import { buildTheme } from "./ia-writer-theme";
import { baseExtensions } from "./markdown-setup";
import { typewriter } from "./typewriter";

export interface EditorEvents {
  /** getText é lazy — só materializa a string quando o save realmente rodar */
  onDocChanged(getText: () => string, wordDelta: number): void;
  onSave(): void;
}

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
  private readonly stateCache = new Map<string, EditorState>();
  private currentPath: string | null = null;

  constructor(
    parent: HTMLElement,
    initialConfig: ThemeConfig,
    private readonly events: EditorEvents,
  ) {
    this.config = initialConfig;
    this.view = new EditorView({ parent, state: this.makeState("") });
  }

  private makeState(content: string): EditorState {
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
        this.focusCompartment.of(focusMode(this.config.focusMode)),
        this.typewriterCompartment.of(this.config.typewriter ? typewriter() : []),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
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
  openDocument(path: string, content: string): void {
    if (this.currentPath) this.stateCache.set(this.currentPath, this.view.state);

    const cached = this.stateCache.get(path);
    if (cached && cached.doc.toString() === content) {
      this.view.setState(cached);
      // o cache pode ter sido criado com config antiga — reaplica a atual
      this.applyConfig(this.config);
    } else {
      this.view.setState(this.makeState(content));
    }
    this.currentPath = path;
    this.view.focus();
  }

  /** Descarta o estado cacheado (ex.: arquivo mudou por fora). */
  forget(path: string): void {
    this.stateCache.delete(path);
  }

  currentText(): string {
    return this.view.state.doc.toString();
  }

  applyConfig(config: ThemeConfig): void {
    this.config = config;
    this.view.dispatch({
      effects: [
        this.themeCompartment.reconfigure(buildTheme(config)),
        this.focusCompartment.reconfigure(focusMode(config.focusMode)),
        this.typewriterCompartment.reconfigure(config.typewriter ? typewriter() : []),
      ],
    });
  }

  focus(): void {
    this.view.focus();
  }

  destroy(): void {
    this.view.destroy();
  }
}
