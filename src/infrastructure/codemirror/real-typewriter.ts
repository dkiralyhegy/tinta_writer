import {
  EditorSelection,
  type Extension,
  type Range,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { clusterEnd, wearFor } from "../../domain/services/ink-wear";
import {
  carriageEvents,
  type CarriageAction,
  type CarriageEvent,
  type CaretSnapshot,
} from "../../domain/services/carriage";

export interface TypewriterHooks {
  onEvents(events: CarriageEvent[]): void;
}

/** linha de batida: fração da altura visível */
const STRIKE_LINE = 0.65;
const ESCAPE_MS = 40;
const RETURN_MS = 280;
const MOVE_MS = 200;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface CaretMeasure {
  snapshot: CaretSnapshot;
  /** x do cursor dentro do scroller (independe do translate) */
  x: number;
  /** y do cursor relativo ao topo visível do scroller */
  y: number;
  viewHeight: number;
  editorWidth: number;
}

/**
 * Carro móvel: o scroller inteiro (texto + layers de cursor/seleção) é
 * transladado em X para que o ponto de batida fique no centro da janela —
 * a folha anda, não o cursor. Transladar o scroller (e não o contentDOM)
 * mantém cursor e seleção alinhados durante a transição.
 * Em Y, ancora a linha do cursor a 65% da altura, só em eventos do usuário.
 */
function carriagePlugin(hooks: TypewriterHooks) {
  return ViewPlugin.fromClass(
    class {
      private prev: CaretSnapshot | null = null;
      private bellRung = false;
      private dead = false;
      private pending: { action: CarriageAction | null; text: string } = { action: null, text: "" };

      constructor(readonly view: EditorView) {
        this.schedule();
      }

      update(u: ViewUpdate) {
        for (const tr of u.transactions) {
          if (tr.isUserEvent("input")) {
            this.pending.action = "insert";
            tr.changes.iterChanges((_a, _b, _c, _d, inserted) => {
              this.pending.text += inserted.toString();
            });
          } else if (tr.isUserEvent("delete")) {
            if (this.pending.action !== "insert") this.pending.action = "delete";
          } else if ((tr.isUserEvent("select") || tr.isUserEvent("move")) && !this.pending.action) {
            this.pending.action = "move";
          }
        }
        if (u.docChanged || u.selectionSet || u.geometryChanged || this.pending.action) this.schedule();
      }

      private schedule() {
        this.view.requestMeasure({
          key: this,
          read: (v): CaretMeasure | null => {
            if (this.dead) return null;
            const head = v.state.selection.main.head;
            const coords = v.coordsAtPos(head);
            if (!coords) return null;
            const lineStart = v.moveToLineBoundary(EditorSelection.cursor(head), false).head;
            const scroller = v.scrollDOM.getBoundingClientRect();
            return {
              snapshot: {
                line: Math.round(coords.top - scroller.top + v.scrollDOM.scrollTop),
                col: head - lineStart,
              },
              x: coords.left - scroller.left,
              y: coords.top - scroller.top,
              viewHeight: v.scrollDOM.clientHeight,
              editorWidth: v.dom.getBoundingClientRect().width,
            };
          },
          write: (m, v) => {
            if (this.dead) return;
            const { action, text } = this.pending;
            this.pending = { action: null, text: "" };
            if (!m) return;

            const reduce = reducedMotion();
            let events: CarriageEvent[] = [];
            if (action && this.prev) {
              const r = carriageEvents({ action, text, prev: this.prev, next: m.snapshot, bellRung: this.bellRung });
              events = r.events;
              this.bellRung = r.bellRung;
              if (events.length) hooks.onEvents(events);
              if (!reduce && (events.includes("key") || events.includes("space"))) jolt(v.dom);
            }
            this.prev = m.snapshot;

            const isReturn = events.includes("return");
            const ms = isReturn ? RETURN_MS : action === "move" ? MOVE_MS : ESCAPE_MS;
            const ease = isReturn ? "cubic-bezier(0.2, 0.8, 0.2, 1)" : "linear";
            v.scrollDOM.style.transition = reduce || !action ? "none" : `transform ${ms}ms ${ease}`;
            v.scrollDOM.style.transform = `translateX(${Math.round(m.editorWidth / 2 - m.x)}px)`;

            if (action) {
              const target = v.scrollDOM.scrollTop + m.y - m.viewHeight * STRIKE_LINE;
              if (Math.abs(target - v.scrollDOM.scrollTop) > 1) {
                v.scrollDOM.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
              }
            }
          },
        });
      }

      destroy() {
        this.dead = true;
        this.view.scrollDOM.style.transform = "";
        this.view.scrollDOM.style.transition = "";
      }
    },
  );
}

const isSpaceChar = (ch: string) => ch === " " || ch === "\t";

/**
 * Uma mark por caractere, só nas visibleRanges. Palavras viram nowrap
 * para que as letras possam ser inline-block (rotação) sem quebrar no meio.
 * As palavras vão por outerDecorations: no CodeMirror, precedência maior =
 * nó DOM mais interno, e a palavra precisa ENVOLVER as letras.
 */
function wearPlugin(wear: number) {
  const word = Decoration.mark({ class: "tw-word" });
  const plugin = ViewPlugin.fromClass(
    class {
      chars: DecorationSet = Decoration.none;
      words: DecorationSet = Decoration.none;
      constructor(view: EditorView) {
        this.build(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) this.build(u.view);
      }
      build(view: EditorView): void {
        if (wear <= 0) {
          this.chars = this.words = Decoration.none;
          return;
        }
        const out: Range<Decoration>[] = [];
        const words: Range<Decoration>[] = [];
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos);
            const end = Math.min(line.to, to);
            const text = line.text;
            let wordStart = -1;
            for (let p = pos; p < end; ) {
              const i = p - line.from;
              const ch = text[i]!;
              if (isSpaceChar(ch)) {
                if (wordStart >= 0) words.push(word.range(wordStart, p));
                wordStart = -1;
                p++;
                continue;
              }
              if (wordStart < 0) wordStart = p;
              const stop = Math.min(line.to, line.from + clusterEnd(text, i));
              const w = wearFor(text.codePointAt(i)!, text.slice(Math.max(0, i - 3), i), wear)!;
              out.push(
                Decoration.mark({
                  class: w.faint ? "tw-ch tw-faint" : "tw-ch",
                  attributes: {
                    style: `--o:${w.opacity.toFixed(3)};--dy:${w.dy.toFixed(2)}px;--r:${w.rot.toFixed(2)}deg;--bleed:${w.bleed.toFixed(2)}px`,
                  },
                }).range(p, stop),
              );
              p = stop;
            }
            if (wordStart >= 0) words.push(word.range(wordStart, end));
            pos = line.to + 1;
          }
        }
        this.chars = Decoration.set(out, true);
        this.words = Decoration.set(words, true);
      }
    },
    { decorations: (v) => v.chars },
  );
  return [
    plugin,
    EditorView.outerDecorations.of((view) => view.plugin(plugin)?.words ?? Decoration.none),
  ];
}

