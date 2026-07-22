import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, hoverTooltip } from "@codemirror/view";

export interface DocGrammarIssue {
  from: number;
  to: number;
  message: string;
  replacements: string[];
}

export const setGrammarIssues = StateEffect.define<DocGrammarIssue[]>();
export const clearGrammarIssues = StateEffect.define<null>();

const issueMark = Decoration.mark({ class: "cm-lt-issue" });

/** issues vivas, remapeadas a cada edição — a decoração deriva delas */
const issuesField = StateField.define<DocGrammarIssue[]>({
  create: () => [],
  update(issues, tr) {
    let next = issues;
    if (tr.docChanged) {
      next = next
        .map((issue) => ({
          ...issue,
          from: tr.changes.mapPos(issue.from, 1),
          to: tr.changes.mapPos(issue.to, -1),
        }))
        .filter((issue) => issue.from < issue.to);
    }
    for (const effect of tr.effects) {
      if (effect.is(setGrammarIssues)) next = effect.value;
      if (effect.is(clearGrammarIssues)) next = [];
    }
    return next;
  },
});

const decorationsField = EditorView.decorations.compute([issuesField], (state) => {
  const issues = state.field(issuesField);
  return Decoration.set(
    issues.map((issue) => issueMark.range(issue.from, issue.to)),
    true,
  );
});

const issueTooltip = hoverTooltip((view, pos) => {
  const issue = view.state.field(issuesField).find((i) => pos >= i.from && pos <= i.to);
  if (!issue) return null;
  return {
    pos: issue.from,
    end: issue.to,
    above: true,
    create() {
      const dom = document.createElement("div");
      dom.className = "tinta-lt-tooltip";

      const msg = document.createElement("p");
      msg.className = "tinta-lt-message";
      msg.textContent = issue.message;
      dom.appendChild(msg);

      for (const replacement of issue.replacements) {
        const btn = document.createElement("button");
        btn.className = "tinta-lt-fix";
        btn.textContent = replacement;
        btn.onclick = () => {
          view.dispatch({
            changes: { from: issue.from, to: issue.to, insert: replacement },
          });
          view.focus();
        };
        dom.appendChild(btn);
      }
      return { dom };
    },
  };
});

/** Sublinhado ondulado + tooltip com sugestões clicáveis (LanguageTool). */
export function grammarExtension(): Extension {
  return [issuesField, decorationsField, issueTooltip];
}
