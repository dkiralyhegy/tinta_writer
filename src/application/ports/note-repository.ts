import type { LibraryNode } from "../../domain/entities/library";
import type { SnapshotMeta } from "../../domain/services/snapshot-policy";

export interface ReadResult {
  content: string;
  mtimeMs: number;
}

export interface WriteResult {
  mtimeMs: number;
  /** se o disco mudou por fora, caminho do arquivo .conflict gravado */
  conflictPath: string | null;
}

/** Porta de persistência de notas — implementada por infra Tauri e por fakes em teste. */
export interface NoteRepository {
  read(path: string): Promise<ReadResult>;
  writeAtomic(path: string, content: string, expectedMtimeMs?: number): Promise<WriteResult>;
  create(path: string, content: string): Promise<WriteResult>;
  createFolder(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  /** move para a lixeira do sistema, nunca apaga de verdade */
  delete(path: string): Promise<void>;
  scan(root: string): Promise<LibraryNode>;
  snapshot(root: string, path: string): Promise<string | null>;
  listSnapshots(root: string): Promise<SnapshotMeta[]>;
  deleteSnapshots(root: string, paths: string[]): Promise<number>;
  /** observa a raiz; onExternalChange recebe caminhos alterados por agentes externos */
  watch(root: string, onExternalChange: (paths: string[]) => void): Promise<void>;
}