/** letra recém-batida: classe por ~80 ms para a animação de impacto */
const addStrike = StateEffect.define<{ from: number; to: number }>();
const clearStrike = StateEffect.define<null>();
const strikeMark = Decoration.mark({ class: "tw-strike" });

const strikeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let deco = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearStrike)) deco = Decoration.none;
      if (e.is(addStrike) && e.value.to > e.value.from)
        deco = Decoration.set([strikeMark.range(e.value.from, e.value.to)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const strikeTimers = new WeakMap<EditorView, number>();

const strikeOnInput = EditorView.updateListener.of((u) => {
  const typed = u.transactions.some((t) => t.isUserEvent("input.type"));
  if (!typed) return;
  let range: { from: number; to: number } | null = null;
  u.changes.iterChanges((_a, _b, fromB, toB) => {
    if (toB > fromB) range = { from: fromB, to: toB };
  });
  if (!range) return;
  const view = u.view;
  // dispatch dentro de um update é proibido — agenda. Ao rodar, o estilo pode
  // ter sido deixado (extensão removida) ou a view destruída: só despacha se o
  // campo ainda estiver instalado.
  const active = () => view.state.field(strikeField, false) !== undefined;
  requestAnimationFrame(() => {
    if (!active()) return;
    const len = view.state.doc.length;
    const from = Math.min(range!.from, len);
    const to = Math.min(range!.to, len);
    if (to <= from) return;
    view.dispatch({ effects: addStrike.of({ from, to }) });
    const prev = strikeTimers.get(view);
    if (prev !== undefined) clearTimeout(prev);
    strikeTimers.set(
      view,
      window.setTimeout(() => {
        strikeTimers.delete(view);
        if (!active()) return;
        view.dispatch({ effects: clearStrike.of(null) });
      }, 80),
    );
  });
});

/** tranco de 1 px na folha a cada batida (WAAPI: o CodeMirror reescreve o class do .cm-editor) */
function jolt(dom: HTMLElement) {
  dom.animate([{ transform: "none" }, { transform: "translateY(1px)", offset: 0.5 }, { transform: "none" }], {
    duration: 70,
    easing: "ease-out",
  });
}

export function realTypewriter(hooks: TypewriterHooks, wear: number): Extension {
  return [
    EditorView.editorAttributes.of({ class: "tinta-tw-real" }),
    carriagePlugin(hooks),
    wearPlugin(wear),
    strikeField,
    strikeOnInput,
  ];
}
