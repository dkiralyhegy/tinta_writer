import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import type { EditorFont, ThemeConfig } from "../../domain/entities/theme-config";

/**
 * Estilo iA Writer: a sintaxe markdown fica sempre visível, mas o conteúdo
 * recebe o estilo real (headings escalados, bold, itálico) e todos os
 * MARCADORES (#, **, -, >) ficam esmaecidos via processingInstruction.
 * Cores vêm de variáveis CSS (--tinta-*), então o dark mode troca sem
 * reconfigurar o editor.
 */
const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.55em", fontWeight: "700", lineHeight: "1.25" },
  { tag: tags.heading2, fontSize: "1.3em", fontWeight: "700", lineHeight: "1.3" },
  { tag: tags.heading3, fontSize: "1.15em", fontWeight: "700" },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "700" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--tinta-dim)" },
  // Todos os marcadores markdown: HeaderMark, EmphasisMark, ListMark,
  // QuoteMark, LinkMark, CodeMark, HardBreak
  { tag: tags.processingInstruction, color: "var(--tinta-dim)", fontWeight: "400" },
  { tag: tags.monospace, backgroundColor: "var(--tinta-code-bg)", borderRadius: "2px" },
  { tag: tags.labelName, color: "var(--tinta-dim)" },
  { tag: tags.link, textDecorationLine: "underline", textDecorationColor: "var(--tinta-dim)" },
  { tag: tags.url, color: "var(--tinta-dim)" },
  { tag: tags.quote, color: "var(--tinta-quote)", fontStyle: "italic" },
  { tag: tags.contentSeparator, color: "var(--tinta-dim)" },
  { tag: tags.comment, color: "var(--tinta-dim)" },
  { tag: tags.escape, color: "var(--tinta-dim)" },
]);

function fontStack(font: EditorFont): string {
  switch (font) {
    case "Calling Code":
      return "'Calling Code', 'Sometype Mono', ui-monospace, monospace";
    case "iA Writer Duo":
      return "'iA Writer Duo', 'Calling Code', ui-monospace, monospace";
    case "EB Garamond":
      return "'EB Garamond', 'Iowan Old Style', Georgia, serif";
    case "Neue Haas Grotesk Display":
      return "'Neue Haas Grotesk Display', 'Helvetica Neue', sans-serif";
  }
}

/**
 * Tema dimensional do editor (fonte, corpo, coluna). Trocado em runtime via
 * Compartment.reconfigure — cores ficam em CSS vars e não passam por aqui.
 */
export function buildTheme(config: ThemeConfig): Extension {
  return [
    EditorView.theme({
      "&": {
        backgroundColor: "transparent",
        color: "var(--tinta-editor-fg)",
        fontSize: `${config.fontSize}px`,
        height: "100%",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": {
        fontFamily: fontStack(config.editorFont),
        lineHeight: String(config.lineHeight),
      },
      ".cm-content": {
        maxWidth: `${config.columnWidth}ch`,
        margin: "0 auto",
        paddingTop: "var(--tinta-editor-pad-top)",
        paddingBottom: "var(--tinta-editor-pad-bottom)",
        paddingLeft: "24px",
        paddingRight: "24px",
        caretColor: "var(--tinta-accent)",
        // justificado pede hifenização, senão a coluna abre "rios" de espaço
        textAlign: config.justified ? "justify" : "left",
        hyphens: config.justified ? "auto" : "manual",
        "-webkit-hyphens": config.justified ? "auto" : "manual",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--tinta-accent)",
        borderLeftWidth: "2px",
      },
      ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground":
        {
          backgroundColor: "var(--tinta-selection)",
        },
      ".cm-selectionMatch": { backgroundColor: "var(--tinta-code-bg)" },
    }),
    syntaxHighlighting(markdownHighlight),
  ];
}
