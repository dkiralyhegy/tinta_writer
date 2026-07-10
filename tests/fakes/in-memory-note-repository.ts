import type { LibraryNode } from "../../src/domain/entities/library";
import type { SnapshotMeta } from "../../src/domain/services/snapshot-policy";
import type {
  NoteRepository,
  ReadResult,
  WriteResult,
} from "../../src/application/ports/note-repository";

interface StoredFile {
  content: string;
  mtimeMs: number;
}

/** Fake em memória do repositório de notas — simula mtime e conflito externo. */
export class InMemoryNoteRepository implements NoteRepository {
  files = new Map<string, StoredFile>();
  folders = new Set<string>();
  snapshots: SnapshotMeta[] = [];
  private clockMs = 1_000;

  /** Simula uma edição externa (outro programa mexeu no arquivo). */
  externallyModify(path: string, content: string): void {
    this.clockMs += 10;
    this.files.set(path, { content, mtimeMs: this.clockMs });
  }

  async read(path: string): Promise<ReadResult> {
    const f = this.files.get(path);
    if (!f) throw new Error(`não existe: ${path}`);
    return { content: f.content, mtimeMs: f.mtimeMs };
  }

  async writeAtomic(
    path: string,
    content: string,
    expectedMtimeMs?: number,
  ): Promise<WriteResult> {
    const existing = this.files.get(path);
    if (existing && expectedMtimeMs !== undefined && existing.mtimeMs !== expectedMtimeMs) {
      const conflictPath = path.replace(/(\.\w+)$/, `.conflict-${this.clockMs}$1`);
      this.clockMs += 10;
      this.files.set(conflictPath, { content, mtimeMs: this.clockMs });
      return { mtimeMs: existing.mtimeMs, conflictPath };
    }
    this.clockMs += 10;
    this.files.set(path, { content, mtimeMs: this.clockMs });
    return { mtimeMs: this.clockMs, conflictPath: null };
  }

  async create(path: string, content: string): Promise<WriteResult> {
    if (this.files.has(path)) throw new Error(`já existe: ${path}`);
    return this.writeAtomic(path, content);
  }

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }

  async rename(from: string, to: string): Promise<void> {
    const f = this.files.get(from);
    if (!f) throw new Error(`não existe: ${from}`);
    if (this.files.has(to)) throw new Error(`já existe: ${to}`);
    this.files.delete(from);
    this.files.set(to, f);
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  async scan(root: string): Promise<LibraryNode> {
    return { name: root, path: root, isDir: true, mtimeMs: 0, children: [] };
  }

  async snapshot(_root: string, path: string): Promise<string | null> {
    if (!this.files.has(path)) return null;
    const snapPath = `.snapshots/${path}/${this.clockMs}`;
    this.snapshots.push({ path: snapPath, noteRel: path, tsSecs: this.clockMs / 1000 });
    return snapPath;
  }

  async listSnapshots(): Promise<SnapshotMeta[]> {
    return [...this.snapshots];
  }

  async deleteSnapshots(_root: string, paths: string[]): Promise<number> {
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => !paths.includes(s.path));
    return before - this.snapshots.length;
  }

  async watch(): Promise<void> {}
}
