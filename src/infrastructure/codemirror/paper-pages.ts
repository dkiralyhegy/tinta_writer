import {
  type EditorState,
  type Extension,
  type Range,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  type BlockInfo,
  BlockType,
  Decoration,
  type DecorationSet,
  EditorView,
  type LayerMarker,
  layer,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import {
  computePageBreaks,
  spacerHeights,
} from "../../domain/services/page-breaks";

export interface PageInfo {
  page: number;
  total: number;
}

/** A4: margem de 2,5 cm em 21 cm de largura */
const MARGIN_RATIO = 0.119;
const GAP = 32;
/** padding lateral do .cm-content (ver buildTheme) */
const CONTENT_PAD_X = 24;

interface Sheet {
  top: number;
  height: number;
}

interface Layout {
  decorations: DecorationSet;
  /** números de linha (1-based) que abrem folha nova */
  breakLines: number[];
  sheets: Sheet[];
  /** alturas dos espaçadores entre folhas, na ordem das folhas */
  spacers: number[];
  sheetLeft: number;
  sheetWidth: number;
}

const EMPTY: Layout = {
  decorations: Decoration.none,
  breakLines: [],
  sheets: [],
  spacers: [],
  sheetLeft: 0,
  sheetWidth: 0,
};

class Spacer extends WidgetType {
  constructor(readonly height: number) {
    super();
  }
  eq(other: Spacer) {
    return Math.abs(other.height - this.height) < 0.5;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "tinta-page-spacer";
    el.style.height = `${this.height}px`;
    return el;
  }
  get estimatedHeight() {
    return this.height;
  }
  ignoreEvent() {
    return true;
  }
}

const setLayout = StateEffect.define<Layout>();

/** espaçadores vêm de StateField: block widgets não podem vir de plugins */
const layoutField = StateField.define<Layout>({
  create: () => EMPTY,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setLayout)) return e.value;
    return tr.docChanged
      ? { ...value, decorations: value.decorations.map(tr.changes) }
      : value;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
});

/**
 * Altura só do texto da linha. Com block widgets (nossos espaçadores), o
 * lineBlockAt devolve um bloco composto (`type` é array): somamos só as
 * partes de texto — os espaçadores nunca entram na conta, então a
 * paginação converge numa passada.
 */
function textHeight(block: BlockInfo): number {
  const parts = block.type;
  if (!Array.isArray(parts)) return block.height;
  return parts
    .filter((b: BlockInfo) => b.type === BlockType.Text)
    .reduce((sum: number, b: BlockInfo) => sum + b.height, 0);
}

function measureLayout(view: EditorView): Layout {
  const { state } = view;

  const content = view.contentDOM.getBoundingClientRect();
  const scroller = view.scrollDOM.getBoundingClientRect();
  const textWidth = Math.max(100, content.width - 2 * CONTENT_PAD_X);
  const margin = (textWidth * MARGIN_RATIO) / (1 - 2 * MARGIN_RATIO);
  const sheetWidth = textWidth + 2 * margin;
  const sheetHeight = sheetWidth * Math.SQRT2;
  const pageContent = sheetHeight - 2 * margin;

  const heights: number[] = [];
  for (let n = 1; n <= state.doc.lines; n++) {
    heights.push(textHeight(view.lineBlockAt(state.doc.line(n).from)));
  }
  const { breakBefore, pageHeights } = computePageBreaks(heights, pageContent);

  const widgets: Range<Decoration>[] = [];
  const spacer = (pos: number, height: number, side: number) =>
    widgets.push(
      Decoration.widget({
        widget: new Spacer(height),
        block: true,
        side,
      }).range(pos),
    );

  spacer(0, margin, -1);
  const sheets: Sheet[] = [];
  let top = 0;
  const spacers = spacerHeights(pageHeights, pageContent, margin, GAP);
  pageHeights.forEach((used, p) => {
    const height = Math.max(pageContent, used) + 2 * margin;
    sheets.push({ top, height });
    const lineIndex = breakBefore[p];
    if (lineIndex !== undefined) {
      spacer(state.doc.line(lineIndex + 1).from, spacers[p]!, -1);
    } else {
      spacer(state.doc.length, spacers[p]!, 1);
    }
    top += height + GAP;
  });

  // layers são posicionadas relativas ao conteúdo rolável do scroller
  const docOffset = view.documentTop - scroller.top + view.scrollDOM.scrollTop;
  return {
    decorations: Decoration.set(widgets, true),
    breakLines: breakBefore.map((i) => i + 1),
    spacers,
    sheets: sheets.map((s) => ({ top: s.top + docOffset, height: s.height })),
    sheetLeft:
      content.left -
      scroller.left +
      view.scrollDOM.scrollLeft +
      CONTENT_PAD_X -
      margin,
    sheetWidth,
  };
}

