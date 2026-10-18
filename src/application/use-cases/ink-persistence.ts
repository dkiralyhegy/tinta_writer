import {
  parseStoredInk,
  resolveRuns,
  serializeRuns,
  type InkRun,
} from "../../domain/services/ink-runs";
import type { InkStore } from "../ports/ink-store";

/** estado do lateral da nota aberta */
export interface InkSession {
  /** JSON exatamente como está em disco (null = sem lateral) */
  lastSaved: string | null;
  /** existe lateral mas não o entendemos — não sobrescrever sem cor nova */
  unreadable: boolean;
}

export const FRESH_INK_SESSION: InkSession = { lastSaved: null, unreadable: false };

export async function loadInk(
  store: InkStore,
  root: string,
  notePath: string,
  doc: string,
): Promise<{ runs: InkRun[]; session: InkSession }> {
  const text = await store.load(root, notePath);
  if (text === null) return { runs: [], session: FRESH_INK_SESSION };
  const stored = parseStoredInk(text);
  if (!stored) return { runs: [], session: { lastSaved: text, unreadable: true } };
  return { runs: resolveRuns(doc, stored), session: { lastSaved: text, unreadable: false } };
}

/**
 * Grava o lateral se a serialização mudou. Notas sem cor nunca geram I/O.
 * Chamar DEPOIS do saveNote, com o mesmo texto que foi para a nota.
 */
export async function saveInk(
  store: InkStore,
  root: string,
  notePath: string,
  doc: string,
  runs: readonly InkRun[],
  session: InkSession,
): Promise<InkSession> {
  const stored = serializeRuns(doc, runs);
  if (stored === null && session.unreadable) return session;
  const text = stored ? JSON.stringify(stored) : null;
  if (text === session.lastSaved) return session;
  await store.save(root, notePath, text);
  return { lastSaved: text, unreadable: false };
}
