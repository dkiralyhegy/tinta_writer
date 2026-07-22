import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { STYLE_ENTRIES_PT } from "../../domain/data/style-check-pt";
import { buildStyleIndex, findStyleIssues } from "../../domain/services/style-check";

// índice construído uma vez por sessão, só quando o recurso liga
let cachedIndex: ReturnType<typeof buildStyleIndex> | null = null;

const marks = {
  muleta: Decoration.mark({ class: "cm-style-muleta" }),
  redundancia: Decoration.mark({ class: "cm-style-redundancia" }),
  cliche: Decoration.mark({ class: "cm-style-cliche" }),
};

/**
 * Risca muletas, redundâncias e clichês (estilo Style Check do iA Writer).
 * Efeito apenas visual — o arquivo não muda. Matching SÓ sobre os
 * visibleRanges expandidos a fronteiras de linha.
 */
export function styleCheck(): Extension {
  const index = (cachedIndex ??= buildStyleIndex(STYLE_ENTRIES_PT));

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        const found: Range<Decoration>[] = [];
        for (const range of view.visibleRanges) {
          // expande a fronteiras de linha para não cortar frase na costura
          const from = view.state.doc.lineAt(range.from).from;
          const to = view.state.doc.lineAt(range.to).to;
          const text = view.state.doc.sliceString(from, to);
          for (const issue of findStyleIssues(text, from, index)) {
            found.push(marks[issue.kind].range(issue.from, issue.to));
          }
        }
        return Decoration.set(found, true);
      }
    },
    { decorations: (v) => v.decorations },
  );

  return [plugin];
}