function sameLayout(a: Layout, b: Layout): boolean {
  if (a.breakLines.join() !== b.breakLines.join()) return false;
  if (a.sheets.length !== b.sheets.length) return false;
  if (a.spacers.length !== b.spacers.length) return false;
  if (a.spacers.some((h, i) => Math.abs(h - b.spacers[i]!) > 0.5)) return false;
  if (
    Math.abs(a.sheetLeft - b.sheetLeft) > 0.5 ||
    Math.abs(a.sheetWidth - b.sheetWidth) > 0.5
  )
    return false;
  return a.sheets.every(
    (s, i) =>
      Math.abs(s.top - b.sheets[i]!.top) < 0.5 &&
      Math.abs(s.height - b.sheets[i]!.height) < 0.5,
  );
}

class SheetMarker implements LayerMarker {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly width: number,
    readonly height: number,
    readonly page: number,
  ) {}
  draw() {
    const el = document.createElement("div");
    el.className = "tinta-sheet";
    this.adjust(el);
    return el;
  }
  update(el: HTMLElement, prev: SheetMarker) {
    if (prev.page !== this.page || !this.eq(prev)) this.adjust(el);
    return true;
  }
  eq(o: SheetMarker) {
    return (
      o.left === this.left &&
      o.top === this.top &&
      o.width === this.width &&
      o.height === this.height &&
      o.page === this.page
    );
  }
  private adjust(el: HTMLElement) {
    el.style.left = `${this.left}px`;
    el.style.top = `${this.top}px`;
    el.style.width = `${this.width}px`;
    el.style.height = `${this.height}px`;
    el.dataset.page = String(this.page);
  }
}

const sheetsLayer = layer({
  above: false,
  class: "tinta-paper-layer",
  markers(view) {
    const l = view.state.field(layoutField, false);
    if (!l) return [];
    return l.sheets.map(
      (s, i) =>
        new SheetMarker(l.sheetLeft, s.top, l.sheetWidth, s.height, i + 1),
    );
  },
  update(update) {
    return (
      update.startState.field(layoutField, false) !==
      update.state.field(layoutField, false)
    );
  },
});

function pageOf(state: EditorState, pos: number): number {
  const line = state.doc.lineAt(pos).number;
  const breaks = state.field(layoutField, false)?.breakLines ?? [];
  return 1 + breaks.filter((n) => n <= line).length;
}

/**
 * Estilo papel: folhas A4 atrás do texto (layer) + espaçadores entre
 * parágrafos onde uma folha enche. Mede na fase read do CodeMirror e
 * aplica num microtask — dispatch dentro do ciclo de medida é proibido.
 */
export function paperPages(onPageInfo: (info: PageInfo) => void): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      private lastInfo = "";
      private destroyed = false;
      constructor(view: EditorView) {
        this.schedule(view);
        // setState recria o plugin: sem isto a barra de status guarda a nota anterior
        this.report(view);
      }
      destroy() {
        this.destroyed = true;
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.geometryChanged || u.viewportChanged)
          this.schedule(u.view);
        if (
          u.selectionSet ||
          u.docChanged ||
          u.transactions.some((t) => t.effects.some((e) => e.is(setLayout)))
        )
          this.report(u.view);
      }
      schedule(view: EditorView) {
        view.requestMeasure({
          key: this,
          read: (v) => (this.destroyed ? null : measureLayout(v)),
          write: (layout, v) => {
            if (this.destroyed || !layout) return;
            // o field pode já ter saído da config (estado restaurado em outro estilo)
            const current = v.state.field(layoutField, false);
            if (!current || sameLayout(layout, current)) return;
            queueMicrotask(() => {
              if (!this.destroyed)
                v.dispatch({ effects: setLayout.of(layout) });
            });
          },
        });
      }
      report(view: EditorView) {
        const info = {
          page: pageOf(view.state, view.state.selection.main.head),
          total: view.state.field(layoutField, false)?.sheets.length || 1,
        };
        const key = `${info.page}/${info.total}`;
        if (key === this.lastInfo) return;
        this.lastInfo = key;
        onPageInfo(info);
      }
    },
  );
  return [
    layoutField,
    plugin,
    sheetsLayer,
    EditorView.editorAttributes.of({ class: "tinta-paper" }),
  ];
}
