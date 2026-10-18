import { EditorSelection, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
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

            let events: CarriageEvent[] = [];
            if (action && this.prev) {
              const r = carriageEvents({ action, text, prev: this.prev, next: m.snapshot, bellRung: this.bellRung });
              events = r.events;
              this.bellRung = r.bellRung;
              if (events.length) hooks.onEvents(events);
            }
            this.prev = m.snapshot;

            const reduce = reducedMotion();
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

export function realTypewriter(hooks: TypewriterHooks, _wear: number): Extension {
  return [EditorView.editorAttributes.of({ class: "tinta-tw-real" }), carriagePlugin(hooks)];
}
