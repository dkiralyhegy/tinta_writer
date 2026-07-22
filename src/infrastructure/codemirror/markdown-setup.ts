import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import { drawSelection, dropCursor, EditorView, keymap } from "@codemirror/view";

/**
 * Extensões base do editor: markdown GFM (com continuação de listas no
 * Enter), histórico, wrap de linha e teclado padrão. Sem gutters, sem
 * highlight de linha ativa — superfície limpa.
 */
export function baseExtensions(): Extension {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    EditorView.lineWrapping,
    EditorState.allowMultipleSelections.of(true),
    markdown({ base: markdownLanguage }),
    highlightSelectionMatches(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
  ];
}

/**
 * Atributos de revisão nativa (macOS): ortografia e autocorreção.
 * Vive num Compartment próprio — os toggles dos ajustes reconfiguram
 * sem recriar o editor.
 */
export function revisionAttributes(spellcheck: boolean, autocorrect: boolean): Extension {
  return EditorView.contentAttributes.of({
    spellcheck: spellcheck ? "true" : "false",
    autocorrect: autocorrect ? "on" : "off",
    autocapitalize: autocorrect ? "on" : "off",
    lang: "pt-BR",
  });
}
