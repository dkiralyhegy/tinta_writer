import type { Extension } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { inkHistory, inkRunsOf, inkStateField } from "./ink-field";

const marks = {
  blue: Decoration.mark({ class: "cm-ink-blue" }),
  red: Decoration.mark({ class: "cm-ink-red" }),
};

/** pinta os trechos (poucos por nota — o doc inteiro é barato) */
const decorations = EditorView.decorations.compute([inkStateField], (state) =>
  Decoration.set(inkRunsOf(state).map((r) => marks[r.ink].range(r.from, r.to))),
);

export const inkDecorations: Extension = [decorations, inkHistory];
