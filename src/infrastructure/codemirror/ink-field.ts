import { invertedEffects } from "@codemirror/commands";
import {
  type ChangeDesc,
  type EditorState,
  type Extension,
  StateEffect,
  StateField,
  type TransactionSpec,
} from "@codemirror/state";
import type { Ink } from "../../domain/entities/theme-config";
import { normalizeRuns, recolor, type InkRun } from "../../domain/services/ink-runs";

/**
 * Trechos de tinta da sessão. Vivem no EditorState (o cache por nota do
 * CmEditor já os preserva) e são mapeados pelas mudanças do documento.
 * Só depende de @codemirror/state — testável sem DOM.
 */
export interface InkMode {
  /** tinta aplicada ao que é digitado quando `choose` */
  active: Ink;
  /** typewriter real: o texto inserido recebe a tinta ativa; senão herda a cor vizinha */
  choose: boolean;
}

interface InkState extends InkMode {
  runs: InkRun[];
}

export const setInkMode = StateEffect.define<InkMode>();
/** troca todos os trechos; `map` deixa o histórico reancorar efeitos guardados */
export const replaceInkRuns = StateEffect.define<InkRun[]>({
  map: (runs, mapping) =>
    runs.map((r) => ({
      ink: r.ink,
      from: mapping.mapPos(r.from, 1),
      to: mapping.mapPos(r.to, -1),
    })),
});

/** limita ao documento: um lateral velho nunca pode gerar uma faixa fora dele */
function clampRuns(runs: readonly InkRun[], length: number): InkRun[] {
  return normalizeRuns(
    runs.map((r) => ({
      ink: r.ink,
      from: Math.max(0, Math.min(r.from, length)),
      to: Math.max(0, Math.min(r.to, length)),
    })),
  );
}

function mapRuns(runs: readonly InkRun[], changes: ChangeDesc, choose: boolean): InkRun[] {
  // início com assoc 1: texto inserido logo antes do trecho fica de fora;
  // fim com assoc 1 (herança) estende o trecho; com -1 (tinta ativa) não
  const endAssoc = choose ? -1 : 1;
  return runs.map((r) => ({
    ink: r.ink,
    from: changes.mapPos(r.from, 1),
    to: changes.mapPos(r.to, endAssoc),
  }));
}

const field = StateField.define<InkState>({
  create: () => ({ runs: [], active: "black", choose: false }),
  update(value, tr) {
    let { runs, active, choose } = value;
    for (const e of tr.effects) {
      if (e.is(setInkMode)) ({ active, choose } = e.value);
    }
    if (tr.docChanged) {
      runs = mapRuns(runs, tr.changes, choose);
      if (choose) {
        tr.changes.iterChanges((_fromA, _toA, fromB, toB) => {
          if (toB > fromB) runs = recolor(runs, fromB, toB, active);
        });
      }
      runs = normalizeRuns(runs);
    }
    // aplicado depois do mapeamento: desfazer restaura os trechos exatos
    for (const e of tr.effects) {
      if (e.is(replaceInkRuns)) runs = clampRuns(e.value, tr.newDoc.length);
    }
    if (runs === value.runs && active === value.active && choose === value.choose) return value;
    return { runs, active, choose };
  },
});

export function inkField(initial: readonly InkRun[], mode: InkMode): Extension {
  return field.init((state) => ({ runs: clampRuns(initial, state.doc.length), ...mode }));
}

export function inkRunsOf(state: EditorState): InkRun[] {
  return state.field(field, false)?.runs ?? [];
}

/** transação que recolore a seleção principal; null se a seleção é vazia */
export function recolorSelectionSpec(state: EditorState, ink: Ink): TransactionSpec | null {
  const { from, to } = state.selection.main;
  if (from === to) return null;
  return {
    effects: replaceInkRuns.of(recolor(inkRunsOf(state), from, to, ink)),
    userEvent: "ink.recolor",
  };
}

export { field as inkStateField };

/** toda edição (ou recoloração) guarda os trechos anteriores para o ⌘Z restaurar */
export const inkHistory: Extension = invertedEffects.of((tr) => {
  if (!tr.docChanged && !tr.effects.some((e) => e.is(replaceInkRuns))) return [];
  const before = inkRunsOf(tr.startState);
  if (before.length === 0 && inkRunsOf(tr.state).length === 0) return [];
  return [replaceInkRuns.of(before)];
});
