import type { EditorState, Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { FocusMode } from "../../domain/entities/theme-config";

interface ActiveRange {
  from: number;
  to: number;
}

const dimMark = Decoration.mark({ class: "cm-focus-dim" });

const focusTheme = EditorView.baseTheme({
  ".cm-focus-dim": {
    opacity: "0.3",
    transition: "opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
});

function isBlank(text: string): boolean {
  return /^\s*$/.test(text);
}

/** Bloco de linhas não vazias contíguas ao cursor. */
function paragraphRange(state: EditorState, pos: number): ActiveRange {
  const doc = state.doc;
  let line = doc.lineAt(pos);
  if (isBlank(line.text)) return { from: line.from, to: line.to };

  let first = line;
  while (first.number > 1) {
    const prev = doc.line(first.number - 1);
    if (isBlank(prev.text)) break;
    first = prev;
  }
  let last = line;
  while (last.number < doc.lines) {
    const next = doc.line(last.number + 1);
    if (isBlank(next.text)) break;
    last = next;
  }
  return { from: first.from, to: last.to };
}

/** Sentença que contém o cursor, dentro do parágrafo ativo (Intl.Segmenter). */
function sentenceRange(state: EditorState, pos: number): ActiveRange {
  const paragraph = paragraphRange(state, pos);
  const text = state.doc.sliceString(paragraph.from, paragraph.to);
  const segmenter = new Intl.Segmenter("pt", { granularity: "sentence" });

  for (const segment of segmenter.segment(text)) {
    const from = paragraph.from + segment.index;
    const to = from + segment.segment.length;
    if (pos >= from && pos <= to) {
      // não esmaece o espaço à direita que pertence à sentença seguinte
      const trimmed = segment.segment.trimEnd();
      return { from, to: from + trimmed.length };
    }
  }
  return paragraph;
}

/**
 * Esmaece tudo exceto a sentença/parágrafo do cursor. As decorations são
 * construídas SOMENTE sobre view.visibleRanges — nunca sobre o documento
 * inteiro; é o que mantém docs de livro (200k+ palavras) fluidos.
 */
export function focusMode(mode: FocusMode): Extension {
  if (mode === "off") return [];

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        const pos = view.state.selection.main.head;
        const active =
          mode === "sentence"
            ? sentenceRange(view.state, pos)
            : paragraphRange(view.state, pos);

        const marks: Range<Decoration>[] = [];
        for (const range of view.visibleRanges) {
          if (range.to <= active.from || range.from >= active.to) {
            if (range.from < range.to) marks.push(dimMark.range(range.from, range.to));
            continue;
          }
          if (range.from < active.from) marks.push(dimMark.range(range.from, active.from));
          if (active.to < range.to) marks.push(dimMark.range(active.to, range.to));
        }
        return Decoration.set(marks, true);
      }
    },
    { decorations: (v) => v.decorations },
  );

  return [plugin, focusTheme];
}
