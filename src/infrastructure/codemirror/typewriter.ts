import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/**
 * Typewriter scrolling: a linha em edição fica no centro vertical.
 * Recentraliza apenas em eventos do usuário (digitação, deleção, movimento
 * de cursor) — nunca em scroll manual, para não brigar com o trackpad.
 * O padding extra que permite centralizar a primeira/última linha vem da
 * classe .tinta-typewriter no CSS.
 */
export function typewriter(): Extension {
  return [
    EditorView.editorAttributes.of({ class: "tinta-typewriter" }),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged && !update.selectionSet) return;
      const isUserEvent = update.transactions.some(
        (tr) =>
          tr.isUserEvent("input") || tr.isUserEvent("delete") || tr.isUserEvent("move"),
      );
      if (!isUserEvent) return;

      const view = update.view;
      // dispatch dentro de um update é proibido — agenda para o próximo frame
      requestAnimationFrame(() => {
        view.dispatch({
          effects: EditorView.scrollIntoView(view.state.selection.main.head, {
            y: "center",
          }),
        });
      });
    }),
  ];
}
