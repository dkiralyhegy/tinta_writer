import type { Ink } from "../entities/theme-config";

/**
 * Trechos de tinta colorida. A nota nunca guarda cor: os trechos vivem num
 * arquivo lateral e são reancorados pelo próprio texto (estilo Web
 * Annotation TextQuoteSelector) quando a nota foi editada fora do tinta.
 * Preto é a ausência de trecho.
 */
export type ColoredInk = Exclude<Ink, "black">;

export interface InkRun {
  from: number;
  to: number;
  ink: ColoredInk;
}

export interface StoredRun extends InkRun {
  text: string;
  prefix: string;
  suffix: string;
}

export interface StoredInk {
  version: 1;
  contentLength: number;
  contentHash: string;
  runs: StoredRun[];
}

/** caracteres de contexto guardados de cada lado da âncora */
const CONTEXT = 32;

/** FNV-1a 32 bits — barato e suficiente para "o texto mudou?" */
export function contentHash(doc: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < doc.length; i++) {
    h ^= doc.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/** ordena, funde adjacentes/sobrepostos de mesma cor, descarta vazios */
export function normalizeRuns(runs: readonly InkRun[]): InkRun[] {
  const sorted = runs
    .filter((r) => r.to > r.from)
    .map((r) => ({ from: r.from, to: r.to, ink: r.ink }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const out: InkRun[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.from <= last.to) {
      if (last.ink === r.ink) {
        last.to = Math.max(last.to, r.to);
        continue;
      }
      // sobreposição de cores diferentes: o anterior fica, o resto do novo segue
      if (r.to > last.to) out.push({ ...r, from: last.to });
      continue;
    }
    out.push(r);
  }
  return out;
}

/** pinta [from, to) com a tinta dada; preto apaga a cor do intervalo */
export function recolor(runs: readonly InkRun[], from: number, to: number, ink: Ink): InkRun[] {
  if (to <= from) return normalizeRuns(runs);
  const out: InkRun[] = [];
  for (const r of runs) {
    if (r.to <= from || r.from >= to) {
      out.push({ ...r });
      continue;
    }
    if (r.from < from) out.push({ ...r, to: from });
    if (r.to > to) out.push({ ...r, from: to });
  }
  if (ink !== "black") out.push({ from, to, ink });
  return normalizeRuns(out);
}

/** formato do lateral; null = nota sem cor (o lateral deve ser apagado) */
export function serializeRuns(doc: string, runs: readonly InkRun[]): StoredInk | null {
  const clean = normalizeRuns(runs).filter((r) => r.from >= 0 && r.to <= doc.length);
  if (clean.length === 0) return null;
  return {
    version: 1,
    contentLength: doc.length,
    contentHash: contentHash(doc),
    runs: clean.map((r) => ({
      ...r,
      text: doc.slice(r.from, r.to),
      prefix: doc.slice(Math.max(0, r.from - CONTEXT), r.from),
      suffix: doc.slice(r.to, r.to + CONTEXT),
    })),
  };
}

function isStoredRun(value: unknown): value is StoredRun {
  const r = value as Partial<StoredRun> | null;
  return (
    !!r &&
    (r.ink === "blue" || r.ink === "red") &&
    Number.isInteger(r.from) &&
    Number.isInteger(r.to) &&
    r.to! > r.from! &&
    typeof r.text === "string" &&
    r.text.length > 0 &&
    typeof r.prefix === "string" &&
    typeof r.suffix === "string"
  );
}

/** lê o JSON do lateral; null se ilegível ou de versão desconhecida */
export function parseStoredInk(text: string): StoredInk | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const r = raw as Partial<StoredInk> | null;
  if (!r || r.version !== 1 || !Array.isArray(r.runs)) return null;
  if (typeof r.contentLength !== "number" || typeof r.contentHash !== "string") return null;
  return {
    version: 1,
    contentLength: r.contentLength,
    contentHash: r.contentHash,
    runs: r.runs.filter(isStoredRun),
  };
}

function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonPrefixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/** melhor ocorrência de r.text: maior contexto casado, depois a mais próxima de r.from */
function bestMatch(doc: string, r: StoredRun): number | null {
  let best: number | null = null;
  let bestScore = -1;
  let bestDistance = Infinity;
  for (let i = doc.indexOf(r.text); i !== -1; i = doc.indexOf(r.text, i + 1)) {
    const before = doc.slice(Math.max(0, i - r.prefix.length), i);
    const after = doc.slice(i + r.text.length, i + r.text.length + r.suffix.length);
    const score = commonSuffixLength(before, r.prefix) + commonPrefixLength(after, r.suffix);
    const distance = Math.abs(i - r.from);
    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      best = i;
      bestScore = score;
      bestDistance = distance;
    }
  }
  return best;
}

/** trechos válidos para o texto atual; o que não for reencontrado é descartado */
export function resolveRuns(doc: string, stored: StoredInk | null): InkRun[] {
  if (!stored || stored.version !== 1 || !Array.isArray(stored.runs)) return [];
  const runs = stored.runs.filter(isStoredRun);
  if (stored.contentLength === doc.length && stored.contentHash === contentHash(doc)) {
    return normalizeRuns(runs.map(({ from, to, ink }) => ({ from, to, ink })));
  }
  const found: InkRun[] = [];
  for (const r of runs) {
    const at = bestMatch(doc, r);
    if (at !== null) found.push({ from: at, to: at + r.text.length, ink: r.ink });
  }
  return normalizeRuns(found);
}
