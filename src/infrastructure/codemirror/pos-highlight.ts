import { syntaxTree } from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { ThemeConfig } from "../../domain/entities/theme-config";
import type { PosLexicon } from "../../domain/services/pos-lexicon";
import { tagTokens, type EnabledCategories, type PosCategory } from "../../domain/services/pos-tagger";

const marks: Record<PosCategory, Decoration> = {
  noun: Decoration.mark({ class: "cm-pos-noun" }),
  verb: Decoration.mark({ class: "cm-pos-verb" }),
  adj: Decoration.mark({ class: "cm-pos-adj" }),
  adv: Decoration.mark({ class: "cm-pos-adv" }),
  conj: Decoration.mark({ class: "cm-pos-conj" }),
};

/** nós da árvore markdown que NÃO são prosa — sem realce dentro deles */
const EXCLUDED_NODE = /Mark$|^(InlineCode|FencedCode|CodeBlock|CodeText|CodeInfo|URL|HTMLTag|HTMLBlock|Comment|LinkTitle)$/;

interface Interval {
  from: number;
  to: number;
}

/**
 * Realce de classes gramaticais (estilo Syntax Highlight do iA Writer).
 * 100% local: tagger do domain + léxico injetado. Decorations SÓ sobre
 * view.visibleRanges — obrigatório para docs de livro.
 */
export function posHighlight(lexicon: PosLexicon, config: ThemeConfig): Extension {
  const enabled: EnabledCategories = {
    noun: config.posNoun,
    verb: config.posVerb,
    adj: config.posAdj,
    adv: config.posAdv,
    conj: config.posConj,
  };

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
          const from = view.state.doc.lineAt(range.from).from;
          const to = view.state.doc.lineAt(range.to).to;

          // intervalos a pular (código, urls, marcadores markdown)
          const excluded: Interval[] = [];
          syntaxTree(view.state).iterate({
            from,
            to,
            enter(node) {
              if (EXCLUDED_NODE.test(node.name)) {
                excluded.push({ from: node.from, to: node.to });
                return false;
              }
              return undefined;
            },
          });

          const text = view.state.doc.sliceString(from, to);
          let exclusionIdx = 0;
          for (const token of tagTokens(text, from, lexicon, enabled)) {
            while (
              exclusionIdx < excluded.length &&
              excluded[exclusionIdx]!.to <= token.from
            ) {
              exclusionIdx++;
            }
            const exclusion = excluded[exclusionIdx];
            if (exclusion && token.to > exclusion.from && token.from < exclusion.to) {
              continue; // token dentro de código/url/marcador
            }
            found.push(marks[token.category].range(token.from, token.to));
          }
        }
        return Decoration.set(found, true);
      }
    },
    { decorations: (v) => v.decorations },
  );

  return [plugin];
}
