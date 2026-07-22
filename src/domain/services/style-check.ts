import type { StyleEntry, StyleKind } from "../data/style-check-pt";

export interface StyleIssue {
  from: number;
  to: number;
  kind: StyleKind;
}

interface IndexedEntry {
  words: string[];
  kind: StyleKind;
}

/** Índice frase→tokens, chaveado pela primeira palavra (lookup O(1) por token). */
export type StyleIndex = Map<string, IndexedEntry[]>;

const WORD_RE = /[\p{L}\p{N}]+/gu;

function tokenize(text: string): { word: string; from: number; to: number }[] {
  const tokens: { word: string; from: number; to: number }[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const from = m.index ?? 0;
    tokens.push({
      word: m[0].toLowerCase().normalize("NFC"),
      from,
      to: from + m[0].length,
    });
  }
  return tokens;
}

export function buildStyleIndex(entries: StyleEntry[]): StyleIndex {
  const index: StyleIndex = new Map();
  for (const entry of entries) {
    const words = tokenize(entry.phrase).map((t) => t.word);
    if (words.length === 0) continue;
    const first = words[0]!;
    const bucket = index.get(first) ?? [];
    bucket.push({ words, kind: entry.kind });
    index.set(first, bucket);
  }
  // frases mais longas têm prioridade no match a partir do mesmo token
  for (const bucket of index.values()) {
    bucket.sort((a, b) => b.words.length - a.words.length);
  }
  return index;
}

/**
 * Encontra vícios de escrita num trecho de texto. `baseOffset` desloca as
 * posições para o documento completo (o caller passa só o viewport).
 */
export function findStyleIssues(
  text: string,
  baseOffset: number,
  index: StyleIndex,
): StyleIssue[] {
  const tokens = tokenize(text);
  const issues: StyleIssue[] = [];

  let i = 0;
  while (i < tokens.length) {
    const candidates = index.get(tokens[i]!.word);
    let matched = 0;
    if (candidates) {
      for (const candidate of candidates) {
        if (i + candidate.words.length > tokens.length) continue;
        let ok = true;
        for (let j = 1; j < candidate.words.length; j++) {
          if (tokens[i + j]!.word !== candidate.words[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          issues.push({
            from: baseOffset + tokens[i]!.from,
            to: baseOffset + tokens[i + candidate.words.length - 1]!.to,
            kind: candidate.kind,
          });
          matched = candidate.words.length;
          break; // bucket ordenado: o primeiro match é o mais longo
        }
      }
    }
    i += matched || 1;
  }
  return issues;
}
