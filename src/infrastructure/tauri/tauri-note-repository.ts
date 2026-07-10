import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { LibraryNode } from "../../domain/entities/library";
import type { SnapshotMeta } from "../../domain/services/snapshot-policy";
import type {
  NoteRepository,
  ReadResult,
  WriteResult,
} from "../../application/ports/note-repository";

/** Adapter da porta NoteRepository sobre os commands Rust. */
export class TauriNoteRepository implements NoteRepository {
  private unlistenFs: (() => void) | null = null;

  read(path: string): Promise<ReadResult> {
    return invoke<ReadResult>("read_note", { path });
  }

  writeAtomic(path: string, content: string, expectedMtimeMs?: number): Promise<WriteResult> {
    return invoke<WriteResult>("write_note_atomic", {
      path,
      content,
      expectedMtimeMs: expectedMtimeMs ?? null,
    });
  }

  create(path: string, content: string): Promise<WriteResult> {
    return invoke<WriteResult>("create_note", { path, content });
  }

  createFolder(path: string): Promise<void> {
    return invoke("create_folder", { path });
  }

  rename(from: string, to: string): Promise<void> {
    return invoke("rename_note", { from, to });
  }

  delete(path: string): Promise<void> {
    return invoke("delete_note", { path });
  }

  scan(root: string): Promise<LibraryNode> {
    return invoke<LibraryNode>("scan_library", { root });
  }

  snapshot(root: string, path: string): Promise<string | null> {
    return invoke<string | null>("snapshot_note", { root, path });
  }

  listSnapshots(root: string): Promise<SnapshotMeta[]> {
    return invoke<SnapshotMeta[]>("list_snapshots", { root });
  }

  deleteSnapshots(root: string, paths: string[]): Promise<number> {
    return invoke<number>("delete_snapshots", { root, paths });
  }

  async watch(root: string, onExternalChange: (paths: string[]) => void): Promise<void> {
    this.unlistenFs?.();
    this.unlistenFs = await listen<string[]>("fs-changed", (event) => {
      onExternalChange(event.payload);
    });
    await invoke("start_watching", { root });
  }
}
